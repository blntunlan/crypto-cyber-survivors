import { describe, it, expect } from 'vitest';
import { ipKeyGenerator } from 'express-rate-limit';
import type { Request } from 'express';
import {
  globalLimiter,
  historyLimiter,
  rateLimitKeyGenerator,
} from '../../src/middleware/rateLimit';

describe('Aggregator Rate Limiters', () => {
  it('globalLimiter should be defined', () => {
    expect(globalLimiter).toBeDefined();
    expect(typeof globalLimiter).toBe('function');
  });

  it('historyLimiter should be defined', () => {
    expect(historyLimiter).toBeDefined();
    expect(typeof historyLimiter).toBe('function');
  });

  it('uses express-rate-limit ipKeyGenerator for IPv6-safe keys', () => {
    const req = { ip: '2001:db8:abcd:0012::1' } as Request;
    expect(rateLimitKeyGenerator(req)).toBe(ipKeyGenerator(req.ip ?? ''));
  });
});
