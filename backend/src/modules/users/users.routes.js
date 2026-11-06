import { Router } from 'express';
import { requireAuthentication, requireRoles } from '../auth/auth.middleware.js';
import { createUser, deactivateUser, listUsers, updateUser } from './users.model.js';
import { toApiRole, UserValidationError, validateRoleFilter, validateUser, validateUserId } from './users.validation.js';

export const usersRouter = Router();
const administrators = [requireAuthentication, requireRoles('admin_website', 'admin_ppdb')];

function present(user) {
  return { ...user, role: toApiRole(user.databaseRole) };
}

usersRouter.get('/', ...administrators, async (request, response, next) => {
  try {
    const role = validateRoleFilter(typeof request.query.role === 'string' ? request.query.role : null);
    response.json((await listUsers(role)).map(present));
  } catch (error) { next(error); }
});

usersRouter.post('/', ...administrators, async (request, response, next) => {
  try { response.status(201).json(present(await createUser(validateUser(request.body)))); }
  catch (error) { next(error); }
});

usersRouter.put('/:id', ...administrators, async (request, response, next) => {
  try {
    validateUserId(request.params.id);
    const payload = validateUser(request.body, { partial: true });
    if (!payload.displayName && !payload.email && !payload.role && !payload.password) throw new UserValidationError('Tidak ada perubahan akun yang dikirim.');
    const result = await updateUser(request.params.id, payload, request.user.id);
    if (result?.notFound) return response.status(404).json({ error: { code: 'USER_NOT_FOUND', message: 'Pengguna tidak ditemukan.' } });
    if (result?.selfRoleChange) return response.status(409).json({ error: { code: 'SELF_ROLE_CHANGE', message: 'Role akun sendiri tidak dapat diubah.' } });
    response.json(present(result));
  } catch (error) { next(error); }
});

usersRouter.delete('/:id', ...administrators, async (request, response, next) => {
  try {
    validateUserId(request.params.id);
    const result = await deactivateUser(request.params.id, request.user.id);
    if (result?.selfDelete) return response.status(409).json({ error: { code: 'SELF_DELETE', message: 'Akun yang sedang digunakan tidak dapat dinonaktifkan.' } });
    if (!result) return response.status(404).json({ error: { code: 'USER_NOT_FOUND', message: 'Pengguna tidak ditemukan atau sudah nonaktif.' } });
    response.status(204).end();
  } catch (error) { next(error); }
});

usersRouter.use((error, _request, response, next) => {
  if (error instanceof UserValidationError) return response.status(error.status).json({ error: { code: error.code, message: error.message } });
  next(error);
});
