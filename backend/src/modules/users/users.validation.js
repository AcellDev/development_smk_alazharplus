export const USER_ROLES = ['admin_website', 'admin_ppdb', 'guru', 'siswa'];
const DB_ROLE = { admin_website: 'admin_website', admin_ppdb: 'admin_ppdb', guru: 'teacher', siswa: 'student' };
const API_ROLE = { admin_website: 'admin_website', admin_ppdb: 'admin_ppdb', teacher: 'guru', student: 'siswa', applicant: 'calon_siswa' };

export class UserValidationError extends Error {
  constructor(message, status = 400) { super(message); this.status = status; this.code = 'VALIDATION_ERROR'; }
}

export function toDatabaseRole(role) { return DB_ROLE[role] ?? null; }
export function toApiRole(role) { return API_ROLE[role] ?? role; }

export function validateUserId(id) {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)) throw new UserValidationError('ID pengguna tidak valid.');
}

export function validateUser(input = {}, { partial = false } = {}) {
  const displayName = input.displayName ?? input.name;
  const email = input.email;
  const role = input.role;
  const password = input.password;
  if (!partial || displayName !== undefined) {
    if (typeof displayName !== 'string' || !displayName.trim() || displayName.trim().length > 160) throw new UserValidationError('Nama wajib diisi dan maksimal 160 karakter.');
  }
  if (!partial || email !== undefined) {
    if (typeof email !== 'string' || email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) throw new UserValidationError('Alamat email tidak valid.');
  }
  if (!partial || role !== undefined) {
    if (typeof role !== 'string' || !USER_ROLES.includes(role)) throw new UserValidationError('Role akun tidak valid.');
  }
  if (!partial || password !== undefined) {
    if (typeof password !== 'string' || password.length < 8 || Buffer.byteLength(password, 'utf8') > 72) throw new UserValidationError('Password wajib diisi dan harus terdiri dari 8–72 byte.');
  }
  return {
    displayName: displayName?.trim(),
    email: email?.trim().toLowerCase(),
    role: toDatabaseRole(role),
    password,
  };
}

export function validateRoleFilter(role) {
  if (role == null || role === '') return null;
  if (!USER_ROLES.includes(role) && role !== 'calon_siswa') throw new UserValidationError('Filter role tidak valid.');
  return role === 'calon_siswa' ? 'applicant' : toDatabaseRole(role);
}
