import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { type GameState, type Gem, type Player } from '../../../../types';
import { type GameEnemy } from '../../../../factories/EnemyFactory';
import { type IPoolManager } from '../../../../services/interfaces/IPoolManager';
import { EventBus } from '../../../../services/core/EventBus';
import { TimeService } from '../../../../services/core/TimeService';
import { BuffManager } from '../../../../services/patterns/decorators/BuffManager';
import { LootCacheRewardApplicator } from '../../../../services/gameplay/loot/LootCacheRewardApplicator';
import { LOOT_CACHE_CONFIG } from '../../../../config/LootCacheConfig';

const createPlayer = (overrides: Partial<Player> = {}): Player =>
  ({
    x: 40,
    y: 60,
    radius: 12,
    color: '#fff',
    level: 3,
    exp: 20,
    nextLevelExp: 101,
    hp: 50,
    maxHp: 100,
    invulnerabilityTimer: 0,
    baseDamage: 10,
    speed: 5,
    fireRate: 5,
    critChance: 0.05,
    critMultiplier: 2,
    armor: 0,
    magnet: 0,
    projectileCount: 1,
    projectileArea: 1,
    luck: 0,
    lifesteal: 0,
    dodge: 0,
    ...overrides,
  }) as Player;

const createPool = (activeEnemies: GameEnemy[] = []) => {
  const getGem = vi.fn(
    (
      x: number,
      y: number,
      value: number,
      radius: number,
      color: string,
      isRare: boolean
    ): Gem => ({
      active: true,
      x,
      y,
      value,
      radius,
      color,
      isRare,
    })
  );
  const getFloatingText = vi.fn();
  const pool = {
    activeEnemies,
    getGem,
    getFloatingText,
  } as unknown as IPoolManager;

  return { pool, getGem, getFloatingText };
};

const createContext = (pool: IPoolManager, player: Player) => ({
  pool,
  player,
  state: {} as GameState,
  x: 100,
  y: 120,
  random: { nextFloat: vi.fn(() => 0.25) },
});

describe('LootCacheRewardApplicator', () => {
  beforeEach(() => {
    TimeService.reset();
    BuffManager.reset();
  });

  afterEach(() => {
    BuffManager.reset();
    TimeService.reset();
    vi.restoreAllMocks();
  });

  it('clamps Liquidity healing and grants contact protection', () => {
    const player = createPlayer({ hp: 90, invulnerabilityTimer: 300 });
    const { pool, getFloatingText } = createPool();
    const emitSpy = vi.spyOn(EventBus, 'emit');

    LootCacheRewardApplicator.apply(
      'liquidity_injection',
      1,
      createContext(pool, player)
    );

    expect(player.hp).toBe(100);
    expect(player.invulnerabilityTimer).toBe(1500);
    expect(emitSpy).toHaveBeenCalledWith('playerHealed', {
      amount: 10,
      x: player.x,
      y: player.y - 20,
      source: 'pickup',
    });
    expect(emitSpy).toHaveBeenCalledWith('playerHealthChange', {
      hpPercent: 100,
      hp: 100,
      maxHp: 100,
    });
    expect(getFloatingText).toHaveBeenCalledTimes(1);
  });

  it('splits epic Data Dividend XP with exact floor and remainder distribution', () => {
    const player = createPlayer({ nextLevelExp: 103 });
    const { pool, getGem, getFloatingText } = createPool();

    LootCacheRewardApplicator.apply('data_dividend', 1.6, createContext(pool, player));

    expect(getGem).toHaveBeenCalledTimes(8);
    const values = getGem.mock.calls.map(call => call[2]);
    expect(values).toEqual([8, 7, 7, 7, 7, 7, 7, 7]);
    expect(values.reduce((sum, value) => sum + value, 0)).toBe(
      Math.max(1, Math.floor(103 * 0.35 * 1.6))
    );
    expect(getFloatingText).toHaveBeenCalledTimes(1);
  });

  it('applies and expires Overclock through the real BuffManager lifecycle', () => {
    const player = createPlayer({ baseDamage: 20, fireRate: 130 });
    const { pool, getFloatingText } = createPool();
    BuffManager.initialize(player);

    LootCacheRewardApplicator.apply(
      'overclock_contract',
      1,
      createContext(pool, player)
    );

    let stats = BuffManager.getDecoratedStats();
    expect(stats.getDamage()).toBe(25);
    expect(stats.getFireRate()).toBeCloseTo(130 / 1.3);
    expect(BuffManager.hasEffect('Overclock Contract')).toBe(true);

    TimeService.setGameTime(LOOT_CACHE_CONFIG.rewards.overclockDurationMs + 1);
    BuffManager.update();

    stats = BuffManager.getDecoratedStats();
    expect(stats.getDamage()).toBe(20);
    expect(stats.getFireRate()).toBe(130);
    expect(BuffManager.hasEffect('Overclock Contract')).toBe(false);
    expect(getFloatingText).toHaveBeenCalledTimes(1);
  });

  it('pushes active enemies away and applies the Circuit Breaker slow', () => {
    const nearEnemy = {
      active: true,
      isDying: false,
      x: 110,
      y: 120,
    } as GameEnemy;
    const diagonalEnemy = {
      active: true,
      isDying: false,
      x: 100,
      y: 130,
    } as GameEnemy;
    const inactiveEnemy = {
      active: false,
      isDying: false,
      x: 90,
      y: 120,
    } as GameEnemy;
    const { pool, getFloatingText } = createPool([
      nearEnemy,
      diagonalEnemy,
      inactiveEnemy,
    ]);

    LootCacheRewardApplicator.apply(
      'circuit_breaker',
      1,
      createContext(pool, createPlayer())
    );

    expect(nearEnemy.x).toBe(145);
    expect(diagonalEnemy.y).toBe(165);
    expect(nearEnemy.movementSlowTimerMs).toBe(2500);
    expect(nearEnemy.movementSlowMultiplier).toBe(0.5);
    expect(diagonalEnemy.movementSlowTimerMs).toBe(2500);
    expect(inactiveEnemy.x).toBe(90);
    expect(inactiveEnemy.movementSlowTimerMs).toBeUndefined();
    expect(getFloatingText).toHaveBeenCalledTimes(1);
  });

  it('composes a legendary secondary reward without undoing the primary', () => {
    const player = createPlayer({ hp: 40 });
    const { pool, getGem } = createPool();
    const context = createContext(pool, player);
    BuffManager.initialize(player);

    LootCacheRewardApplicator.apply('liquidity_injection', 1.5, context);
    LootCacheRewardApplicator.apply('overclock_contract', 1.5, context);

    expect(player.hp).toBe(77.5);
    expect(player.invulnerabilityTimer).toBe(1500);
    expect(BuffManager.hasEffect('Overclock Contract')).toBe(true);
    expect(BuffManager.getDecoratedStats().getDamage()).toBe(12.5);
    expect(getGem).not.toHaveBeenCalled();
  });

  it('composes Data Dividend with full-health Liquidity as two positive effects', () => {
    const player = createPlayer({ hp: 100, nextLevelExp: 100 });
    const { pool, getGem } = createPool();
    const context = createContext(pool, player);

    LootCacheRewardApplicator.apply('data_dividend', 1.5, context);
    LootCacheRewardApplicator.apply('liquidity_injection', 1.5, context);

    const totalGemXp = getGem.mock.calls.reduce((total, call) => total + call[2], 0);
    expect(totalGemXp).toBe(52);
    expect(player.hp).toBe(100);
    expect(player.invulnerabilityTimer).toBe(1500);
  });

  it('preserves exact Data Dividend XP across partial pool failures', () => {
    const player = createPlayer({ nextLevelExp: 103 });
    const { pool, getGem } = createPool();
    const successfulGems: Gem[] = [];
    let attempt = 0;
    getGem.mockImplementation((x, y, value, radius, color, isRare) => {
      const currentAttempt = attempt++;
      if (currentAttempt === 1 || currentAttempt === 7) {
        throw new Error('pool exhausted');
      }
      const gem: Gem = { active: true, x, y, value, radius, color, isRare };
      successfulGems.push(gem);
      return gem;
    });

    LootCacheRewardApplicator.apply('data_dividend', 1.6, createContext(pool, player));

    expect(getGem).toHaveBeenCalledTimes(8);
    expect(successfulGems.reduce((sum, gem) => sum + gem.value, 0)).toBe(57);
  });

  it('applies the exact Data Dividend XP when every gem request fails', () => {
    const player = createPlayer();
    const { pool, getGem } = createPool();
    getGem.mockImplementation(() => {
      throw new Error('pool exhausted');
    });

    const expectedXp = Math.max(
      1,
      Math.floor(player.nextLevelExp * LOOT_CACHE_CONFIG.rewards.xpNextLevelFraction)
    );

    expect(() =>
      LootCacheRewardApplicator.apply('data_dividend', 1, createContext(pool, player))
    ).not.toThrow();
    expect(getGem).toHaveBeenCalledTimes(8);
    expect(player.exp).toBe(20 + expectedXp);
  });

  it.each([
    ['NaN', Number.NaN],
    ['Infinity', Number.POSITIVE_INFINITY],
    ['zero', 0],
    ['negative', -100],
  ] as const)(
    'uses one finite XP as the exact Data Dividend total for a %s next-level basis',
    (_label, nextLevelExp) => {
      const player = createPlayer({ nextLevelExp });
      const { pool, getGem } = createPool();

      LootCacheRewardApplicator.apply('data_dividend', 1, createContext(pool, player));

      const values = getGem.mock.calls.map(call => call[2]);
      expect(values).toHaveLength(8);
      expect(values.every(Number.isFinite)).toBe(true);
      expect(values.reduce((total, value) => total + value, 0)).toBe(1);
    }
  );

  it.each([
    ['NaN', Number.NaN],
    ['Infinity', Number.POSITIVE_INFINITY],
    ['zero', 0],
    ['negative', -100],
  ] as const)(
    'applies one direct XP when every gem fails for a %s next-level basis',
    (_label, nextLevelExp) => {
      const player = createPlayer({ nextLevelExp });
      const { pool, getGem } = createPool();
      getGem.mockImplementation(() => {
        throw new Error('pool exhausted');
      });

      LootCacheRewardApplicator.apply('data_dividend', 1, createContext(pool, player));

      expect(player.exp).toBe(21);
    }
  );
});
