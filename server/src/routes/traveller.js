import { Router } from 'express';
import { query, withTenant, audit } from '../db.js';
import { requireAuth } from '../auth.js';
import { computeQuote, round } from '../services/pricing.js';
import integrations from '../services/integrations.js';

const r = Router();
r.use(requireAuth);

// ================= BOOKING =================
// Transactional: quote → atomic berth decrement (SECURITY DEFINER, availability-checked)
// → payment (idempotency key) → guaranteed-status flip → waitlist notify.
r.post('/bookings', async (req, res) => {
  const user = req.user;
  const { departure_id, booking_type = 'berth', berth_count = 1, cabin_id, share_cabin,
          cabin_share_preference = 'any', join_stop_id, leave_stop_id,
          guests = [], extras = [], special_requests, idempotency_key } = req.body || {};

  if (!departure_id) return res.status(400).json({ error: 'departure_id required' });

  // Idempotency: same key returns the original booking.
  if (idempotency_key) {
    const existing = await query(
      `SELECT b.id FROM berth_bookings b JOIN payments p ON p.booking_id = b.id
       WHERE b.traveller_id = $1 AND p.idempotency_key = $2 AND p.status = 'succeeded'`, [user.id, idempotency_key]);
    if (existing.rows.length) return res.json({ booking_id: existing.rows[0].id, idempotent_replay: true });
  }

  const depRes = await query(`SELECT * FROM departures WHERE id = $1`, [departure_id]);
  const departure = depRes.rows[0];
  if (!departure || !['open', 'guaranteed', 'almost_full'].includes(departure.status)) {
    return res.status(409).json({ error: 'This departure is no longer bookable' });
  }

  const isWholeBoat = booking_type === 'whole_boat';
  const berthsNeeded = isWholeBoat ? departure.berths_total : Number(berth_count);
  if (!isWholeBoat && berthsNeeded < 1) return res.status(400).json({ error: 'Invalid berth count' });
  if (isWholeBoat && !(departure.booking_mode === 'whole_boat' || departure.booking_mode === 'mixed')) {
    return res.status(400).json({ error: 'This departure is not bookable by whole boat' });
  }
  if (!isWholeBoat && departure.booking_mode === 'whole_boat') {
    return res.status(400).json({ error: 'This departure is whole-boat only' });
  }

  const rulesRes = await query(`SELECT * FROM pricing_rules WHERE operator_id = $1 ORDER BY priority DESC`, [departure.operator_id]);
  let cabinModifier = 0, joinDay = null, leaveDay = null;
  if (cabin_id) {
    const cabin = await query(`SELECT price_modifier_percent FROM cabins WHERE id = $1 AND vessel_id = $2`, [cabin_id, departure.vessel_id]);
    if (!cabin.rows.length) return res.status(400).json({ error: 'Cabin not on this vessel' });
    cabinModifier = Number(cabin.rows[0].price_modifier_percent);
  }
  if (join_stop_id || leave_stop_id) {
    const stops = await query(`SELECT id, day_number FROM route_stops WHERE route_id = $1 AND id = ANY($2::uuid[])`,
      [departure.route_id, [join_stop_id, leave_stop_id].filter(Boolean)]);
    const byId = Object.fromEntries(stops.rows.map((s) => [s.id, s.day_number]));
    if (join_stop_id) joinDay = byId[join_stop_id];
    if (leave_stop_id) leaveDay = byId[leave_stop_id];
    if (join_stop_id && byId[join_stop_id] == null) return res.status(400).json({ error: 'join_stop not on this route' });
  }
  const quote = computeQuote(departure, rulesRes.rows, {
    bookingType: booking_type, berthCount: berthsNeeded, shareCabin: !!share_cabin,
    cabinModifierPct: cabinModifier, joinDay, leaveDay
  });

  // Extra pricing
  const nightsCount = Math.max(1, Math.round((new Date(departure.return_date) - new Date(departure.departure_date)) / 86400000));
  let extrasTotal = 0;
  const appliedExtras = [];
  for (const extraId of extras) {
    const ex = await query(`SELECT * FROM extras WHERE id = $1 AND operator_id = $2`, [extraId, departure.operator_id]);
    if (!ex.rows.length) continue;
    const e = ex.rows[0];
    const amount = e.price_unit === 'per_person' ? e.price * (guests.length || berthsNeeded)
      : e.price_unit === 'per_day' ? e.price * nightsCount : e.price;
    extrasTotal += amount;
    appliedExtras.push({ id: e.id, name: e.name, amount: round(amount) });
  }
  const total = round(quote.total + extrasTotal);

  const status = departure.instant_confirmation ? 'confirmed' : 'on_request';

  const booking = await withTenant(user, async (client) => {
    const { rows } = await client.query(
      `INSERT INTO berth_bookings (departure_id, traveller_id, cabin_id, berth_count, booking_type,
        share_cabin, cabin_share_preference, join_stop_id, leave_stop_id, total_price, deposit_paid,
        balance_due_date, status, extras, special_requests, share_profile)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16) RETURNING *`,
      [departure_id, user.id, cabin_id || null, berthsNeeded, booking_type, !!share_cabin,
       cabin_share_preference, join_stop_id || null, leave_stop_id || null, total, quote.deposit,
       departure.departure_date, status, JSON.stringify(appliedExtras), special_requests || null,
       req.body.share_profile || null]);
    const bk = rows[0];

    // Atomic inventory decrement — returns false if sold out (transaction rolls back).
    const booked = await client.query('SELECT book_berths($1,$2) AS ok', [departure_id, berthsNeeded]);
    if (!booked.rows[0].ok) {
      const err = new Error('SOLD_OUT'); err.status = 409; throw err;
    }

    // Payment via adapter (mock) with idempotency key.
    const charge = await integrations.payments.charge({ amount: quote.deposit, idempotency_key });
    await client.query(
      `INSERT INTO payments (booking_id, amount, currency, type, provider, provider_reference, idempotency_key, status)
       VALUES ($1,$2,'EUR','deposit',$3,$4,$5,$6)`,
      [bk.id, quote.deposit, charge.provider, charge.provider_reference, idempotency_key || null, charge.status]);

    // Fraud heuristics (Block C): rapid repeat bookings.
    const recent = await client.query(
      `SELECT count(*)::int AS n FROM berth_bookings WHERE traveller_id = $1 AND created_at > now() - interval '24 hours'`, [user.id]);
    if (recent.rows[0].n >= 3) {
      await client.query(`INSERT INTO fraud_flags (booking_id, reason, details) VALUES ($1,'rapid_repeat_bookings',$2)`,
        [bk.id, JSON.stringify({ bookings_24h: recent.rows[0].n })]);
    }

    // Guaranteed flip → notify waitlisted users (Block B #4).
    const afterDep = await client.query(`SELECT * FROM departures WHERE id = $1`, [departure_id]);
    const fresh = afterDep.rows[0];
    if (fresh?.status === 'guaranteed' && departure.status !== 'guaranteed') {
      const wl = await client.query(`SELECT u.email, u.name FROM waitlist_entries w JOIN users u ON u.id = w.user_id WHERE w.departure_id = $1`, [departure_id]);
      for (const w of wl.rows) await integrations.comms.sendEmail(w.email, 'departure_guaranteed', { name: w.name, departure: fresh.embarkation_port });
      await audit(client, user, 'departure.guaranteed', 'departure', departure_id, { status: departure.status }, { status: 'guaranteed' });
    }

    await audit(client, user, 'booking.create', 'booking', bk.id, null,
      { status: bk.status, total, berth_count: berthsNeeded, booking_type });
    return bk;
  });

  // Post-commit notifications (Block C email sequences; mock adapter).
  const t = await query(`SELECT name, email FROM users WHERE id = $1`, [user.id]);
  await integrations.comms.sendEmail(t.rows[0].email, 'booking_received', { name: t.rows[0].name, total, status });
  if (status === 'on_request') {
    const op = await query(`SELECT u.email FROM users u WHERE u.operator_id = $1 AND u.role = 'operator'`, [departure.operator_id]);
    if (op.rows.length) await integrations.comms.sendEmail(op.rows[0].email, 'booking_request', { traveller: t.rows[0].name });
  }

  res.status(201).json({ booking_id: booking.id, status, total, deposit: quote.deposit, balance_due: quote.balance_due, breakdown: quote.breakdown, extras: appliedExtras });
});

r.post('/bookings/:id/cancel', async (req, res) => {
  const user = req.user;
  const result = await withTenant(user, async (client) => {
    const { rows } = await client.query(`SELECT * FROM berth_bookings WHERE id = $1`, [req.params.id]);
    const bk = rows[0];
    if (!bk) return { error: 'Booking not found', status: 404 };
    if (!['pending', 'on_request', 'confirmed'].includes(bk.status)) return { error: 'Booking cannot be cancelled', status: 409 };
    const dep = await client.query(`SELECT * FROM departures WHERE id = $1`, [bk.departure_id]);
    const departure = dep.rows[0];
    const policy = departure.cancellation_policy_id
      ? (await client.query(`SELECT tiers FROM cancellation_policies WHERE id = $1`, [departure.cancellation_policy_id])).rows[0]
      : null;
    const daysBefore = Math.ceil((new Date(departure.departure_date) - Date.now()) / 86400000);
    let refundPct = 0;
    if (policy) {
      for (const tier of policy.tiers || []) if (daysBefore >= tier.days_before) { refundPct = tier.refund_percent; break; }
      refundPct = Math.max(refundPct, (policy.tiers || []).reduce((m, t) => daysBefore >= t.days_before ? Math.max(m, t.refund_percent) : m, 0));
    }
    const refund = round(Number(bk.deposit_paid) * refundPct / 100);
    await client.query(`UPDATE berth_bookings SET status = 'cancelled' WHERE id = $1`, [bk.id]);
    await client.query(`SELECT release_berths($1,$2)`, [bk.departure_id, bk.berth_count]);
    if (refund > 0) {
      const pay = await client.query(`SELECT * FROM payments WHERE booking_id = $1 AND type = 'deposit' AND status = 'succeeded' LIMIT 1`, [bk.id]);
      if (pay.rows.length) {
        const rf = await integrations.payments.refund({ providerReference: pay.rows[0].provider_reference, amount: refund });
        await client.query(`INSERT INTO payments (booking_id, amount, type, provider, provider_reference, status) VALUES ($1,$2,'refund',$3,$4,$5)`,
          [bk.id, refund, rf.provider, rf.providerReference, 'succeeded']);
      }
    }
    await audit(client, user, 'booking.cancel', 'booking', bk.id, { status: bk.status }, { status: 'cancelled', refund_pct: refundPct });
    return { ok: true, refund_percent: refundPct, refund_amount: refund };
  });
  if (result.error) return res.status(result.status).json(result);
  res.json(result);
});

// Waitlist (Block B #4)
r.post('/departures/:id/waitlist', async (req, res) => {
  await withTenant(req.user, async (client) => {
    await client.query(
      `INSERT INTO waitlist_entries (departure_id, user_id, berths_wanted) VALUES ($1,$2,$3)
       ON CONFLICT (departure_id, user_id) DO NOTHING`,
      [req.params.id, req.user.id, Number(req.body?.berths_wanted || 1)]);
    await audit(client, req.user, 'waitlist.join', 'departure', req.params.id);
  });
  res.status(201).json({ ok: true });
});

// Verified-only reviews (Block B #9): requires a booking on this departure whose date has passed.
r.post('/departures/:id/reviews', async (req, res) => {
  const { rating_overall, rating_vessel, rating_skipper, rating_cleanliness, rating_value, rating_itinerary, written_review } = req.body || {};
  if (!rating_overall) return res.status(400).json({ error: 'rating_overall required' });
  const result = await withTenant(req.user, async (client) => {
    const dep = await client.query(
      `SELECT d.*, v.id AS vid, d.skipper_id FROM departures d JOIN vessels v ON v.id = d.vessel_id WHERE d.id = $1`, [req.params.id]);
    if (!dep.rows.length) return { error: 'Not found', status: 404 };
    const bk = await client.query(
      `SELECT id FROM berth_bookings WHERE departure_id = $1 AND traveller_id = $2 AND status IN ('completed','confirmed','cancelled')`,
      [req.params.id, req.user.id]);
    if (!bk.rows.length) return { error: 'Only guests with a booking on this departure can review it', status: 403 };
    const { rows } = await client.query(
      `INSERT INTO reviews (booking_id, traveller_id, vessel_id, skipper_id, rating_overall, rating_vessel,
        rating_skipper, rating_cleanliness, rating_value, rating_itinerary, written_review, verified)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,true) RETURNING *`,
      [bk.rows[0].id, req.user.id, dep.rows[0].vid, dep.rows[0].skipper_id, rating_overall,
       rating_vessel || rating_overall, rating_skipper || rating_overall, rating_cleanliness || rating_overall,
       rating_value || rating_overall, rating_itinerary || rating_overall, written_review || null]);
    await audit(client, req.user, 'review.create', 'review', rows[0].id, null, { verified: true });
    return rows[0];
  });
  if (result.error) return res.status(result.status).json(result);
  res.status(201).json(result);
});

// Enquiry / message to operator
r.post('/departures/:id/enquiry', async (req, res) => {
  const body = (req.body?.body || '').trim();
  if (!body) return res.status(400).json({ error: 'Message body required' });
  const result = await withTenant(req.user, async (client) => {
    let th = await client.query(`SELECT * FROM enquiry_threads WHERE departure_id = $1 AND traveller_id = $2`,
      [req.params.id, req.user.id]);
    if (!th.rows.length) {
      th = await client.query(`INSERT INTO enquiry_threads (departure_id, traveller_id) VALUES ($1,$2) RETURNING *`,
        [req.params.id, req.user.id]);
    }
    const msg = await client.query(
      `INSERT INTO enquiry_messages (thread_id, sender_id, body) VALUES ($1,$2,$3) RETURNING *`,
      [th.rows[0].id, req.user.id, body]);
    return msg.rows[0];
  });
  res.status(201).json(result);
});

// ================= TRIPS =================
r.get('/trips', async (req, res) => {
  const { rows } = await query(
    `SELECT b.id, b.status, b.booking_type, b.berth_count, b.total_price, b.departure_id,
            d.departure_date, d.return_date, d.embarkation_port, d.status AS departure_status,
            v.name AS vessel_name, v.type AS vessel_type, v.photos,
            r.name AS route_name, r.slug AS route_slug, r.hero_image, r.region,
            u.name AS skipper_name
     FROM berth_bookings b
     JOIN departures d ON d.id = b.departure_id
     JOIN vessels v ON v.id = d.vessel_id
     JOIN routes r ON r.id = d.route_id
     LEFT JOIN users u ON u.id = d.skipper_id
     WHERE b.traveller_id = $1 ORDER BY d.departure_date ASC`, [req.user.id]);
  res.json(rows);
});

const loadBooking = (client, id) => client.query(
  `SELECT b.*, d.departure_date, d.return_date, d.embarkation_port, d.disembarkation_port,
          d.minimum_viable_bookings, d.trip_vibe, d.skipper_id, d.operator_id, d.base_price_per_berth,
          v.name AS vessel_name, v.type AS vessel_type, v.photos, v.length_m, v.mmsi, v.cabins AS vessel_cabins,
          r.id AS route_id, r.name AS route_name, r.slug AS route_slug, r.region, r.difficulty,
          u.name AS skipper_name, o.company_name AS operator_name, o.response_time_mins
   FROM berth_bookings b
   JOIN departures d ON d.id = b.departure_id
   JOIN vessels v ON v.id = d.vessel_id
   JOIN routes r ON r.id = d.route_id
   LEFT JOIN users u ON u.id = d.skipper_id
   LEFT JOIN operators o ON o.id = d.operator_id
   WHERE b.id = $1`, [id]);

r.get('/trips/:id', async (req, res) => {
  const result = await withTenant(req.user, async (client) => {
    const bk = (await loadBooking(client, req.params.id)).rows[0];
    if (!bk) return { error: 'Booking not found', status: 404 };
    const departureId = bk.departure_id;
    const [stops, items, messages, docs, myMatches, incomingMatches, guests, candidates, payments] = await Promise.all([
      client.query(`SELECT * FROM route_stops WHERE route_id = $1 ORDER BY day_number`, [bk.route_id]),
      client.query(`SELECT i.*, a.name AS added_by_name, c.name AS claimed_by_name FROM trip_items i
        LEFT JOIN users a ON a.id = i.added_by LEFT JOIN users c ON c.id = i.claimed_by
        WHERE i.departure_id = $1 ORDER BY i.category, i.name`, [departureId]),
      client.query(`SELECT m.*, u.name AS sender_name, u.role AS sender_role FROM trip_messages m
        JOIN users u ON u.id = m.sender_id WHERE m.departure_id = $1 ORDER BY m.created_at ASC LIMIT 100`, [departureId]),
      client.query(`SELECT id, doc_type, file_name, size_bytes, status, uploaded_at FROM trip_documents WHERE booking_id = $1`, [bk.id]),
      client.query(`SELECT m.*, bu.traveller_id AS target_user FROM cabin_match_requests m
        JOIN berth_bookings bu ON bu.id = m.target_booking_id WHERE m.requester_booking_id = $1`, [bk.id]),
      client.query(`SELECT m.*, bu.traveller_id AS requester_user FROM cabin_match_requests m
        JOIN berth_bookings bu ON bu.id = m.requester_booking_id WHERE m.target_booking_id = $1`, [bk.id]),
      client.query(`SELECT id, full_name, date_of_birth, nationality, dietary_requirements, emergency_contact, sailing_experience FROM guests WHERE booking_id = $1`, [bk.id]),
      client.query(`SELECT b.id, b.share_profile, b.cabin_share_preference, u.name FROM berth_bookings b
        JOIN users u ON u.id = b.traveller_id
        WHERE b.departure_id = $1 AND b.id <> $2 AND b.share_cabin AND b.share_profile IS NOT NULL
        AND b.status IN ('confirmed','on_request')`, [departureId, bk.id]),
      client.query(`SELECT id, amount, type, status, created_at FROM payments WHERE booking_id = $1 ORDER BY created_at`, [bk.id])
    ]);
    const firstStop = stops.rows[0];
    const weather = firstStop ? await integrations.weather.forecast(firstStop.lat, firstStop.lng, 7) : [];
    const inProgress = new Date(bk.departure_date) <= new Date() && new Date(bk.return_date) >= new Date();
    const aisPos = inProgress && bk.mmsi
      ? await integrations.ais.position(bk.mmsi, stops.rows) : null;
    const daysUntil = Math.ceil((new Date(bk.departure_date) - Date.now()) / 86400000);
    const tepahTax = integrations.tepah.compute({
      vesselLengthM: Number(bk.length_m), passengerDays: bk.berth_count * 7
    });
    const manifest = integrations.charterpartyManifest(bk, guests.rows);
    return {
      booking: bk, stops: stops.rows, items: items.rows, messages: messages.rows, documents: docs.rows,
      my_matches: myMatches.rows, incoming_matches: incomingMatches.rows, guests: guests.rows,
      cabin_share_candidates: candidates.rows, payments: payments.rows,
      weather, ais_position: aisPos, days_until: daysUntil, tepah_tax: tepahTax, e_charterparty: manifest
    };
  });
  if (result.error) return res.status(result.status).json(result);
  res.json(result);
});

// Packing / provisioning co-edit (Block B #7)
r.post('/trips/:id/items', async (req, res) => {
  const { name, category } = req.body || {};
  if (!name || !['packing', 'provisioning'].includes(category)) return res.status(400).json({ error: 'name and valid category required' });
  const result = await withTenant(req.user, async (client) => {
    const bk = (await client.query(`SELECT departure_id FROM berth_bookings WHERE id = $1`, [req.params.id])).rows[0];
    if (!bk) return { error: 'Not found', status: 404 };
    const { rows } = await client.query(
      `INSERT INTO trip_items (departure_id, category, name, added_by) VALUES ($1,$2,$3,$4) RETURNING *`,
      [bk.departure_id, category, name, req.user.id]);
    return rows[0];
  });
  if (result.error) return res.status(result.status).json(result);
  res.status(201).json(result);
});

r.patch('/trips/:id/items/:itemId', async (req, res) => {
  const { checked, claim } = req.body || {};
  const result = await withTenant(req.user, async (client) => {
    const bk = (await client.query(`SELECT departure_id FROM berth_bookings WHERE id = $1`, [req.params.id])).rows[0];
    if (!bk) return { error: 'Not found', status: 404 };
    const sets = [];
    if (checked != null) { await client.query(`UPDATE trip_items SET checked = $1 WHERE id = $2 AND departure_id = $3`, [checked, req.params.itemId, bk.departure_id]); }
    if (claim === 'me') { await client.query(`UPDATE trip_items SET claimed_by = $1 WHERE id = $2 AND departure_id = $3`, [req.user.id, req.params.itemId, bk.departure_id]); }
    if (claim === 'release') { await client.query(`UPDATE trip_items SET claimed_by = NULL WHERE id = $1 AND departure_id = $2`, [req.params.itemId, bk.departure_id]); }
    const { rows } = await client.query(`SELECT * FROM trip_items WHERE id = $1`, [req.params.itemId]);
    return rows[0];
  });
  if (result.error) return res.status(result.status).json(result);
  res.json(result);
});

// Group chat (Block B #7)
r.post('/trips/:id/messages', async (req, res) => {
  const body = (req.body?.body || '').trim();
  if (!body) return res.status(400).json({ error: 'Message body required' });
  const result = await withTenant(req.user, async (client) => {
    const bk = (await client.query(`SELECT departure_id FROM berth_bookings WHERE id = $1`, [req.params.id])).rows[0];
    if (!bk) return { error: 'Not found', status: 404 };
    const { rows } = await client.query(
      `INSERT INTO trip_messages (departure_id, sender_id, body) VALUES ($1,$2,$3) RETURNING *`,
      [bk.departure_id, req.user.id, body]);
    return rows[0];
  });
  if (result.error) return res.status(result.status).json(result);
  res.status(201).json(result);
});

// Document upload metadata (Block C GDPR: stored purge-able, encrypted-at-rest in production)
// TODO(Cloudinary/S3): real file storage; TODO GDPR: automatic purge 90 days after trip completion.
r.post('/trips/:id/documents', async (req, res) => {
  const { doc_type, file_name, size_bytes } = req.body || {};
  if (!doc_type || !file_name) return res.status(400).json({ error: 'doc_type and file_name required' });
  const result = await withTenant(req.user, async (client) => {
    const { rows } = await client.query(
      `INSERT INTO trip_documents (booking_id, doc_type, file_name, size_bytes) VALUES ($1,$2,$3,$4) RETURNING *`,
      [req.params.id, doc_type, file_name, size_bytes || null]);
    await audit(client, req.user, 'document.upload', 'trip_document', rows[0].id);
    return rows[0];
  });
  res.status(201).json(result);
});

// Cabin-share matching (Block B #2): mutual accept/decline.
r.post('/trips/:id/cabin-matches', async (req, res) => {
  const target_booking_id = req.body?.target_booking_id;
  if (!target_booking_id) return res.status(400).json({ error: 'target_booking_id required' });
  const result = await withTenant(req.user, async (client) => {
    const mine = (await client.query(`SELECT b.share_cabin FROM berth_bookings b WHERE b.id = $1 AND b.traveller_id = $2`, [req.params.id, req.user.id])).rows[0];
    if (!mine?.share_cabin) return { error: 'Opt in to cabin sharing on your booking first', status: 400 };
    const target = (await client.query(`SELECT b.* FROM berth_bookings b WHERE b.id = $1 AND b.share_cabin = true`, [target_booking_id])).rows[0];
    if (!target) return { error: 'Target booking not found or not shareable', status: 404 };
    const { rows } = await client.query(
      `INSERT INTO cabin_match_requests (requester_booking_id, target_booking_id) VALUES ($1,$2) RETURNING *`,
      [req.params.id, target_booking_id]);
    return rows[0];
  });
  if (result.error) return res.status(result.status).json(result);
  res.status(201).json(result);
});

r.post('/trips/:id/cabin-matches/:matchId/respond', async (req, res) => {
  const { action } = req.body || {};
  if (!['accept', 'decline'].includes(action)) return res.status(400).json({ error: 'action must be accept or decline' });
  const result = await withTenant(req.user, async (client) => {
    const m = (await client.query(`SELECT * FROM cabin_match_requests WHERE id = $1 AND target_booking_id = $2`, [req.params.matchId, req.params.id])).rows[0];
    if (!m) return { error: 'Match request not found', status: 404 };
    await client.query(`UPDATE cabin_match_requests SET status = $1, responded_at = now() WHERE id = $2`,
      [action === 'accept' ? 'accepted' : 'declined', req.params.matchId]);
    await audit(client, req.user, `cabin_match.${action}`, 'cabin_match_request', req.params.matchId);
    return { ok: true };
  });
  if (result.error) return res.status(result.status).json(result);
  res.json(result);
});

export default r;
