import { Router } from 'express';
import { query } from '../db.js';
import { requireRole } from '../auth.js';

// Agent portal (Block B #10) — white-label portal, commission statements.
// TODO: per-agent branded subdomain + branded PDF quotes (Block B #10).
const r = Router();
r.use(requireRole('agent'));

r.get('/overview', async (req, res) => {
  const [bookings, statement] = await Promise.all([
    query(`
      SELECT b.id, b.total_price, b.status, b.created_at, u.name AS client_name, u.email AS client_email,
             r.name AS route_name, d.departure_date
      FROM berth_bookings b
      JOIN users u ON u.id = b.traveller_id
      JOIN departures d ON d.id = b.departure_id
      JOIN routes r ON r.id = d.route_id
      WHERE b.agent_id = $1 ORDER BY b.created_at DESC`, [req.user.id]),
    query(`
      SELECT to_char(b.created_at, 'YYYY-MM') AS period,
             count(*)::int AS bookings, COALESCE(SUM(b.total_price),0) AS gross,
             COALESCE(SUM(b.total_price) * $2 / 100, 0) AS commission
      FROM berth_bookings b WHERE b.agent_id = $1 GROUP BY 1 ORDER BY 1 DESC`, [req.user.id, req.user.agent_commission_rate || 8])
  ]);
  res.json({
    commission_rate: req.user.agent_commission_rate || 8,
    bookings: bookings.rows,
    commission_statement: statement.rows,
    // Client list (Block B #10)
    clients: [...new Map(bookings.rows.map((b) => [b.client_email, { name: b.client_name, email: b.client_email }])).values()]
  });
});

export default r;
