import { describe, it, expect } from 'vitest';
import {
  globalLimiter,
  authLimiter,
  writeLimiter,
  telemetryLimiter,
  leaderboardLimiter,
} from '../../src/middleware/rateLimit';

describe('Rate Limiters', () => {
  it('globalLimiter should be defined and be a function', () => {
    expect(globalLimiter).toBeDefined();
    expect(typeof globalLimiter).toBe('function');
  });

  it('authLimiter should be defined', () => {
    expect(authLimiter).toBeDefined();
    expect(typeof authLimiter).toBe('function');
  });

  it('writeLimiter should be defined', () => {
    expect(writeLimiter).toBeDefined();
    expect(typeof writeLimiter).toBe('function');
  });

  it('telemetryLimiter should be defined', () => {
    expect(telemetryLimiter).toBeDefined();
    expect(typeof telemetryLimiter).toBe('function');
  });

  it('leaderboardLimiter should be defined', () => {
    expect(leaderboardLimiter).toBeDefined();
    expect(typeof leaderboardLimiter).toBe('function');
  });
});
