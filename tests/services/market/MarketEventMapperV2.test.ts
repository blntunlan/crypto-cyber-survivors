/**
 * @fileoverview Tests for MarketEventMapperV2
 * @description Maps market events to gameplay effects
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import {
  MarketEventMapperV2,
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
  });

  describe('Modifier Accumulation', () => {
    it('should return default spawn rate when no effects', () => {
      expect(mapper.getSpawnRateMultiplier()).toBe(1.0);
    });

    it('should return default elite bonus when no effects', () => {
      expect(mapper.getEliteChanceBonus()).toBe(0);
    });

    it('should return default player modifiers when no effects', () => {
      const mods = mapper.getPlayerModifiers();
      expect(mods.speed).toBe(1.0);
      expect(mods.damage).toBe(1.0);
      expect(mods.defense).toBe(1.0);
    });
  });

  describe('Boss State', () => {
    it('should report no boss active by default', () => {
      expect(mapper.isBossActive()).toBe(false);
    });

    it('should not pause spawns by default', () => {
      expect(mapper.shouldPauseNormalSpawns()).toBe(false);
    });
  });

  describe('Active Effects', () => {
    it('should start with empty active effects', () => {
      expect(mapper.getActiveEffects()).toHaveLength(0);
    });

    it('should report no specific event active by default', () => {
      expect(mapper.isEventActive('VOLUME_SPIKE')).toBe(false);
      expect(mapper.isEventActive('WHALE_ALERT')).toBe(false);
      expect(mapper.isEventActive('FLASH_CRASH')).toBe(false);
    });
  });

  describe('Event History', () => {
    it('should start with empty history', () => {
      expect(mapper.getEventHistory()).toHaveLength(0);
    });
  });

  describe('Update Loop', () => {
    it('should handle update calls gracefully', () => {
      expect(() => mapper.update(16)).not.toThrow();
    });

    it('should handle rapid updates', () => {
      for (let i = 0; i < 100; i++) {
        mapper.update(16);
      }
      expect(mapper.getActiveEffects()).toHaveLength(0);
    });
  });

  describe('Reset', () => {
    it('should reset all state', () => {
      mapper.reset();

      expect(mapper.getActiveEffects()).toHaveLength(0);
      expect(mapper.getEventHistory()).toHaveLength(0);
      expect(mapper.getSpawnRateMultiplier()).toBe(1.0);
      expect(mapper.isBossActive()).toBe(false);
    });
  });

  describe('Debug State', () => {
    it('should provide debug information', () => {
      const debug = mapper.getDebugState();

      expect(debug).toHaveProperty('activeEffects');
      expect(debug).toHaveProperty('modifiers');
      expect(debug).toHaveProperty('bossActive');
      expect(debug).toHaveProperty('pauseSpawns');
      expect(debug).toHaveProperty('eventCount');
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
