import { Router } from 'express';
import { requireAuthentication, requireRoles } from '../auth/auth.middleware.js';
import { createGallery, deleteGallery, listGalleries, updateGallery } from './galleries.model.js';
import { GalleryValidationError, validateGallery, validateGalleryId } from './galleries.validation.js';

export const galleriesRouter = Router();
const websiteAdmin = [requireAuthentication, requireRoles('admin_website')];

galleriesRouter.get('/', async (_request, response, next) => {
  try { response.json(await listGalleries()); } catch (error) { next(error); }
});

galleriesRouter.post('/', ...websiteAdmin, async (request, response, next) => {
  try {
    response.status(201).json(await createGallery(validateGallery(request.body)));
  } catch (error) { next(error); }
});

galleriesRouter.put('/:id', ...websiteAdmin, async (request, response, next) => {
  try {
    validateGalleryId(request.params.id);
    const gallery = await updateGallery(request.params.id, validateGallery(request.body));
    if (!gallery) return response.status(404).json({ error: { code: 'NOT_FOUND', message: 'Item galeri tidak ditemukan.' } });
    response.json(gallery);
  } catch (error) { next(error); }
});

galleriesRouter.delete('/:id', ...websiteAdmin, async (request, response, next) => {
  try {
    validateGalleryId(request.params.id);
    if (!await deleteGallery(request.params.id)) return response.status(404).json({ error: { code: 'NOT_FOUND', message: 'Item galeri tidak ditemukan.' } });
    response.status(204).end();
  } catch (error) { next(error); }
});

galleriesRouter.use((error, _request, response, next) => {
  if (error instanceof GalleryValidationError) return response.status(error.status).json({ error: { code: 'VALIDATION_ERROR', message: error.message } });
  next(error);
});
