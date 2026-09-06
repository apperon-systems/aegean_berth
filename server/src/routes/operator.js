import { Router } from 'express';
import { query, withTenant, audit } from '../db.js';
import { requireRole } from '../auth.js';
import { revpab, suggestPriceAdjustment, round } from '../services/pricing.js';
import integrations from '../services/integrations.js';

const r = Router();
r.use(requireRole('operator'));

// Multi-tenancy: every query here runs through withTenant, so RLS scopes all
// rows to the authenticated operator automatically.

const nightsBetween = (a, b) => Math.max(1, Math.round((new Date(b) - new Date(a)) / 86400000));

r.get('/dashboard', async (req, res) => {
  const data = await withTenant(req.user, async (client) => {
    const vessels = await client.query(`SELECT id, name, type, status FROM vessels WHERE operator_id = $1`, [req.user.operator_id]);
    const departures = await client.query(`
      SELECT d.*, r.name AS route_name, v.name AS vessel_name,
             (SELECT COALESCE(SUM(b.berth_count),0)::int FROM berth_bookings b
              WHERE b.departure_id = d.id AND b.status IN ('confirmed','on_request')) AS booked_berths,
             (SELECT COALESCE(SUM(b.total_price),0) FROM berth_bookings b
              WHERE b.departure_id = d.id AND b.status = 'confirmed') AS confirmed_revenue,
             (SELECT count(*)::int FROM berth_bookings b WHERE b.departure_id = d.id AND b.status = 'on_request') AS requests
      FROM departures d JOIN routes r ON r.id = d.route_id JOIN vessels v ON v.id = d.vessel_id
      WHERE d.operator_id = $1 ORDER BY d.departure_date`, [req.user.operator_id]);
    const ops = departures.rows;
    const active = ops.filter((d) => ['open', 'guaranteed', 'almost_full'].includes(d.status));
    const revenue = ops.reduce((s, d) => s + Number(d.confirmed_revenue || 0), 0);
    const berthNights = ops.reduce((s, d) => s + d.berths_total * nightsBetween(d.departure_date, d.return_date), 0);
    const bookedBerthNights = ops.reduce((s, d) => s + d.booked_berths * nightsBetween(d.departure_date, d.return_date), 0);
    const cancelled = await client.query(
      `SELECT count(*)::int AS n FROM berth_bookings b JOIN departures d ON d.id = b.departure_id
       WHERE d.operator_id = $1 AND b.status = 'cancelled'`, [req.user.operator_id]);
    const totalBookings = await client.query(
      `SELECT count(*)::int AS n FROM berth_bookings b JOIN departures d ON d.id = b.departure_id
       WHERE d.operator_id = $1 AND b.status <> 'pending'`, [req.user.operator_id]);
    const enquiries = await client.query(
      `SELECT t.id, t.departure_id, (SELECT count(*)::int FROM enquiry_messages m WHERE m.thread_id = t.id) AS message_count
       FROM enquiry_threads t JOIN departures d ON d.id = t.departure_id WHERE d.operator_id = $1`, [req.user.operator_id]);
    // Yield suggestions (Block B #5)
    const suggestions = active
      .map((d) => ({ departure_id: d.id, route_name: d.route_name, vessel_name: d.vessel_name,
        departure_date: d.departure_date, current_price: Number(d.base_price_per_berth), ...suggestPriceAdjustment(d) }))
      .filter((s) => s.rule);
    return {
      vessel_count: vessels.rows.length,
      vessels: vessels.rows,
      departures: ops,
      metrics: {
        revenue: round(revenue),
        // RevPAB — Revenue per Available Berth-night (Block B #5)
        revpab_nightly: berthNights ? round(revenue / berthNights) : 0,
        occupancy_pct: berthNights ? round((bookedBerthNights / berthNights) * 100) : 0,
        cancellation_rate_pct: totalBookings.rows[0].n ? round((cancelled.rows[0].n / totalBookings.rows[0].n) * 100) : 0,
        pending_requests: ops.reduce((s, d) => s + d.requests, 0),
        open_departures: active.length,
        // TODO(Booking pace vs same period last year): requires a full prior season of data.
        booking_pace: { bookings_last_7d: null, same_period_last_year: null, note: 'Pace comparison requires one full prior season.' }
      },
      suggestions,
      enquiries: enquiries.rows
    };
  });
  res.json(data);
});

r.get('/bookings', async (req, res) => {
  const data = await withTenant(req.user, async (client) => {
    const { rows } = await client.query(`
      SELECT b.*, u.name AS traveller_name, u.email AS traveller_email,
             d.departure_date, d.return_date, r.name AS route_name, v.name AS vessel_name,
             p.provider_reference AS deposit_ref, p.amount AS deposit_amount, p.status AS deposit_status
      FROM berth_bookings b
      JOIN departures d ON d.id = b.departure_id
      JOIN routes r ON r.id = d.route_id
      JOIN vessels v ON v.id = d.vessel_id
      JOIN users u ON u.id = b.traveller_id
      LEFT JOIN payments p ON p.booking_id = b.id AND p.type = 'deposit'
      WHERE d.operator_id = $1
      ORDER BY (b.status = 'on_request') DESC, d.departure_date ASC`, [req.user.operator_id]);
    return rows;
  });
  res.json(data);
});

r.post('/bookings/:id/action', async (req, res) => {
  const { action } = req.body || {};
  if (!['confirm', 'decline'].includes(action)) return res.status(400).json({ error: 'action must be confirm or decline' });
  const result = await withTenant(req.user, async (client) => {
    const bk = (await client.query(`SELECT b.*, d.operator_id AS dep_operator, b.status AS current_status FROM berth_bookings b
      JOIN departures d ON d.id = b.departure_id WHERE b.id = $1`, [req.params.id])).rows[0];
    if (!bk) return { error: 'Booking not found', status: 404 };   // RLS hides other operators' bookings
    if (bk.current_status !== 'on_request' && bk.current_status !== 'pending') return { error: 'Booking is not actionable', status: 409 };
    if (action === 'confirm') {
      await client.query(`UPDATE berth_bookings SET status = 'confirmed' WHERE id = $1`, [bk.id]);
      await client.query(`SELECT recalc_departure_status($1)`, [bk.departure_id]);
    } else {
      await client.query(`UPDATE berth_bookings SET status = 'cancelled' WHERE id = $1`, [bk.id]);
      await client.query(`SELECT release_berths($1,$2)`, [bk.departure_id, bk.berth_count]);
      const pay = await client.query(`SELECT * FROM payments WHERE booking_id = $1 AND type = 'deposit' AND status = 'succeeded'`, [bk.id]);
      if (pay.rows.length) {
        const rf = await integrations.payments.refund({ providerReference: pay.rows[0].provider_reference, amount: pay.rows[0].amount });
        await client.query(`INSERT INTO payments (booking_id, amount, type, provider, provider_reference, status) VALUES ($1,$2,'refund',$3,$4,'succeeded')`,
          [bk.id, pay.rows[0].amount, rf.provider, rf.providerReference]);
      }
    }
    await audit(client, req.user, `booking.${action}`, 'booking', bk.id, { status: bk.current_status }, { status: action === 'confirm' ? 'confirmed' : 'cancelled' });
    return { ok: true, new_status: action === 'confirm' ? 'confirmed' : 'cancelled' };
  });
  if (result.error) return res.status(result.status).json(result);
  res.json(result);
});

r.post('/departures', async (req, res) => {
  const { vessel_id, route_id, departure_date, return_date, base_price_per_berth, whole_boat_price,
          booking_mode = 'by_berth', berths_total, minimum_viable_bookings = 4, instant_confirmation = false,
          trip_vibe = [], one_way = false, languages_spoken = ['el','en'] } = req.body || {};
  const result = await withTenant(req.user, async (client) => {
    const vessel = (await client.query(`SELECT * FROM vessels WHERE id = $1`, [vessel_id])).rows[0];  // RLS: own vessels only
    if (!vessel) return { error: 'Vessel not found in your fleet', status: 404 };
    const route = (await client.query(`SELECT id, name FROM routes WHERE id = $1`, [route_id])).rows[0];
    if (!route) return { error: 'Route not found', status: 404 };
    if (!departure_date || !return_date || new Date(return_date) <= new Date(departure_date)) {
      return { error: 'Valid departure and return dates required', status: 400 };
    }
    const berths = Number(berths_total || vessel.berths);
    if (berths > vessel.berths) return { error: `Vessel has ${vessel.berths} berths`, status: 400 };
    const { rows } = await client.query(
      `INSERT INTO departures (vessel_id, route_id, operator_id, departure_date, return_date,
        embarkation_port, disembarkation_port, one_way, booking_mode, base_price_per_berth, whole_boat_price,
        berths_total, berths_available, minimum_viable_bookings, status, instant_confirmation,
        trip_vibe, languages_spoken, cancellation_policy_id)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$12,$13,'open',$14,$15,$16,$17) RETURNING *`,
      [vessel_id, route_id, req.user.operator_id, departure_date, return_date,
       req.body?.embarkation_port || route.name.split(':')[0], req.body?.disembarkation_port || req.body?.embarkation_port || route.name.split(':')[0],
       !!one_way, booking_mode, base_price_per_berth, whole_boat_price || null, berths,
       Number(minimum_viable_bookings), !!instant_confirmation, JSON.stringify(trip_vibe),
       JSON.stringify(languages_spoken), req.body?.cancellation_policy_id || null]);
    await audit(client, req.user, 'departure.create', 'departure', rows[0].id, null, { status: 'open', vessel: vessel.name });
    return rows[0];
  });
  if (result.error) return res.status(result.status).json(result);
  res.status(201).json(result);
});

r.patch('/departures/:id', async (req, res) => {
  const result = await withTenant(req.user, async (client) => {
    const dep = (await client.query(`SELECT * FROM departures WHERE id = $1`, [req.params.id])).rows[0];
    if (!dep) return { error: 'Departure not found in your schedule', status: 404 };
    const fields = ['base_price_per_berth', 'whole_boat_price', 'instant_confirmation', 'minimum_viable_bookings', 'status', 'trip_vibe'];
    const sets = [], vals = [];
    for (const f of fields) if (req.body?.[f] !== undefined) { sets.push(`${f} = $${vals.length + 1}`); vals.push(req.body[f]); }
    if (!sets.length) return { error: 'Nothing to update', status: 400 };
    vals.push(req.params.id);
    const { rows } = await client.query(`UPDATE departures SET ${sets.join(', ')} WHERE id = $${vals.length} RETURNING *`, vals);
    await audit(client, req.user, 'departure.update', 'departure', req.params.id,
      { base_price_per_berth: dep.base_price_per_berth }, { base_price_per_berth: rows[0].base_price_per_berth });
    return rows[0];
  });
  if (result.error) return res.status(result.status).json(result);
  res.json(result);
});

// Apply a yield suggestion (Block B #5)
r.post('/departures/:id/apply-suggestion', async (req, res) => {
  const { pct } = req.body || {};
  const result = await withTenant(req.user, async (client) => {
    const dep = (await client.query(`SELECT * FROM departures WHERE id = $1`, [req.params.id])).rows[0];
    if (!dep) return { error: 'Departure not found', status: 404 };
    const newPrice = round(Number(dep.base_price_per_berth) * (1 - Number(pct) / 100));
    await client.query(`UPDATE departures SET base_price_per_berth = $1 WHERE id = $2`, [newPrice, req.params.id]);
    await audit(client, req.user, 'departure.price_suggestion_applied', 'departure', req.params.id,
      { price: Number(dep.base_price_per_berth) }, { price: newPrice, pct });
    return { ok: true, new_price: newPrice };
  });
  if (result.error) return res.status(result.status).json(result);
  res.json(result);
});

r.get('/payouts', async (req, res) => {
  const data = await withTenant(req.user, async (client) => {
    const { rows } = await client.query(`SELECT * FROM payouts WHERE operator_id = $1 ORDER BY period DESC`, [req.user.operator_id]);
    return rows;
  });
  res.json(data);
});

// Enquiries on the operator's departures
r.get('/enquiries', async (req, res) => {
  const data = await withTenant(req.user, async (client) => {
    const { rows } = await client.query(`
      SELECT t.id, t.departure_id, u.name AS traveller_name, r.name AS route_name, d.departure_date
      FROM enquiry_threads t
      JOIN departures d ON d.id = t.departure_id
      JOIN routes r ON r.id = d.route_id
      JOIN users u ON u.id = t.traveller_id
      WHERE d.operator_id = $1 ORDER BY t.created_at DESC`, [req.user.operator_id]);
    for (const t of rows) {
      const msgs = await client.query(
        `SELECT m.*, u.name AS sender_name FROM enquiry_messages m JOIN users u ON u.id = m.sender_id
         WHERE m.thread_id = $1 ORDER BY m.created_at ASC`, [t.id]);
      t.messages = msgs.rows;
    }
    return rows;
  });
  res.json(data);
});

r.post('/enquiries/:threadId/reply', async (req, res) => {
  const body = (req.body?.body || '').trim();
  if (!body) return res.status(400).json({ error: 'Reply body required' });
  const result = await withTenant(req.user, async (client) => {
    const th = (await client.query(
      `SELECT t.* FROM enquiry_threads t JOIN departures d ON d.id = t.departure_id
       WHERE t.id = $1 AND d.operator_id = $2`, [req.params.threadId, req.user.operator_id])).rows[0];
    if (!th) return { error: 'Thread not found', status: 404 };
    const { rows } = await client.query(
      `INSERT INTO enquiry_messages (thread_id, sender_id, body) VALUES ($1,$2,$3) RETURNING *`,
      [th.id, req.user.id, body]);
    return rows[0];
  });
  if (result.error) return res.status(result.status).json(result);
  res.status(201).json(result);
});

export default r;
