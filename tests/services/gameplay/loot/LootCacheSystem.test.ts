import { beforeEach, describe, expect, it, vi } from 'vitest';
import { TIER_CONFIG } from '../../../../services/cards/CardSystem';
import { LootCacheSystem } from '../../../../services/gameplay/loot/LootCacheSystem';
import { type IPoolManager } from '../../../../services/interfaces/IPoolManager';
import {
  type FloatingText,
  type GameState,
  type Interactable,
  type Player,
} from '../../../../types';
import {
  type LootCacheResolution,
  type LootCacheRarity,
  type LootCacheResolveInput,
  type LootCacheSource,
} from '../../../../types/lootCache';

const DEFAULT_RESOLUTION: LootCacheResolution = {
  primaryReward: 'data_dividend',
  secondaryReward: null,
  rewardStrength: 1,
  fragmentAwarded: false,
  persistFragment: false,
  fragmentChance: 0,
  nextPityMisses: 0,
};

const createPlayer = (): Player =>
  ({
    x: 400,
    y: 300,
    radius: 16,
    hp: 100,
    maxHp: 100,
    exp: 25,
    nextLevelExp: 100,
    level: 3,
    invulnerabilityTimer: 0,
  }) as Player;

const createState = (): GameState =>
  ({
    shake: 0,
  }) as GameState;

const createScriptedRng = (values: number[], fallback = 0) => {
  let index = 0;
  return {
    nextFloat: vi.fn(() => values[index++] ?? fallback),
    reset: vi.fn(() => {
      index = 0;
    }),
  };
};

type TestEventBus = ReturnType<typeof createTestEventBus>;

const createTestEventBus = () => {
  const listeners = new Map<string, (data: unknown) => void>();
  const unsubscribeByEvent = new Map<string, ReturnType<typeof vi.fn>>();
  const emissions: Array<{ event: string; data: unknown }> = [];
  const on = vi.fn((event: string, callback: (data: unknown) => void) => {
    listeners.set(event, callback);
    const unsubscribe = vi.fn(() => {
      listeners.delete(event);
    });
    unsubscribeByEvent.set(event, unsubscribe);
    return unsubscribe;
  });
  const emit = vi.fn((event: string, data: unknown) => {
    emissions.push({ event, data });
  });

  return {
    on,
    emit,
    emissions,
    unsubscribeByEvent,
    dispatch(event: string, data: unknown): void {
      listeners.get(event)?.(data);
    },
  };
};

const createPool = () => {
  const activeInteractables: Interactable[] = [];
  const activeEnemies: IPoolManager['activeEnemies'] = [];
  const floatingTexts: FloatingText[] = [];
  const getLootCache = vi.fn(
    (
      cacheId: number,
      rarity: LootCacheRarity,
      source: LootCacheSource,
      x: number,
      y: number,
      color: string
    ): Interactable => {
      const cache: Interactable = {
        active: true,
        type: 'LOOT_CRATE',
        x,
        y,
        radius: 20,
        color,
        health: 1,
        maxHealth: 1,
        lootCacheId: cacheId,
        lootCacheRarity: rarity,
        lootCachePhase: 'closed',
        lootCacheSource: source,
        lootCachePhaseElapsedMs: 0,
        lootCacheIdleElapsedMs: 0,
        lootCacheProximity: false,
        lootCacheProximityTickElapsedMs: 0,
        lootCacheCoreFlashPending: false,
        lootCacheSecondaryReward: null,
        lootCacheFragmentPreview: false,
      };
      activeInteractables.push(cache);
      return cache;
    }
  );
  const releaseInteractable = vi.fn((cache: Interactable) => {
    cache.active = false;
    const index = activeInteractables.indexOf(cache);
    if (index >= 0) {
      activeInteractables.splice(index, 1);
    }
  });
  const getFloatingText = vi.fn(
    (
      x: number,
      y: number,
      text: string,
      color: string,
      size: number,
      isCrit = false,
      vx = 0,
      vy = 0
    ): FloatingText => {
      const floatingText: FloatingText = {
        active: true,
        x,
        y,
        text,
        color,
        size,
        life: 1,
        isCrit,
        vx,
        vy,
      };
      floatingTexts.push(floatingText);
      return floatingText;
    }
  );

  const pool = {
    activeEnemies,
    activeInteractables,
    getLootCache,
    releaseInteractable,
    getParticle: vi.fn(),
    getImpactRing: vi.fn(),
    getFloatingText,
  } as unknown as IPoolManager;

  return { pool, getLootCache, releaseInteractable, getFloatingText, floatingTexts };
};

const createAudio = () => ({
  playSlotTick: vi.fn(),
  playAnticipation: vi.fn(),
  playSlotWin: vi.fn(),
  playJackpot: vi.fn(),
  playCoinShower: vi.fn(),
  playMultiplierChime: vi.fn(),
});

const makeUpdateInput = (
  elapsedSeconds: number,
  pool: IPoolManager,
  player: Player,
  state: GameState,
  deltaMs = 0,
  reducedMotion = false,
  width = 800,
  height = 600,
  showParticles = true,
  particleMultiplier = 1
) => ({
  deltaMs,
  elapsedSeconds,
  width,
  height,
  reducedMotion,
  showParticles,
  particleMultiplier,
  pool,
  player,
  state,
});

const makeOpenInput = (
  elapsedSeconds: number,
  pool: IPoolManager,
  player: Player,
  state: GameState,
  reducedMotion = false
) => ({ elapsedSeconds, reducedMotion, pool, player, state });

const createSystem = (
  rng: ReturnType<typeof createScriptedRng>,
  eventBus: TestEventBus,
  resolution: LootCacheResolution = DEFAULT_RESOLUTION
) => {
  const resolver = {
    resolve: vi.fn((_input: LootCacheResolveInput) => resolution),
  };
  const applicator = { apply: vi.fn() };
  const audio = createAudio();
  const system = new LootCacheSystem({
    rng,
    resolver,
    applicator,
    eventBus,
    audio,
  });
  return { system, resolver, applicator, audio };
};

describe('LootCacheSystem', () => {
  let player: Player;
  let state: GameState;

  beforeEach(() => {
    player = createPlayer();
    state = createState();
  });

  it('plays spawn and proximity chimes only at their event boundaries', () => {
    const rng = createScriptedRng([0, 0, 0, 0, 0]);
    const eventBus = createTestEventBus();
    const { pool, getLootCache } = createPool();
    const { system, audio } = createSystem(rng, eventBus);

    system.beginRun(8);
    system.update(makeUpdateInput(35, pool, player, state));
    expect(audio.playMultiplierChime).toHaveBeenCalledWith(1);

    const cache = getLootCache.mock.results[0]!.value;
    player.x = cache.x;
    player.y = cache.y;
    system.update(makeUpdateInput(35, pool, player, state, 16));
    system.update(makeUpdateInput(35, pool, player, state, 16));
    expect(audio.playSlotTick).toHaveBeenCalledTimes(1);
  });

  it('throttles proximity ticks with game delta and raises cadence when closer', () => {
    const rng = createScriptedRng([0, 0, 0, 0, 0]);
    const eventBus = createTestEventBus();
    const { pool, getLootCache } = createPool();
    const { system, audio } = createSystem(rng, eventBus);

    system.beginRun(81);
    system.update(makeUpdateInput(35, pool, player, state));
    const cache = getLootCache.mock.results[0]!.value;
    player.x = cache.x - 96;
    player.y = cache.y;

    system.update(makeUpdateInput(35, pool, player, state, 16.67));
    for (let frame = 0; frame < 8; frame++) {
      system.update(makeUpdateInput(35, pool, player, state, 16.67));
    }
    expect(audio.playSlotTick).toHaveBeenCalledTimes(1);

    player.x = cache.x - 120;
    system.update(makeUpdateInput(35, pool, player, state, 16.67));
    expect(cache.lootCacheProximity).toBe(false);
    expect(cache.lootCacheProximityTickElapsedMs).toBe(0);

    player.x = cache.x;
    system.update(makeUpdateInput(35, pool, player, state, 16.67));
    expect(audio.playSlotTick).toHaveBeenCalledTimes(2);
    for (let frame = 0; frame < 8; frame++) {
      system.update(makeUpdateInput(35, pool, player, state, 16.67));
    }
    expect(audio.playSlotTick).toHaveBeenCalledTimes(3);
  });

  it.each([
    ['common', 'confirmation'],
    ['rare', 'win'],
    ['epic', 'win'],
    ['legendary', 'jackpot'],
  ] as const)('routes %s reward audio through the %s finish', (rarity, _finish) => {
    const rarityRoll = {
      common: 0,
      rare: 0.5,
      epic: 0.8,
      legendary: 0.99,
    }[rarity];
    const rng = createScriptedRng([0, rarityRoll, 0, 0]);
    const eventBus = createTestEventBus();
    const { pool, getLootCache } = createPool();
    const { system, audio } = createSystem(rng, eventBus);

    system.beginRun(9);
    system.update(makeUpdateInput(720, pool, player, state));
    const cache = getLootCache.mock.results[0]!.value;
    system.tryOpen(cache, makeOpenInput(720, pool, player, state));
    system.update(makeUpdateInput(720, pool, player, state, 260));

    if (rarity === 'common') {
      expect(audio.playMultiplierChime).toHaveBeenLastCalledWith(2);
      expect(audio.playSlotWin).not.toHaveBeenCalled();
    } else if (rarity === 'legendary') {
      expect(audio.playJackpot).toHaveBeenCalledTimes(1);
      expect(audio.playCoinShower).toHaveBeenCalledTimes(1);
      expect(audio.playSlotWin).not.toHaveBeenCalled();
    } else {
      expect(audio.playSlotWin).toHaveBeenCalledTimes(1);
      expect(audio.playJackpot).not.toHaveBeenCalled();
    }
  });

  it('waits for the sampled first window and keeps at most one active cache', () => {
    const rng = createScriptedRng([0, 0, 0, 0, 0]);
    const eventBus = createTestEventBus();
    const { pool, getLootCache } = createPool();
    const { system } = createSystem(rng, eventBus);

    system.beginRun(123);
    system.update(makeUpdateInput(34.999, pool, player, state));
    expect(getLootCache).not.toHaveBeenCalled();

    system.update(makeUpdateInput(35, pool, player, state));
    expect(getLootCache).toHaveBeenCalledTimes(1);
    expect(
      eventBus.emissions.filter(item => item.event === 'lootCacheSpawned')
    ).toHaveLength(1);

    system.update(makeUpdateInput(500, pool, player, state));
    expect(getLootCache).toHaveBeenCalledTimes(1);
  });

  it('honors the 55 second maximum first-spawn boundary', () => {
    const rng = createScriptedRng([1, 0, 0, 0, 0]);
    const eventBus = createTestEventBus();
    const { pool, getLootCache } = createPool();
    const { system } = createSystem(rng, eventBus);

    system.beginRun(124);
    system.update(makeUpdateInput(54.999, pool, player, state));
    expect(getLootCache).not.toHaveBeenCalled();

    system.update(makeUpdateInput(55, pool, player, state));
    expect(getLootCache).toHaveBeenCalledTimes(1);
  });

  it('anchors a fresh first window to the current cycle time', () => {
    const rng = createScriptedRng([0, 0, 0, 0, 0]);
    const eventBus = createTestEventBus();
    const { pool, getLootCache } = createPool();
    const { system } = createSystem(rng, eventBus);

    system.beginRun(124, 300);
    system.update(makeUpdateInput(334.999, pool, player, state));
    expect(getLootCache).not.toHaveBeenCalled();

    system.update(makeUpdateInput(335, pool, player, state));
    expect(getLootCache).toHaveBeenCalledTimes(1);
  });

  it.each([
    ['minimum', 0, 55],
    ['maximum', 1, 95],
  ] as const)(
    'honors the %s repeat-spawn boundary',
    (_boundary, repeatRoll, repeatSeconds) => {
      const rng = createScriptedRng([0, 0, 0, 0, repeatRoll], 0);
      const eventBus = createTestEventBus();
      const { pool, getLootCache, releaseInteractable } = createPool();
      const { system } = createSystem(rng, eventBus);

      system.beginRun(125);
      system.update(makeUpdateInput(35, pool, player, state));
      const firstCache = getLootCache.mock.results[0]!.value;
      expect(system.tryOpen(firstCache, makeOpenInput(200, pool, player, state))).toBe(
        true
      );
      releaseInteractable(firstCache);

      const repeatAt = 200 + repeatSeconds;
      system.update(makeUpdateInput(repeatAt - 0.001, pool, player, state));
      expect(getLootCache).toHaveBeenCalledTimes(1);

      system.update(makeUpdateInput(repeatAt, pool, player, state));
      expect(getLootCache).toHaveBeenCalledTimes(2);
    }
  );

  it('does not accelerate the first window before 35 seconds', () => {
    const rng = createScriptedRng([0, 0, 0, 0, 0]);
    const eventBus = createTestEventBus();
    const { pool, getLootCache } = createPool();
    const { system } = createSystem(rng, eventBus);
    player.hp = 34;

    system.beginRun(126);
    system.update(makeUpdateInput(34.999, pool, player, state));
    expect(getLootCache).not.toHaveBeenCalled();

    system.update(makeUpdateInput(35, pool, player, state));
    expect(getLootCache).toHaveBeenCalledTimes(1);
  });

  it('does not accelerate a repeat window before 55 seconds from contact', () => {
    const rng = createScriptedRng([0, 0, 0, 0, 0], 0);
    const eventBus = createTestEventBus();
    const { pool, getLootCache, releaseInteractable } = createPool();
    const { system } = createSystem(rng, eventBus);

    system.beginRun(127);
    system.update(makeUpdateInput(35, pool, player, state));
    const firstCache = getLootCache.mock.results[0]!.value;
    expect(system.tryOpen(firstCache, makeOpenInput(100, pool, player, state))).toBe(
      true
    );
    releaseInteractable(firstCache);
    player.hp = 34;

    system.update(makeUpdateInput(154.999, pool, player, state));
    expect(getLootCache).toHaveBeenCalledTimes(1);

    system.update(makeUpdateInput(155, pool, player, state));
    expect(getLootCache).toHaveBeenCalledTimes(2);
  });

  it('accelerates a critical-health window once by ten seconds', () => {
    const rng = createScriptedRng([1, 0, 0, 0, 0]);
    const eventBus = createTestEventBus();
    const { pool, getLootCache } = createPool();
    const { system } = createSystem(rng, eventBus);
    player.hp = 34;

    system.beginRun(7);
    system.update(makeUpdateInput(30, pool, player, state));
    system.update(makeUpdateInput(44.999, pool, player, state));
    expect(getLootCache).not.toHaveBeenCalled();

    system.update(makeUpdateInput(45, pool, player, state));
    expect(getLootCache).toHaveBeenCalledTimes(1);
  });

  it('defers a pressured spawn once by fifteen seconds', () => {
    const rng = createScriptedRng([0, 0, 0, 0, 0]);
    const eventBus = createTestEventBus();
    const { pool, getLootCache } = createPool();
    const { system } = createSystem(rng, eventBus);
    for (let enemyIndex = 0; enemyIndex < 28; enemyIndex++) {
      pool.activeEnemies.push({
        active: true,
        radius: 12,
      } as IPoolManager['activeEnemies'][number]);
    }

    system.beginRun(8);
    system.update(makeUpdateInput(35, pool, player, state));
    system.update(makeUpdateInput(49.999, pool, player, state));
    expect(getLootCache).not.toHaveBeenCalled();

    system.update(makeUpdateInput(50, pool, player, state));
    expect(getLootCache).toHaveBeenCalledTimes(1);
  });

  it('uses the last clamped placement candidate when every attempt is blocked', () => {
    const rng = createScriptedRng([0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]);
    const eventBus = createTestEventBus();
    const { pool, getLootCache } = createPool();
    const { system } = createSystem(rng, eventBus);
    player.x = 50;
    player.y = 50;
    pool.activeEnemies.push({
      active: true,
      x: 50,
      y: 50,
      radius: 20,
    } as IPoolManager['activeEnemies'][number]);

    system.beginRun(9);
    system.update(makeUpdateInput(35, pool, player, state, 0, false, 100, 100));

    expect(getLootCache).toHaveBeenCalledWith(
      1,
      'common',
      'runtime',
      50,
      50,
      '#9ca3af'
    );
  });

  it('applies rewards once and advances phase feedback using game delta', () => {
    const rng = createScriptedRng([0, 0.99], 0);
    const eventBus = createTestEventBus();
    const { pool, getLootCache, releaseInteractable } = createPool();
    const resolution: LootCacheResolution = {
      primaryReward: 'liquidity_injection',
      secondaryReward: 'data_dividend',
      rewardStrength: 1.6,
      fragmentAwarded: true,
      persistFragment: true,
      fragmentChance: 0.05,
      nextPityMisses: 0,
    };
    const { system, applicator, audio } = createSystem(rng, eventBus, resolution);

    system.beginRun(10);
    system.update(makeUpdateInput(35, pool, player, state));
    const cache = getLootCache.mock.results[0]!.value;

    expect(system.tryOpen(cache, makeOpenInput(420, pool, player, state))).toBe(true);
    expect(system.tryOpen(cache, makeOpenInput(420, pool, player, state))).toBe(false);
    expect(cache.lootCachePhase).toBe('anticipation');
    expect(cache.lootCachePrimaryReward).toBe('liquidity_injection');
    expect(cache.lootCacheSecondaryReward).toBe('data_dividend');
    expect(applicator.apply).toHaveBeenCalledTimes(2);
    expect(eventBus.emissions.map(item => item.event)).toEqual([
      'lootCacheSpawned',
      'lootCacheOpened',
      'cosmeticFragmentEarned',
    ]);
    expect(state.shake).toBe(2.5);

    system.update(makeUpdateInput(420, pool, player, state, 16.67));
    expect(pool.getParticle).not.toHaveBeenCalled();
    expect(eventBus.emissions.some(item => item.event === 'hitStop')).toBe(false);
    system.update(makeUpdateInput(420, pool, player, state, 16.67));
    expect(pool.getParticle).not.toHaveBeenCalled();
    expect(eventBus.emissions.some(item => item.event === 'hitStop')).toBe(false);
    system.update(makeUpdateInput(420, pool, player, state, 16.67));
    expect(cache.lootCachePhase).toBe('opening');
    expect(cache.lootCachePhaseElapsedMs).toBeCloseTo(10.01);
    expect(cache.lootCacheCoreFlashPending).toBe(true);
    expect(eventBus.emissions.filter(item => item.event === 'hitStop')).toHaveLength(1);
    expect(pool.getParticle).toHaveBeenCalledTimes(18);
    expect(pool.getImpactRing).toHaveBeenCalledTimes(1);

    system.update(makeUpdateInput(420, pool, player, state, 220));
    expect(cache.lootCachePhase).toBe('reward');
    expect(audio.playSlotWin).toHaveBeenCalledTimes(1);
    expect(pool.getFloatingText).toHaveBeenCalledTimes(3);
    system.update(makeUpdateInput(420, pool, player, state, 1));
    expect(audio.playSlotWin).toHaveBeenCalledTimes(1);
    expect(pool.getFloatingText).toHaveBeenCalledTimes(3);

    system.update(makeUpdateInput(420, pool, player, state, 377.99));
    expect(releaseInteractable).not.toHaveBeenCalled();
    system.update(makeUpdateInput(420, pool, player, state, 1));
    expect(releaseInteractable).toHaveBeenCalledWith(cache);
  });

  it('scales opening particles for low profiles and skips disabled burst work', () => {
    const rng = createScriptedRng([0, 0, 0, 0, 0]);
    const eventBus = createTestEventBus();
    const { pool, getLootCache, releaseInteractable } = createPool();
    const { system } = createSystem(rng, eventBus);

    system.beginRun(101);
    system.update(makeUpdateInput(35, pool, player, state));
    const lowProfileCache = getLootCache.mock.results[0]!.value;
    system.tryOpen(lowProfileCache, makeOpenInput(35, pool, player, state));
    for (let frame = 0; frame < 3; frame++) {
      system.update(
        makeUpdateInput(35, pool, player, state, 16.67, false, 800, 600, true, 0.3)
      );
    }
    expect(pool.getParticle).toHaveBeenCalledTimes(2);
    expect(pool.getImpactRing).toHaveBeenCalledTimes(1);

    releaseInteractable(lowProfileCache);
    system.requestDebugSpawn('random');
    system.update(makeUpdateInput(100, pool, player, state));
    const disabledCache = getLootCache.mock.results[1]!.value;
    system.tryOpen(disabledCache, makeOpenInput(100, pool, player, state));
    vi.mocked(pool.getParticle).mockClear();
    vi.mocked(pool.getImpactRing).mockClear();
    for (let frame = 0; frame < 3; frame++) {
      system.update(
        makeUpdateInput(100, pool, player, state, 16.67, false, 800, 600, false, 0.3)
      );
    }
    expect(pool.getParticle).not.toHaveBeenCalled();
    expect(pool.getImpactRing).not.toHaveBeenCalled();
  });

  it('spawns readable pooled primary, secondary, and fragment visuals once', () => {
    const rng = createScriptedRng([0, 0, 0, 0, 0]);
    const eventBus = createTestEventBus();
    const { pool, getLootCache, floatingTexts } = createPool();
    const resolution: LootCacheResolution = {
      primaryReward: 'liquidity_injection',
      secondaryReward: 'data_dividend',
      rewardStrength: 1.6,
      fragmentAwarded: true,
      persistFragment: false,
      fragmentChance: 0.05,
      nextPityMisses: 0,
    };
    const { system } = createSystem(rng, eventBus, resolution);

    system.beginRun(102);
    system.update(makeUpdateInput(35, pool, player, state));
    const cache = getLootCache.mock.results[0]!.value;
    system.tryOpen(cache, makeOpenInput(35, pool, player, state));
    system.update(makeUpdateInput(35, pool, player, state, 260));

    expect(floatingTexts.map(text => text.text)).toEqual([
      '♥ LIQUIDITY INJECTION',
      '✦ DATA DIVIDEND',
      '◆ ENCRYPTED FRAGMENT',
    ]);
    expect(floatingTexts[0]!.size).toBeGreaterThan(floatingTexts[1]!.size);
    expect(floatingTexts[0]!.vx).not.toBe(0);
    expect(floatingTexts.every(text => text.stationary !== true)).toBe(true);
    expect(floatingTexts.every(text => text.alwaysVisible === true)).toBe(true);
    expect(floatingTexts.every(text => text.velocityOnly === true)).toBe(true);

    system.update(makeUpdateInput(35, pool, player, state, 16.67));
    expect(floatingTexts).toHaveLength(3);
  });

  it('keeps reduced-motion reward and fragment visuals stationary and readable', () => {
    const rng = createScriptedRng([0, 0, 0, 0, 0]);
    const eventBus = createTestEventBus();
    const { pool, getLootCache, floatingTexts } = createPool();
    const resolution: LootCacheResolution = {
      ...DEFAULT_RESOLUTION,
      fragmentAwarded: true,
      persistFragment: false,
    };
    const { system } = createSystem(rng, eventBus, resolution);

    system.beginRun(103);
    system.update(makeUpdateInput(35, pool, player, state));
    const cache = getLootCache.mock.results[0]!.value;
    system.tryOpen(cache, makeOpenInput(35, pool, player, state, true));
    system.update(makeUpdateInput(35, pool, player, state, 260, true));

    expect(floatingTexts.map(text => text.text)).toEqual([
      '✦ DATA DIVIDEND',
      '◆ ENCRYPTED FRAGMENT',
    ]);
    expect(
      floatingTexts.every(
        text =>
          text.stationary === true &&
          text.alwaysVisible === true &&
          text.velocityOnly === true &&
          text.vx === 0 &&
          text.vy === 0
      )
    ).toBe(true);
  });

  it('omits shake for reduced motion while retaining opening facts', () => {
    const rng = createScriptedRng([0, 0.99], 0);
    const eventBus = createTestEventBus();
    const { pool, getLootCache } = createPool();
    const { system } = createSystem(rng, eventBus);

    system.beginRun(11);
    system.update(makeUpdateInput(35, pool, player, state));
    const cache = getLootCache.mock.results[0]!.value;
    expect(system.tryOpen(cache, makeOpenInput(420, pool, player, state, true))).toBe(
      true
    );

    expect(state.shake).toBe(0);
    expect(eventBus.emissions.some(item => item.event === 'lootCacheOpened')).toBe(
      true
    );
  });

  it.each([
    [
      'HP',
      (target: Player) => {
        target.hp = Number.NaN;
      },
      0,
    ],
    [
      'level progress',
      (target: Player) => {
        target.hp = 50;
        target.nextLevelExp = 0;
      },
      0.99,
    ],
  ] as const)(
    'falls back to Data Dividend for a malformed %s snapshot',
    (_snapshot, mutatePlayer, rewardRoll) => {
      const rng = createScriptedRng([0, 0, 0, 0, rewardRoll], 0);
      const eventBus = createTestEventBus();
      const { pool, getLootCache } = createPool();
      const applicator = { apply: vi.fn() };
      const system = new LootCacheSystem({
        rng,
        applicator,
        eventBus,
        audio: createAudio(),
      });
      mutatePlayer(player);

      system.beginRun(111);
      system.update(makeUpdateInput(35, pool, player, state));
      const cache = getLootCache.mock.results[0]!.value;
      expect(system.tryOpen(cache, makeOpenInput(35, pool, player, state))).toBe(true);

      expect(applicator.apply).toHaveBeenCalledWith(
        'data_dividend',
        1,
        expect.objectContaining({ player })
      );
    }
  );

  it('preserves pity across ineligible runtime openings', () => {
    const rng = createScriptedRng([], 0);
    const eventBus = createTestEventBus();
    const { pool, getLootCache } = createPool();
    const { system, resolver } = createSystem(rng, eventBus);
    resolver.resolve
      .mockReturnValueOnce({ ...DEFAULT_RESOLUTION, nextPityMisses: 4 })
      .mockReturnValueOnce({ ...DEFAULT_RESOLUTION, nextPityMisses: 4 })
      .mockReturnValueOnce(DEFAULT_RESOLUTION);

    system.beginRun(12);
    system.update(makeUpdateInput(35, pool, player, state));
    system.tryOpen(
      getLootCache.mock.results[0]!.value,
      makeOpenInput(120, pool, player, state)
    );
    system.update(makeUpdateInput(120, pool, player, state, 650));

    system.update(makeUpdateInput(175, pool, player, state));
    system.tryOpen(
      getLootCache.mock.results[1]!.value,
      makeOpenInput(179, pool, player, state)
    );
    system.update(makeUpdateInput(179, pool, player, state, 650));

    system.update(makeUpdateInput(234, pool, player, state));
    system.tryOpen(
      getLootCache.mock.results[2]!.value,
      makeOpenInput(420, pool, player, state)
    );

    expect(resolver.resolve.mock.calls[1]![0].pityMisses).toBe(4);
    expect(resolver.resolve.mock.calls[2]![0].pityMisses).toBe(4);
  });

  it('forces a Gold debug preview without fragment persistence or pity mutation', () => {
    const rng = createScriptedRng([], 0);
    const eventBus = createTestEventBus();
    const { pool, getLootCache } = createPool();
    const previewResolution: LootCacheResolution = {
      ...DEFAULT_RESOLUTION,
      fragmentAwarded: true,
      persistFragment: false,
      nextPityMisses: 0,
    };
    const { system, resolver, audio } = createSystem(rng, eventBus, previewResolution);

    system.beginRun(13);
    eventBus.dispatch('debugLootCacheSpawnRequested', { mode: 'jackpot' });
    system.update(makeUpdateInput(0, pool, player, state));
    const cache = getLootCache.mock.results[0]!.value;

    expect(getLootCache).toHaveBeenCalledWith(
      1,
      'legendary',
      'debug',
      expect.any(Number),
      expect.any(Number),
      TIER_CONFIG.legendary.color
    );
    expect(cache.lootCacheFragmentPreview).toBe(true);
    expect(system.tryOpen(cache, makeOpenInput(0, pool, player, state))).toBe(true);
    expect(resolver.resolve.mock.calls[0]![0]).toMatchObject({
      pityMisses: 0,
      forceFragmentPreview: true,
    });
    expect(
      eventBus.emissions.some(item => item.event === 'cosmeticFragmentEarned')
    ).toBe(false);

    system.update(makeUpdateInput(0, pool, player, state, 260));
    expect(audio.playJackpot).toHaveBeenCalledTimes(1);
    expect(audio.playCoinShower).toHaveBeenCalledTimes(1);
  });

  it('applies two distinct effects for constrained Gold reward selection', () => {
    const rng = createScriptedRng([0, 0.99, 0, 0, 0.99, 0, 0], 0);
    const eventBus = createTestEventBus();
    const { pool, getLootCache } = createPool();
    const applicator = { apply: vi.fn() };
    const system = new LootCacheSystem({
      rng,
      applicator,
      eventBus,
      audio: createAudio(),
      isOverclockActive: () => true,
    });
    player.hp = player.maxHp;

    system.beginRun(131);
    system.update(makeUpdateInput(720, pool, player, state));
    const cache = getLootCache.mock.results[0]!.value;
    expect(cache.lootCacheRarity).toBe('legendary');

    expect(system.tryOpen(cache, makeOpenInput(720, pool, player, state))).toBe(true);
    expect(applicator.apply.mock.calls.map(call => call[0])).toEqual([
      'data_dividend',
      'liquidity_injection',
    ]);
  });

  it('rearms natural spawning when debug replaces an unopened runtime cache', () => {
    const rng = createScriptedRng([], 0);
    const eventBus = createTestEventBus();
    const { pool, getLootCache } = createPool();
    const { system } = createSystem(rng, eventBus);

    system.beginRun(132);
    system.update(makeUpdateInput(35, pool, player, state));
    const runtimeCache = getLootCache.mock.results[0]!.value;
    expect(runtimeCache.lootCacheSource).toBe('runtime');

    system.requestDebugSpawn('random');
    system.update(makeUpdateInput(50, pool, player, state));
    const debugCache = getLootCache.mock.results[1]!.value;
    expect(debugCache.lootCacheSource).toBe('debug');
    expect(system.tryOpen(debugCache, makeOpenInput(50, pool, player, state))).toBe(
      true
    );
    system.update(makeUpdateInput(50, pool, player, state, 650));

    system.update(makeUpdateInput(104.999, pool, player, state));
    expect(getLootCache).toHaveBeenCalledTimes(2);
    system.update(makeUpdateInput(105, pool, player, state));
    expect(getLootCache).toHaveBeenCalledTimes(3);
    expect(getLootCache.mock.results[2]!.value.lootCacheSource).toBe('runtime');
  });

  it('clears active cache, pity, and pending debug state on reset', () => {
    const rng = createScriptedRng([], 0);
    const eventBus = createTestEventBus();
    const { pool, getLootCache, releaseInteractable } = createPool();
    const { system, resolver } = createSystem(rng, eventBus);
    resolver.resolve.mockReturnValueOnce({ ...DEFAULT_RESOLUTION, nextPityMisses: 6 });

    system.beginRun(14);
    system.update(makeUpdateInput(35, pool, player, state));
    system.tryOpen(
      getLootCache.mock.results[0]!.value,
      makeOpenInput(420, pool, player, state)
    );
    system.requestDebugSpawn('jackpot');
    system.reset();

    expect(releaseInteractable).toHaveBeenCalledTimes(1);
    system.update(makeUpdateInput(500, pool, player, state));
    expect(getLootCache).toHaveBeenCalledTimes(1);

    system.requestDebugSpawn('random');
    system.update(makeUpdateInput(500, pool, player, state));
    system.tryOpen(
      getLootCache.mock.results[1]!.value,
      makeOpenInput(500, pool, player, state)
    );
    expect(resolver.resolve.mock.calls[1]![0].pityMisses).toBe(0);
  });

  it('uses afterReset for the same cleanup and unsubscribes both listeners', () => {
    const rng = createScriptedRng([], 0);
    const eventBus = createTestEventBus();
    const { pool, getLootCache, releaseInteractable } = createPool();
    const { system } = createSystem(rng, eventBus);

    system.beginRun(15);
    system.update(makeUpdateInput(35, pool, player, state));
    system.requestDebugSpawn('jackpot');
    eventBus.dispatch('afterReset', {});

    expect(releaseInteractable).toHaveBeenCalledWith(
      getLootCache.mock.results[0]!.value
    );
    system.update(makeUpdateInput(500, pool, player, state));
    expect(getLootCache).toHaveBeenCalledTimes(1);

    system.dispose();
    expect(eventBus.unsubscribeByEvent.get('afterReset')).toHaveBeenCalledTimes(1);
    expect(
      eventBus.unsubscribeByEvent.get('debugLootCacheSpawnRequested')
    ).toHaveBeenCalledTimes(1);
  });

  it('disposes idempotently without duplicate release or listener cleanup', () => {
    const rng = createScriptedRng([], 0);
    const eventBus = createTestEventBus();
    const { pool, releaseInteractable } = createPool();
    const { system } = createSystem(rng, eventBus);

    system.beginRun(151);
    system.update(makeUpdateInput(35, pool, player, state));

    expect(() => {
      system.dispose();
      system.dispose();
    }).not.toThrow();
    expect(releaseInteractable).toHaveBeenCalledTimes(1);
    expect(eventBus.unsubscribeByEvent.get('afterReset')).toHaveBeenCalledTimes(1);
    expect(
      eventBus.unsubscribeByEvent.get('debugLootCacheSpawnRequested')
    ).toHaveBeenCalledTimes(1);
  });

  it('backs off five seconds after pool exhaustion without a phantom spawn', () => {
    const rng = createScriptedRng([], 0);
    const eventBus = createTestEventBus();
    const { pool, getLootCache } = createPool();
    const { system } = createSystem(rng, eventBus);
    getLootCache.mockImplementationOnce(() => {
      throw new Error('Pool exhausted');
    });

    system.beginRun(16);
    expect(() => system.update(makeUpdateInput(35, pool, player, state))).not.toThrow();
    expect(getLootCache).toHaveBeenCalledTimes(1);
    expect(eventBus.emissions.some(item => item.event === 'lootCacheSpawned')).toBe(
      false
    );

    system.update(makeUpdateInput(39.999, pool, player, state));
    expect(getLootCache).toHaveBeenCalledTimes(1);
    system.update(makeUpdateInput(40, pool, player, state));
    expect(getLootCache).toHaveBeenCalledTimes(2);
    expect(
      eventBus.emissions.filter(item => item.event === 'lootCacheSpawned')
    ).toHaveLength(1);
  });

  it('does not accelerate a pool retry when health becomes critical', () => {
    const rng = createScriptedRng([], 0);
    const eventBus = createTestEventBus();
    const { pool, getLootCache } = createPool();
    const { system } = createSystem(rng, eventBus);
    getLootCache.mockImplementationOnce(() => {
      throw new Error('Pool exhausted');
    });

    system.beginRun(17);
    system.update(makeUpdateInput(35, pool, player, state));
    player.hp = 34;

    system.update(makeUpdateInput(36, pool, player, state));
    system.update(makeUpdateInput(39.999, pool, player, state));
    expect(getLootCache).toHaveBeenCalledTimes(1);

    system.update(makeUpdateInput(40, pool, player, state));
    expect(getLootCache).toHaveBeenCalledTimes(2);
  });

  it('does not defer a pool retry under high enemy pressure', () => {
    const rng = createScriptedRng([], 0);
    const eventBus = createTestEventBus();
    const { pool, getLootCache } = createPool();
    const { system } = createSystem(rng, eventBus);
    getLootCache.mockImplementationOnce(() => {
      throw new Error('Pool exhausted');
    });

    system.beginRun(18);
    system.update(makeUpdateInput(35, pool, player, state));
    for (let enemyIndex = 0; enemyIndex < 28; enemyIndex++) {
      pool.activeEnemies.push({
        active: true,
        radius: 12,
      } as IPoolManager['activeEnemies'][number]);
    }

    system.update(makeUpdateInput(39.999, pool, player, state));
    expect(getLootCache).toHaveBeenCalledTimes(1);
    system.update(makeUpdateInput(40, pool, player, state));
    expect(getLootCache).toHaveBeenCalledTimes(2);
  });

  it('retries a failed jackpot request as the same debug preview', () => {
    const rng = createScriptedRng([], 0);
    const eventBus = createTestEventBus();
    const { pool, getLootCache } = createPool();
    const { system, resolver } = createSystem(rng, eventBus, {
      ...DEFAULT_RESOLUTION,
      fragmentAwarded: true,
      persistFragment: false,
    });
    getLootCache.mockImplementationOnce(() => {
      throw new Error('Pool exhausted');
    });

    system.beginRun(19);
    system.requestDebugSpawn('jackpot');
    system.update(makeUpdateInput(0, pool, player, state));
    expect(getLootCache).toHaveBeenCalledTimes(1);
    expect(eventBus.emissions.some(item => item.event === 'lootCacheSpawned')).toBe(
      false
    );

    system.update(makeUpdateInput(4.999, pool, player, state));
    expect(getLootCache).toHaveBeenCalledTimes(1);
    system.update(makeUpdateInput(5, pool, player, state));

    expect(getLootCache).toHaveBeenNthCalledWith(
      2,
      1,
      'legendary',
      'debug',
      expect.any(Number),
      expect.any(Number),
      TIER_CONFIG.legendary.color
    );
    expect(getLootCache.mock.results[1]!.value.lootCacheFragmentPreview).toBe(true);
    expect(
      eventBus.emissions.filter(item => item.event === 'lootCacheSpawned')
    ).toHaveLength(1);

    system.tryOpen(
      getLootCache.mock.results[1]!.value,
      makeOpenInput(5, pool, player, state)
    );
    expect(resolver.resolve.mock.calls[0]![0]).toMatchObject({
      pityMisses: 0,
      forceFragmentPreview: true,
    });
  });
});
