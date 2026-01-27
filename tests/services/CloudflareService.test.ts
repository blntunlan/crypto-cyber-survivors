import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { CloudflareService } from '../../services/system/CloudflareService';
import { Logger } from '../../services/system/Logger';

// Mock Logger
vi.mock('../../services/system/Logger', () => ({
  Logger: {
    warn: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
  },
}));

describe('CloudflareService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    CloudflareService.reset();

    // Default mock fetch
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ success: true }),
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should identify as disabled by default in test env (no env vars)', () => {
    expect(CloudflareService.isEnabled()).toBe(false);
  });

  it('should return empty prices when disabled', async () => {
    const prices = await CloudflareService.getLatestPrices();
    expect(prices).toEqual([]);
  });

  it('should verify price as valid when disabled (fail-open)', async () => {
    const result = await CloudflareService.verifyPrice('BTCUSDT', 50000, Date.now());
    expect(result.valid).toBe(true);
    expect(result.reason).toBe('DISABLED');
  });

  it('should generate local session ID when starting session while disabled', async () => {
    const response = await CloudflareService.startSession('player-1', 'BTC');
    expect(response).not.toBeNull();
    expect(response?.sessionId).toContain('local_');
    expect(CloudflareService.getCurrentSessionId()).toBe(response?.sessionId);
  });

  it('should validate session locally when ending while disabled', async () => {
    await CloudflareService.startSession('player-1', 'BTC');
    const sessionId = CloudflareService.getCurrentSessionId();

    const result = await CloudflareService.endSession({
      playerId: 'player-1',
      cryptoPair: 'BTC',
      position: 'LONG',
      leverage: 10,
      entryPrice: 50000,
      exitPrice: 51000,
      endTime: Date.now(),
      pnlPercent: 2,
      level: 5,
      kills: 100,
      survivalTime: 300,
    });

    expect(result.valid).toBe(true);
    expect(result.sessionId).toBe(sessionId);
    expect(result.reason).toBe('LOCAL');
    expect(CloudflareService.getCurrentSessionId()).toBeNull();
  });

  it('should return error when ending session with no active session', async () => {
    const result = await CloudflareService.endSession({} as any);
    expect(result.valid).toBe(false);
    expect(result.reason).toBe('NO_ACTIVE_SESSION');
  });

  describe('Enabled State (with env vars)', () => {
    beforeEach(() => {
      // Manually overwrite private state for testing
      (CloudflareService as any).enabled = true;
      (CloudflareService as any).workerUrls = {
        PRICE_ORACLE: 'https://oracle.test',
        SESSION_VALIDATOR: 'https://validator.test',
      };
    });

    it('should fetch prices from oracle when enabled', async () => {
      const mockPrices = [{ pair: 'BTC', price: 50000, timestamp: Date.now() }];
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockPrices),
      });

      const prices = await CloudflareService.getLatestPrices();
      expect(prices).toEqual(mockPrices);
      expect(global.fetch).toHaveBeenCalledWith('https://oracle.test/prices');
    });

    it('should verify price via oracle when enabled', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ valid: true }),
      });

      const result = await CloudflareService.verifyPrice('BTC', 50000, 123456);
      expect(result.valid).toBe(true);
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('oracle.test/verify')
      );
    });

    it('should start session via validator when enabled', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ sessionId: 'remote-123', startTime: 1000 }),
      });

      const response = await CloudflareService.startSession('player-1', 'BTC');
      expect(response?.sessionId).toBe('remote-123');
      expect(global.fetch).toHaveBeenCalledWith(
        'https://validator.test/start',
        expect.anything()
      );
    });

    it('should end session via validator when enabled', async () => {
      // Setup active session
      (CloudflareService as any).currentSessionId = 'remote-123';
      (CloudflareService as any).sessionStartTime = 1000;

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ valid: true, sessionId: 'remote-123' }),
      });

      const result = await CloudflareService.endSession({
        endTime: 2000,
      } as any);

      expect(result.valid).toBe(true);
      expect(global.fetch).toHaveBeenCalledWith(
        'https://validator.test/end',
        expect.anything()
      );
    });

    it('should handle API errors by falling back or returning empty', async () => {
      global.fetch = vi.fn().mockResolvedValue({ ok: false, status: 500 });

      const prices = await CloudflareService.getLatestPrices();
      expect(prices).toEqual([]);
      expect(Logger.error).toHaveBeenCalled();
    });
  });

  it('should return null for session status when disabled', async () => {
    (CloudflareService as any).enabled = false;
    const status = await CloudflareService.getSessionStatus('any-id');
    expect(status).toBeNull();
  });

  it('should return false for triggerPriceFetch when disabled', async () => {
    (CloudflareService as any).enabled = false;
    const result = await CloudflareService.triggerPriceFetch();
    expect(result).toBe(false);
  });
});
