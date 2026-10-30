const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export class LmsValidationError extends Error {
  constructor(message) { super(message); this.status = 400; this.code = 'VALIDATION_ERROR'; }
}

export function validateId(value, label = 'ID') {
  if (!uuidPattern.test(value)) throw new LmsValidationError(`${label} tidak valid.`);
}

export function validateClass(body = {}, allowActive = false) {
  ensureObject(body);
  const name = text(body.name, 'Nama kelas', 120, true);
  const academicYear = text(body.academicYear, 'Tahun ajaran', 30, true);
  const description = text(body.description, 'Deskripsi', 1000, false);
  if (allowActive && ![true, false, 'true', 'false'].includes(body.isActive)) throw new LmsValidationError('Status kelas tidak valid.');
  return { name, academicYear, description, isActive: allowActive ? body.isActive === true || body.isActive === 'true' : true };
}

export function validateSubject(body = {}) {
  ensureObject(body);
  return { name: text(body.name, 'Nama mata pelajaran', 120, true) };
}

export function validateMembership(body = {}) {
  ensureObject(body);
  validateId(String(body.userId ?? ''), 'Pengguna');
  if (!['teacher', 'student'].includes(body.role)) throw new LmsValidationError('Role keanggotaan harus guru atau siswa.');
  return { userId: body.userId, role: body.role };
}

export function validateClassSubject(body = {}) {
  ensureObject(body);
  validateId(String(body.subjectId ?? ''), 'Mata pelajaran');
  return { subjectId: body.subjectId };
}

export function validateMaterial(body = {}, hasFile = false) {
  ensureObject(body);
  const title = text(body.title, 'Judul materi', 180, true);
  const content = text(body.body, 'Isi materi', 30000, false);
  const subjectId = optionalId(body.subjectId, 'Mata pelajaran');
  if (!content && !hasFile) throw new LmsValidationError('Isi materi atau file lampiran wajib diisi.');
  return { title, body: content, subjectId };
}

export function validateAssignment(body = {}) {
  ensureObject(body);
  const title = text(body.title, 'Judul tugas', 180, true);
  const description = text(body.description, 'Deskripsi tugas', 30000, true);
  const dueAt = parseDate(body.dueAt, 'Tenggat tugas', true);
  const subjectId = optionalId(body.subjectId, 'Mata pelajaran');
  return {
    title, description, dueAt, subjectId,
    allowResubmission: body.allowResubmission === true || body.allowResubmission === 'true',
  };
}

export function validateSubmission(body = {}, hasFile = false) {
  ensureObject(body);
  const content = text(body.content, 'Jawaban', 20000, false);
  if (!content && !hasFile) throw new LmsValidationError('Tulis jawaban atau unggah file sebelum mengumpulkan.');
  return { content };
}

export function validateGrade(body = {}) {
  ensureObject(body);
  let score = null;
  if (body.score != null && String(body.score).trim() !== '') {
    score = Number(body.score);
    if (!Number.isFinite(score) || score < 0 || score > 100) throw new LmsValidationError('Nilai harus berada pada rentang 0 sampai 100.');
    score = Math.round(score * 100) / 100;
  }
  const feedback = text(body.feedback, 'Umpan balik', 5000, false);
  if (score == null && !feedback) throw new LmsValidationError('Isi nilai atau umpan balik.');
  return { score, feedback, isPublished: body.isPublished === true || body.isPublished === 'true' };
}

function ensureObject(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) throw new LmsValidationError('Isi permintaan harus berupa objek.');
}

function text(value, label, maxLength, required) {
  if (typeof value !== 'string') {
    if (required) throw new LmsValidationError(`${label} wajib diisi.`);
    return null;
  }
  const clean = value.trim();
  if (required && !clean) throw new LmsValidationError(`${label} wajib diisi.`);
  if (clean.length > maxLength) throw new LmsValidationError(`${label} maksimal ${maxLength} karakter.`);
  return clean || null;
}

function optionalId(value, label) {
  if (value == null || value === '') return null;
  validateId(String(value), label);
  return value;
}

function parseDate(value, label, required) {
  if (value == null || value === '') {
    if (required) throw new LmsValidationError(`${label} wajib diisi.`);
    return null;
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) throw new LmsValidationError(`${label} tidak valid.`);
  return date.toISOString();
}
