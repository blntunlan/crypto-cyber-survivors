import rateLimit, { ipKeyGenerator } from 'express-rate-limit';
import type { Request } from 'express';

// Shared key generator — Express resolves proxied IPs via app.set('trust proxy', 1).
export const rateLimitKeyGenerator = (req: Request): string => {
  return ipKeyGenerator(req.ip ?? 'unknown');
};

// Global rate limiter - 60 req/min per IP (aggregator has fewer endpoints)
export const globalLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later' },
  keyGenerator: rateLimitKeyGenerator,
});

// History endpoint - 30 req/min per IP
export const historyLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many history requests, please try again later' },
  keyGenerator: rateLimitKeyGenerator,
});
