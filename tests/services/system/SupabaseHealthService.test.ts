import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SupabaseHealthService } from '../../../services/system/SupabaseHealthService';
import { supabase, isSupabaseConfigured } from '../../../services/supabase/client';

vi.mock('../../../services/supabase/client', () => ({
  supabase: {
    from: vi.fn(),
  },
  isSupabaseConfigured: vi.fn(),
}));

vi.mock('../../../services/system/Logger', () => ({
  Logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  },
}));

vi.mock('../../../services/core/EventBus', () => ({
  EventBus: {
    emit: vi.fn(),
    on: vi.fn(),
  },
}));

describe('SupabaseHealthService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (SupabaseHealthService as any).reset();
  });

  const createMockChain = (data: any, error: any = null, count: number = 0) => {
    const chain = {
      select: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      gt: vi.fn().mockReturnThis(),
      lt: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      neq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data, error }),
      maybeSingle: vi.fn().mockResolvedValue({ data, error }),
      then: (resolve: any) => resolve({ data, error, count }),
    };
    return chain;
  };

  it('should return unhealthy if Supabase is not configured', async () => {
    (isSupabaseConfigured as any).mockReturnValue(false);

    const result = await SupabaseHealthService.runHealthCheck();

    expect(result.status).toBe('unhealthy');
    expect(result.summary).toContain('Supabase not configured');
  });

  it('should return healthy if all checks pass', async () => {
    (isSupabaseConfigured as any).mockReturnValue(true);

    (supabase.from as any).mockImplementation((table: string) => {
      if (table === 'schema_versions') {
        return createMockChain({ version: '1.0.0' }, null, 1);
      }
      return createMockChain([], null, 10); // Assume tables exist and have rows
    });

    const result = await SupabaseHealthService.runHealthCheck();

    expect(result.status).toBe('healthy');
  });

  it('should detect missing tables', async () => {
    (isSupabaseConfigured as any).mockReturnValue(true);

    (supabase.from as any).mockImplementation((table: string) => {
      if (table === 'profiles') {
        return createMockChain(null, { message: 'Table not found' }, 0);
      }
      return createMockChain([], null, 1);
    });

    const result = await SupabaseHealthService.runHealthCheck();

    expect(result.status).toBe('unhealthy');
    expect(
      result.recommendations.some(
        r => r.includes('Missing tables') && r.includes('profiles')
      )
    ).toBe(true);
  });

  it('should detect slow queries', async () => {
    (isSupabaseConfigured as any).mockReturnValue(true);

    // Mock performance.now to simulate delay
    let callCount = 0;
    const originalNow = global.performance.now;
    global.performance.now = vi.fn(() => {
      callCount++;
      return callCount * 600; // Each call adds 600ms
    });

    (supabase.from as any).mockReturnValue(
      createMockChain({ version: '1.0.0' }, null, 1)
    );

    const result = await SupabaseHealthService.runHealthCheck();

    expect(result.status).toBe('degraded');
    expect(result.recommendations.some(r => r.includes('Slow queries detected'))).toBe(
      true
    );

    global.performance.now = originalNow;
  });

  it('should validate individual tables', async () => {
    (isSupabaseConfigured as any).mockReturnValue(true);

    (supabase.from as any).mockReturnValue(createMockChain([], null, 10));

    const result = await SupabaseHealthService.validateTable('profiles');

    expect(result.valid).toBe(true);
    expect(result.issues).toHaveLength(0);
  });
});
