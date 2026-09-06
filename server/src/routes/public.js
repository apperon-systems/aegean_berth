import { Router } from 'express';
import { query } from '../db.js';
import { getUser } from '../auth.js';

const r = Router();

const STATUS_SEARCHABLE = `('open','guaranteed','almost_full')`;
const SELECT_DEPARTURE = `
  SELECT d.id, d.operator_id, d.departure_date, d.return_date, d.embarkation_port, d.disembarkation_port, d.one_way,
         d.booking_mode, d.base_price_per_berth, d.whole_boat_price, d.currency, d.berths_total,
         d.berths_available, d.minimum_viable_bookings, d.status, d.instant_confirmation, d.trip_vibe,
         d.skill_level_required, d.languages_spoken, d.minimum_age, d.pets_allowed, d.skipper_id,
         v.id AS vessel_id, v.name AS vessel_name, v.type AS vessel_type, v.length_m, v.air_conditioning,
         v.photos AS vessel_photos, v.cabins AS vessel_cabins, v.amenities,
         r.id AS route_id, r.name AS route_name, r.slug AS route_slug, r.region, r.hero_image,
         r.total_nm, r.difficulty, r.typical_nights,
         u.name AS skipper_name, u.id AS skipper_user_id,
         (SELECT round(avg(rv.rating_overall)::numeric, 1) FROM reviews rv WHERE rv.vessel_id = v.id AND rv.published) AS vessel_rating,
         (SELECT count(*) FROM reviews rv WHERE rv.vessel_id = v.id AND rv.published) AS review_count,
         (SELECT round(avg(rv.rating_skipper)::numeric, 1) FROM reviews rv WHERE rv.skipper_id = d.skipper_id AND rv.published) AS skipper_rating
  FROM departures d
  JOIN vessels v ON v.id = d.vessel_id
  JOIN routes r ON r.id = d.route_id
  LEFT JOIN users u ON u.id = d.skipper_id`;

// ---- Facets for the homepage search bar ----
r.get('/regions', async (req, res) => {
  const { rows } = await query(`
    SELECT region, count(DISTINCT r.id) AS route_count, count(d.id) AS departure_count,
           min(d.base_price_per_berth) AS from_price
    FROM routes r LEFT JOIN departures d ON d.route_id = r.id AND d.status IN ${STATUS_SEARCHABLE}
                  AND d.departure_date >= CURRENT_DATE
    GROUP BY region ORDER BY route_count DESC`);
  res.json(rows);
});

// ---- Core search: DEPARTURES, not boats ----
r.get('/search', async (req, res) => {
  const q = req.query;
  const where = [`d.status IN ${STATUS_SEARCHABLE}`, `d.departure_date >= CURRENT_DATE`];
  const params = [];
  const add = (sql, val) => { params.push(val); where.push(sql.replace('?', `$${params.length}`)); };

  if (q.where) {
    const term = `%${q.where}%`;
    params.push(term);
    where.push(`(r.name ILIKE $${params.length} OR r.region ILIKE $${params.length}
      OR d.embarkation_port ILIKE $${params.length}
      OR EXISTS (SELECT 1 FROM route_stops s WHERE s.route_id = r.id AND s.port_name ILIKE $${params.length}))`);
  }
  if (q.month) add(`date_trunc('month', d.departure_date) = make_date(?, ?, 1)`, [Number(q.month_year), Number(q.month)]);
  if (q.date_from) add(`d.departure_date >= ?::date`, q.date_from);
  if (q.date_to) add(`d.departure_date <= ?::date`, q.date_to);
  const people = Number(q.people || 1);
  if (q.how === 'whole_boat') where.push(`d.booking_mode IN ('whole_boat','mixed') AND d.whole_boat_price IS NOT NULL AND d.berths_available = d.berths_total`);
  if (q.how === 'cabin') where.push(`d.booking_mode IN ('by_cabin','mixed')`);
  if (q.how === 'berth') where.push(`d.booking_mode IN ('by_berth','by_cabin','mixed') AND d.berths_available >= 1`);
  if (people > 1 && q.how !== 'whole_boat') add(`d.berths_available >= ?`, people);

  if (q.region) add(`r.region = ?`, q.region);
  if (q.vessel_type) add(`v.type = ?`, q.vessel_type);
  if (q.min_price) add(`COALESCE(d.base_price_per_berth, d.whole_boat_price / NULLIF(d.berths_total,0)) >= ?`, Number(q.min_price));
  if (q.max_price) add(`COALESCE(d.base_price_per_berth, d.whole_boat_price / NULLIF(d.berths_total,0)) <= ?`, Number(q.max_price));
  if (q.vibe) add(`d.trip_vibe @> ?::jsonb`, JSON.stringify([q.vibe]));
  if (q.language) add(`d.languages_spoken @> ?::jsonb`, JSON.stringify([q.language]));
  if (q.skill) add(`d.skill_level_required = ?`, q.skill);
  if (q.instant === 'true') where.push(`d.instant_confirmation`);
  if (q.guaranteed === 'true') where.push(`d.status = 'guaranteed'`);
  if (q.one_way === 'true') where.push(`d.one_way`);
  if (q.pets === 'true') where.push(`d.pets_allowed`);
  if (q.ac === 'true') where.push(`v.air_conditioning`);
  if (q.ensuite === 'true') where.push(`EXISTS (SELECT 1 FROM cabins c WHERE c.vessel_id = v.id AND c.ensuite)`);
  if (q.port) add(`d.embarkation_port ILIKE ?`, `%${q.port}%`);

  const order = {
    price: `ORDER BY COALESCE(d.base_price_per_berth, d.whole_boat_price / NULLIF(d.berths_total,0)) ASC`,
    date: `ORDER BY d.departure_date ASC`,
    berths: `ORDER BY d.berths_available DESC`,
    rating: `ORDER BY vessel_rating DESC NULLS LAST`,
    best: `ORDER BY d.instant_confirmation DESC, (d.status = 'guaranteed') DESC, vessel_rating DESC NULLS LAST`
  }[q.sort] || `ORDER BY (d.status = 'guaranteed') DESC, d.instant_confirmation DESC, d.departure_date ASC`;

  const limit = Math.min(Number(q.limit || 24), 50);
  const offset = Number(q.offset || 0);
  const countSql = `SELECT count(*)::int AS total FROM departures d
    JOIN vessels v ON v.id = d.vessel_id JOIN routes r ON r.id = d.route_id
    WHERE ${where.join(' AND ')}`;
  const dataSql = `${SELECT_DEPARTURE} WHERE ${where.join(' AND ')} ${order} LIMIT ${limit} OFFSET ${offset}`;

  const [countRes, dataRes] = await Promise.all([query(countSql, params), query(dataSql, params)]);
  const routeIds = [...new Set(dataRes.rows.map((x) => x.route_id))];
  let stopsByRoute = {};
  if (routeIds.length) {
    const stops = await query(
      `SELECT route_id, id, day_number, port_name, lat, lng, swim_stop, has_ferry_access, has_airport_access
       FROM route_stops WHERE route_id = ANY($1::uuid[]) ORDER BY route_id, day_number`, [routeIds]);
    for (const s of stops.rows) (stopsByRoute[s.route_id] ||= []).push(s);
  }
  res.json({ total: countRes.rows[0].total, results: dataRes.rows, stops_by_route: stopsByRoute });
});

// ---- Departure detail ----
r.get('/departures/:id', async (req, res) => {
  const { id } = req.params;
  const user = getUser(req);
  const d = await query(`${SELECT_DEPARTURE} WHERE d.id = $1`, [id]);
  if (!d.rows.length) return res.status(404).json({ error: 'Departure not found' });
  const dep = d.rows[0];
  const [vessel, route, stops, cabins, skipper, operator, reviews, crew, extras, waitlisted] = await Promise.all([
    query(`SELECT * FROM vessels WHERE id = $1`, [dep.vessel_id]),
    query(`SELECT * FROM routes WHERE id = $1`, [dep.route_id]),
    query(`SELECT * FROM route_stops WHERE route_id = $1 ORDER BY day_number`, [dep.route_id]),
    query(`SELECT * FROM cabins WHERE vessel_id = $1 ORDER BY price_modifier_percent DESC`, [dep.vessel_id]),
    dep.skipper_id ? query(`SELECT id, name, locale FROM users WHERE id = $1`, [dep.skipper_id]) : null,
    query(`SELECT id, company_name, description, kyc_status, response_time_mins, acceptance_rate, logo_url FROM operators WHERE id = $1`,
      [dep.operator_id || (await query('SELECT operator_id FROM vessels WHERE id=$1', [dep.vessel_id])).rows[0].operator_id]),
    query(`SELECT rv.rating_overall, rv.rating_vessel, rv.rating_skipper, rv.rating_cleanliness, rv.rating_value,
                  rv.rating_itinerary, rv.written_review, rv.operator_response, rv.created_at, u.name AS traveller_name
           FROM reviews rv JOIN users u ON u.id = rv.traveller_id
           WHERE rv.vessel_id = $1 AND rv.published ORDER BY rv.created_at DESC LIMIT 10`, [dep.vessel_id]),
    query(`SELECT b.id, b.share_profile, b.cabin_share_preference
           FROM berth_bookings b WHERE b.departure_id = $1 AND b.share_profile IS NOT NULL
             AND b.status IN ('confirmed','on_request')`, [id]),
    query(`SELECT * FROM extras WHERE operator_id = $1 ORDER BY mandatory DESC, name`, [dep.operator_id]),
    user ? query(`SELECT 1 FROM waitlist_entries WHERE departure_id = $1 AND user_id = $2`, [id, user.id]) : null
  ]);
  const confirmedBerths = await query(
    `SELECT COALESCE(SUM(berth_count),0)::int AS n FROM berth_bookings WHERE departure_id = $1 AND status = 'confirmed'`, [id]);
  const cancellation = dep.cancellation_policy_id
    ? await query(`SELECT name, description, tiers FROM cancellation_policies WHERE id = $1`, [dep.cancellation_policy_id]) : null;
  res.json({
    departure: dep,
    vessel: vessel.rows[0],
    route: route.rows[0],
    stops: stops.rows,
    cabins: cabins.rows,
    skipper: skipper?.rows[0] || null,
    operator: operator.rows[0] || null,
    reviews: reviews.rows,
    crew_manifest_anonymised: crew.rows,
    extras: extras.rows,
    confirmed_berths: confirmedBerths.rows[0].n,
    berths_to_guarantee: Math.max(0, dep.minimum_viable_bookings - confirmedBerths.rows[0].n),
    cancellation_policy: cancellation?.rows[0] || null,
    waitlisted: !!(waitlisted && waitlisted.rows.length)
  });
});

// ---- Quote preview (booking widget) ----
r.post('/departures/:id/quote', async (req, res) => {
  const { id } = req.params;
  const { booking_type, berth_count, share_cabin, cabin_id, join_stop_id, leave_stop_id } = req.body || {};
  const dep = await query(`SELECT * FROM departures WHERE id = $1 AND status IN ('open','guaranteed','almost_full')`, [id]);
  if (!dep.rows.length) return res.status(404).json({ error: 'Departure not available' });
  const departure = dep.rows[0];
  const rules = await query(`SELECT * FROM pricing_rules WHERE operator_id = $1 ORDER BY priority DESC`, [departure.operator_id]);
  let cabinModifier = 0, joinDay = null, leaveDay = null;
  if (cabin_id) {
    const cabin = await query(`SELECT price_modifier_percent FROM cabins WHERE id = $1 AND vessel_id = $2`, [cabin_id, departure.vessel_id]);
    if (cabin.rows.length) cabinModifier = Number(cabin.rows[0].price_modifier_percent);
  }
  if (join_stop_id || leave_stop_id) {
    const stops = await query(
      `SELECT id, day_number FROM route_stops WHERE route_id = $1 AND id = ANY($2::uuid[])`,
      [departure.route_id, [join_stop_id, leave_stop_id].filter(Boolean)]);
    const byId = Object.fromEntries(stops.rows.map((s) => [s.id, s.day_number]));
    if (join_stop_id) joinDay = byId[join_stop_id];
    if (leave_stop_id) leaveDay = byId[leave_stop_id];
  }
  // Imported lazily to avoid circular imports; pricing is pure computation.
  const { computeQuote } = await import('../services/pricing.js');
  const quote = computeQuote(departure, rules.rows, {
    bookingType: booking_type || 'berth', berthCount: Number(berth_count || 1),
    shareCabin: !!share_cabin, cabinModifierPct: cabinModifier, joinDay, leaveDay
  });
  res.json({ quote, rules_applied: quote.breakdown.adjustments });
});

// ---- Routes (SEO landing pages) ----
r.get('/routes', async (req, res) => {
  const { rows } = await query(`
    SELECT r.*, (SELECT count(*)::int FROM departures d WHERE d.route_id = r.id
      AND d.status IN ${STATUS_SEARCHABLE} AND d.departure_date >= CURRENT_DATE) AS departure_count,
      (SELECT min(base_price_per_berth) FROM departures d WHERE d.route_id = r.id
      AND d.status IN ${STATUS_SEARCHABLE} AND d.departure_date >= CURRENT_DATE) AS from_price
    FROM routes r ORDER BY departure_count DESC`);
  res.json(rows);
});

r.get('/routes/:slug', async (req, res) => {
  const route = await query(`SELECT * FROM routes WHERE slug = $1`, [req.params.slug]);
  if (!route.rows.length) return res.status(404).json({ error: 'Route not found' });
  const rt = route.rows[0];
  const [stops, departures] = await Promise.all([
    query(`SELECT * FROM route_stops WHERE route_id = $1 ORDER BY day_number`, [rt.id]),
    query(`${SELECT_DEPARTURE} WHERE d.route_id = $1 AND d.status IN ${STATUS_SEARCHABLE}
           AND d.departure_date >= CURRENT_DATE ORDER BY d.departure_date ASC LIMIT 12`, [rt.id])
  ]);
  res.json({ route: rt, stops: stops.rows, departures: departures.rows });
});

export default r;
