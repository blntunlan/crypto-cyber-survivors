import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CoinService, MockCoinProvider } from '../../services/gameplay/CoinService';
import { RewardCalculator } from '../../services/gameplay/RewardCalculator';
import { EventBus } from '../../services/core/EventBus';

describe('CoinService System', () => {
  describe('RewardCalculator', () => {
    const calculator = new RewardCalculator({
      perSecond: 1,
      perKill: 10,
      perLevel: 100,
      pnlMultiplier: 100,
      streakMilestoneBonus: 50,
      maxStreakBonus: 500,
    });

    it('should calculate base survival reward', () => {
      const result = calculator.calculate({
        survivalTimeSeconds: 60,
        kills: 0,
        level: 0,
        pnl: 0,
        maxStreak: 0,
      });
      expect(result.base).toBe(60);
      expect(result.total).toBe(60);
    });

    it('should calculate kill and level bonuses', () => {
      const result = calculator.calculate({
        survivalTimeSeconds: 0,
        kills: 5,
        level: 2,
        pnl: 0,
        maxStreak: 0,
      });
      expect(result.killBonus).toBe(50);
      expect(result.levelBonus).toBe(200);
      expect(result.total).toBe(250);
    });

    it('should calculate market bonus only for positive PnL', () => {
      const positive = calculator.calculate({
        survivalTimeSeconds: 0,
        kills: 0,
        level: 0,
        pnl: 0.05,
        maxStreak: 0,
      });
      const negative = calculator.calculate({
        survivalTimeSeconds: 0,
        kills: 0,
        level: 0,
        pnl: -0.05,
        maxStreak: 0,
      });

      expect(positive.marketBonus).toBe(500); // 5% * 100 * 100
      expect(negative.marketBonus).toBe(0);
    });

    it('should calculate streak bonuses with a cap', () => {
      const result = calculator.calculate({
        survivalTimeSeconds: 0,
        kills: 0,
        level: 0,
        pnl: 0,
        maxStreak: 25, // 2 milestones
      });
      expect(result.streakBonus).toBe(100);

      const capped = calculator.calculate({
        survivalTimeSeconds: 0,
        kills: 0,
        level: 0,
        pnl: 0,
        maxStreak: 200, // many milestones
      });
      expect(capped.streakBonus).toBe(500); // capped at maxStreakBonus
    });
  });

  describe('MockCoinProvider', () => {
    it('should track balance and transactions', async () => {
      const provider = new MockCoinProvider();
      await provider.credit(100, 'achievement');

      expect(await provider.getBalance()).toBe(100);
      expect(provider.getTransactions()).toHaveLength(1);
      const tx = provider.getTransactions()[0];
      expect(tx).toBeDefined();
      expect(tx!.source).toBe('achievement');
    });
  });

  describe('CoinService', () => {
    beforeEach(() => {
      CoinService.resetSession();
      // Ensure we use a clean mock provider
      CoinService.setProvider(new MockCoinProvider());
    });

    it('should credit coins and track session total', async () => {
      const eventSpy = vi.fn();
      EventBus.on('xpGained', eventSpy);

      const success = await CoinService.creditCoins(50, 'kill_bonus');

      expect(success).toBe(true);
      expect(CoinService.getSessionCoins()).toBe(50);
      expect(await CoinService.getBalance()).toBe(50);
      expect(eventSpy).toHaveBeenCalledWith(expect.objectContaining({ amount: 50 }));
    });

    it('should allow switching providers', () => {
      const customProvider = {
        id: 'custom',
        isRealCurrency: true,
        getBalance: async () => 999,
        credit: async () => true,
      };

      CoinService.setProvider(customProvider as any);
      expect(CoinService.getProviderInfo().id).toBe('custom');
      expect(CoinService.getProviderInfo().isRealCurrency).toBe(true);
    });
  });
});
