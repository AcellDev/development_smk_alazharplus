import { createHash, randomBytes } from 'node:crypto';
import { Router } from 'express';
import bcrypt from 'bcryptjs';
import multer from 'multer';
import { fileTypeFromBuffer } from 'file-type';
import { requireAuthentication, requireRoles } from '../auth/auth.middleware.js';
import {
  createApplicantApplication, deleteAdminItem, deletePeriod, getAdminApplication, getAdminCollection,
  getAdminPeriods, getApplicantForUser, getApplicantUploadTarget, getAuthorizedDocument, getPublicConfiguration,
  listAdminApplications, saveAdminItem, saveApplicantDocument, savePeriod, submitApplicantApplication,
  updateApplicantDetails, updateApplicationStatus,
} from './ppdb.model.js';
import {
  PpdbValidationError, validateAnnouncement, validateApplication, validateId, validatePeriod,
  validateApplicantUpdate, validateRequirement, validateSchedule, validateStatusChange,
} from './ppdb.validation.js';
import { readPrivateDocument, removePrivateDocument, writePrivateDocument } from './document-storage.js';

export const ppdbRouter = Router();
const applicantOnly = [requireAuthentication, requireRoles('applicant')];
const committeeOnly = [requireAuthentication, requireRoles('admin_ppdb')];
const configuredPrivateMax = Number(process.env.PRIVATE_UPLOAD_MAX_BYTES ?? 10 * 1024 * 1024);
const maximumDocumentSize = Number.isSafeInteger(configuredPrivateMax) && configuredPrivateMax > 0
  ? Math.min(configuredPrivateMax, 10 * 1024 * 1024)
  : 10 * 1024 * 1024;
const documentUpload = multer({ storage: multer.memoryStorage(), limits: { fileSize: maximumDocumentSize, files: 1, fields: 1, fieldSize: 100 } });
const supportedTypes = new Set(['application/pdf', 'image/jpeg', 'image/png', 'image/webp']);
const sessionDurationSeconds = 8 * 60 * 60;
const registrationAttempts = new Map();

ppdbRouter.get('/configuration', async (_request, response, next) => {
  try { response.json(await getPublicConfiguration()); } catch (error) { next(error); }
});

ppdbRouter.post('/applications', async (request, response, next) => {
  try {
    const now = Date.now();
    const address = request.ip;
    for (const [key, entry] of registrationAttempts) if (entry.resetAt <= now) registrationAttempts.delete(key);
    const previous = registrationAttempts.get(address);
    if (previous && previous.count >= 5) return response.status(429).json({ error: { code: 'RATE_LIMITED', message: 'Terlalu banyak percobaan pendaftaran. Coba kembali nanti.' } });
    registrationAttempts.set(address, previous ? { ...previous, count: previous.count + 1 } : { count: 1, resetAt: now + 60 * 60 * 1000 });
    const data = validateApplication(request.body);
    const passwordHash = await bcrypt.hash(data.password, 12);
    const token = randomBytes(32).toString('hex');
    const tokenHash = createHash('sha256').update(token).digest('hex');
    const expiresAt = new Date(Date.now() + sessionDurationSeconds * 1000);
    const result = await createApplicantApplication({ ...data, sessionTokenHash: tokenHash, sessionExpiresAt: expiresAt }, passwordHash);
    response.setHeader('Set-Cookie', sessionCookie(token, sessionDurationSeconds));
    response.status(201).json({ user: { ...result.user, role: 'applicant' }, application: result.applicant, expiresAt: result.session.expiresAt });
  } catch (error) { next(error); }
});

ppdbRouter.get('/applications/mine', ...applicantOnly, async (request, response, next) => {
  try {
    const application = await getApplicantForUser(request.user.id);
    if (!application) return response.status(404).json({ error: { code: 'APPLICATION_NOT_FOUND', message: 'Data pendaftaran tidak ditemukan.' } });
    response.json(application);
  } catch (error) { next(error); }
});

ppdbRouter.put('/applications/mine', ...applicantOnly, async (request, response, next) => {
  try {
    const result = await updateApplicantDetails(request.user.id, validateApplicantUpdate(request.body));
    if (result.notFound) return response.status(404).json({ error: { code: 'APPLICATION_NOT_FOUND', message: 'Data pendaftaran tidak ditemukan.' } });
    response.json(result);
  } catch (error) { next(error); }
});

ppdbRouter.post('/applications/mine/submit', ...applicantOnly, async (request, response, next) => {
  try {
    const result = await submitApplicantApplication(request.user.id);
    if (result.notFound) return response.status(404).json({ error: { code: 'APPLICATION_NOT_FOUND', message: 'Data pendaftaran tidak ditemukan.' } });
    response.json(result);
  } catch (error) { next(error); }
});

ppdbRouter.post('/applications/mine/documents', ...applicantOnly, documentUpload.single('file'), async (request, response, next) => {
  let storageKey;
  try {
    if (!request.file) return response.status(400).json({ error: { code: 'FILE_REQUIRED', message: 'Pilih file dokumen.' } });
    const requirementId = String(request.body?.requirementId ?? '');
    validateId(requirementId, 'Persyaratan');
    const detected = await fileTypeFromBuffer(request.file.buffer);
    if (!detected || !supportedTypes.has(detected.mime)) {
      return response.status(400).json({ error: { code: 'UNSUPPORTED_FILE', message: 'Format dokumen harus PDF, JPEG, PNG, atau WebP.' } });
    }
    const uploadTarget = await getApplicantUploadTarget(request.user.id);
    if (!uploadTarget) return response.status(404).json({ error: { code: 'APPLICATION_NOT_FOUND', message: 'Data pendaftaran tidak ditemukan.' } });
    storageKey = await writePrivateDocument(request.file.buffer, detected.mime);
    const originalName = request.file.originalname.replace(/[\\/\u0000-\u001f\u007f]/g, '').slice(0, 255) || `dokumen.${detected.ext}`;
    const document = await saveApplicantDocument(request.user.id, requirementId, request.file, storageKey, originalName, detected.mime);
    if (document.notFound) {
      await removePrivateDocument(storageKey);
      return response.status(404).json({ error: { code: 'APPLICATION_NOT_FOUND', message: 'Data pendaftaran tidak ditemukan.' } });
    }
    response.status(201).json(document);
  } catch (error) {
    if (storageKey) await removePrivateDocument(storageKey);
    next(error);
  }
});

ppdbRouter.get('/documents/:id', requireAuthentication, requireRoles('applicant', 'admin_ppdb'), async (request, response, next) => {
  try {
    validateId(request.params.id, 'Dokumen');
    const document = await getAuthorizedDocument(request.params.id, request.user);
    if (!document) return response.status(404).json({ error: { code: 'DOCUMENT_NOT_FOUND', message: 'Dokumen tidak ditemukan.' } });
    const bytes = await readPrivateDocument(document.storageKey);
    if (!bytes) return response.status(404).json({ error: { code: 'DOCUMENT_NOT_FOUND', message: 'Dokumen tidak ditemukan.' } });
    response.setHeader('Content-Type', document.mediaType);
    response.setHeader('Content-Length', bytes.length);
    response.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${encodeURIComponent(document.originalName)}`);
    response.setHeader('Cache-Control', 'private, no-store');
    response.setHeader('X-Content-Type-Options', 'nosniff');
    response.send(bytes);
  } catch (error) { next(error); }
});

ppdbRouter.get('/admin/periods', ...committeeOnly, async (_request, response, next) => {
  try { response.json(await getAdminPeriods()); } catch (error) { next(error); }
});

ppdbRouter.post('/admin/periods', ...committeeOnly, async (request, response, next) => {
  try { response.status(201).json(await savePeriod(validatePeriod(request.body))); } catch (error) { next(error); }
});

ppdbRouter.put('/admin/periods/:id', ...committeeOnly, async (request, response, next) => {
  try {
    validateId(request.params.id, 'Periode');
    const period = await savePeriod(validatePeriod(request.body), request.params.id);
    if (!period) return response.status(404).json({ error: { code: 'PERIOD_NOT_FOUND', message: 'Periode tidak ditemukan.' } });
    response.json(period);
  } catch (error) { next(error); }
});

ppdbRouter.delete('/admin/periods/:id', ...committeeOnly, async (request, response, next) => {
  try {
    validateId(request.params.id, 'Periode');
    if (!await deletePeriod(request.params.id)) return response.status(404).json({ error: { code: 'PERIOD_NOT_FOUND', message: 'Periode tidak ditemukan.' } });
    response.status(204).end();
  } catch (error) { next(error); }
});

for (const resource of ['requirements', 'schedule', 'announcements']) {
  ppdbRouter.get(`/admin/${resource}`, ...committeeOnly, async (request, response, next) => {
    try {
      const periodId = request.query.periodId ? String(request.query.periodId) : null;
      if (periodId) validateId(periodId, 'Periode');
      response.json(await getAdminCollection(resource, periodId));
    } catch (error) { next(error); }
  });
  ppdbRouter.post(`/admin/${resource}`, ...committeeOnly, async (request, response, next) => {
    try {
      const item = resource === 'requirements' ? validateRequirement(request.body)
        : resource === 'schedule' ? validateSchedule(request.body) : validateAnnouncement(request.body);
      response.status(201).json(await saveAdminItem(resource, item));
    } catch (error) { next(error); }
  });
  ppdbRouter.put(`/admin/${resource}/:id`, ...committeeOnly, async (request, response, next) => {
    try {
      validateId(request.params.id, 'Konten');
      const item = resource === 'requirements' ? validateRequirement(request.body)
        : resource === 'schedule' ? validateSchedule(request.body) : validateAnnouncement(request.body);
      const updated = await saveAdminItem(resource, item, request.params.id);
      if (!updated) return response.status(404).json({ error: { code: 'CONTENT_NOT_FOUND', message: 'Data tidak ditemukan.' } });
      response.json(updated);
    } catch (error) { next(error); }
  });
  ppdbRouter.delete(`/admin/${resource}/:id`, ...committeeOnly, async (request, response, next) => {
    try {
      validateId(request.params.id, 'Konten');
      if (!await deleteAdminItem(resource, request.params.id)) return response.status(404).json({ error: { code: 'CONTENT_NOT_FOUND', message: 'Data tidak ditemukan.' } });
      response.status(204).end();
    } catch (error) { next(error); }
  });
}

ppdbRouter.get('/admin/applications', ...committeeOnly, async (request, response, next) => {
  try {
    const status = request.query.status ? String(request.query.status) : null;
    const search = request.query.search ? String(request.query.search).trim().slice(0, 100) : null;
    const periodId = request.query.periodId ? String(request.query.periodId) : null;
    if (status && !['Draft', 'Dikirim', 'Perlu Perbaikan', 'Terverifikasi', 'Lulus', 'Tidak Lulus'].includes(status)) throw new PpdbValidationError('Filter status tidak valid.');
    if (periodId) validateId(periodId, 'Periode');
    response.json(await listAdminApplications({ status, search, periodId }));
  } catch (error) { next(error); }
});

ppdbRouter.get('/admin/applications/:id', ...committeeOnly, async (request, response, next) => {
  try {
    validateId(request.params.id, 'Pendaftaran');
    const application = await getAdminApplication(request.params.id);
    if (!application) return response.status(404).json({ error: { code: 'APPLICATION_NOT_FOUND', message: 'Pendaftaran tidak ditemukan.' } });
    response.json(application);
  } catch (error) { next(error); }
});

ppdbRouter.patch('/admin/applications/:id/status', ...committeeOnly, async (request, response, next) => {
  try {
    validateId(request.params.id, 'Pendaftaran');
    const { status, note } = validateStatusChange(request.body);
    const result = await updateApplicationStatus(request.params.id, status, note, request.user.id);
    if (!result) return response.status(404).json({ error: { code: 'APPLICATION_NOT_FOUND', message: 'Pendaftaran tidak ditemukan.' } });
    response.json(result);
  } catch (error) { next(error); }
});

ppdbRouter.use((error, _request, response, next) => {
  if (error instanceof PpdbValidationError) return response.status(error.status).json({ error: { code: error.code, message: error.message } });
  if (error?.status && error?.code) return response.status(error.status).json({ error: { code: error.code, message: error.message } });
  if (error?.code === 'LIMIT_FILE_SIZE') return response.status(413).json({ error: { code: 'FILE_TOO_LARGE', message: 'Ukuran file melewati batas maksimum upload.' } });
  if (error?.name === 'MulterError') return response.status(400).json({ error: { code: 'INVALID_UPLOAD', message: 'Permintaan unggah tidak valid.' } });
  next(error);
});

function sessionCookie(token, maxAge) {
  return `sid=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${maxAge}${process.env.NODE_ENV === 'production' ? '; Secure' : ''}`;
}
