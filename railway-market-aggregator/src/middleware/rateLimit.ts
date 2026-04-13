import rateLimit, { ipKeyGenerator } from 'express-rate-limit';

// Shared key generator — respects proxied IPs
const keyGenerator = (req: {
  headers: Record<string, string | string[] | undefined>;
  ip?: string;
}) => {
  const forwarded = req.headers['x-forwarded-for'];
  const forwardedStr = Array.isArray(forwarded) ? forwarded[0] : forwarded;
  const ip = forwardedStr?.split(',')[0]?.trim() ?? req.ip ?? 'unknown';
  // Use ipKeyGenerator helper for proper IPv6 handling (required by express-rate-limit v8.3+)
  return ipKeyGenerator(ip);
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
