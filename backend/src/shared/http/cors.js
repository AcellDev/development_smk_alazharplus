const defaultOrigin = process.env.FRONTEND_ORIGIN ?? 'http://localhost:5173';
const developmentOrigins = new Set(['http://localhost:5173', 'http://127.0.0.1:5173']);

export function isAllowedOrigin(origin) {
  if (!origin) return true;
  if (origin === defaultOrigin) return true;
  if (process.env.NODE_ENV !== 'production') {
    if (developmentOrigins.has(origin)) return true;
    if (origin.endsWith('.ngrok-free.app') || origin.endsWith('.ngrok.app') || origin.endsWith('.ngrok.io')) return true;
  }
  return false;
}

export function corsMiddleware(request, response, next) {
  const origin = request.headers.origin;
  if (origin && isAllowedOrigin(origin)) {
    response.setHeader('Access-Control-Allow-Origin', origin);
    response.setHeader('Access-Control-Allow-Credentials', 'true');
    response.setHeader('Vary', 'Origin');
  }
  if (request.method === 'OPTIONS') {
    response.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
    response.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    return response.sendStatus(204);
  }
  next();
}
