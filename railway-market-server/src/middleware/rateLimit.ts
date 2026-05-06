import rateLimit from 'express-rate-limit';

/**
 * Rate limiters for API routes.
 *
 * No custom keyGenerator is needed — Express's `trust proxy` setting (set in
 * index.ts) ensures `req.ip` already resolves the real client IP from
 * X-Forwarded-For. express-rate-limit v7+ uses `req.ip` by default and
 * validates IPv6 addresses internally; a custom keyGenerator that manually
 * parses X-Forwarded-For triggers ERR_ERL_KEY_GEN_IPV6 on Railway's IPv6 infra.
 */

// Global rate limiter - 100 req/min per IP
export const globalLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later' },
});

// Auth routes - stricter: 20 req/min per IP
export const authLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many auth attempts, please try again later' },
});

// Write routes - 50 req/min per IP
export const writeLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 50,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many write requests, please try again later' },
});

// Telemetry - 10 req/min per IP
export const telemetryLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many telemetry requests' },
});

// Leaderboard - 30 req/min per IP
export const leaderboardLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many leaderboard requests' },
});
