import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  GameplayValidator,
  GameplayValidatorClass,
  type GameplaySnapshot,
} from '../../services/gameplay/GameplayValidator';
import { EventBus } from '../../services/core/EventBus';
import {
  type Player,
  type MarketData,
  type Enemy,
  type Gem,
  GameStatus,
  MarketPosition,
} from '../../types';

// Mock player factory
const createMockPlayer = (overrides: Partial<Player> = {}): Player => ({
  x: 400,
  y: 300,
  radius: 20,
  color: '#00ff00',
  level: 1,
  exp: 0,
  nextLevelExp: 100,
  hp: 100,
  maxHp: 100,
  invulnerabilityTimer: 0,
  baseDamage: 10,
  speed: 200,
  fireRate: 1,
  luck: 0.1,
  lifesteal: 0,
  critChance: 0.1,
  critDamage: 2.0,
  projectiles: 1,
  magnet: 50,
  armor: 0,
  area: 1,
  regen: 0,
  dodge: 0,
  ...overrides,
});

// Mock market data factory
const createMockMarketData = (overrides: Partial<MarketData> = {}): MarketData => ({
  price: 50000,
  volume: 1000000,
  pnl: 0.02,
  effectivePnl: 0.02,
  leverage: 10,
  position: MarketPosition.LONG,
  rsi: 50,
  difficulty: 5,
  momentum: 0,
  ...overrides,
});

// Mock enemy factory
const createMockEnemy = (overrides: Partial<Enemy> = {}): Enemy => ({
  active: true,
  x: 200,
  y: 200,
  radius: 15,
  color: '#ff0000',
  speed: 50,
  health: 100,
  maxHealth: 100,
  damage: 10,
  type: 'bear',
  ...overrides,
});

// Mock gem factory
const createMockGem = (overrides: Partial<Gem> = {}): Gem => ({
  active: true,
  x: 300,
  y: 300,
  radius: 8,
  color: '#00ffff',
  value: 10,
  ...overrides,
});

describe('GameplayValidator', () => {
  beforeEach(() => {
    GameplayValidator.reset();
    GameplayValidator.configure({
      autoFix: true,
      logIssues: false, // Suppress logs in tests
      emitEvents: true,
      maxIssuesPerFrame: 50,
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Singleton Pattern', () => {
    it('should return the same instance', () => {
      const instance1 = GameplayValidatorClass.getInstance();
      const instance2 = GameplayValidatorClass.getInstance();
      expect(instance1).toBe(instance2);
    });
  });

  describe('Configuration', () => {
    it('should update config correctly', () => {
      GameplayValidator.configure({ autoFix: false });
      expect(GameplayValidator.getConfig().autoFix).toBe(false);
    });

    it('should preserve unmodified config values', () => {
      const originalConfig = GameplayValidator.getConfig();
      GameplayValidator.configure({ autoFix: false });
      expect(GameplayValidator.getConfig().logIssues).toBe(originalConfig.logIssues);
    });
  });

  describe('Player Validation', () => {
    it('should pass for valid player', () => {
      const snapshot: GameplaySnapshot = {
        player: createMockPlayer(),
        timestamp: performance.now(),
      };

      const result = GameplayValidator.validate(snapshot);
      expect(result.isValid).toBe(true);
      expect(result.issues).toHaveLength(0);
    });

    it('should detect negative HP', () => {
      const snapshot: GameplaySnapshot = {
        player: createMockPlayer({ hp: -10 }),
        timestamp: performance.now(),
      };

      const result = GameplayValidator.validate(snapshot);
      expect(result.isValid).toBe(false);
      expect(result.issues.some(i => i.id.includes('player.hp.negative'))).toBe(true);
    });

    it('should detect HP exceeding maxHp', () => {
      const snapshot: GameplaySnapshot = {
        player: createMockPlayer({ hp: 150, maxHp: 100 }),
        timestamp: performance.now(),
      };

      const result = GameplayValidator.validate(snapshot);
      expect(result.isValid).toBe(false);
      expect(result.issues.some(i => i.id.includes('player.hp.exceeds_max'))).toBe(
        true
      );
    });

    it('should detect invalid maxHp', () => {
      const snapshot: GameplaySnapshot = {
        player: createMockPlayer({ maxHp: 0 }),
        timestamp: performance.now(),
      };

      const result = GameplayValidator.validate(snapshot);
      expect(result.isValid).toBe(false);
      expect(result.issues.some(i => i.id.includes('player.maxHp.invalid'))).toBe(true);
    });

    it('should detect invalid level', () => {
      const snapshot: GameplaySnapshot = {
        player: createMockPlayer({ level: 0 }),
        timestamp: performance.now(),
      };

      const result = GameplayValidator.validate(snapshot);
      expect(result.isValid).toBe(false);
      expect(result.issues.some(i => i.id.includes('player.level.invalid'))).toBe(true);
    });

    it('should detect negative exp', () => {
      const snapshot: GameplaySnapshot = {
        player: createMockPlayer({ exp: -50 }),
        timestamp: performance.now(),
      };

      const result = GameplayValidator.validate(snapshot);
      expect(result.isValid).toBe(false);
      expect(result.issues.some(i => i.id.includes('player.exp.negative'))).toBe(true);
    });

    it('should detect NaN position', () => {
      const snapshot: GameplaySnapshot = {
        player: createMockPlayer({ x: NaN, y: 300 }),
        timestamp: performance.now(),
      };

      const result = GameplayValidator.validate(snapshot);
      expect(result.isValid).toBe(false);
      expect(result.issues.some(i => i.id.includes('player.position.nan'))).toBe(true);
    });

    it('should detect invalid critChance (> 1)', () => {
      const snapshot: GameplaySnapshot = {
        player: createMockPlayer({ critChance: 1.5 }),
        timestamp: performance.now(),
      };

      const result = GameplayValidator.validate(snapshot);
      expect(result.isValid).toBe(false);
      expect(result.issues.some(i => i.id.includes('player.stats.critChance'))).toBe(
        true
      );
    });

    it('should auto-fix negative HP to 0', () => {
      const player = createMockPlayer({ hp: -10 });
      const snapshot: GameplaySnapshot = { player, timestamp: performance.now() };

      const { player: fixedPlayer } = GameplayValidator.validatePlayer(
        player,
        snapshot
      );
      expect(fixedPlayer.hp).toBe(0);
    });

    it('should auto-fix HP exceeding maxHp', () => {
      const player = createMockPlayer({ hp: 150, maxHp: 100 });
      const snapshot: GameplaySnapshot = { player, timestamp: performance.now() };

      const { player: fixedPlayer } = GameplayValidator.validatePlayer(
        player,
        snapshot
      );
      expect(fixedPlayer.hp).toBe(100);
    });
  });

  describe('Market Data Validation', () => {
    it('should pass for valid market data', () => {
      const snapshot: GameplaySnapshot = {
        marketData: createMockMarketData(),
        timestamp: performance.now(),
      };

      const result = GameplayValidator.validate(snapshot);
      expect(result.isValid).toBe(true);
    });

    it('should detect invalid price', () => {
      const snapshot: GameplaySnapshot = {
        marketData: createMockMarketData({ price: -100 }),
        timestamp: performance.now(),
      };

      const result = GameplayValidator.validate(snapshot);
      expect(result.isValid).toBe(false);
      expect(result.issues.some(i => i.id.includes('market.price.invalid'))).toBe(true);
    });

    it('should detect RSI out of range', () => {
      const snapshot: GameplaySnapshot = {
        marketData: createMockMarketData({ rsi: 150 }),
        timestamp: performance.now(),
      };

      const result = GameplayValidator.validate(snapshot);
      expect(result.isValid).toBe(false);
      expect(result.issues.some(i => i.id.includes('market.rsi.range'))).toBe(true);
    });

    it('should detect invalid leverage', () => {
      const snapshot: GameplaySnapshot = {
        marketData: createMockMarketData({ leverage: 7 as any }),
        timestamp: performance.now(),
      };

      const result = GameplayValidator.validate(snapshot);
      expect(result.isValid).toBe(false);
      expect(result.issues.some(i => i.id.includes('market.leverage.valid'))).toBe(
        true
      );
    });

    it('should detect NaN PnL', () => {
      const snapshot: GameplaySnapshot = {
        marketData: createMockMarketData({ pnl: NaN }),
        timestamp: performance.now(),
      };

      const result = GameplayValidator.validate(snapshot);
      expect(result.isValid).toBe(false);
      expect(result.issues.some(i => i.id.includes('market.pnl.nan'))).toBe(true);
    });

    it('should detect illogical liquidation price for LONG', () => {
      const snapshot: GameplaySnapshot = {
        marketData: createMockMarketData({
          price: 50000,
          position: MarketPosition.LONG,
          liquidationPrice: 60000, // Should be below price for LONG
        }),
        timestamp: performance.now(),
      };

      const result = GameplayValidator.validate(snapshot);
      expect(result.isValid).toBe(false);
      expect(
        result.issues.some(i => i.id.includes('market.liquidationPrice.logical'))
      ).toBe(true);
    });
  });

  describe('Enemy Validation', () => {
    it('should pass for valid enemies', () => {
      const snapshot: GameplaySnapshot = {
        enemies: [createMockEnemy(), createMockEnemy()],
        timestamp: performance.now(),
      };

      const result = GameplayValidator.validate(snapshot);
      expect(result.isValid).toBe(true);
    });

    it('should detect negative enemy health', () => {
      const snapshot: GameplaySnapshot = {
        enemies: [createMockEnemy({ health: -10 })],
        timestamp: performance.now(),
      };

      const result = GameplayValidator.validate(snapshot);
      expect(result.isValid).toBe(false);
      expect(result.issues.some(i => i.id.includes('enemy.health.negative'))).toBe(
        true
      );
    });

    it('should detect enemy health exceeding maxHealth', () => {
      const snapshot: GameplaySnapshot = {
        enemies: [createMockEnemy({ health: 150, maxHealth: 100 })],
        timestamp: performance.now(),
      };

      const result = GameplayValidator.validate(snapshot);
      expect(result.isValid).toBe(false);
      expect(result.issues.some(i => i.id.includes('enemy.health.exceeds_max'))).toBe(
        true
      );
    });

    it('should detect NaN enemy position', () => {
      const snapshot: GameplaySnapshot = {
        enemies: [createMockEnemy({ x: NaN })],
        timestamp: performance.now(),
      };

      const result = GameplayValidator.validate(snapshot);
      expect(result.isValid).toBe(false);
      expect(result.issues.some(i => i.id.includes('enemy.position.nan'))).toBe(true);
    });

    it('should skip inactive enemies', () => {
      const snapshot: GameplaySnapshot = {
        enemies: [createMockEnemy({ active: false, health: -100 })],
        timestamp: performance.now(),
      };

      const result = GameplayValidator.validate(snapshot);
      expect(result.isValid).toBe(true);
    });

    it('should auto-fix enemy by deactivating on NaN position', () => {
      const enemy = createMockEnemy({ x: NaN });
      const snapshot: GameplaySnapshot = {
        enemies: [enemy],
        timestamp: performance.now(),
      };

      const { enemies: fixedEnemies } = GameplayValidator.validateEnemies(
        [enemy],
        snapshot
      );
      expect(fixedEnemies.length).toBe(1);
      expect(fixedEnemies[0]!.active).toBe(false);
    });
  });

  describe('Gem Validation', () => {
    it('should pass for valid gems', () => {
      const snapshot: GameplaySnapshot = {
        gems: [createMockGem(), createMockGem()],
        timestamp: performance.now(),
      };

      const result = GameplayValidator.validate(snapshot);
      expect(result.isValid).toBe(true);
    });

    it('should detect invalid gem value', () => {
      const snapshot: GameplaySnapshot = {
        gems: [createMockGem({ value: 0 })],
        timestamp: performance.now(),
      };

      const result = GameplayValidator.validate(snapshot);
      expect(result.isValid).toBe(false);
      expect(result.issues.some(i => i.id.includes('gem.value.invalid'))).toBe(true);
    });

    it('should detect NaN gem position', () => {
      const snapshot: GameplaySnapshot = {
        gems: [createMockGem({ x: NaN })],
        timestamp: performance.now(),
      };

      const result = GameplayValidator.validate(snapshot);
      expect(result.isValid).toBe(false);
      expect(result.issues.some(i => i.id.includes('gem.position.nan'))).toBe(true);
    });

    it('should detect stuck gems (lifetime overflow)', () => {
      const snapshot: GameplaySnapshot = {
        gems: [createMockGem({ elapsedLifetime: 120000 })],
        timestamp: performance.now(),
      };

      const result = GameplayValidator.validate(snapshot);
      expect(result.isValid).toBe(false);
      expect(result.issues.some(i => i.id.includes('gem.lifetime.overflow'))).toBe(
        true
      );
    });
  });

  describe('Cross Validation', () => {
    it('should detect PLAYING status with dead player', () => {
      const snapshot: GameplaySnapshot = {
        player: createMockPlayer({ hp: 0 }),
        gameStatus: GameStatus.PLAYING,
        timestamp: performance.now(),
      };

      const result = GameplayValidator.validate(snapshot);
      expect(result.isValid).toBe(false);
      expect(result.issues.some(i => i.message.includes('PLAYING but player HP'))).toBe(
        true
      );
    });

    it('should detect EXP >= nextLevelExp (pending level up)', () => {
      const snapshot: GameplaySnapshot = {
        player: createMockPlayer({ exp: 100, nextLevelExp: 100 }),
        timestamp: performance.now(),
      };

      const result = GameplayValidator.validate(snapshot);
      expect(result.isValid).toBe(false);
      expect(result.issues.some(i => i.message.includes('level up pending'))).toBe(
        true
      );
    });
  });

  describe('Quick Checks', () => {
    it('quickCheckPlayer should return true for valid player', () => {
      const player = createMockPlayer();
      expect(GameplayValidator.quickCheckPlayer(player)).toBe(true);
    });

    it('quickCheckPlayer should return false for invalid player', () => {
      const player = createMockPlayer({ hp: -1 });
      expect(GameplayValidator.quickCheckPlayer(player)).toBe(false);
    });

    it('quickCheckEnemy should return true for valid enemy', () => {
      const enemy = createMockEnemy();
      expect(GameplayValidator.quickCheckEnemy(enemy)).toBe(true);
    });

    it('quickCheckEnemy should return false for invalid enemy', () => {
      const enemy = createMockEnemy({ health: -1 });
      expect(GameplayValidator.quickCheckEnemy(enemy)).toBe(false);
    });

    it('quickCheckEnemy should return true for inactive enemy', () => {
      const enemy = createMockEnemy({ active: false, health: -100 });
      expect(GameplayValidator.quickCheckEnemy(enemy)).toBe(true);
    });

    it('quickCheckMarketData should return true for valid market data', () => {
      const marketData = createMockMarketData();
      expect(GameplayValidator.quickCheckMarketData(marketData)).toBe(true);
    });

    it('quickCheckMarketData should return false for invalid market data', () => {
      const marketData = createMockMarketData({ price: -100 });
      expect(GameplayValidator.quickCheckMarketData(marketData)).toBe(false);
    });
  });

  describe('Event Emission', () => {
    it('should emit gameplayValidation event when issues found', () => {
      const eventSpy = vi.fn();
      const unsub = EventBus.on('gameplayValidation', eventSpy);

      const snapshot: GameplaySnapshot = {
        player: createMockPlayer({ hp: -10 }),
        timestamp: performance.now(),
      };

      GameplayValidator.validate(snapshot);

      expect(eventSpy).toHaveBeenCalled();
      const call = eventSpy.mock.calls[0];
      expect(call?.[0]?.issues?.length).toBeGreaterThan(0);

      unsub();
    });

    it('should not emit event when no issues found', () => {
      const eventSpy = vi.fn();
      const unsub = EventBus.on('gameplayValidation', eventSpy);

      const snapshot: GameplaySnapshot = {
        player: createMockPlayer(),
        timestamp: performance.now(),
      };

      GameplayValidator.validate(snapshot);

      expect(eventSpy).not.toHaveBeenCalled();

      unsub();
    });

    it('should not emit event when emitEvents is disabled', () => {
      GameplayValidator.configure({ emitEvents: false });
      const eventSpy = vi.fn();
      const unsub = EventBus.on('gameplayValidation', eventSpy);

      const snapshot: GameplaySnapshot = {
        player: createMockPlayer({ hp: -10 }),
        timestamp: performance.now(),
      };

      GameplayValidator.validate(snapshot);

      expect(eventSpy).not.toHaveBeenCalled();

      unsub();
    });
  });

  describe('Throttling', () => {
    it('should throttle rapid validation calls', () => {
      const snapshot1: GameplaySnapshot = {
        player: createMockPlayer({ hp: -10 }),
        timestamp: performance.now(),
      };
      const snapshot2: GameplaySnapshot = {
        player: createMockPlayer({ hp: -20 }),
        timestamp: performance.now(),
      };

      // First call should process
      const result1 = GameplayValidator.validate(snapshot1);
      expect(result1.issues.length).toBeGreaterThan(0);

      // Second immediate call should be throttled
      const result2 = GameplayValidator.validate(snapshot2);
      expect(result2.issues.length).toBe(0);
    });
  });

  describe('History & Diagnostics', () => {
    it('should store issues in history', () => {
      const snapshot: GameplaySnapshot = {
        player: createMockPlayer({ hp: -10 }),
        timestamp: performance.now(),
      };

      GameplayValidator.validate(snapshot);

      const history = GameplayValidator.getIssueHistory();
      expect(history.length).toBeGreaterThan(0);
    });

    it('should provide issue summary by category', () => {
      const snapshot: GameplaySnapshot = {
        player: createMockPlayer({ hp: -10 }),
        marketData: createMockMarketData({ price: -100 }),
        timestamp: performance.now(),
      };

      GameplayValidator.validate(snapshot);

      const summary = GameplayValidator.getIssueSummary();
      expect(summary.player).toBeGreaterThan(0);
      expect(summary.market).toBeGreaterThan(0);
    });

    it('should clear history on clearHistory()', () => {
      const snapshot: GameplaySnapshot = {
        player: createMockPlayer({ hp: -10 }),
        timestamp: performance.now(),
      };

      GameplayValidator.validate(snapshot);
      expect(GameplayValidator.getIssueHistory().length).toBeGreaterThan(0);

      GameplayValidator.clearHistory();
      expect(GameplayValidator.getIssueHistory().length).toBe(0);
    });

    it('should provide debug state', () => {
      const debugState = GameplayValidator.getDebugState();
      expect(debugState).toHaveProperty('config');
      expect(debugState).toHaveProperty('historySize');
      expect(debugState).toHaveProperty('summary');
      expect(debugState).toHaveProperty('recentIssues');
    });
  });

  describe('Auto-fix Counting', () => {
    it('should count auto-fixed issues', () => {
      const snapshot: GameplaySnapshot = {
        player: createMockPlayer({ hp: -10, exp: -50 }),
        timestamp: performance.now(),
      };

      const result = GameplayValidator.validate(snapshot);
      expect(result.fixedCount).toBeGreaterThan(0);
    });

    it('should not count fixes when autoFix is disabled', () => {
      GameplayValidator.configure({ autoFix: false });

      const snapshot: GameplaySnapshot = {
        player: createMockPlayer({ hp: -10 }),
        timestamp: performance.now(),
      };

      const result = GameplayValidator.validate(snapshot);
      expect(result.fixedCount).toBe(0);
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty snapshot', () => {
      const snapshot: GameplaySnapshot = {
        timestamp: performance.now(),
      };

      const result = GameplayValidator.validate(snapshot);
      expect(result.isValid).toBe(true);
    });

    it('should handle empty enemy array', () => {
      const snapshot: GameplaySnapshot = {
        enemies: [],
        timestamp: performance.now(),
      };

      const result = GameplayValidator.validate(snapshot);
      expect(result.isValid).toBe(true);
    });

    it('should handle empty gem array', () => {
      const snapshot: GameplaySnapshot = {
        gems: [],
        timestamp: performance.now(),
      };

      const result = GameplayValidator.validate(snapshot);
      expect(result.isValid).toBe(true);
    });

    it('should limit issues per frame', () => {
      GameplayValidator.configure({ maxIssuesPerFrame: 2 });

      // Create snapshot with many issues
      const snapshot: GameplaySnapshot = {
        player: createMockPlayer({
          hp: -10,
          maxHp: 0,
          level: 0,
          exp: -100,
          x: NaN,
        }),
        timestamp: performance.now(),
      };

      const result = GameplayValidator.validate(snapshot);
      expect(result.issues.length).toBeLessThanOrEqual(2);
    });
  });
});
