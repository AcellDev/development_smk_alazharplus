import bcrypt from 'bcryptjs';
import { pool } from '../../database/pool.js';

const USER_SELECT = `SELECT u.id, u.display_name AS "displayName", u.email, r.name AS "databaseRole",
  u.is_active AS "isActive", u.created_at AS "createdAt"
  FROM users u JOIN roles r ON r.id=u.role_id`;

export async function listUsers(role) {
  const values = role ? [role] : [];
  const where = role ? 'WHERE r.name=$1' : '';
  const result = await pool.query(`${USER_SELECT} ${where} ORDER BY u.is_active DESC, r.name, u.display_name`, values);
  return result.rows;
}

export async function createUser(user) {
  const hash = await bcrypt.hash(user.password, 12);
  const result = await pool.query(
    `INSERT INTO users (role_id,email,password_hash,display_name)
     VALUES ((SELECT id FROM roles WHERE name=$1),$2,$3,$4)
     RETURNING id, display_name AS "displayName", email, is_active AS "isActive", created_at AS "createdAt"`,
    [user.role,user.email,hash,user.displayName],
  );
  return { ...result.rows[0], databaseRole: user.role };
}

export async function updateUser(id, user, actorId) {
  const currentResult = await pool.query(`${USER_SELECT} WHERE u.id=$1`, [id]);
  const current = currentResult.rows[0];
  if (!current) return { notFound: true };
  if (id === actorId && user.role && user.role !== current.databaseRole) return { selfRoleChange: true };
  const next = {
    displayName: user.displayName ?? current.displayName,
    email: user.email ?? current.email,
    role: user.role ?? current.databaseRole,
  };
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await client.query(
      `UPDATE users SET display_name=$1,email=$2,role_id=(SELECT id FROM roles WHERE name=$3),
       password_hash=COALESCE($4,password_hash),updated_at=now()
       WHERE id=$5 RETURNING id,display_name AS "displayName",email,is_active AS "isActive",created_at AS "createdAt"`,
      [next.displayName,next.email,next.role,user.password ? await bcrypt.hash(user.password,12) : null,id],
    );
    if (user.password) await client.query('DELETE FROM auth_sessions WHERE user_id=$1', [id]);
    await client.query('COMMIT');
    return { ...result.rows[0], databaseRole: next.role };
  } catch (error) { await client.query('ROLLBACK'); throw error; }
  finally { client.release(); }
}

export async function deactivateUser(id, actorId) {
  if (id === actorId) return { selfDelete: true };
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await client.query('UPDATE users SET is_active=false,updated_at=now() WHERE id=$1 AND is_active=true RETURNING id', [id]);
    if (!result.rowCount) { await client.query('ROLLBACK'); return false; }
    await client.query('DELETE FROM auth_sessions WHERE user_id=$1', [id]);
    await client.query('COMMIT');
    return true;
  } catch (error) { await client.query('ROLLBACK'); throw error; }
  finally { client.release(); }
}
