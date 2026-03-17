import { type Request, type Response, type NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { Logger } from '../utils/logger';

// Extend Express Request to include authUserId
declare module 'express-serve-static-core' {
  interface Request {
    authUserId?: string;
  }
}

// Supabase JWT secrets are base64-encoded in the dashboard.
// Decode to raw bytes so HMAC-SHA256 verification uses the correct 64-byte key.
const RAW_SECRET = process.env.SUPABASE_JWT_SECRET;
const JWT_SECRET: Buffer | undefined = RAW_SECRET
  ? Buffer.from(RAW_SECRET, 'base64')
  : undefined;

/**
 * Middleware to verify Supabase JWT tokens.
 * Extracts the `sub` claim (Supabase Auth user ID) and sets `req.authUserId`.
 */
export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Missing or invalid Authorization header' });
    return;
  }

  const token = authHeader.slice(7);

  if (!JWT_SECRET) {
    Logger.error('[Auth] SUPABASE_JWT_SECRET not configured');
    res.status(500).json({ error: 'Auth not configured' });
    return;
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET, { algorithms: ['HS256'] }) as jwt.JwtPayload;
    const sub = decoded.sub;

    if (!sub || typeof sub !== 'string') {
      res.status(401).json({ error: 'Invalid token: missing sub claim' });
      return;
    }

    req.authUserId = sub;
    next();
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      res.status(401).json({ error: 'Token expired' });
      return;
    }
    Logger.warn('[Auth] JWT verification failed:', error);
    res.status(401).json({ error: 'Invalid token' });
  }
}
