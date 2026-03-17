import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SupabaseHealthService } from '../../../services/system/SupabaseHealthService';

const mockRailwayClient = {
  get: vi.fn(),
};

vi.mock('../../../services/api/RailwayClient', () => ({
  railwayClient: mockRailwayClient,
}));

vi.mock('../../../services/system/Logger', () => ({
  Logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  },
}));

describe('SupabaseHealthService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (SupabaseHealthService as any).reset();
  });

  it('should return healthy when Railway DB is connected', async () => {
    mockRailwayClient.get.mockResolvedValue({
      pipeline: { binanceConnected: true, dbConnected: true },
      database: { pool: { totalCount: 5, idleCount: 3, waitingCount: 0 } },
    });

    const result = await SupabaseHealthService.runHealthCheck();

    expect(result.status).toBe('healthy');
    expect(result.summary).toContain('connected');
  });

  it('should return unhealthy when Railway DB is disconnected', async () => {
    mockRailwayClient.get.mockResolvedValue({
      pipeline: { binanceConnected: false, dbConnected: false },
      database: { pool: { totalCount: 0, idleCount: 0, waitingCount: 0 } },
    });

    const result = await SupabaseHealthService.runHealthCheck();

    expect(result.status).toBe('unhealthy');
    expect(result.summary).toContain('disconnected');
  });

  it('should return unhealthy when Railway API is unreachable', async () => {
    mockRailwayClient.get.mockRejectedValue(new Error('Network error'));

    const result = await SupabaseHealthService.runHealthCheck();

    expect(result.status).toBe('unhealthy');
    expect(result.summary).toContain('UNHEALTHY');
  });

  it('should ping Railway health endpoint', async () => {
    mockRailwayClient.get.mockResolvedValue({ status: 'ok' });

    const result = await SupabaseHealthService.ping();

    expect(result.ok).toBe(true);
    expect(result.latencyMs).toBeGreaterThanOrEqual(0);
  });

  it('should return failed ping when Railway is unreachable', async () => {
    mockRailwayClient.get.mockRejectedValue(new Error('Connection refused'));

    const result = await SupabaseHealthService.ping();

    expect(result.ok).toBe(false);
    expect(result.latencyMs).toBe(-1);
  });

  it('should validate individual tables (stub always returns valid)', async () => {
    const result = await SupabaseHealthService.validateTable('profiles');

    expect(result.valid).toBe(true);
    expect(result.issues).toHaveLength(0);
  });

  it('should store and return last health check result', async () => {
    expect(SupabaseHealthService.getLastResult()).toBeNull();

    mockRailwayClient.get.mockResolvedValue({
      pipeline: { binanceConnected: true, dbConnected: true },
      database: { pool: { totalCount: 5, idleCount: 3, waitingCount: 0 } },
    });

    await SupabaseHealthService.runHealthCheck();

    const lastResult = SupabaseHealthService.getLastResult();
    expect(lastResult).not.toBeNull();
    expect(lastResult?.status).toBe('healthy');
  });
});
