import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { ownerPool } from './db.js';

export function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, salt, 32).toString('hex');
  return `${salt}:${hash}`;
}

async function run() {
  const client = await ownerPool.connect();
  try {
    const { rows } = await client.query('SELECT count(*)::int AS n FROM users');
    if (rows[0].n > 0) {
      console.log('[seed] data present — skipping');
      return;
    }
    const sql = fs.readFileSync(path.resolve('seed.sql'), 'utf8');
    await client.query(sql);
    await client.query(`UPDATE users SET password_hash = $1 WHERE password_hash = 'PLACEHOLDER'`, [
      hashPassword('sailgreek1')
    ]);
    console.log('[seed] demo data inserted (demo password for all accounts: sailgreek1)');
  } finally {
    client.release();
    await ownerPool.end();
  }
}

run().catch((err) => { console.error('[seed] FAILED:', err.message); process.exit(1); });
