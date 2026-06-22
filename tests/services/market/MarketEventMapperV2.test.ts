/**
 * @fileoverview Tests for MarketEventMapperV2
 * @description Maps market events to gameplay effects
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import {
  MARKET_EVENT_EFFECTS,
  createMarketEventMapperV2,
} from '../../../services/market/MarketEventMapperV2';
import { EventBus } from '../../../services/core/EventBus';

// Mock EventBus
vi.mock('../../../services/core/EventBus', () => ({
  EventBus: {
    emit: vi.fn(),
    on: vi.fn(() => vi.fn()),
    off: vi.fn(),
  },
}));

// Mock Logger
vi.mock('../../../services/system/Logger', () => ({
  Logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

describe('MarketEventMapperV2', () => {
  let mapper: ReturnType<typeof createMarketEventMapperV2>;

  beforeEach(() => {
    vi.clearAllMocks();
    mapper = createMarketEventMapperV2();
  });

  afterEach(() => {
    mapper.reset();
  });

  describe('Initialization', () => {
    it('should start with default modifiers', () => {
      expect(mapper.getSpawnRateMultiplier()).toBe(1.0);
      expect(mapper.getEliteChanceBonus()).toBe(0);
    });

    it('should start with no active effects', () => {
      const effects = mapper.getActiveEffects();
      expect(effects).toHaveLength(0);
    });

    it('should have configured effect mappings', () => {
      expect(MARKET_EVENT_EFFECTS.VOLUME_SPIKE).toBeDefined();
      expect(MARKET_EVENT_EFFECTS.WHALE_ALERT).toBeDefined();
      expect(MARKET_EVENT_EFFECTS.FLASH_CRASH).toBeDefined();
      expect(MARKET_EVENT_EFFECTS.PRICE_BREAKOUT).toBeDefined();
      expect(MARKET_EVENT_EFFECTS.CONSOLIDATION).toBeDefined();
    });
  });

  describe('Event Effect Configuration', () => {
    it('should configure VOLUME_SPIKE as spawn increase', () => {
      const effect = MARKET_EVENT_EFFECTS.VOLUME_SPIKE;
      expect(effect.spawnRateMultiplier).toBeGreaterThan(1);
      expect(effect.eliteChanceBonus).toBeGreaterThan(0);
    });

    it('should configure WHALE_ALERT as boss spawn', () => {
      const effect = MARKET_EVENT_EFFECTS.WHALE_ALERT;
      expect(effect.bossSpawn).toBe(true);
      expect(effect.pauseNormalSpawns).toBe(true);
    });

    it('should configure FLASH_CRASH as player debuff', () => {
      const effect = MARKET_EVENT_EFFECTS.FLASH_CRASH;
      expect(effect.playerSpeedMultiplier).toBeLessThan(1);
      expect(effect.screenShake).toBe(true);
      expect(effect.shouldTriggerPortal).toBe(true);
    });

    it('should configure PRICE_BREAKOUT as player buff', () => {
      const effect = MARKET_EVENT_EFFECTS.PRICE_BREAKOUT;
      expect(effect.playerSpeedMultiplier).toBeGreaterThan(1);
      expect(effect.playerDamageMultiplier).toBeGreaterThan(1);
    });

    it('should configure CONSOLIDATION as calm period', () => {
      const effect = MARKET_EVENT_EFFECTS.CONSOLIDATION;
      expect(effect.spawnRateMultiplier).toBeLessThan(1);
      expect(effect.stressIncrease).toBeLessThan(0);
    });
  });

  describe('Market Event Handling', () => {
    it('should receive event subscriptions', () => {
      expect(EventBus.on).toHaveBeenCalledWith('gameMarketEvent', expect.any(Function));
      expect(EventBus.on).toHaveBeenCalledWith('gameReset', expect.any(Function));
    });

    it('should process VOLUME_SPIKE event', () => {
      // Get the callback registered with EventBus
      const callback = (EventBus.on as any).mock.calls.find(
        (call: any) => call[0] === 'gameMarketEvent'
      )[1];

      callback({
        type: 'VOLUME_SPIKE',
        intensity: 0.8,
        durationMs: 10000,
      });

      expect(mapper.isEventActive('VOLUME_SPIKE')).toBe(true);
      expect(mapper.getSpawnRateMultiplier()).toBeGreaterThan(1.0);
    });

    it('should scale effects based on intensity', () => {
      const callback = (EventBus.on as any).mock.calls.find(
        (call: any) => call[0] === 'gameMarketEvent'
      )[1];

      // Low intensity
      callback({
        type: 'VOLUME_SPIKE',
        intensity: 0.1,
        durationMs: 10000,
      });
      const lowSpawnRate = mapper.getSpawnRateMultiplier();

      mapper.reset();

      // High intensity
      callback({
        type: 'VOLUME_SPIKE',
        intensity: 1.0,
        durationMs: 10000,
      });
      const highSpawnRate = mapper.getSpawnRateMultiplier();

      expect(highSpawnRate).toBeGreaterThan(lowSpawnRate);
    });

    it('should refresh existing effects instead of stacking', () => {
      const callback = (EventBus.on as any).mock.calls.find(
        (call: any) => call[0] === 'gameMarketEvent'
      )[1];

      callback({
        type: 'VOLUME_SPIKE',
        intensity: 0.5,
        durationMs: 10000,
      });

      const initialEffects = mapper.getActiveEffects();
      expect(initialEffects).toHaveLength(1);

      callback({
        type: 'VOLUME_SPIKE',
        intensity: 0.8,
        durationMs: 15000,
      });

      expect(mapper.getActiveEffects()).toHaveLength(1);
      expect(mapper.getActiveEffects()[0]?.intensity).toBe(0.8);
    });

    it('should emit specific gameplay events for WHALE_ALERT', () => {
      const callback = (EventBus.on as any).mock.calls.find(
        (call: any) => call[0] === 'gameMarketEvent'
      )[1];

      callback({
        type: 'WHALE_ALERT',
        intensity: 1.0,
        durationMs: 30000,
      });

      expect(EventBus.emit).toHaveBeenCalledWith(
        'spawnBoss',
        expect.objectContaining({
          type: 'whale',
        })
      );
      expect(mapper.shouldPauseNormalSpawns()).toBe(true);
      expect(mapper.isBossActive()).toBe(true);
    });

    it('should apply player modifiers for FLASH_CRASH', () => {
      const callback = (EventBus.on as any).mock.calls.find(
        (call: any) => call[0] === 'gameMarketEvent'
      )[1];

      callback({
        type: 'FLASH_CRASH',
        intensity: 1.0,
        durationMs: 15000,
      });

      expect(EventBus.emit).toHaveBeenCalledWith(
        'playerModifierApplied',
        expect.objectContaining({
          source: 'market_FLASH_CRASH',
        })
      );

      const mods = mapper.getPlayerModifiers();
      expect(mods.speed).toBeLessThan(1.0);
    });
  });

  describe('Modifier Accumulation', () => {
    it('should combine multiple active effects', () => {
      const callback = (EventBus.on as any).mock.calls.find(
        (call: any) => call[0] === 'gameMarketEvent'
      )[1];

      // Volume spike increases spawn rate
      callback({
        type: 'VOLUME_SPIKE',
        intensity: 1.0,
        durationMs: 10000,
      });
      const spikeSpawnRate = mapper.getSpawnRateMultiplier();

      // Price breakout also affects spawn rate
      callback({
        type: 'PRICE_BREAKOUT',
        intensity: 1.0,
        durationMs: 10000,
      });

      expect(mapper.getSpawnRateMultiplier()).toBeCloseTo(
        spikeSpawnRate * MARKET_EVENT_EFFECTS.PRICE_BREAKOUT.spawnRateMultiplier,
        2
      );
    });
  });

  describe('Update Loop and Expiration', () => {
    it('should expire effects after duration', () => {
      const callback = (EventBus.on as any).mock.calls.find(
        (call: any) => call[0] === 'gameMarketEvent'
      )[1];

      vi.useFakeTimers();

      callback({
        type: 'VOLUME_SPIKE',
        intensity: 1.0,
        durationMs: 1000,
      });

      expect(mapper.isEventActive('VOLUME_SPIKE')).toBe(true);

      // Advance time beyond duration
      vi.advanceTimersByTime(1100);
      mapper.update(1100);

      expect(mapper.isEventActive('VOLUME_SPIKE')).toBe(false);
      expect(EventBus.emit).toHaveBeenCalledWith('playerModifierRemoved', {
        source: 'market_VOLUME_SPIKE',
      });

      vi.useRealTimers();
    });

    it('should recalculate modifiers after expiration', () => {
      const callback = (EventBus.on as any).mock.calls.find(
        (call: any) => call[0] === 'gameMarketEvent'
      )[1];

      vi.useFakeTimers();

      callback({
        type: 'VOLUME_SPIKE',
        intensity: 1.0,
        durationMs: 1000,
      });

      const boostedRate = mapper.getSpawnRateMultiplier();
      expect(boostedRate).toBeGreaterThan(1.0);

      vi.advanceTimersByTime(1100);
      mapper.update(1100);

      expect(mapper.getSpawnRateMultiplier()).toBe(1.0);

      vi.useRealTimers();
    });
  });

  describe('Utility Methods', () => {
    it('should return event history', () => {
      const callback = (EventBus.on as any).mock.calls.find(
        (call: any) => call[0] === 'gameMarketEvent'
      )[1];

      callback({ type: 'VOLUME_SPIKE', intensity: 0.5, durationMs: 5000 });
      callback({ type: 'PRICE_BREAKOUT', intensity: 0.7, durationMs: 5000 });

      const history = mapper.getEventHistory();
      expect(history).toHaveLength(2);
      expect(history[0]?.type).toBe('VOLUME_SPIKE');
      expect(history[1]?.type).toBe('PRICE_BREAKOUT');
    });

    it('should handle gameReset event', () => {
      const resetCallback = (EventBus.on as any).mock.calls.find(
        (call: any) => call[0] === 'gameReset'
      )[1];

      const eventCallback = (EventBus.on as any).mock.calls.find(
        (call: any) => call[0] === 'gameMarketEvent'
      )[1];

      eventCallback({ type: 'VOLUME_SPIKE', intensity: 0.5, durationMs: 5000 });
      expect(mapper.getActiveEffects()).toHaveLength(1);

      resetCallback();
      expect(mapper.getActiveEffects()).toHaveLength(0);
    });
  });

  describe('Reset', () => {
    it('should reset all state', () => {
      const callback = (EventBus.on as any).mock.calls.find(
        (call: any) => call[0] === 'gameMarketEvent'
      )[1];

      callback({ type: 'VOLUME_SPIKE', intensity: 0.5, durationMs: 5000 });
      mapper.reset();

      expect(mapper.getActiveEffects()).toHaveLength(0);
      expect(mapper.getEventHistory()).toHaveLength(0);
      expect(mapper.getSpawnRateMultiplier()).toBe(1.0);
      expect(mapper.isBossActive()).toBe(false);
    });
  });

  describe('Debug State', () => {
    it('should provide debug information with active effects', () => {
      const callback = (EventBus.on as any).mock.calls.find(
        (call: any) => call[0] === 'gameMarketEvent'
      )[1];

      callback({ type: 'VOLUME_SPIKE', intensity: 0.5, durationMs: 5000 });

      const debug = mapper.getDebugState();
      expect(debug.activeEffects).toHaveLength(1);
      expect((debug.activeEffects as any)[0].type).toBe('VOLUME_SPIKE');
    });

    it('should show correct modifier values in debug', () => {
      const debug = mapper.getDebugState() as { modifiers: Record<string, string> };
      expect(debug.modifiers.spawnRate).toBe('1.00');
      expect(debug.modifiers.eliteBonus).toBe('0.00');
    });
  });

  describe('Effect Durations', () => {
    it('should have reasonable durations configured', () => {
      expect(MARKET_EVENT_EFFECTS.VOLUME_SPIKE.durationMs).toBeGreaterThan(10000);
      expect(MARKET_EVENT_EFFECTS.WHALE_ALERT.durationMs).toBeGreaterThan(20000);
      expect(MARKET_EVENT_EFFECTS.FLASH_CRASH.durationMs).toBeGreaterThan(10000);
    });
  });

  describe('Screen Effects Configuration', () => {
    it('should configure appropriate overlay effects', () => {
      expect(MARKET_EVENT_EFFECTS.FLASH_CRASH.overlayEffect).toBe('red_flash');
      expect(MARKET_EVENT_EFFECTS.PRICE_BREAKOUT.overlayEffect).toBe('green_pulse');
      expect(MARKET_EVENT_EFFECTS.CONSOLIDATION.overlayEffect).toBe('blue_calm');
      expect(MARKET_EVENT_EFFECTS.VOLUME_SPIKE.overlayEffect).toBe('purple_chaos');
    });

    it('should configure screen shake for intense events', () => {
      expect(MARKET_EVENT_EFFECTS.FLASH_CRASH.screenShake).toBe(true);
      expect(MARKET_EVENT_EFFECTS.WHALE_ALERT.screenShake).toBe(true);
      expect(MARKET_EVENT_EFFECTS.CONSOLIDATION.screenShake).toBe(false);
    });
  });

  describe('Flow State Influence', () => {
    it('should configure stress increases for negative events', () => {
      expect(MARKET_EVENT_EFFECTS.FLASH_CRASH.stressIncrease).toBeGreaterThan(0);
      expect(MARKET_EVENT_EFFECTS.WHALE_ALERT.stressIncrease).toBeGreaterThan(0);
    });

    it('should configure stress decreases for calm events', () => {
      expect(MARKET_EVENT_EFFECTS.CONSOLIDATION.stressIncrease).toBeLessThan(0);
      expect(MARKET_EVENT_EFFECTS.PRICE_BREAKOUT.stressIncrease).toBeLessThan(0);
    });

    it('should configure engagement changes', () => {
      expect(MARKET_EVENT_EFFECTS.WHALE_ALERT.engagementIncrease).toBeGreaterThan(0);
      expect(MARKET_EVENT_EFFECTS.PRICE_BREAKOUT.engagementIncrease).toBeGreaterThan(0);
    });
  });

  describe('Portal Trigger Configuration', () => {
    it('should trigger portals for significant events', () => {
      expect(MARKET_EVENT_EFFECTS.FLASH_CRASH.shouldTriggerPortal).toBe(true);
      expect(MARKET_EVENT_EFFECTS.PRICE_BREAKOUT.shouldTriggerPortal).toBe(true);
    });

    it('should configure correct portal types', () => {
      expect(MARKET_EVENT_EFFECTS.FLASH_CRASH.portalType).toBe('STOP_LOSS');
      expect(MARKET_EVENT_EFFECTS.PRICE_BREAKOUT.portalType).toBe('TAKE_PROFIT');
    });

    it('should not trigger portals for minor events', () => {
      expect(MARKET_EVENT_EFFECTS.CONSOLIDATION.shouldTriggerPortal).toBe(false);
      expect(MARKET_EVENT_EFFECTS.VOLUME_SPIKE.shouldTriggerPortal).toBe(false);
    });
  });
});
