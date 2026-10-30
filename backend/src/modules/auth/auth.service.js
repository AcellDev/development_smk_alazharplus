import { randomBytes, createHash } from 'node:crypto';
import bcrypt from 'bcryptjs';
import { pool } from '../../database/pool.js';

const SESSION_DURATION_MS = 8 * 60 * 60 * 1000;

export async function verifyCredentials(email, password) {
  const result = await pool.query(
    `SELECT users.id, users.email, users.display_name, users.password_hash, roles.name AS role
     FROM users JOIN roles ON roles.id = users.role_id
     WHERE users.email = $1 AND users.is_active = true`,
    [email],
  );
  const user = result.rows[0];
  const valid = user
    ? await bcrypt.compare(password, user.password_hash)
    : await bcrypt.compare(password, '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy');
  if (!user || !valid) return null;

  const token = randomBytes(32).toString('hex');
  const tokenHash = hashToken(token);
  const expiresAt = new Date(Date.now() + SESSION_DURATION_MS);
  await pool.query('INSERT INTO auth_sessions (user_id, token_hash, expires_at) VALUES ($1, $2, $3)', [user.id, tokenHash, expiresAt]);

  return {
    token,
    expiresAt,
    user: { id: user.id, email: user.email, displayName: user.display_name, role: user.role },
  };
}

export async function findSession(token) {
  if (!token) return null;
  const result = await pool.query(
    `SELECT users.id, users.email, users.display_name, roles.name AS role
     FROM auth_sessions
     JOIN users ON users.id = auth_sessions.user_id
     JOIN roles ON roles.id = users.role_id
     WHERE auth_sessions.token_hash = $1 AND auth_sessions.expires_at > now() AND users.is_active = true`,
    [hashToken(token)],
  );
  const user = result.rows[0];
  return user ? { id: user.id, email: user.email, displayName: user.display_name, role: user.role } : null;
}

export async function revokeSession(token) {
  if (!token) return;
  await pool.query('DELETE FROM auth_sessions WHERE token_hash = $1', [hashToken(token)]);
}

export async function createSessionRecord(executor, userId) {
  const token = randomBytes(32).toString('hex');
  const tokenHash = hashToken(token);
  const expiresAt = new Date(Date.now() + SESSION_DURATION_MS);
  await executor.query('INSERT INTO auth_sessions (user_id, token_hash, expires_at) VALUES ($1, $2, $3)', [userId, tokenHash, expiresAt]);
  return { token, expiresAt };
}

function hashToken(token) {
  return createHash('sha256').update(token).digest('hex');
}
