import { Router } from 'express';
import { query, withTenant, audit } from '../db.js';
import { requireAuth } from '../auth.js';
import integrations from '../services/integrations.js';

const r = Router();

const PROPOSAL_SELECT = `
  SELECT p.*, r.name AS route_name, r.slug AS route_slug, r.region, r.hero_image, r.difficulty, r.typical_nights,
         u.name AS proposer_name,
         (SELECT count(*) FROM proposal_joins j WHERE j.proposal_id = p.id)::int AS joins_count,
         (SELECT min(b.price_per_berth) FROM operator_bids b WHERE b.proposal_id = p.id) AS best_bid,
         (SELECT count(*) FROM operator_bids b WHERE b.proposal_id = p.id)::int AS bid_count
  FROM proposed_departures p
  JOIN routes r ON r.id = p.route_id
  JOIN users u ON u.id = p.proposer_id`;

r.get('/', async (req, res) => {
  const { rows } = await query(`${PROPOSAL_SELECT} WHERE p.status IN ('open','bidding') ORDER BY p.status = 'bidding' DESC, p.expires_at ASC`);
  res.json(rows);
});

r.get('/:id', async (req, res) => {
  const p = await query(`${PROPOSAL_SELECT} WHERE p.id = $1`, [req.params.id]);
  if (!p.rows.length) return res.status(404).json({ error: 'Proposal not found' });
  const [joins, bids] = await Promise.all([
    query(`SELECT j.berths, j.created_at, u.name FROM proposal_joins j JOIN users u ON u.id = j.user_id WHERE j.proposal_id = $1 ORDER BY j.created_at`, [req.params.id]),
    query(`SELECT b.id, b.price_per_berth, b.message, b.created_at, o.company_name, v.name AS vessel_name, v.type AS vessel_type, v.photos
           FROM operator_bids b JOIN operators o ON o.id = b.operator_id LEFT JOIN vessels v ON v.id = b.vessel_id
           WHERE b.proposal_id = $1 ORDER BY b.price_per_berth ASC`, [req.params.id])
  ]);
  res.json({ ...p.rows[0], joins: joins.rows, bids: bids.rows });
});

r.post('/', requireAuth, async (req, res) => {
  const { route_id, proposed_start, proposed_end, vessel_class = 'any', berths_needed = 1, notes } = req.body || {};
  if (!route_id || !proposed_start || !proposed_end) return res.status(400).json({ error: 'route_id and dates required' });
  const result = await withTenant(req.user, async (client) => {
    const route = await client.query(`SELECT id FROM routes WHERE id = $1`, [route_id]);
    if (!route.rows.length) return { error: 'Route not found', status: 404 };
    const target = Math.max(Number(berths_needed) + 3, 6);
    const { rows } = await client.query(
      `INSERT INTO proposed_departures (proposer_id, route_id, proposed_start, proposed_end, vessel_class,
        berths_needed, berths_committed, berths_target, status, expires_at, notes)
       VALUES ($1,$2,$3,$4,$5,$6,$6,$7,'open', now() + interval '14 days', $8) RETURNING *`,
      [req.user.id, route_id, proposed_start, proposed_end, vessel_class, Number(berths_needed), target, notes || null]);
    await audit(client, req.user, 'proposal.create', 'proposed_departure', rows[0].id, null, { berths_target: target });
    return rows[0];
  });
  if (result.error) return res.status(result.status).json(result);
  res.status(201).json(result);
});

r.post('/:id/join', requireAuth, async (req, res) => {
  const berths = Number(req.body?.berths || 1);
  const result = await withTenant(req.user, async (client) => {
    const p = (await client.query(`SELECT * FROM proposed_departures WHERE id = $1 FOR UPDATE`, [req.params.id])).rows[0];
    if (!p) return { error: 'Proposal not found', status: 404 };
    if (!['open', 'bidding'].includes(p.status)) return { error: 'Proposal is not open for joins', status: 409 };
    const existing = await client.query(`SELECT id FROM proposal_joins WHERE proposal_id = $1 AND user_id = $2`, [req.params.id, req.user.id]);
    if (existing.rows.length) return { error: 'You have already joined this proposal', status: 409 };
    if (p.proposer_id === req.user.id) return { error: 'You started this proposal', status: 400 };
    await client.query(`INSERT INTO proposal_joins (proposal_id, user_id, berths) VALUES ($1,$2,$3)`, [req.params.id, req.user.id, berths]);
    const committed = p.berths_committed + berths;
    let status = p.status;
    if (p.status === 'open' && committed >= p.berths_target) {
      status = 'bidding';
      // Notify matching operators (Block B #1). TODO: real operator-matching by route/vessel class.
      const ops = await client.query(`SELECT u.email, u.name FROM users u WHERE u.role = 'operator'`);
      for (const o of ops.rows) await integrations.comms.sendEmail(o.email, 'proposal_reached_minimum', { route: p.route_id, berths: committed });
    }
    await client.query(`UPDATE proposed_departures SET berths_committed = $2, status = $3 WHERE id = $1`, [req.params.id, committed, status]);
    await audit(client, req.user, 'proposal.join', 'proposed_departure', req.params.id, { berths_committed: p.berths_committed }, { berths_committed: committed });
    return { ok: true, berths_committed: committed, status };
  });
  if (result.error) return res.status(result.status).json(result);
  res.json(result);
});

r.post('/:id/bids', requireAuth, async (req, res) => {
  if (req.user.role !== 'operator') return res.status(403).json({ error: 'Operators only' });
  const { vessel_id, price_per_berth, message } = req.body || {};
  if (!price_per_berth || price_per_berth <= 0) return res.status(400).json({ error: 'price_per_berth required' });
  const result = await withTenant(req.user, async (client) => {
    const p = (await client.query(`SELECT * FROM proposed_departures WHERE id = $1`, [req.params.id])).rows[0];
    if (!p) return { error: 'Proposal not found', status: 404 };
    if (p.status !== 'bidding') return { error: 'Proposal is not open for bids yet', status: 409 };
    // RLS guarantees the vessel belongs to this operator.
    const v = vessel_id ? await client.query(`SELECT id, name FROM vessels WHERE id = $1`, [vessel_id]) : null;
    const { rows } = await client.query(
      `INSERT INTO operator_bids (proposal_id, operator_id, vessel_id, price_per_berth, message) VALUES ($1,$2,$3,$4,$5) RETURNING *`,
      [req.params.id, req.user.operator_id, v?.rows[0]?.id || null, price_per_berth, message || null]);
    await audit(client, req.user, 'proposal.bid', 'operator_bid', rows[0].id);
    return rows[0];
  });
  if (result.error) return res.status(result.status).json(result);
  res.status(201).json(result);
});

r.post('/:id/accept', requireAuth, async (req, res) => {
  const { bid_id } = req.body || {};
  const result = await withTenant(req.user, async (client) => {
    const p = (await client.query(`SELECT * FROM proposed_departures WHERE id = $1 FOR UPDATE`, [req.params.id])).rows[0];
    if (!p) return { error: 'Proposal not found', status: 404 };
    if (p.proposer_id !== req.user.id) return { error: 'Only the proposer can accept a bid', status: 403 };
    if (p.status !== 'bidding') return { error: 'Not in bidding phase', status: 409 };
    await client.query(`UPDATE proposed_departures SET winning_bid = $2, status = 'scheduled' WHERE id = $1`, [req.params.id, bid_id]);
    await audit(client, req.user, 'proposal.accept_bid', 'proposed_departure', req.params.id, { status: 'bidding' }, { status: 'scheduled' });
    return { ok: true, status: 'scheduled' };
  });
  if (result.error) return res.status(result.status).json(result);
  res.json(result);
});

export default r;
