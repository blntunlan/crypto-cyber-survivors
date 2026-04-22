import rateLimit from 'express-rate-limit';

// Shared key generator — respects proxied IPs
const keyGenerator = (req: { headers: Record<string, string | string[] | undefined>; ip?: string }) => {
  const forwarded = req.headers['x-forwarded-for'];
  const forwardedStr = Array.isArray(forwarded) ? forwarded[0] : forwarded;
  let ip = forwardedStr?.split(',')[0]?.trim() || req.ip || 'unknown';
  // Normalize IPv6 mapped IPv4
  if (ip.startsWith('::ffff:')) {
    ip = ip.substring(7);
  }
  return ip;
};

const validateOptions = { xForwardedForHeader: false };

// Global rate limiter - 100 req/min per IP
export const globalLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later' },
  keyGenerator,
  validate: { xForwardedForHeader: false, default: false, ip: false },
});

// Auth routes - stricter: 20 req/min per IP
export const authLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many auth attempts, please try again later' },
  keyGenerator,
  validate: { xForwardedForHeader: false, default: false, ip: false },
});

// Write routes - 50 req/min per IP
export const writeLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 50,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many write requests, please try again later' },
  keyGenerator,
  validate: { xForwardedForHeader: false, default: false, ip: false },
});

// Telemetry - 10 req/min per IP
export const telemetryLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many telemetry requests' },
  keyGenerator,
  validate: { xForwardedForHeader: false, default: false, ip: false },
});

// Leaderboard - 30 req/min per IP
export const leaderboardLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many leaderboard requests' },
  keyGenerator,
  validate: { xForwardedForHeader: false, default: false, ip: false },
});
