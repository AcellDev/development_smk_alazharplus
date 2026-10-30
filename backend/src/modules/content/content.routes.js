import { Router } from 'express';
import { requireAuthentication, requireRoles } from '../auth/auth.middleware.js';
import {
  createContent, deleteContent, getAdminCollection, getHomeContent, getPublicCollection,
  getPublicContact, getPublicDetail, updateContent,
} from './content.model.js';
import { ValidationError, validateContent, validateContentId } from './content.validation.js';
import { mediaUploadRouter } from './media.routes.js';

export const contentRouter = Router();
const resources = new Set(['profiles', 'programs', 'news', 'events', 'contact']);
const contentAdmin = [requireAuthentication, requireRoles('admin_website')];

contentRouter.get('/home', async (_request, response, next) => {
  try { response.json(await getHomeContent()); } catch (error) { next(error); }
});

contentRouter.use('/media', mediaUploadRouter);

// Register admin endpoints before dynamic public routes.
contentRouter.get('/admin/:resource', ...contentAdmin, async (request, response, next) => {
  const resource = request.params.resource;
  if (!resources.has(resource)) return response.status(404).json({ error: { code: 'NOT_FOUND', message: 'Jenis konten tidak ditemukan.' } });
  try { response.json(await getAdminCollection(resource)); } catch (error) { next(error); }
});

contentRouter.post('/admin/:resource', ...contentAdmin, async (request, response, next) => {
  const resource = request.params.resource;
  if (!resources.has(resource)) return response.status(404).json({ error: { code: 'NOT_FOUND', message: 'Jenis konten tidak ditemukan.' } });
  try {
    const item = validateContent(resource, request.body);
    response.status(201).json(await createContent(resource, item, request.user.id));
  } catch (error) { next(error); }
});

contentRouter.put('/admin/:resource/:id', ...contentAdmin, async (request, response, next) => {
  const { resource, id } = request.params;
  if (!resources.has(resource)) return response.status(404).json({ error: { code: 'NOT_FOUND', message: 'Jenis konten tidak ditemukan.' } });
  try {
    const item = validateContent(resource, request.body);
    const updated = await updateContent(resource, id, item, request.user.id);
    if (!updated) return response.status(404).json({ error: { code: 'NOT_FOUND', message: 'Konten tidak ditemukan.' } });
    response.json(updated);
  } catch (error) { next(error); }
});

contentRouter.delete('/admin/:resource/:id', ...contentAdmin, async (request, response, next) => {
  const { resource, id } = request.params;
  if (!['profiles', 'programs', 'news', 'events'].includes(resource)) return response.status(404).json({ error: { code: 'NOT_FOUND', message: 'Jenis konten tidak dapat dihapus.' } });
  try {
    validateContentId(id);
    if (!await deleteContent(resource, id)) return response.status(404).json({ error: { code: 'NOT_FOUND', message: 'Konten tidak ditemukan.' } });
    response.status(204).end();
  } catch (error) { next(error); }
});

contentRouter.get('/contact', async (_request, response, next) => {
  try { response.json(await getPublicContact() ?? {}); } catch (error) { next(error); }
});

contentRouter.get('/:resource', async (request, response, next) => {
  const { resource } = request.params;
  if (!['profiles', 'programs', 'news', 'events'].includes(resource)) return response.status(404).json({ error: { code: 'NOT_FOUND', message: 'Konten tidak ditemukan.' } });
  try { response.json(await getPublicCollection(resource)); } catch (error) { next(error); }
});

contentRouter.get('/:resource/:slug', async (request, response, next) => {
  const { resource, slug } = request.params;
  if (!['profiles', 'programs', 'news'].includes(resource)) return response.status(404).json({ error: { code: 'NOT_FOUND', message: 'Konten tidak ditemukan.' } });
  try {
    const item = await getPublicDetail(resource, slug);
    if (!item) return response.status(404).json({ error: { code: 'NOT_FOUND', message: 'Konten tidak ditemukan.' } });
    response.json(item);
  } catch (error) { next(error); }
});

contentRouter.use((error, request, response, next) => {
  if (error instanceof ValidationError) return response.status(error.status).json({ error: { code: error.code, message: error.message } });
  next(error);
});
