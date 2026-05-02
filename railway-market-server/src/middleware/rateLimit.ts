import rateLimit from 'express-rate-limit';

import { ipKeyGenerator } from 'express-rate-limit';
import { type Request, type Response } from 'express';

// Shared key generator — respects proxied IPs
const keyGenerator = (req: Request, _res: Response) => {
  const forwarded = req.headers['x-forwarded-for'];
  const forwardedStr = Array.isArray(forwarded) ? forwarded[0] : forwarded;
  if (forwardedStr) {
    const ip = forwardedStr.split(',')[0]?.trim();
    if (ip) {
      if (ip.startsWith('::ffff:')) {
        return ip.substring(7);
      }
      return ipKeyGenerator(ip);
    }
  }
  return ipKeyGenerator(req.ip ?? 'unknown');
};

// Global rate limiter - 100 req/min per IP
export const globalLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later' },
  keyGenerator,
});

// Auth routes - stricter: 20 req/min per IP
export const authLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many auth attempts, please try again later' },
  keyGenerator,
});

// Write routes - 50 req/min per IP
export const writeLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 50,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many write requests, please try again later' },
  keyGenerator,
});

// Telemetry - 10 req/min per IP
export const telemetryLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many telemetry requests' },
  keyGenerator,
});

// Leaderboard - 30 req/min per IP
export const leaderboardLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many leaderboard requests' },
  keyGenerator,
});
