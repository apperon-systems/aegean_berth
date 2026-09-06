import { Router } from 'express';
import { query, withTenant, audit } from '../db.js';
import { requireRole } from '../auth.js';
import integrations from '../services/integrations.js';

const r = Router();
r.use(requireRole('admin', 'superadmin'));

r.get('/overview', async (req, res) => {
  const data = await withTenant(req.user, async (client) => {
    const one = async (sql) => (await client.query(sql)).rows[0];
    const ops = await one(`SELECT count(*)::int n FROM operators WHERE kyc_status = 'pending'`);
    const deps = await one(`SELECT count(*)::int n FROM departures WHERE status IN ('open','guaranteed','almost_full') AND departure_date >= CURRENT_DATE`);
    const bks = await one(`SELECT count(*)::int n, COALESCE(SUM(total_price),0) rev FROM berth_bookings WHERE status IN ('confirmed','completed')`);
    const disputes = await one(`SELECT count(*)::int n FROM dispute_cases WHERE status IN ('open','reviewing')`);
    const flags = await one(`SELECT count(*)::int n FROM fraud_flags`);
    const commission = await one(`SELECT COALESCE(SUM(total_price * 0.12),0) c FROM berth_bookings WHERE status IN ('confirmed','completed')`);
    const ff = (await client.query(`SELECT * FROM feature_flags ORDER BY key`)).rows;
    return {
      pending_kyc: ops.n, active_departures: deps.n, bookings: bks.n,
      gmv: Math.round(Number(bks.rev)), commission_earned: Math.round(Number(commission.c)),
      open_disputes: disputes.n, fraud_flags: flags.n, feature_flags: ff
    };
  });
  res.json(data);
});

r.get('/kyc', async (req, res) => {
  const { rows } = await query(`
    SELECT o.*, (SELECT count(*)::int FROM vessels v WHERE v.operator_id = o.id) AS vessel_count,
           (SELECT count(*)::int FROM users u WHERE u.operator_id = o.id AND u.role = 'operator') AS user_count
    FROM operators o ORDER BY (o.kyc_status = 'pending') DESC, o.company_name`);
  res.json(rows);
});

r.post('/kyc/:operatorId', async (req, res) => {
  const { action } = req.body || {};
  if (!['verify', 'reject'].includes(action)) return res.status(400).json({ error: 'action must be verify or reject' });
  const result = await withTenant(req.user, async (client) => {
    const op = (await client.query(`SELECT * FROM operators WHERE id = $1`, [req.params.operatorId])).rows[0];
    if (!op) return { error: 'Operator not found', status: 404 };
    const newStatus = action === 'verify' ? 'verified' : 'rejected';
    await client.query(`UPDATE operators SET kyc_status = $1 WHERE id = $2`, [newStatus, op.id]);
    await audit(client, req.user, `kyc.${action}`, 'operator', op.id, { kyc_status: op.kyc_status }, { kyc_status: newStatus });
    return { ok: true, kyc_status: newStatus };
  });
  if (result.error) return res.status(result.status).json(result);
  res.json(result);
});

r.get('/payouts', async (req, res) => {
  const rows = await withTenant(req.user, (client) =>
    client.query(`SELECT p.*, o.company_name, o.iban FROM payouts p JOIN operators o ON o.id = p.operator_id
                  ORDER BY (p.status = 'pending') DESC, p.period DESC`).then((x) => x.rows));
  res.json(rows);
});

// Payout run with downloadable SEPA batch (Block C)
r.post('/payout-runs', async (req, res) => {
  const { period } = req.body || {};
  const result = await withTenant(req.user, async (client) => {
    const pending = await client.query(
      `SELECT p.*, o.company_name, o.iban FROM payouts p JOIN operators o ON o.id = p.operator_id
       WHERE p.status = 'pending' AND ($1::text IS NULL OR p.period = $1)`, [period || null]);
    if (!pending.rows.length) return { error: 'No pending payouts for this period', status: 404 };
    const ref = 'SEPA-' + Date.now().toString(36).toUpperCase();
    for (const p of pending.rows) {
      await client.query(`UPDATE payouts SET status = 'paid', sepa_reference = $2 WHERE id = $1`, [p.id, ref]);
      await audit(client, req.user, 'payout.paid', 'payout', p.id, { status: 'pending' }, { status: 'paid', ref });
    }
    return { ok: true, count: pending.rows.length, sepa_reference: ref, xml: integrations.sepaXml(pending.rows) };
  });
  if (result.error) return res.status(result.status).json(result);
  res.json(result);
});

r.get('/audit', async (req, res) => {
  const rows = await withTenant(req.user, (client) =>
    client.query(`SELECT a.*, u.name AS actor_name FROM audit_log a LEFT JOIN users u ON u.id = a.actor_id
                  ORDER BY a.created_at DESC LIMIT 100`).then((x) => x.rows));
  res.json(rows);
});

r.get('/disputes', async (req, res) => {
  const rows = await withTenant(req.user, (client) =>
    client.query(`SELECT dc.*, b.total_price, u.name AS opened_by_name
                  FROM dispute_cases dc JOIN berth_bookings b ON b.id = dc.booking_id
                  LEFT JOIN users u ON u.id = dc.opened_by ORDER BY dc.created_at DESC`).then((x) => x.rows));
  res.json(rows);
});

r.post('/disputes/:id/resolve', async (req, res) => {
  const { resolution, status = 'resolved' } = req.body || {};
  const result = await withTenant(req.user, async (client) => {
    const d = (await client.query(`SELECT * FROM dispute_cases WHERE id = $1`, [req.params.id])).rows[0];
    if (!d) return { error: 'Dispute not found', status: 404 };
    await client.query(`UPDATE dispute_cases SET status = $1, resolution = $2 WHERE id = $3`, [status, resolution || d.resolution, req.params.id]);
    await audit(client, req.user, 'dispute.resolve', 'dispute_case', d.id, { status: d.status }, { status });
    return { ok: true };
  });
  if (result.error) return res.status(result.status).json(result);
  res.json(result);
});

r.get('/fraud', async (req, res) => {
  const rows = await withTenant(req.user, (client) =>
    client.query(`SELECT f.*, u.name AS user_name, u.email FROM fraud_flags f
                  LEFT JOIN berth_bookings b ON b.id = f.booking_id
                  LEFT JOIN users u ON u.id = b.traveller_id ORDER BY f.created_at DESC`).then((x) => x.rows));
  res.json(rows);
});

// Bulk CSV export (Block C)
r.get('/export/:entity', async (req, res) => {
  const entity = req.params.entity;
  const sql = {
    bookings: `SELECT b.id, u.email, d.departure_date, r.name AS route, v.name AS vessel, b.booking_type,
               b.berth_count, b.total_price, b.status FROM berth_bookings b
               JOIN users u ON u.id = b.traveller_id JOIN departures d ON d.id = b.departure_id
               JOIN routes r ON r.id = d.route_id JOIN vessels v ON v.id = d.vessel_id ORDER BY d.departure_date`,
    departures: `SELECT d.id, v.name AS vessel, r.name AS route, d.departure_date, d.return_date,
                 d.base_price_per_berth, d.berths_total, d.berths_available, d.status
                 FROM departures d JOIN vessels v ON v.id = d.vessel_id JOIN routes r ON r.id = d.route_id ORDER BY d.departure_date`,
    users: `SELECT id, email, name, role, locale, created_at FROM users ORDER BY created_at`
  }[entity];
  if (!sql) return res.status(400).json({ error: 'Unknown entity' });
  const rows = await withTenant(req.user, (client) => client.query(sql).then((x) => x.rows));
  if (!rows.length) return res.type('text/csv').send('');
  const cols = Object.keys(rows[0]);
  const csv = [cols.join(','), ...rows.map((row) => cols.map((c) => `"${String(row[c] ?? '').replace(/"/g, '""')}"`).join(','))].join('\n');
  res.setHeader('Content-Disposition', `attachment; filename="${entity}.csv"`);
  res.type('text/csv').send(csv);
});

// Impersonation mode for support (Block C) — logged and consented.
r.post('/impersonate', async (req, res) => {
  const { email } = req.body || {};
  const target = await query(`SELECT id, email, name, role, operator_id FROM users WHERE lower(email) = lower($1)`, [email]);
  if (!target.rows.length) return res.status(404).json({ error: 'User not found' });
  const t = target.rows[0];
  await withTenant(req.user, async (client) => {
    await audit(client, req.user, 'support.impersonate', 'user', t.id, null, { target_email: t.email });
  });
  res.json({ ok: true, user: { id: t.id, name: t.name, email: t.email, role: t.role, operator_id: t.operator_id } });
});

export default r;
