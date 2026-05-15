import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { CoinService, MockCoinProvider } from '../../services/gameplay/CoinService';
import {
  MAX_REWARDABLE_LEVEL,
  RewardCalculator,
} from '../../services/gameplay/RewardCalculator';
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

    it('should cap rewardable level bonus', () => {
      const result = calculator.calculate({
        survivalTimeSeconds: 0,
        kills: 0,
        level: MAX_REWARDABLE_LEVEL + 50,
        pnl: 0,
        maxStreak: 0,
      });

      expect(result.levelBonus).toBe(MAX_REWARDABLE_LEVEL * 100);
      expect(result.total).toBe(MAX_REWARDABLE_LEVEL * 100);
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

  // =========================================================================
  // Feature Flag & Verification Queue Tests
  // =========================================================================

  describe('CoinService - Feature flag OFF (default)', () => {
    beforeEach(() => {
      vi.stubEnv('VITE_VERIFY_COINS_ONLY', '');
      CoinService.resetSession();
      CoinService.setProvider(new MockCoinProvider());
    });

    afterEach(() => {
      vi.unstubAllEnvs();
    });

    it('creditCoins() credits immediately via provider', async () => {
      const success = await CoinService.creditCoins(100, 'cycle_complete');

      expect(success).toBe(true);
      expect(CoinService.getSessionCoins()).toBe(100);
      expect(await CoinService.getBalance()).toBe(100);
    });

    it('does not add items to the pending queue', async () => {
      await CoinService.creditCoins(100, 'cycle_complete');

      expect(CoinService.getPendingVerifications()).toBe(0);
    });

    it('emits xpGained event on credit', async () => {
      const spy = vi.fn();
      EventBus.on('xpGained', spy);

      await CoinService.creditCoins(75, 'kill_bonus');

      expect(spy).toHaveBeenCalledWith(expect.objectContaining({ amount: 75 }));
    });
  });

  describe('CoinService - Feature flag ON (VITE_VERIFY_COINS_ONLY=true)', () => {
    beforeEach(() => {
      vi.stubEnv('VITE_VERIFY_COINS_ONLY', 'true');
      CoinService.resetSession();
      CoinService.setProvider(new MockCoinProvider());
    });

    afterEach(() => {
      vi.unstubAllEnvs();
    });

    it('creditCoins() does NOT credit immediately', async () => {
      await CoinService.creditCoins(200, 'cycle_complete');

      // Balance should remain 0 because coins are queued, not credited
      expect(await CoinService.getBalance()).toBe(0);
      // Session coins should also remain 0
      expect(CoinService.getSessionCoins()).toBe(0);
    });

    it('creditCoins() returns true (queued is treated as accepted)', async () => {
      const result = await CoinService.creditCoins(200, 'cycle_complete');
      expect(result).toBe(true);
    });

    it('adds to pending verification queue', async () => {
      await CoinService.creditCoins(200, 'cycle_complete', {
        sessionId: 'sess-1',
      });

      expect(CoinService.getPendingVerifications()).toBe(1);
    });

    it('emits verification:queued event', async () => {
      const spy = vi.fn();
      EventBus.on('verification:queued', spy);

      await CoinService.creditCoins(150, 'cycle_complete', {
        sessionId: 'sess-abc',
      });

      expect(spy).toHaveBeenCalledWith(
        expect.objectContaining({
          sessionId: 'sess-abc',
          amount: 150,
          source: 'cycle_complete',
        })
      );
    });

    it('does NOT emit xpGained when queuing', async () => {
      const spy = vi.fn();
      EventBus.on('xpGained', spy);

      await CoinService.creditCoins(100, 'cycle_complete');

      expect(spy).not.toHaveBeenCalled();
    });

    it('creditVerifiedCoins credits immediately even when verification queue is enabled', async () => {
      const spy = vi.fn();
      EventBus.on('xpGained', spy);

      const result = await CoinService.creditVerifiedCoins(120, 'cycle_complete', {
        sessionId: 'verified-session',
      });

      expect(result).toBe(true);
      expect(await CoinService.getBalance()).toBe(120);
      expect(CoinService.getSessionCoins()).toBe(120);
      expect(CoinService.getPendingVerifications()).toBe(0);
      expect(spy).toHaveBeenCalledWith(expect.objectContaining({ amount: 120 }));
    });

    it('generates a sessionId when metadata lacks one', async () => {
      const spy = vi.fn();
      EventBus.on('verification:queued', spy);

      await CoinService.creditCoins(50, 'kill_bonus');

      expect(spy).toHaveBeenCalledTimes(1);
      const emitted = spy.mock.calls[0]![0] as Record<string, unknown>;
      expect(emitted['sessionId']).toBeDefined();
      expect(typeof emitted['sessionId']).toBe('string');
      expect(CoinService.getPendingVerifications()).toBe(1);
    });

    it('queues multiple verifications independently', async () => {
      await CoinService.creditCoins(100, 'cycle_complete', {
        sessionId: 'sess-1',
      });
      await CoinService.creditCoins(200, 'cycle_complete', {
        sessionId: 'sess-2',
      });

      expect(CoinService.getPendingVerifications()).toBe(2);
    });
  });

  describe('CoinService - processVerificationResponse()', () => {
    beforeEach(() => {
      vi.stubEnv('VITE_VERIFY_COINS_ONLY', 'true');
      CoinService.resetSession();
      CoinService.setProvider(new MockCoinProvider());
    });

    afterEach(() => {
      vi.unstubAllEnvs();
    });

    it('verified: true credits the server-approved amount', async () => {
      await CoinService.creditCoins(200, 'cycle_complete', {
        sessionId: 'sess-v1',
      });

      await CoinService.processVerificationResponse('sess-v1', {
        verified: true,
        reward: 180, // server may approve a different amount
        metaShare: 20,
      });

      expect(await CoinService.getBalance()).toBe(180);
      expect(CoinService.getSessionCoins()).toBe(180);
    });

    it('verified: true emits verification:success with correct data', async () => {
      const spy = vi.fn();
      EventBus.on('verification:success', spy);

      await CoinService.creditCoins(200, 'cycle_complete', {
        sessionId: 'sess-v2',
      });

      await CoinService.processVerificationResponse('sess-v2', {
        verified: true,
        reward: 180,
        metaShare: 20,
      });

      expect(spy).toHaveBeenCalledWith(
        expect.objectContaining({
          sessionId: 'sess-v2',
          requestedAmount: 200,
          verifiedAmount: 180,
          metaShare: 20,
        })
      );
    });

    it('verified: true emits xpGained for UI animation', async () => {
      const spy = vi.fn();
      EventBus.on('xpGained', spy);

      await CoinService.creditCoins(100, 'cycle_complete', {
        sessionId: 'sess-v3',
      });

      await CoinService.processVerificationResponse('sess-v3', {
        verified: true,
        reward: 90,
        metaShare: 10,
      });

      expect(spy).toHaveBeenCalledWith(expect.objectContaining({ amount: 90 }));
    });

    it('verified: false does NOT credit coins', async () => {
      await CoinService.creditCoins(200, 'cycle_complete', {
        sessionId: 'sess-f1',
      });

      await CoinService.processVerificationResponse('sess-f1', {
        verified: false,
        reward: 0,
        metaShare: 0,
      });

      expect(await CoinService.getBalance()).toBe(0);
      expect(CoinService.getSessionCoins()).toBe(0);
    });

    it('verified: false emits verification:failed', async () => {
      const spy = vi.fn();
      EventBus.on('verification:failed', spy);

      await CoinService.creditCoins(200, 'cycle_complete', {
        sessionId: 'sess-f2',
      });

      await CoinService.processVerificationResponse('sess-f2', {
        verified: false,
        reward: 0,
        metaShare: 0,
      });

      expect(spy).toHaveBeenCalledWith(
        expect.objectContaining({
          sessionId: 'sess-f2',
          requestedAmount: 200,
        })
      );
    });

    it('removes from pending queue after processing (verified)', async () => {
      await CoinService.creditCoins(100, 'cycle_complete', {
        sessionId: 'sess-r1',
      });
      expect(CoinService.getPendingVerifications()).toBe(1);

      await CoinService.processVerificationResponse('sess-r1', {
        verified: true,
        reward: 100,
        metaShare: 0,
      });

      expect(CoinService.getPendingVerifications()).toBe(0);
    });

    it('removes from pending queue after processing (failed)', async () => {
      await CoinService.creditCoins(100, 'cycle_complete', {
        sessionId: 'sess-r2',
      });
      expect(CoinService.getPendingVerifications()).toBe(1);

      await CoinService.processVerificationResponse('sess-r2', {
        verified: false,
        reward: 0,
        metaShare: 0,
      });

      expect(CoinService.getPendingVerifications()).toBe(0);
    });

    it('handles unknown sessionId gracefully (requestedAmount is 0)', async () => {
      const successSpy = vi.fn();
      EventBus.on('verification:success', successSpy);

      await CoinService.processVerificationResponse('nonexistent', {
        verified: true,
        reward: 50,
        metaShare: 5,
      });

      expect(successSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          sessionId: 'nonexistent',
          requestedAmount: 0,
          verifiedAmount: 50,
        })
      );
      expect(await CoinService.getBalance()).toBe(50);
    });
  });

  describe('CoinService - getPendingVerifications()', () => {
    beforeEach(() => {
      vi.stubEnv('VITE_VERIFY_COINS_ONLY', 'true');
      CoinService.resetSession();
      CoinService.setProvider(new MockCoinProvider());
    });

    afterEach(() => {
      vi.unstubAllEnvs();
    });

    it('returns 0 when no verifications are pending', () => {
      expect(CoinService.getPendingVerifications()).toBe(0);
    });

    it('returns correct count after queuing multiple items', async () => {
      await CoinService.creditCoins(10, 'kill_bonus', { sessionId: 'a' });
      await CoinService.creditCoins(20, 'kill_bonus', { sessionId: 'b' });
      await CoinService.creditCoins(30, 'kill_bonus', { sessionId: 'c' });

      expect(CoinService.getPendingVerifications()).toBe(3);
    });

    it('decrements after processing a verification', async () => {
      await CoinService.creditCoins(10, 'kill_bonus', { sessionId: 'x' });
      await CoinService.creditCoins(20, 'kill_bonus', { sessionId: 'y' });

      expect(CoinService.getPendingVerifications()).toBe(2);

      await CoinService.processVerificationResponse('x', {
        verified: true,
        reward: 10,
        metaShare: 0,
      });

      expect(CoinService.getPendingVerifications()).toBe(1);
    });
  });

  describe('CoinService - resetSession()', () => {
    beforeEach(() => {
      vi.stubEnv('VITE_VERIFY_COINS_ONLY', 'true');
      CoinService.resetSession();
      CoinService.setProvider(new MockCoinProvider());
    });

    afterEach(() => {
      vi.unstubAllEnvs();
    });

    it('clears pending verification queue', async () => {
      await CoinService.creditCoins(100, 'cycle_complete', {
        sessionId: 's1',
      });
      await CoinService.creditCoins(200, 'cycle_complete', {
        sessionId: 's2',
      });
      expect(CoinService.getPendingVerifications()).toBe(2);

      CoinService.resetSession();

      expect(CoinService.getPendingVerifications()).toBe(0);
    });

    it('resets session coins to 0', async () => {
      // Switch flag off to actually credit
      vi.stubEnv('VITE_VERIFY_COINS_ONLY', '');
      await CoinService.creditCoins(100, 'kill_bonus');
      expect(CoinService.getSessionCoins()).toBe(100);

      CoinService.resetSession();

      expect(CoinService.getSessionCoins()).toBe(0);
    });
  });

  describe('CoinService - creditCoins validation', () => {
    beforeEach(() => {
      CoinService.resetSession();
      CoinService.setProvider(new MockCoinProvider());
    });

    it('rejects zero amount', async () => {
      const result = await CoinService.creditCoins(0, 'kill_bonus');
      expect(result).toBe(false);
    });

    it('rejects negative amount', async () => {
      const result = await CoinService.creditCoins(-10, 'kill_bonus');
      expect(result).toBe(false);
    });

    it('rejects NaN amount', async () => {
      const result = await CoinService.creditCoins(NaN, 'kill_bonus');
      expect(result).toBe(false);
    });

    it('rejects Infinity amount', async () => {
      const result = await CoinService.creditCoins(Infinity, 'kill_bonus');
      expect(result).toBe(false);
    });
  });
});
