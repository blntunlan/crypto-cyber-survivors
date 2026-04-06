import { describe, it, expect } from 'vitest';
import { globalLimiter, historyLimiter } from '../../src/middleware/rateLimit';

describe('Aggregator Rate Limiters', () => {
  it('globalLimiter should be defined', () => {
    expect(globalLimiter).toBeDefined();
    expect(typeof globalLimiter).toBe('function');
  });

  it('historyLimiter should be defined', () => {
    expect(historyLimiter).toBeDefined();
    expect(typeof historyLimiter).toBe('function');
  });
});
