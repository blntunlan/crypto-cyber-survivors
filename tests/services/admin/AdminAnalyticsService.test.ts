import { vi } from 'vitest';

// Mock Supabase module - simple version since we will use spyOn
vi.mock('../../../services/core/Supabase', () => ({
  supabase: {
    rpc: vi.fn(),
    from: vi.fn(),
  },
  isSupabaseConfigured: vi.fn().mockReturnValue(true),
}));

import { describe, it, expect, beforeEach } from 'vitest';
import { supabase } from '../../../services/core/Supabase';
import { adminAnalytics } from '../../../services/admin/AdminAnalyticsService';
import { Logger } from '../../../services/system/Logger';

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

  it('should fetch market health via RPC', async () => {
    const mockHealth = { status: 'healthy', delay_seconds: 5 };
    const rpcSpy = vi
      .spyOn(supabase as any, 'rpc')
      .mockResolvedValue({ data: [mockHealth], error: null } as any);

    const result = await adminAnalytics.getMarketHealth();
    expect(result).toEqual(mockHealth);
    expect(rpcSpy).toHaveBeenCalledWith('get_market_health_status');
  });

  it('should fetch error summary from view', async () => {
    const mockSummary = [{ error_type: 'test', occurrences: 10 }];
    const selectMock = vi.fn().mockResolvedValue({ data: mockSummary, error: null });
    const fromSpy = vi
      .spyOn(supabase as any, 'from')
      .mockReturnValue({ select: selectMock } as any);

    const result = await adminAnalytics.getErrorSummary();
    expect(result).toEqual(mockSummary);
    expect(fromSpy).toHaveBeenCalledWith('v_error_summary');
  });

  it('should resolve error by updating table', async () => {
    const eqMock = vi.fn().mockResolvedValue({ error: null });
    const updateMock = vi.fn().mockReturnValue({ eq: eqMock });
    vi.spyOn(supabase as any, 'from').mockReturnValue({
      update: updateMock,
    } as any);

    const result = await adminAnalytics.resolveError('test-error');
    expect(result).toBe(true);
    expect(updateMock).toHaveBeenCalledWith({ status: 'resolved' });
  });

  it('should handle errors gracefully', async () => {
    vi.spyOn(supabase as any, 'rpc').mockRejectedValue(new Error('Crashed'));
    const result = await adminAnalytics.getMarketHealth();
    expect(result).toBeNull();
    expect(Logger.error).toHaveBeenCalled();
  });
});
