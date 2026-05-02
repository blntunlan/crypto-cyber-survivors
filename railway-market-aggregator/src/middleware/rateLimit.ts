import rateLimit from 'express-rate-limit';

import { ipKeyGenerator } from 'express-rate-limit';

import { type Request, type Response } from 'express';

// Shared key generator — respects proxied IPs
const keyGenerator = (req: Request, res: Response) => {
  const forwarded = req.headers['x-forwarded-for'];
  const forwardedStr = Array.isArray(forwarded) ? forwarded[0] : forwarded;
  if (forwardedStr) {
    const ip = forwardedStr.split(',')[0]?.trim();
    if (ip) {
      if (ip.startsWith('::ffff:')) {
        return ip.substring(7);
      }
      return ip;
    }
  }
  return ipKeyGenerator(req, res);
};

// Global rate limiter - 60 req/min per IP (aggregator has fewer endpoints)
export const globalLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later' },
  keyGenerator,
});

// History endpoint - 30 req/min per IP
export const historyLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many history requests, please try again later' },
  keyGenerator,
});
