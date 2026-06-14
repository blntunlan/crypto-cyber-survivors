import { describe, it, expect, vi, beforeEach } from 'vitest';
import { IndicatorService } from '../../src/services/indicatorService';
import { Logger } from '../../src/utils/logger';

const mockDatabase = {
  updateMarketState: vi.fn().mockResolvedValue(undefined),
};

vi.mock('../../src/services/databaseService', () => ({
  DatabaseService: {
    getInstance: vi.fn(() => mockDatabase),
  },
}));

vi.mock('../../src/utils/logger', () => ({
  Logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

describe('IndicatorService', () => {
  let service: IndicatorService;

  beforeEach(() => {
    vi.clearAllMocks();
    mockDatabase.updateMarketState.mockResolvedValue(undefined);
    (IndicatorService as any).instance = null;
    service = IndicatorService.getInstance();
  });

  it('should be a singleton', () => {
    const firstService = IndicatorService.getInstance();
    const secondService = IndicatorService.getInstance();
    expect(firstService).toBe(secondService);
  });

  it('should initialize with supported pairs', () => {
    const stats = service.getStats();
    const pairs = stats.pairs.map(pairStats => pairStats.pair);
    expect(pairs).toContain('BTC');
    expect(pairs).toContain('ETH');
    expect(pairs).toContain('SOL');
    expect(stats.updates).toBe(0);
  });

  it('should update indicators for a valid pair', async () => {
    const data = {
      pair: 'BTC',
      price: 50000,
      high: 51000,
      low: 49000,
      volume: 1000,
    };

    await service.update(data);

    expect(mockDatabase.updateMarketState).toHaveBeenCalled();

    const stats = service.getStats();
    expect(stats.updates).toBe(1);
    expect(stats.errors).toBe(0);
  });

  it('should handle unknown pairs gracefully', async () => {
    const data = {
      pair: 'DOGE',
      price: 1,
      high: 1.1,
      low: 0.9,
      volume: 1000,
    };

    await service.update(data);
    expect(Logger.warn).toHaveBeenCalledWith(expect.stringContaining('Unknown pair'));

    const stats = service.getStats();
    expect(stats.updates).toBe(0);
  });

  it('should handle update errors gracefully', async () => {
    mockDatabase.updateMarketState.mockRejectedValueOnce(new Error('DB Error'));

    const data = {
      pair: 'BTC',
      price: 50000,
      high: 51000,
      low: 49000,
      volume: 1000,
    };

    await service.update(data);
    expect(Logger.error).toHaveBeenCalled();

    const stats = service.getStats();
    expect(stats.errors).toBe(1);
  });

  describe('Whale Event Logging', () => {
    it('should log significant whale events', async () => {
      vi.mocked(Logger.info).mockClear();

      for (let index = 0; index < 30; index++) {
        await service.update({
          pair: 'BTC',
          price: 100,
          high: 101,
          low: 99,
          volume: 100,
        });
      }

      await service.update({
        pair: 'BTC',
        price: 100,
        high: 101,
        low: 99,
        volume: 10000,
      });

      expect(Logger.info).toHaveBeenCalledWith(expect.stringContaining('🐳'));
    });
  });
});
