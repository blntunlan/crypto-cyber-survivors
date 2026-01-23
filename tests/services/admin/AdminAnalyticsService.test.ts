import { describe, it, expect, vi, beforeEach } from 'vitest';
import { adminAnalytics } from '../../../services/admin/AdminAnalyticsService';
import { Logger } from '../../../services/Logger';

// Mock Logger
vi.mock('../../../services/Logger', () => ({
  Logger: {
    error: vi.fn(),
  },
}));

// Mock dynamic import of Supabase
const mockSupabase = {
  rpc: vi.fn(),
  from: vi.fn().mockReturnThis(),
  select: vi.fn().mockReturnThis(),
  update: vi.fn().mockReturnThis(),
  eq: vi.fn().mockReturnThis(),
};

vi.mock('../../../services/Supabase', () => ({
  supabase: mockSupabase,
}));

describe('AdminAnalyticsService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should fetch market health via RPC', async () => {
    const mockHealth = { status: 'healthy', delay_seconds: 5 };
    mockSupabase.rpc.mockResolvedValue({ data: mockHealth, error: null });

    const result = await adminAnalytics.getMarketHealth();
    expect(result).toEqual(mockHealth);
    expect(mockSupabase.rpc).toHaveBeenCalledWith('get_market_health_status');
  });

  it('should fetch error summary from view', async () => {
    const mockSummary = [{ error_type: 'test', occurrences: 10 }];
    mockSupabase.from.mockReturnThis();
    mockSupabase.select.mockResolvedValue({ data: mockSummary, error: null });

    const result = await adminAnalytics.getErrorSummary();
    expect(result).toEqual(mockSummary);
    expect(mockSupabase.from).toHaveBeenCalledWith('v_error_summary');
  });

  it('should resolve error by updating table', async () => {
    mockSupabase.from.mockReturnThis();
    mockSupabase.update.mockReturnThis();
    mockSupabase.eq.mockResolvedValue({ error: null });

    const result = await adminAnalytics.resolveError('test-error');
    expect(result).toBe(true);
    expect(mockSupabase.update).toHaveBeenCalledWith({ status: 'resolved' });
  });

  it('should handle errors gracefully', async () => {
    mockSupabase.rpc.mockRejectedValue(new Error('Crashed'));
    const result = await adminAnalytics.getMarketHealth();
    expect(result).toBeNull();
    expect(Logger.error).toHaveBeenCalled();
  });
});
