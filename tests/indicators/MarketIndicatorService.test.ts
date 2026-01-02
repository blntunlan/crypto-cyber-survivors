/**
 * MarketIndicatorService Tests
 *
 * Integration tests for the market indicator orchestrator.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createMarketIndicatorService } from '../../services/indicators/MarketIndicatorService';
import { type MarketPosition } from '../../types';
import { WhaleTier } from '../../types/indicators';

describe('MarketIndicatorService', () => {
  let service: ReturnType<typeof createMarketIndicatorService>;

  beforeEach(() => {
    service = createMarketIndicatorService();
  });

  describe('Initialization', () => {
    it('should start with default state', () => {
      const state = service.getState();

      expect(state.rsi).toBe(50);
      expect(state.rsiState).toBe('NEUTRAL');
      expect(state.normalizedVolume).toBe(0.5);
      expect(state.whaleTier).toBe(WhaleTier.NONE);
      expect(state.spawnRateMultiplier).toBe(1.0);
      expect(state.isInitialized).toBe(false);
    });

    it('should not be initialized without data', () => {
      expect(service.isInitialized()).toBe(false);
    });
  });

  describe('Update', () => {
    it('should update state on price/volume update', () => {
      // Update with some prices
      for (let i = 0; i < 10; i++) {
        service.update(100 + i, 1000 + i * 100, 'LONG' as MarketPosition);
      }

      const state = service.getState();
      expect(state.lastUpdateTime).toBeGreaterThan(0);
      expect(state.currentPosition).toBe('LONG');
    });

    it('should become initialized after enough data', () => {
      // Add enough data for RSI (14 points) + something extra
      for (let i = 0; i < 20; i++) {
        service.update(100 + i, 1000 + i * 100, 'LONG' as MarketPosition);
      }

      expect(service.isInitialized()).toBe(true);
    });

    it('should return updated state from update()', () => {
      const state = service.update(100, 1000, 'LONG' as MarketPosition);

      expect(state).toBeDefined();
      expect(state.currentPosition).toBe('LONG');
    });
  });

  describe('RSI-Based Enemy Modifiers', () => {
    /**
     * Build RSI state by feeding appropriate price sequences
     */
    function buildOversoldState() {
      // Strong downtrend to get RSI < 30
      // Need at least 15 points for 14-period RSI
      for (let i = 0; i < 20; i++) {
        service.update(100 - i * 5, 1000, 'LONG' as MarketPosition);
      }
    }

    function buildOverboughtState() {
      // Strong uptrend to get RSI > 70
      for (let i = 0; i < 20; i++) {
        service.update(100 + i * 5, 1000, 'LONG' as MarketPosition);
      }
    }

    function buildNeutralState() {
      // Balanced price action
      for (let i = 0; i < 20; i++) {
        service.update(i % 2 === 0 ? 100 : 101, 1000, 'LONG' as MarketPosition);
      }
    }

    it('should return FRIENDLY modifier for LONG + OVERSOLD', () => {
      buildOversoldState();

      // Update with LONG position, keeping price low
      service.update(5, 1000, 'LONG' as MarketPosition);

      const modifier = service.getEnemyModifier();
      expect(modifier.visualStyle).toBe('friendly');
      expect(modifier.movementPattern).toBe('straight');
      expect(modifier.dropBuffChance).toBeGreaterThan(0.5);
    });

    it('should return AGGRESSIVE modifier for LONG + OVERBOUGHT', () => {
      buildOverboughtState();

      // Update with LONG position, keeping price high
      service.update(200, 1000, 'LONG' as MarketPosition);

      const modifier = service.getEnemyModifier();
      expect(modifier.visualStyle).toBe('aggressive');
      expect(modifier.movementPattern).toBe('zigzag');
      expect(modifier.dropDebuffChance).toBeGreaterThan(0.3);
    });

    it('should return AGGRESSIVE modifier for SHORT + OVERSOLD', () => {
      buildOversoldState();

      // Update with SHORT position, keeping price low
      service.update(5, 1000, 'SHORT' as MarketPosition);

      const modifier = service.getEnemyModifier();
      expect(modifier.visualStyle).toBe('aggressive');
    });

    it('should return FRIENDLY modifier for SHORT + OVERBOUGHT', () => {
      buildOverboughtState();

      // Update with SHORT position, keeping price high
      service.update(200, 1000, 'SHORT' as MarketPosition);

      const modifier = service.getEnemyModifier();
      expect(modifier.visualStyle).toBe('friendly');
    });

    it('should return NEUTRAL modifier for neutral RSI', () => {
      buildNeutralState();

      const modifier = service.getEnemyModifier();
      expect(modifier.visualStyle).toBe('neutral');
      expect(modifier.aggroMultiplier).toBe(1.0);
    });
  });

  describe('Favorability Detection', () => {
    function buildOversoldState() {
      for (let i = 0; i < 20; i++) {
        service.update(100 - i * 5, 1000, 'LONG' as MarketPosition);
      }
    }

    function buildOverboughtState() {
      for (let i = 0; i < 20; i++) {
        service.update(100 + i * 5, 1000, 'SHORT' as MarketPosition);
      }
    }

    it('should detect favorable state for LONG + OVERSOLD', () => {
      buildOversoldState();
      expect(service.isFavorable()).toBe(true);
      expect(service.isUnfavorable()).toBe(false);
    });

    it('should detect favorable state for SHORT + OVERBOUGHT', () => {
      buildOverboughtState();
      expect(service.isFavorable()).toBe(true);
      expect(service.isUnfavorable()).toBe(false);
    });

    it('should return false for neutral state', () => {
      for (let i = 0; i < 20; i++) {
        service.update(i % 2 === 0 ? 100 : 101, 1000, 'LONG' as MarketPosition);
      }

      expect(service.isFavorable()).toBe(false);
      expect(service.isUnfavorable()).toBe(false);
    });
  });

  describe('Spawn Rate Multiplier', () => {
    it('should return default multiplier (1.0) initially', () => {
      expect(service.getSpawnRateMultiplier()).toBe(1.0);
    });

    it('should update multiplier based on state', () => {
      // Update with enough data
      for (let i = 0; i < 20; i++) {
        service.update(100 + i, 1000, 'LONG' as MarketPosition);
      }

      // Should have some multiplier value
      const multiplier = service.getSpawnRateMultiplier();
      expect(multiplier).toBeGreaterThanOrEqual(0.5);
      expect(multiplier).toBeLessThanOrEqual(2.5);
    });
  });

  describe('Whale Spawning', () => {
    beforeEach(() => {
      // Build up volume history
      const volumes = [100, 200, 300, 400, 500, 600, 700, 800, 900, 1000];
      volumes.forEach((v, _i) => service.update(100, v, 'LONG' as MarketPosition));
    });

    it('should return spawn decision', () => {
      const result = service.shouldSpawnWhale();

      expect(result).toBeDefined();
      expect(typeof result.shouldSpawn).toBe('boolean');
      expect(typeof result.tier).toBe('number');
    });

    it('should update cooldown when whale spawns', () => {
      // Force high volume for mega whale
      service.update(100, 10000, 'LONG' as MarketPosition);

      const stateBefore = service.getState();
      const timeBefore = stateBefore.lastWhaleSpawnTime;

      service.recordWhaleSpawn();
      const stateAfter = service.getState();

      // After recording a spawn, lastWhaleSpawnTime should be set/updated
      expect(stateAfter.lastWhaleSpawnTime).toBeGreaterThan(0);
      expect(stateAfter.lastWhaleSpawnTime).toBeGreaterThanOrEqual(timeBefore);
    });

    it('should provide whale tier config', () => {
      const config = service.getWhaleTierConfig(WhaleTier.MEGA_WHALE);

      expect(config).toBeDefined();
      expect(config?.sizeMultiplier).toBe(2.0);
      expect(config?.healthMultiplier).toBe(4.0);
    });
  });

  describe('Reset', () => {
    it('should reset all state', () => {
      // Build up state (need > 14 points)
      for (let i = 0; i < 20; i++) {
        service.update(100 - i * 5, 1000 + i * 100, 'LONG' as MarketPosition);
      }

      expect(service.getState().rsiState).not.toBe('NEUTRAL'); // Should be OVERSOLD

      // Reset
      service.reset();

      const state = service.getState();
      expect(state.rsi).toBe(50);
      expect(state.rsiState).toBe('NEUTRAL');
      expect(state.normalizedVolume).toBe(0.5);
      expect(state.whaleTier).toBe(WhaleTier.NONE);
      expect(state.isInitialized).toBe(false);
    });
  });

  describe('Event Emission', () => {
    it('should emit marketStateChanged event on update', async () => {
      const mockHandler = vi.fn();

      // Dynamic import to get EventBus
      const { EventBus } = await import('../../services/EventBus');
      const unsub = EventBus.on('marketStateChanged', mockHandler);

      // Update
      service.update(100, 1000, 'LONG' as MarketPosition);

      expect(mockHandler).toHaveBeenCalled();
      expect(mockHandler).toHaveBeenCalledWith(
        expect.objectContaining({
          rsi: expect.any(Number),
          rsiState: expect.any(String),
          normalizedVolume: expect.any(Number),
          spawnRateMultiplier: expect.any(Number),
          isFavorable: expect.any(Boolean),
          position: 'LONG',
        })
      );

      unsub();
    });
  });
});
