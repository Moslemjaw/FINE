import jwt from 'jsonwebtoken';

const COOKIE_NAME = 'fine_token';

export function signToken(payload) {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error('Missing JWT_SECRET');
  return jwt.sign(payload, secret, { expiresIn: '7d' });
}

export function setAuthCookie(res, token) {
  res.cookie(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: false,
    maxAge: 7 * 24 * 60 * 60 * 1000,
    path: '/',
  });
}

export function clearAuthCookie(res) {
  res.clearCookie(COOKIE_NAME, { path: '/' });
}

export function getTokenFromReq(req) {
  return req.cookies?.[COOKIE_NAME] ?? null;
}

export function requireAuth(req, res, next) {
  const token = getTokenFromReq(req);
  if (!token) return res.status(401).json({ error: 'unauthorized' });

  try {
    const secret = process.env.JWT_SECRET;
    if (!secret) throw new Error('Missing JWT_SECRET');
    req.auth = jwt.verify(token, secret);
    return next();
  } catch {
    return res.status(401).json({ error: 'unauthorized' });
  }
}

export function requireAdmin(req, res, next) {
  if (!req.auth) return res.status(401).json({ error: 'unauthorized' });
  if (req.auth.role !== 'admin') return res.status(403).json({ error: 'forbidden' });
  return next();
}

