import { type Request, type Response, type NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
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
const JWKS_URL = SUPABASE_URL
  ? `${SUPABASE_URL}/auth/v1/.well-known/jwks.json`
  : null;
const EXPECTED_ISSUER = SUPABASE_URL ? `${SUPABASE_URL}/auth/v1` : undefined;
const EXPECTED_AUDIENCE = 'authenticated';

// HS256 fallback (legacy Supabase projects)
const RAW_SECRET = process.env.SUPABASE_JWT_SECRET;
const HS256_SECRET: Buffer | undefined = RAW_SECRET
  ? Buffer.from(RAW_SECRET, 'base64')
  : undefined;

// ── JWKS cache ─────────────────────────────────────────────────────────────

interface JwkKey {
  kid: string;
  kty: string;
  crv: string;
  x: string;
  y: string;
}

/** PEM cache keyed by `kid`, with expiry timestamp. */
let jwksCache: Map<string, string> = new Map();
let jwksCacheExpiry = 0;
const JWKS_CACHE_TTL_MS = 600_000; // 10 min

/**
 * Fetch JWKS from Supabase and convert EC JWK keys to PEM format.
 * Uses Node's built-in crypto.createPublicKey (no external deps).
 */
async function fetchAndCacheJwks(): Promise<void> {
  if (!JWKS_URL) throw new Error('SUPABASE_URL not configured');

  const res = await fetch(JWKS_URL);
  if (!res.ok) throw new Error(`JWKS fetch failed: ${res.status}`);

  const { keys } = (await res.json()) as { keys: JwkKey[] };
  const newCache = new Map<string, string>();

  for (const key of keys) {
    if (key.kty === 'EC' && key.crv === 'P-256') {
      const pubKey = crypto.createPublicKey({
        key: {
          kty: key.kty,
          crv: key.crv,
          x: key.x,
          y: key.y,
        },
        format: 'jwk',
      });
      newCache.set(key.kid, pubKey.export({ type: 'spki', format: 'pem' }) as string);
    }
  }

  jwksCache = newCache;
  jwksCacheExpiry = Date.now() + JWKS_CACHE_TTL_MS;
  Logger.info(`[Auth] JWKS cached: ${newCache.size} key(s)`);
}

/**
 * Get PEM public key for a given kid. Fetches JWKS if cache is stale.
 */
async function getPublicKey(kid: string): Promise<string> {
  if (Date.now() >= jwksCacheExpiry || !jwksCache.has(kid)) {
    await fetchAndCacheJwks();
  }

  const pem = jwksCache.get(kid);
  if (!pem) throw new Error(`Signing key not found for kid: ${kid}`);
  return pem;
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
    if (!JWKS_URL) {
      Logger.error('[Auth] SUPABASE_URL not configured for JWKS verification');
      res.status(500).json({ error: 'Auth not configured' });
      return;
    }

    const kid = header.kid;
    if (!kid) {
      res.status(401).json({ error: 'Token missing kid header' });
      return;
    }

    getPublicKey(kid)
      .then(publicKey => {
        const decoded = jwt.verify(token, publicKey, {
          algorithms: ['ES256'],
          issuer: EXPECTED_ISSUER,
          audience: EXPECTED_AUDIENCE,
        }) as jwt.JwtPayload;

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
        issuer: EXPECTED_ISSUER,
        audience: EXPECTED_AUDIENCE,
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
 * Returns the authenticated user id populated by `requireAuth`.
 * Throws if a protected route is invoked without auth context.
 */
export function getRequiredAuthUserId(req: Request): string {
  if (!req.authUserId) {
    throw new Error('Authenticated request missing authUserId');
  }

  return req.authUserId;
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
