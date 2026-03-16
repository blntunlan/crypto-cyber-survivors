import { describe, it, expect, beforeEach, vi } from 'vitest';
import { adminAnalytics } from '../../../services/admin/AdminAnalyticsService';

// Mock Logger
vi.mock('../../../services/system/Logger', () => ({
  Logger: {
    info: vi.fn(),
    error: vi.fn(),
  },
}));

describe('AdminAnalyticsService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return null for market health (not yet implemented via Railway)', async () => {
    const result = await adminAnalytics.getMarketHealth();
    expect(result).toBeNull();
  });

  it('should return empty array for error summary (not yet implemented via Railway)', async () => {
    const result = await adminAnalytics.getErrorSummary();
    expect(result).toEqual([]);
  });

  it('should return false for resolveError (not yet implemented via Railway)', async () => {
    const result = await adminAnalytics.resolveError('test-error');
    expect(result).toBe(false);
  });
});
