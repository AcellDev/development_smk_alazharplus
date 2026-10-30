import { findSession } from './auth.service.js';

export async function requireAuthentication(request, response, next) {
  try {
    request.user = await findSession(readSessionCookie(request.headers.cookie));
    if (!request.user) {
      return response.status(401).json({ error: { code: 'UNAUTHENTICATED', message: 'Silakan login untuk melanjutkan.' } });
    }
    next();
  } catch (error) {
    next(error);
  }
}

export function requireRoles(...allowedRoles) {
  return (request, response, next) => {
    if (!request.user) {
      return response.status(401).json({ error: { code: 'UNAUTHENTICATED', message: 'Silakan login untuk melanjutkan.' } });
    }
    if (!allowedRoles.includes(request.user.role)) {
      return response.status(403).json({ error: { code: 'FORBIDDEN', message: 'Anda tidak memiliki izin untuk tindakan ini.' } });
    }
    next();
  };
}

export function readSessionCookie(cookieHeader = '') {
  const entry = cookieHeader.split(';').map((part) => part.trim()).find((part) => part.startsWith('sid='));
  return entry ? decodeURIComponent(entry.slice(4)) : null;
}
