import pg from 'pg';

const parse = (url) => new pg.Pool({ connectionString: url, max: 10 });

// Owner pool: migrations/seeding only (bypasses RLS as table owner).
export const ownerPool = parse(process.env.DATABASE_OWNER_URL || process.env.DATABASE_URL);

// App pool: connects as role `app_api` (member of app_user) so RLS policies apply.
export const appPool = parse(process.env.DATABASE_URL);

export function query(text, params) {
  return appPool.query(text, params);
}

/**
 * Run `fn(client)` inside a transaction with the request's identity installed
 * as transaction-local GUCs consumed by the RLS policies (app.user_id / app.role / app.operator_id).
 */
export async function withTenant(user, fn) {
  const client = await appPool.connect();
  try {
    await client.query('BEGIN');
    await client.query(
      `SELECT set_config('app.user_id', $1, true),
              set_config('app.role', $2, true),
              set_config('app.operator_id', $3, true)`,
      [user?.id ?? '', user?.role ?? '', user?.operator_id ?? '']
    );
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    throw err;
  } finally {
    client.release();
  }
}

/** Immutable audit trail for every state-changing action. */
export async function audit(client, actor, action, entity, entityId, before, after) {
  await client.query(
    `INSERT INTO audit_log (actor_id, actor_role, action, entity, entity_id, before, after)
     VALUES ($1,$2,$3,$4,$5,$6,$7)`,
    [actor?.id ?? null, actor?.role ?? 'system', action, entity, entityId ?? null, before ?? null, after ?? null]
  );
}
