const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const supportedDocumentTypes = new Set(['application/pdf', 'image/jpeg', 'image/png', 'image/webp']);
const maxDocumentBytes = 10 * 1024 * 1024;

export class PpdbValidationError extends Error {
  constructor(message) { super(message); this.status = 400; this.code = 'VALIDATION_ERROR'; }
}

export function validateId(value, label = 'ID') {
  if (!uuidPattern.test(value)) throw new PpdbValidationError(`${label} tidak valid.`);
}

export function validateApplication(body = {}) {
  ensureObject(body);
  const details = validateApplicantDetails(body);
  const email = text(body.email, 'Email', 254, true)?.toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new PpdbValidationError('Format email tidak valid.');
  const password = body.password;
  if (typeof password !== 'string' || password.length < 8 || Buffer.byteLength(password, 'utf8') > 72) {
    throw new PpdbValidationError('Password wajib berisi 8–72 byte.');
  }
  return { ...details, email, password };
}

export function validateApplicantUpdate(body = {}) {
  ensureObject(body);
  return validateApplicantDetails(body);
}

export function validatePeriod(body = {}) {
  ensureObject(body);
  const name = text(body.name, 'Nama periode', 120, true);
  const startsAt = date(body.startsAt, 'Tanggal mulai');
  const endsAt = date(body.endsAt, 'Tanggal selesai');
  if (startsAt && endsAt && endsAt < startsAt) throw new PpdbValidationError('Tanggal selesai harus setelah tanggal mulai.');
  return {
    name, startsAt, endsAt,
    isOpen: body.isOpen === true || body.isOpen === 'true',
    isPublished: body.isPublished === true || body.isPublished === 'true',
  };
}

export function validateRequirement(body = {}) {
  ensureObject(body);
  validateId(String(body.periodId ?? ''), 'Periode');
  const allowedMimeTypes = body.allowedMimeTypes == null
    ? ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'] : body.allowedMimeTypes;
  if (!Array.isArray(allowedMimeTypes) || allowedMimeTypes.length < 1 || allowedMimeTypes.some((mime) => !supportedDocumentTypes.has(mime))) {
    throw new PpdbValidationError('Pilih satu atau lebih format dokumen yang didukung.');
  }
  const maxBytes = body.maxBytes == null || body.maxBytes === '' ? 5 * 1024 * 1024 : Number(body.maxBytes);
  const displayOrder = body.displayOrder == null || body.displayOrder === '' ? 0 : Number(body.displayOrder);
  if (!Number.isSafeInteger(maxBytes) || maxBytes < 1 || maxBytes > maxDocumentBytes) throw new PpdbValidationError('Batas ukuran dokumen harus 1 byte hingga 10 MB.');
  if (!Number.isInteger(displayOrder) || displayOrder < 0 || displayOrder > 10000) throw new PpdbValidationError('Urutan tampil harus berupa bilangan bulat 0–10000.');
  return {
    periodId: body.periodId,
    name: text(body.name, 'Nama persyaratan', 160, true),
    description: text(body.description, 'Deskripsi', 1000, false),
    isRequired: body.isRequired === true || body.isRequired === 'true',
    allowedMimeTypes: [...new Set(allowedMimeTypes)], maxBytes, displayOrder,
  };
}

export function validateSchedule(body = {}) {
  ensureObject(body);
  validateId(String(body.periodId ?? ''), 'Periode');
  const startsAt = date(body.startsAt, 'Waktu mulai');
  const endsAt = date(body.endsAt, 'Waktu selesai');
  if (startsAt && endsAt && endsAt < startsAt) throw new PpdbValidationError('Waktu selesai harus setelah waktu mulai.');
  const displayOrder = body.displayOrder == null || body.displayOrder === '' ? 0 : Number(body.displayOrder);
  if (!Number.isInteger(displayOrder) || displayOrder < 0 || displayOrder > 10000) throw new PpdbValidationError('Urutan tampil harus berupa bilangan bulat 0–10000.');
  return {
    periodId: body.periodId, title: text(body.title, 'Nama tahapan', 160, true),
    description: text(body.description, 'Deskripsi', 1000, false), startsAt, endsAt, displayOrder,
  };
}

export function validateAnnouncement(body = {}) {
  ensureObject(body);
  const periodId = body.periodId === '' || body.periodId == null ? null : String(body.periodId);
  if (periodId) validateId(periodId, 'Periode');
  return {
    periodId, title: text(body.title, 'Judul pengumuman', 160, true),
    body: text(body.body, 'Isi pengumuman', 10000, true),
    isPublished: body.isPublished === true || body.isPublished === 'true',
  };
}

export function validateStatusChange(body = {}) {
  ensureObject(body);
  const status = body.status;
  if (!['Perlu Perbaikan', 'Terverifikasi', 'Lulus', 'Tidak Lulus'].includes(status)) throw new PpdbValidationError('Status tujuan tidak valid.');
  const note = text(body.note, 'Catatan', 1000, status === 'Perlu Perbaikan');
  return { status, note };
}

function ensureObject(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) throw new PpdbValidationError('Isi permintaan harus berupa objek.');
}

function validateApplicantDetails(body) {
  const fullName = text(body.fullName, 'Nama lengkap', 160, true);
  const phone = text(body.phone, 'Telepon', 50, false);
  const address = text(body.address, 'Alamat', 1000, false);
  const guardianName = text(body.guardianName, 'Nama orang tua/wali', 160, false);
  const guardianPhone = text(body.guardianPhone, 'Telepon orang tua/wali', 50, false);
  const guardianRelationship = text(body.guardianRelationship, 'Hubungan dengan calon siswa', 60, false);
  if ((guardianPhone || guardianRelationship) && !guardianName) throw new PpdbValidationError('Isi nama orang tua/wali jika data wali lainnya diisi.');
  const previousInstitution = text(body.previousInstitution, 'Sekolah asal', 200, false);
  const previousGraduationYear = body.previousGraduationYear === '' || body.previousGraduationYear == null
    ? null : Number(body.previousGraduationYear);
  const currentYear = new Date().getFullYear();
  if (previousGraduationYear != null && (!Number.isInteger(previousGraduationYear) || previousGraduationYear < 1900 || previousGraduationYear > currentYear + 1)) {
    throw new PpdbValidationError('Tahun lulus sekolah asal tidak valid.');
  }
  if (previousGraduationYear != null && !previousInstitution) throw new PpdbValidationError('Isi sekolah asal jika tahun lulus diisi.');
  return { fullName, phone, address, guardianName, guardianPhone, guardianRelationship, previousInstitution, previousGraduationYear };
}

function text(value, label, maxLength, required) {
  if (typeof value !== 'string') {
    if (required) throw new PpdbValidationError(`${label} wajib diisi.`);
    return null;
  }
  const result = value.trim();
  if (required && !result) throw new PpdbValidationError(`${label} wajib diisi.`);
  if (result.length > maxLength) throw new PpdbValidationError(`${label} maksimal ${maxLength} karakter.`);
  return result || null;
}

function date(value, label) {
  if (value == null || value === '') return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) throw new PpdbValidationError(`${label} tidak valid.`);
  return parsed.toISOString();
}
