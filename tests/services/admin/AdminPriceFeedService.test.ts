import { describe, it, expect, vi, beforeEach } from 'vitest';
import { adminPriceFeed } from '../../../services/admin/AdminPriceFeedService';
import { MarketService } from '../../../services/market/MarketService';
import { Logger } from '../../../services/system/Logger';

// Mock Dependencies
const mockMarketServiceInstance = {
  connect: vi.fn(),
  destroy: vi.fn(),
  isConnected: vi.fn().mockReturnValue(true),
};

vi.mock('../../../services/market/MarketService', () => ({
  MarketService: vi.fn().mockImplementation(function () {
    return mockMarketServiceInstance;
  }),
}));

vi.mock('../../../services/system/Logger', () => ({
  Logger: {
    info: vi.fn(),
    debug: vi.fn(),
  },
}));

describe('AdminPriceFeedService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    adminPriceFeed.stop(); // Reset state
  });

  it('should start services for all pairs', () => {
    adminPriceFeed.start();
    expect(MarketService).toHaveBeenCalledTimes(3); // BTC, ETH, SOL
    expect(adminPriceFeed.isActive()).toBe(true);
  });

  it('should not start multiple times if already running', () => {
    adminPriceFeed.start();
    adminPriceFeed.start();
    expect(Logger.debug).toHaveBeenCalledWith(
      expect.stringContaining('Already running')
    );
  });

  it('should stop all services and clear map', () => {
    adminPriceFeed.start();
    adminPriceFeed.stop();
    expect(adminPriceFeed.isActive()).toBe(false);
    expect(adminPriceFeed.getStatus()).toEqual({
      BTC: false,
      ETH: false,
      SOL: false,
    });
  });

  it('should return correct connection status', () => {
    adminPriceFeed.start();
    const status = adminPriceFeed.getStatus();
    expect(status.BTC).toBe(true);
    expect(status.ETH).toBe(true);
    expect(status.SOL).toBe(true);
  });
});
