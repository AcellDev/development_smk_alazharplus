import { Router } from 'express';
import multer from 'multer';
import { fileTypeFromBuffer } from 'file-type';
import { requireAuthentication, requireRoles } from '../auth/auth.middleware.js';
import { readPrivateFile, removePrivateFile, writePrivateFile } from '../../shared/storage/private-files.js';
import {
  addClassMember, addClassSubject, createAssignment, createClass, createMaterial, createSubject,
  getAdminClasses, getAdminUsers, getLmsFile, getStudentClass, getStudentClasses, getSubjects,
  getTeacherClass, getTeacherClasses, getTeacherSubmissions, removeClassMember, removeClassSubject, saveGrade,
  submitAssignment, updateAssignment, updateClass, updateMaterial,
} from './lms.model.js';
import {
  LmsValidationError, validateAssignment, validateClass, validateClassSubject, validateGrade,
  validateId, validateMaterial, validateMembership, validateSubject, validateSubmission,
} from './lms.validation.js';

export const lmsRouter = Router();
const adminOnly = [requireAuthentication, requireRoles('admin_website')];
const teacherOnly = [requireAuthentication, requireRoles('teacher')];
const studentOnly = [requireAuthentication, requireRoles('student')];
const memberOnly = [requireAuthentication, requireRoles('teacher', 'student')];
const configuredMax = Number(process.env.PRIVATE_UPLOAD_MAX_BYTES ?? 10 * 1024 * 1024);
const maxFileSize = Number.isSafeInteger(configuredMax) && configuredMax > 0 ? Math.min(configuredMax, 10 * 1024 * 1024) : 10 * 1024 * 1024;
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: maxFileSize, files: 1, fields: 5, fieldSize: 32000 } });
const acceptedMimeTypes = new Set(['application/pdf', 'image/jpeg', 'image/png', 'image/webp']);

// School administrators provision classes, subject associations, and memberships.
lmsRouter.get('/admin/users', ...adminOnly, async (request, response, next) => {
  try {
    const role = String(request.query.role ?? '');
    if (!['teacher', 'student'].includes(role)) throw new LmsValidationError('Role pengguna harus guru atau siswa.');
    response.json(await getAdminUsers(role));
  } catch (error) { next(error); }
});

lmsRouter.get('/admin/subjects', ...adminOnly, async (_request, response, next) => {
  try { response.json(await getSubjects()); } catch (error) { next(error); }
});

lmsRouter.post('/admin/subjects', ...adminOnly, async (request, response, next) => {
  try { response.status(201).json(await createSubject(validateSubject(request.body).name)); }
  catch (error) { next(error); }
});

lmsRouter.get('/admin/classes', ...adminOnly, async (_request, response, next) => {
  try { response.json(await getAdminClasses()); } catch (error) { next(error); }
});

lmsRouter.post('/admin/classes', ...adminOnly, async (request, response, next) => {
  try { response.status(201).json(await createClass(validateClass(request.body), request.user.id)); }
  catch (error) { next(error); }
});

lmsRouter.put('/admin/classes/:id', ...adminOnly, async (request, response, next) => {
  try {
    validateId(request.params.id, 'Kelas');
    const item = validateClass(request.body, true);
    const updated = await updateClass(request.params.id, item);
    if (!updated) return response.status(404).json({ error: { code: 'CLASS_NOT_FOUND', message: 'Kelas tidak ditemukan.' } });
    response.json(updated);
  } catch (error) { next(error); }
});

lmsRouter.post('/admin/classes/:id/members', ...adminOnly, async (request, response, next) => {
  try {
    validateId(request.params.id, 'Kelas');
    const member = validateMembership(request.body);
    const added = await addClassMember(request.params.id, member.userId, member.role);
    if (!added) return response.status(400).json({ error: { code: 'MEMBER_ROLE_MISMATCH', message: 'Pengguna tidak ditemukan, kelas tidak aktif, atau role akun tidak cocok.' } });
    response.status(201).json(added);
  } catch (error) { next(error); }
});

lmsRouter.delete('/admin/classes/:id/members/:userId', ...adminOnly, async (request, response, next) => {
  try {
    validateId(request.params.id, 'Kelas'); validateId(request.params.userId, 'Pengguna');
    if (!await removeClassMember(request.params.id, request.params.userId)) return response.status(404).json({ error: { code: 'MEMBER_NOT_FOUND', message: 'Keanggotaan tidak ditemukan.' } });
    response.status(204).end();
  } catch (error) { next(error); }
});

lmsRouter.post('/admin/classes/:id/subjects', ...adminOnly, async (request, response, next) => {
  try {
    validateId(request.params.id, 'Kelas');
    const { subjectId } = validateClassSubject(request.body);
    const item = await addClassSubject(request.params.id, subjectId);
    if (!item) return response.status(404).json({ error: { code: 'CLASS_OR_SUBJECT_NOT_FOUND', message: 'Kelas atau mata pelajaran tidak ditemukan.' } });
    response.status(201).json(item);
  } catch (error) { next(error); }
});

lmsRouter.delete('/admin/classes/:id/subjects/:subjectId', ...adminOnly, async (request, response, next) => {
  try {
    validateId(request.params.id, 'Kelas'); validateId(request.params.subjectId, 'Mata pelajaran');
    if (!await removeClassSubject(request.params.id, request.params.subjectId)) return response.status(404).json({ error: { code: 'CLASS_SUBJECT_NOT_FOUND', message: 'Mata pelajaran tidak ditemukan di kelas.' } });
    response.status(204).end();
  } catch (error) { next(error); }
});

// Teacher-only class work and grading.
lmsRouter.get('/teacher/classes', ...teacherOnly, async (request, response, next) => {
  try { response.json(await getTeacherClasses(request.user.id)); } catch (error) { next(error); }
});

lmsRouter.get('/teacher/classes/:classId', ...teacherOnly, async (request, response, next) => {
  try {
    validateId(request.params.classId, 'Kelas');
    const item = await getTeacherClass(request.user.id, request.params.classId);
    if (!item) return response.status(404).json({ error: { code: 'CLASS_NOT_FOUND', message: 'Kelas tidak ditemukan atau bukan kewenangan Anda.' } });
    response.json(item);
  } catch (error) { next(error); }
});

lmsRouter.post('/teacher/classes/:classId/materials', ...teacherOnly, upload.single('file'), async (request, response, next) => {
  let storageKey;
  try {
    const classId = request.params.classId; validateId(classId, 'Kelas');
    const detected = await detectUpload(request.file);
    const item = validateMaterial(request.body, Boolean(detected));
    const file = detected ? await storeUpload(request.file, detected) : null;
    storageKey = file?.storageKey;
    const created = await createMaterial(request.user.id, classId, item, file);
    if (created.forbidden || created.invalidSubject) {
      if (storageKey) { await removePrivateFile(storageKey); storageKey = undefined; }
      if (created.forbidden) return response.status(403).json({ error: { code: 'CLASS_ACCESS_DENIED', message: 'Anda bukan guru yang ditugaskan pada kelas ini.' } });
      return response.status(400).json({ error: { code: 'SUBJECT_NOT_IN_CLASS', message: 'Mata pelajaran tidak terhubung ke kelas ini.' } });
    }
    response.status(201).json(created);
  } catch (error) {
    if (storageKey) await removePrivateFile(storageKey);
    next(error);
  }
});

lmsRouter.put('/teacher/materials/:id', ...teacherOnly, upload.single('file'), async (request, response, next) => {
  let storageKey;
  try {
    validateId(request.params.id, 'Materi');
    const detected = await detectUpload(request.file);
    const item = validateMaterial(request.body, Boolean(detected || request.body?.attachmentName));
    const file = detected ? await storeUpload(request.file, detected) : null;
    storageKey = file?.storageKey;
    const updated = await updateMaterial(request.user.id, request.params.id, item, file);
    if (!updated || updated.forbidden || updated.invalidSubject) {
      if (storageKey) { await removePrivateFile(storageKey); storageKey = undefined; }
      if (!updated) return response.status(404).json({ error: { code: 'MATERIAL_NOT_FOUND', message: 'Materi tidak ditemukan.' } });
      if (updated.forbidden) return response.status(403).json({ error: { code: 'CLASS_ACCESS_DENIED', message: 'Anda tidak berwenang mengubah materi ini.' } });
      return response.status(400).json({ error: { code: 'SUBJECT_NOT_IN_CLASS', message: 'Mata pelajaran tidak terhubung ke kelas ini.' } });
    }
    if (updated.oldStorageKey) await removePrivateFile(updated.oldStorageKey);
    delete updated.oldStorageKey;
    response.json(updated);
  } catch (error) {
    if (storageKey) await removePrivateFile(storageKey);
    next(error);
  }
});

lmsRouter.post('/teacher/classes/:classId/assignments', ...teacherOnly, upload.single('file'), async (request, response, next) => {
  let storageKey;
  try {
    const classId = request.params.classId; validateId(classId, 'Kelas');
    const detected = await detectUpload(request.file);
    const item = validateAssignment(request.body);
    const file = detected ? await storeUpload(request.file, detected) : null;
    storageKey = file?.storageKey;
    const created = await createAssignment(request.user.id, classId, item, file);
    if (created.forbidden || created.invalidSubject) {
      if (storageKey) { await removePrivateFile(storageKey); storageKey = undefined; }
      if (created.forbidden) return response.status(403).json({ error: { code: 'CLASS_ACCESS_DENIED', message: 'Anda bukan guru yang ditugaskan pada kelas ini.' } });
      return response.status(400).json({ error: { code: 'SUBJECT_NOT_IN_CLASS', message: 'Mata pelajaran tidak terhubung ke kelas ini.' } });
    }
    response.status(201).json(created);
  } catch (error) {
    if (storageKey) await removePrivateFile(storageKey);
    next(error);
  }
});

lmsRouter.put('/teacher/assignments/:id', ...teacherOnly, upload.single('file'), async (request, response, next) => {
  let storageKey;
  try {
    validateId(request.params.id, 'Tugas');
    const detected = await detectUpload(request.file);
    const item = validateAssignment(request.body);
    const file = detected ? await storeUpload(request.file, detected) : null;
    storageKey = file?.storageKey;
    const updated = await updateAssignment(request.user.id, request.params.id, item, file);
    if (!updated || updated.forbidden || updated.invalidSubject) {
      if (storageKey) { await removePrivateFile(storageKey); storageKey = undefined; }
      if (!updated) return response.status(404).json({ error: { code: 'ASSIGNMENT_NOT_FOUND', message: 'Tugas tidak ditemukan.' } });
      if (updated.forbidden) return response.status(403).json({ error: { code: 'CLASS_ACCESS_DENIED', message: 'Anda tidak berwenang mengubah tugas ini.' } });
      return response.status(400).json({ error: { code: 'SUBJECT_NOT_IN_CLASS', message: 'Mata pelajaran tidak terhubung ke kelas ini.' } });
    }
    if (updated.oldStorageKey) await removePrivateFile(updated.oldStorageKey);
    delete updated.oldStorageKey;
    response.json(updated);
  } catch (error) {
    if (storageKey) await removePrivateFile(storageKey);
    next(error);
  }
});

lmsRouter.get('/teacher/classes/:classId/assignments/:assignmentId/submissions', ...teacherOnly, async (request, response, next) => {
  try {
    validateId(request.params.classId, 'Kelas'); validateId(request.params.assignmentId, 'Tugas');
    const submissions = await getTeacherSubmissions(request.user.id, request.params.classId, request.params.assignmentId);
    if (!submissions) return response.status(404).json({ error: { code: 'ASSIGNMENT_NOT_FOUND', message: 'Tugas tidak ditemukan atau kelas bukan kewenangan Anda.' } });
    response.json(submissions);
  } catch (error) { next(error); }
});

lmsRouter.put('/teacher/submissions/:id/grade', ...teacherOnly, async (request, response, next) => {
  try {
    validateId(request.params.id, 'Pengumpulan');
    const result = await saveGrade(request.user.id, request.params.id, validateGrade(request.body));
    if (!result) return response.status(404).json({ error: { code: 'SUBMISSION_NOT_FOUND', message: 'Pengumpulan tidak ditemukan atau kelas bukan kewenangan Anda.' } });
    response.json(result);
  } catch (error) { next(error); }
});

// Student-only class access, submissions, and published grades.
lmsRouter.get('/student/classes', ...studentOnly, async (request, response, next) => {
  try { response.json(await getStudentClasses(request.user.id)); } catch (error) { next(error); }
});

lmsRouter.get('/student/classes/:classId', ...studentOnly, async (request, response, next) => {
  try {
    validateId(request.params.classId, 'Kelas');
    const course = await getStudentClass(request.user.id, request.params.classId);
    if (!course) return response.status(404).json({ error: { code: 'CLASS_NOT_FOUND', message: 'Kelas tidak ditemukan atau Anda bukan anggotanya.' } });
    response.json(course);
  } catch (error) { next(error); }
});

lmsRouter.post('/student/assignments/:assignmentId/submissions', ...studentOnly, upload.single('file'), async (request, response, next) => {
  let storageKey;
  try {
    validateId(request.params.assignmentId, 'Tugas');
    const detected = await detectUpload(request.file);
    const item = validateSubmission(request.body, Boolean(detected));
    const file = detected ? await storeUpload(request.file, detected) : null;
    storageKey = file?.storageKey;
    const submitted = await submitAssignment(request.user.id, request.params.assignmentId, item, file);
    if (submitted.notFound) {
      if (storageKey) { await removePrivateFile(storageKey); storageKey = undefined; }
      return response.status(404).json({ error: { code: 'ASSIGNMENT_NOT_FOUND', message: 'Tugas tidak ditemukan atau Anda bukan anggota kelasnya.' } });
    }
    if (submitted.oldStorageKey) await removePrivateFile(submitted.oldStorageKey);
    delete submitted.oldStorageKey;
    response.status(201).json(submitted);
  } catch (error) {
    if (storageKey) await removePrivateFile(storageKey);
    next(error);
  }
});

lmsRouter.get('/files/:type/:id', ...memberOnly, async (request, response, next) => {
  try {
    validateId(request.params.id, 'File');
    const item = await getLmsFile(request.user, request.params.type, request.params.id);
    if (!item?.storageKey) return response.status(404).json({ error: { code: 'FILE_NOT_FOUND', message: 'File tidak ditemukan atau tidak dapat diakses.' } });
    const bytes = await readPrivateFile(item.storageKey);
    if (!bytes) return response.status(404).json({ error: { code: 'FILE_NOT_FOUND', message: 'File tidak ditemukan.' } });
    response.setHeader('Content-Type', item.mediaType);
    response.setHeader('Content-Length', bytes.length);
    response.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${encodeURIComponent(item.originalName)}`);
    response.setHeader('Cache-Control', 'private, no-store');
    response.setHeader('X-Content-Type-Options', 'nosniff');
    response.send(bytes);
  } catch (error) { next(error); }
});

lmsRouter.use((error, _request, response, next) => {
  if (error instanceof LmsValidationError) return response.status(error.status).json({ error: { code: error.code, message: error.message } });
  if (error?.status && error?.code) return response.status(error.status).json({ error: { code: error.code, message: error.message } });
  if (error?.code === 'LIMIT_FILE_SIZE') return response.status(413).json({ error: { code: 'FILE_TOO_LARGE', message: 'Ukuran file melewati batas unggah.' } });
  if (error?.name === 'MulterError') return response.status(400).json({ error: { code: 'INVALID_UPLOAD', message: 'Permintaan unggah tidak valid.' } });
  next(error);
});

async function detectUpload(file) {
  if (!file) return null;
  const detected = await fileTypeFromBuffer(file.buffer);
  if (!detected || !acceptedMimeTypes.has(detected.mime)) {
    const error = new Error('Format file harus PDF, JPEG, PNG, atau WebP.'); error.status = 400; error.code = 'UNSUPPORTED_FILE'; throw error;
  }
  return detected;
}

async function storeUpload(file, detected) {
  const originalName = file.originalname.replace(/[\\/\u0000-\u001f\u007f]/g, '').slice(0, 255) || `lampiran.${detected.ext}`;
  return {
    storageKey: await writePrivateFile(file.buffer, detected.mime),
    originalName, mimeType: detected.mime, byteSize: file.size,
  };
}
