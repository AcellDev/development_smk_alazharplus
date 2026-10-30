import { randomUUID } from 'node:crypto';
import { mkdir, readFile, unlink, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { Router } from 'express';
import multer from 'multer';
import { fileTypeFromBuffer } from 'file-type';
import { pool } from '../../database/pool.js';
import { requireAuthentication, requireRoles } from '../auth/auth.middleware.js';
import { isPublicMedia } from './content.model.js';

export const mediaUploadRouter = Router();
const configuredMaxSize = Number(process.env.MAX_UPLOAD_SIZE_BYTES ?? 5 * 1024 * 1024);
const maxFileSize = Number.isSafeInteger(configuredMaxSize) && configuredMaxSize > 0
  ? Math.min(configuredMaxSize, 10 * 1024 * 1024)
  : 5 * 1024 * 1024;
const uploadDirectory = path.resolve(process.env.UPLOAD_DIR ?? path.join(process.cwd(), 'var', 'uploads'));
const acceptedTypes = new Map([['image/jpeg', 'jpg'], ['image/png', 'png'], ['image/webp', 'webp']]);
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: maxFileSize, files: 1, fields: 0 } });

mediaUploadRouter.post('/', requireAuthentication, requireRoles('admin_website'), upload.single('file'), async (request, response, next) => {
  let targetPath;
  try {
    if (!request.file) return response.status(400).json({ error: { code: 'FILE_REQUIRED', message: 'Pilih gambar yang akan diunggah.' } });
    const detected = await fileTypeFromBuffer(request.file.buffer);
    const extension = detected && acceptedTypes.get(detected.mime);
    if (!extension) return response.status(400).json({ error: { code: 'UNSUPPORTED_FILE', message: 'Format yang diterima: JPEG, PNG, atau WebP.' } });

    const storageKey = `${randomUUID()}.${extension}`;
    targetPath = path.join(uploadDirectory, storageKey);
    await mkdir(uploadDirectory, { recursive: true });
    await writeFile(targetPath, request.file.buffer, { flag: 'wx', mode: 0o640 });
    const originalName = path.basename(request.file.originalname).replace(/[\u0000-\u001f\u007f]/g, '').slice(0, 255) || `image.${extension}`;

    try {
      const result = await pool.query(
        `INSERT INTO media_assets (storage_key, original_name, media_type, byte_size, uploaded_by)
         VALUES ($1, $2, $3, $4, $5) RETURNING id, original_name AS "originalName", media_type AS "mediaType", byte_size AS "byteSize"`,
        [storageKey, originalName, detected.mime, request.file.size, request.user.id],
      );
      response.status(201).json({ ...result.rows[0], url: `/api/content/media/${result.rows[0].id}` });
    } catch (error) {
      await unlink(targetPath).catch(() => {});
      throw error;
    }
  } catch (error) { next(error); }
});

mediaUploadRouter.get('/:id', async (request, response, next) => {
  try {
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(request.params.id)) {
      return response.status(404).json({ error: { code: 'NOT_FOUND', message: 'Media tidak ditemukan.' } });
    }
    const asset = await isPublicMedia(request.params.id);
    if (!asset || !/^[0-9a-f-]{36}\.(jpg|png|webp)$/.test(asset.storageKey)) {
      return response.status(404).json({ error: { code: 'NOT_FOUND', message: 'Media tidak ditemukan.' } });
    }
    const absolutePath = path.resolve(uploadDirectory, asset.storageKey);
    if (!absolutePath.startsWith(`${uploadDirectory}${path.sep}`)) return response.sendStatus(404);
    const bytes = await readFile(absolutePath);
    response.setHeader('Content-Type', asset.mediaType);
    response.setHeader('Content-Length', bytes.length);
    response.setHeader('Cache-Control', 'public, max-age=3600');
    response.setHeader('X-Content-Type-Options', 'nosniff');
    response.setHeader('Content-Security-Policy', "default-src 'none'; sandbox");
    response.send(bytes);
  } catch (error) { next(error); }
});
