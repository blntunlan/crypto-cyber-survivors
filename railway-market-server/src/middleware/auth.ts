import { type Request, type Response, type NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import jwksClient from 'jwks-rsa';
import { Logger } from '../utils/logger';

// Extend Express Request to include authUserId
declare module 'express-serve-static-core' {
  interface Request {
    authUserId?: string;
  }
}

// ── Key configuration ──────────────────────────────────────────────────────
//
// New Supabase projects sign JWTs with ES256 (asymmetric ECDSA).
// Legacy projects use HS256 (symmetric HMAC with a shared secret).
//
// We support BOTH algorithms so the server works regardless of which
// Supabase project is connected:
//   • ES256 → public key fetched from Supabase JWKS endpoint (cached)
//   • HS256 → decoded from SUPABASE_JWT_SECRET env var
// ────────────────────────────────────────────────────────────────────────────

const SUPABASE_URL = process.env.SUPABASE_URL;

// JWKS client for ES256 verification (new Supabase projects)
const jwks = SUPABASE_URL
  ? jwksClient({
      jwksUri: `${SUPABASE_URL}/auth/v1/.well-known/jwks.json`,
      cache: true,
      cacheMaxAge: 600_000, // 10 min
      rateLimit: true,
      jwksRequestsPerMinute: 5,
    })
  : null;

// HS256 fallback (legacy Supabase projects)
const RAW_SECRET = process.env.SUPABASE_JWT_SECRET;
const HS256_SECRET: Buffer | undefined = RAW_SECRET
  ? Buffer.from(RAW_SECRET, 'base64')
  : undefined;

/**
 * Retrieve the signing key for a given JWT `kid` from the JWKS endpoint.
 */
function getJwksSigningKey(kid: string): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!jwks) {
      reject(new Error('JWKS client not configured'));
      return;
    }
    jwks.getSigningKey(kid, (err, key) => {
      if (err || !key) {
        reject(err ?? new Error('Signing key not found'));
        return;
      }
      resolve(key.getPublicKey());
    });
  });
}

/**
 * Middleware to verify Supabase JWT tokens.
 * Supports both ES256 (JWKS) and HS256 (shared secret).
 * Extracts the `sub` claim (Supabase Auth user ID) and sets `req.authUserId`.
 */
export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Missing or invalid Authorization header' });
    return;
  }

  const token = authHeader.slice(7);

  // Decode header to determine algorithm
  const header = jwt.decode(token, { complete: true })?.header;

  if (!header) {
    res.status(401).json({ error: 'Malformed token' });
    return;
  }

  if (header.alg === 'ES256') {
    // ── ES256 path (new Supabase projects) ──────────────────────────────
    if (!jwks) {
      Logger.error('[Auth] SUPABASE_URL not configured for JWKS verification');
      res.status(500).json({ error: 'Auth not configured' });
      return;
    }

    const kid = header.kid;
    if (!kid) {
      res.status(401).json({ error: 'Token missing kid header' });
      return;
    }

    getJwksSigningKey(kid)
      .then(publicKey => {
        const decoded = jwt.verify(token, publicKey, {
          algorithms: ['ES256'],
        }) as jwt.JwtPayload;
        return decoded;
      })
      .then(decoded => {
        const sub = decoded.sub;
        if (!sub || typeof sub !== 'string') {
          res.status(401).json({ error: 'Invalid token: missing sub claim' });
          return;
        }
        req.authUserId = sub;
        next();
      })
      .catch((error: unknown) => {
        handleJwtError(error, res);
      });
  } else if (header.alg === 'HS256') {
    // ── HS256 path (legacy Supabase projects) ───────────────────────────
    if (!HS256_SECRET) {
      Logger.error('[Auth] SUPABASE_JWT_SECRET not configured');
      res.status(500).json({ error: 'Auth not configured' });
      return;
    }

    try {
      const decoded = jwt.verify(token, HS256_SECRET, {
        algorithms: ['HS256'],
      }) as jwt.JwtPayload;
      const sub = decoded.sub;

      if (!sub || typeof sub !== 'string') {
        res.status(401).json({ error: 'Invalid token: missing sub claim' });
        return;
      }

      req.authUserId = sub;
      next();
    } catch (error) {
      handleJwtError(error, res);
    }
  } else {
    Logger.warn(`[Auth] Unsupported JWT algorithm: ${header.alg}`);
    res.status(401).json({ error: 'Unsupported token algorithm' });
  }
}

/**
 * Shared error handler for JWT verification failures.
 */
function handleJwtError(error: unknown, res: Response): void {
  if (error instanceof jwt.TokenExpiredError) {
    Logger.warn('[Auth] Token expired at:', error.expiredAt);
    res.status(401).json({ error: 'Token expired' });
    return;
  }
  if (error instanceof jwt.JsonWebTokenError) {
    Logger.warn(`[Auth] JWT error: ${error.message}`);
    res.status(401).json({ error: 'Invalid token' });
    return;
  }
  Logger.error('[Auth] Unexpected JWT verification error:', error);
  res.status(401).json({ error: 'Invalid token' });
}
