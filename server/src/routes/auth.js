import { Router } from 'express';
import { query } from '../db.js';
import { hashPassword, verifyPassword, signSession, sessionCookie, requireAuth } from '../auth.js';

const r = Router();

r.post('/login', async (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) return res.status(400).json({ error: 'Email and password required' });
  const { rows } = await query('SELECT * FROM users WHERE lower(email) = lower($1)', [email]);
  const user = rows[0];
  if (!user || !verifyPassword(password, user.password_hash)) {
    return res.status(401).json({ error: 'Invalid email or password' });
  }
  res.setHeader('Set-Cookie', sessionCookie(signSession(user)));
  res.json({ id: user.id, email: user.email, name: user.name, role: user.role, operator_id: user.operator_id, locale: user.locale });
});

r.post('/register', async (req, res) => {
  const { email, password, name, locale } = req.body || {};
  if (!email || !password || !name) return res.status(400).json({ error: 'Name, email and password required' });
  if (password.length < 8) return res.status(400).json({ error: 'Password must be at least 8 characters' });
  try {
    const { rows } = await query(
      `INSERT INTO users (email, password_hash, name, role, locale) VALUES (lower($1),$2,$3,'traveller',$4) RETURNING *`,
      [email, hashPassword(password), name, locale || 'en']
    );
    const user = rows[0];
    res.setHeader('Set-Cookie', sessionCookie(signSession(user)));
    res.status(201).json({ id: user.id, email: user.email, name: user.name, role: user.role, locale: user.locale });
  } catch (e) {
    if (String(e.message).includes('duplicate key')) return res.status(409).json({ error: 'An account with this email already exists' });
    throw e;
  }
});

r.post('/logout', (req, res) => {
  res.setHeader('Set-Cookie', sessionCookie('', true));
  res.json({ ok: true });
});

r.get('/me', requireAuth, async (req, res) => {
  const { rows } = await query(
    `SELECT u.id, u.email, u.name, u.role, u.locale, u.operator_id, u.agent_commission_rate, o.company_name AS operator_name
     FROM users u LEFT JOIN operators o ON o.id = u.operator_id WHERE u.id = $1`, [req.user.id]);
  res.json(rows[0] || null);
});

export default r;
