import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  CoinService,
  CoinCalculator,
  MockCoinProvider,
  type ICoinProvider,
  type CoinCalculation,
} from '../../services/CoinService';
import { EventBus } from '../../services/EventBus';

// Mock dependencies
vi.mock('../../services/EventBus', () => ({
  EventBus: {
    emit: vi.fn(),
  },
}));

vi.mock('../../services/Logger', () => ({
  Logger: {
    info: vi.fn(),
    debug: vi.fn(),
    warn: vi.fn(),
  },
}));

describe('CoinService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    CoinService.resetSession();
    // Reset to mock provider
    const mockProvider = new MockCoinProvider();
    CoinService.setProvider(mockProvider);
  });

  describe('Calculator', () => {
    it('should calculate coin rewards correctly', () => {
      const calculator = new CoinCalculator();
      const params = {
        survivalTimeSeconds: 60, // 60s * 2 = 120
        kills: 10, // 10 * 5 = 50
        level: 2, // 2 * 50 = 100
        pnl: 0.1, // 10% * 100 = 10
        maxStreak: 25, // 2 milestones * 25 = 50
      };

      const result: CoinCalculation = calculator.calculate(params);

      expect(result.base).toBe(120);
      expect(result.killBonus).toBe(50);
      expect(result.levelBonus).toBe(100);
      expect(result.marketBonus).toBe(1000);
      expect(result.streakBonus).toBe(50);
      expect(result.total).toBe(120 + 50 + 100 + 1000 + 50);
    });

    it('should ignore negative PnL for market bonus', () => {
      const calculator = new CoinCalculator();
      const params = {
        survivalTimeSeconds: 10,
        kills: 0,
        level: 1,
        pnl: -0.5, // Loss
        maxStreak: 0,
      };

      const result = calculator.calculate(params);
      expect(result.marketBonus).toBe(0);
    });

    it('should cap streak bonus', () => {
      const calculator = new CoinCalculator();
      // Max bonus is 250 (10 milestones)
      const params = {
        survivalTimeSeconds: 0,
        kills: 0,
        level: 0,
        pnl: 0,
        maxStreak: 200, // 20 milestones -> 20 * 25 = 500 > 250 cap
      };

      const result = calculator.calculate(params);
      expect(result.streakBonus).toBe(250);
    });
  });

  describe('Provider Management', () => {
    it('should allow setting a custom provider', () => {
      const customProvider: ICoinProvider = {
        id: 'custom',
        isRealCurrency: true,
        getBalance: vi.fn().mockResolvedValue(1000),
        credit: vi.fn().mockResolvedValue(true),
      };

      CoinService.setProvider(customProvider);
      const info = CoinService.getProviderInfo();

      expect(info.id).toBe('custom');
      expect(info.isRealCurrency).toBe(true);
    });

    it('should mock provider logic including getBalance and credit', async () => {
      const mockProvider = new MockCoinProvider();
      CoinService.setProvider(mockProvider);

      await CoinService.creditCoins(100, 'kill_bonus');
      const balance = await CoinService.getBalance();

      expect(balance).toBe(100);
    });
  });

  describe('Session Management', () => {
    it('should track session coins', async () => {
      await CoinService.creditCoins(50, 'level_bonus');
      expect(CoinService.getSessionCoins()).toBe(50);

      await CoinService.creditCoins(25, 'streak_bonus');
      expect(CoinService.getSessionCoins()).toBe(75);
    });

    it('should reset session coins', async () => {
      await CoinService.creditCoins(50, 'level_bonus');
      CoinService.resetSession();
      expect(CoinService.getSessionCoins()).toBe(0);
    });

    it('should emit xpGained event on credit', async () => {
      await CoinService.creditCoins(100, 'cycle_complete');
      // Note: The service emits 'xpGained' reusing it via: EventBus.emit('xpGained', { amount });
      expect(EventBus.emit).toHaveBeenCalledWith('xpGained', { amount: 100 });
    });
  });
});
