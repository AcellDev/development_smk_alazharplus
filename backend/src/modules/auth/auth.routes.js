import { Router } from 'express';
import { findSession, revokeSession, verifyCredentials } from './auth.service.js';
import { readSessionCookie, requireAuthentication, requireRoles } from './auth.middleware.js';
import { isAllowedOrigin } from '../../shared/http/cors.js';

export const authRouter = Router();
const cookieName = 'sid';
const loginAttempts = new Map();
const sessionCookie = (token, maxAge) => `${cookieName}=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${maxAge}${process.env.NODE_ENV === 'production' ? '; Secure' : ''}`;

authRouter.post('/login', async (request, response, next) => {
  try {
    const origin = request.headers.origin;
    if (origin && !isAllowedOrigin(origin)) {
      return response.status(403).json({ error: { code: 'ORIGIN_FORBIDDEN', message: 'Origin tidak diizinkan.' } });
    }
    const key = request.ip;
    const now = Date.now();
    for (const [address, entry] of loginAttempts) {
      if (entry.resetAt <= now) loginAttempts.delete(address);
    }
    const previous = loginAttempts.get(key);
    if (previous && previous.resetAt > now && previous.count >= 10) {
      return response.status(429).json({ error: { code: 'RATE_LIMITED', message: 'Terlalu banyak percobaan. Coba lagi sebentar.' } });
    }
    const attempt = previous?.resetAt > now ? previous : { count: 0, resetAt: now + 60_000 };
    attempt.count += 1;
    loginAttempts.set(key, attempt);

    const { email, password } = request.body ?? {};
    if (typeof email !== 'string' || email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
      || typeof password !== 'string' || password.length < 1 || password.length > 200) {
      return response.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Email atau password tidak valid.' } });
    }
    const session = await verifyCredentials(email.trim().toLowerCase(), password);
    if (!session) {
      return response.status(401).json({ error: { code: 'INVALID_CREDENTIALS', message: 'Email atau password salah.' } });
    }
    loginAttempts.delete(key);
    response.setHeader('Set-Cookie', sessionCookie(session.token, 8 * 60 * 60));
    response.json({ user: session.user, expiresAt: session.expiresAt });
  } catch (error) {
    next(error);
  }
});

authRouter.post('/logout', async (request, response, next) => {
  try {
    const token = readSessionCookie(request.headers.cookie);
    await revokeSession(token);
    response.setHeader('Set-Cookie', sessionCookie('', 0));
    response.status(204).end();
  } catch (error) {
    next(error);
  }
});

authRouter.get('/session', requireAuthentication, (request, response) => {
  response.json({ user: request.user });
});

// Small protected route demonstrates that role checks are enforced on the server.
authRouter.get('/admin-check', requireAuthentication, requireRoles('admin_website', 'admin_ppdb'), (_request, response) => {
  response.json({ allowed: true });
});
