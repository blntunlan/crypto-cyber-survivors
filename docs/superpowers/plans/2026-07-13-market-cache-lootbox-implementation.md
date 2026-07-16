# Market Cache Lootbox Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the bullet-destroyed world loot crate with a contact-opened, smart-reward Market Cache that has casino rarity juice, time-gated cosmetic fragments, and development spawn controls.

**Architecture:** A non-singleton `LootCacheSystem` owned by `GameRuntime` controls spawn and opening lifecycle. A pure `LootCacheRewardResolver` selects rewards and fragments, a focused applicator mutates run state, `CollectionSystem` owns contact detection, and `EntityRenderer` owns canvas presentation. Persistent encrypted fragments extend the existing `cosmeticsStore`; wallet paths remain untouched.

**Tech Stack:** React 19, TypeScript 5.8 strict mode, Vite 6, Vitest 4/jsdom, Zustand persist, Canvas 2D, existing `EventBus`, `PoolManager`, `BuffManager`, `TimeService`, and `SeededRng`.

## Global Constraints

- Node.js remains version 20 or newer.
- Do not add `useState` or `setState` to the RAF loop.
- Do not allocate arrays or objects continuously in cache update/render paths.
- Use `PoolManager` for particles, rings, gems, floating text, and interactables.
- Use game-time deltas; do not add native `setTimeout` or `setInterval`.
- Add no new singleton. `LootCacheSystem` is constructed and disposed by `GameRuntime`.
- Every EventBus subscription must clean up.
- `LOOT_CRATE` opens only from player contact and never from bullet damage.
- Every opening grants a positive run reward; no trap, damage, debuff, empty, or enemy-spawn result is allowed.
- The first 180 seconds have zero encrypted-fragment probability.
- World caches never unlock a complete skin and never mutate coins or wallets.
- `B` and `Shift+B` work only in development while status is `PLAYING`.
- Reduced motion removes shake and fragment travel while retaining readable feedback.
- Application code uses no `any`; test partial mocks may use `any`.
- Commit steps run only after explicit user authorization; otherwise skip them.

## File Map

**Create:**

- `types/lootCache.ts` — cache rarity, reward, phase, resolver, and source contracts.
- `config/LootCacheConfig.ts` — approved time curves and tuning.
- `services/gameplay/loot/LootCacheRewardResolver.ts` — pure smart selection.
- `services/gameplay/loot/LootCacheRewardApplicator.ts` — immediate reward effects.
- `services/gameplay/loot/LootCacheSystem.ts` — spawn/open/pity runtime.
- `services/interfaces/ILootCacheSystem.ts` — narrow integration contract.
- `services/patterns/decorators/buffs/OverclockContractDecorator.ts` — timed buff.
- `tests/config/LootCacheConfig.test.ts`
- `tests/services/gameplay/loot/LootCacheRewardResolver.test.ts`
- `tests/services/gameplay/loot/LootCacheRewardApplicator.test.ts`
- `tests/services/gameplay/loot/LootCacheSystem.test.ts`
- `tests/stores/cosmeticsStore.test.ts`

**Modify:**

- `types.ts`, `types/events.ts`, `config/index.ts`, `constants.ts`
- `stores/cosmeticsStore.ts`, `hooks/useGameEvents.ts`
- `services/patterns/decorators/buffs/index.ts`
- `services/combat/PoolManager.ts`, `services/interfaces/IPoolManager.ts`
- `services/combat/physics/MovementSystem.ts`
- `services/combat/physics/CollisionSystem.ts`
- `services/combat/physics/CollectionSystem.ts`, `services/combat/PhysicsSystem.ts`
- `services/renderers/EntityRenderer.ts`
- `services/gameplay/GameRuntime.ts`, `services/core/GameStateManager.ts`, `components/GameEngine.tsx`
- `services/system/CheatManager.ts`
- Adjacent Vitest files and `public/docs/LOOTBOX_SYSTEM.md`

---

### Task 1: Lock Cache Contracts and Configuration

**Files:**
- Create: `types/lootCache.ts`
- Create: `config/LootCacheConfig.ts`
- Create: `tests/config/LootCacheConfig.test.ts`
- Modify: `types.ts:292`
- Modify: `types/events.ts:35`
- Modify: `config/index.ts:1`

**Interfaces:**
- Produces: `LootCacheRarity`, `LootCacheRewardId`, `LootCachePhase`, `LootCacheSource`, `LootCacheResolveInput`, `LootCacheResolution`, `LOOT_CACHE_CONFIG`, `getLootCacheRarityWeights()`, and `getLootCacheFragmentChance()`.
- Consumes: existing `LootboxRarity`, `Interactable`, and typed EventBus conventions.

- [ ] **Step 1: Write failing time-boundary tests**

```ts
import { describe, expect, it } from 'vitest';
import {
  getLootCacheFragmentChance,
  getLootCacheRarityWeights,
} from '../../config/LootCacheConfig';

describe('LootCacheConfig', () => {
  it('keeps fragments disabled before three minutes', () => {
    for (const rarity of ['common', 'rare', 'epic', 'legendary'] as const) {
      expect(getLootCacheFragmentChance(179.999, rarity)).toBe(0);
    }
  });

  it('switches rarity weights at approved boundaries', () => {
    expect(getLootCacheRarityWeights(0)).toEqual({
      common: 78, rare: 20, epic: 2, legendary: 0,
    });
    expect(getLootCacheRarityWeights(180)).toEqual({
      common: 65, rare: 27, epic: 7, legendary: 1,
    });
    expect(getLootCacheRarityWeights(420)).toEqual({
      common: 55, rare: 30, epic: 12, legendary: 3,
    });
    expect(getLootCacheRarityWeights(720)).toEqual({
      common: 45, rare: 32, epic: 18, legendary: 5,
    });
  });

  it('opens blue fragment eligibility at seven minutes', () => {
    expect(getLootCacheFragmentChance(419.999, 'rare')).toBe(0);
    expect(getLootCacheFragmentChance(420, 'rare')).toBe(0.01);
    expect(getLootCacheFragmentChance(720, 'rare')).toBe(0.02);
  });
});
```

- [ ] **Step 2: Run red test**

Run: `npx vitest run tests/config/LootCacheConfig.test.ts --pool=forks --maxWorkers=1`

Expected: FAIL because `config/LootCacheConfig.ts` is missing.

- [ ] **Step 3: Add exact cache types**

Create `types/lootCache.ts`:

```ts
import { type LootboxRarity } from './lootbox';

export type LootCacheRarity = LootboxRarity;
export type LootCacheRewardId =
  | 'liquidity_injection'
  | 'data_dividend'
  | 'overclock_contract'
  | 'circuit_breaker';
export type LootCachePhase = 'closed' | 'anticipation' | 'opening' | 'reward';
export type LootCacheSource = 'runtime' | 'debug';
export type LootCacheDebugMode = 'random' | 'jackpot';
export type LootCacheRarityWeights = Readonly<Record<LootCacheRarity, number>>;

export type LootCacheResolveInput = {
  elapsedSeconds: number;
  rarity: LootCacheRarity;
  hpRatio: number;
  levelProgress: number;
  enemyCount: number;
  overclockActive: boolean;
  pityMisses: number;
  forceFragmentPreview: boolean;
};

export type LootCacheResolution = {
  primaryReward: LootCacheRewardId;
  secondaryReward: LootCacheRewardId | null;
  rewardStrength: number;
  fragmentAwarded: boolean;
  persistFragment: boolean;
  fragmentChance: number;
  nextPityMisses: number;
};
```

Import the cache types into `types.ts`. Extend `Interactable` with:

```ts
lootCacheId?: number;
lootCacheRarity?: LootCacheRarity;
lootCachePhase?: LootCachePhase;
lootCacheSource?: LootCacheSource;
lootCachePhaseElapsedMs?: number;
lootCacheIdleElapsedMs?: number;
lootCacheProximity?: boolean;
lootCachePrimaryReward?: LootCacheRewardId;
lootCacheSecondaryReward?: LootCacheRewardId | null;
lootCacheFragmentPreview?: boolean;
```

Extend `Enemy` with reusable slow state:

```ts
movementSlowTimerMs?: number;
movementSlowMultiplier?: number;
```

- [ ] **Step 4: Add exact config tables**

Create `config/LootCacheConfig.ts`. Use four shared module-level time bands:

```ts
const TIME_BANDS = [
  {
    minSeconds: 0,
    rarityWeights: { common: 78, rare: 20, epic: 2, legendary: 0 },
    fragmentChance: { common: 0, rare: 0, epic: 0, legendary: 0 },
  },
  {
    minSeconds: 180,
    rarityWeights: { common: 65, rare: 27, epic: 7, legendary: 1 },
    fragmentChance: { common: 0, rare: 0, epic: 0.02, legendary: 0.08 },
  },
  {
    minSeconds: 420,
    rarityWeights: { common: 55, rare: 30, epic: 12, legendary: 3 },
    fragmentChance: { common: 0, rare: 0.01, epic: 0.05, legendary: 0.15 },
  },
  {
    minSeconds: 720,
    rarityWeights: { common: 45, rare: 32, epic: 18, legendary: 5 },
    fragmentChance: { common: 0, rare: 0.02, epic: 0.08, legendary: 0.25 },
  },
] as const;
```

Export this exact tuning object:

```ts
export const LOOT_CACHE_CONFIG = {
  spawn: {
    firstWindowSeconds: { min: 35, max: 55 },
    repeatWindowSeconds: { min: 55, max: 95 },
    pressureDeferralSeconds: 15,
    comebackAccelerationSeconds: 10,
    criticalHpRatio: 0.35,
    placementAttempts: 5,
    minimumPlayerDistance: 180,
    maximumPlayerDistance: 320,
    enemyClearance: 48,
    viewportPadding: 72,
  },
  smartWeights: {
    liquidity: 25,
    data: 30,
    overclock: 25,
    circuitBreaker: 20,
    criticalHealthBonus: 70,
    lowProgressBonus: 25,
    highPressureControlBonus: 50,
    highPressureDamageBonus: 20,
    highPressureEnemyCount: 28,
    fullHealthCutoff: 0.8,
    lowProgressCutoff: 0.35,
  },
  rewardStrength: { common: 1, rare: 1.25, epic: 1.6, legendary: 1.5 },
  fragment: { pityStartsAfterMisses: 8, pityStep: 0.02, pityMaximumBonus: 0.1 },
  feedback: {
    proximityRadius: 96,
    anticipationMs: 40,
    totalOpeningMs: 650,
    hitStopMs: { common: 70, rare: 80, epic: 90, legendary: 100 },
    particles: { common: 8, rare: 12, epic: 18, legendary: 28 },
    shake: { common: 0, rare: 1.5, epic: 2.5, legendary: 3.5 },
  },
  rewards: {
    healMaxHpFraction: 0.25,
    contactProtectionMs: 1500,
    xpNextLevelFraction: 0.35,
    xpGemCount: 8,
    overclockDurationMs: 10000,
    circuitBreakerSlowMs: 2500,
    circuitBreakerSlowMultiplier: 0.5,
    circuitBreakerPushPixels: 35,
  },
} as const;
```

Implement `getLootCacheRarityWeights()` and `getLootCacheFragmentChance()` with
four descending `if` checks returning shared records. Export them through
`config/index.ts`; do not allocate in either lookup.

- [ ] **Step 5: Add typed cache events**

Add these event names and exact payloads to `types/events.ts`:

```ts
lootCacheSpawned: {
  cacheId: number;
  rarity: LootCacheRarity;
  x: number;
  y: number;
  source: LootCacheSource;
};
lootCacheOpened: {
  cacheId: number;
  rarity: LootCacheRarity;
  primaryReward: LootCacheRewardId;
  secondaryReward: LootCacheRewardId | null;
  x: number;
  y: number;
  elapsedSeconds: number;
  source: LootCacheSource;
};
cosmeticFragmentEarned: {
  amount: number;
  rarity: LootCacheRarity;
  elapsedSeconds: number;
  source: 'runtime';
};
debugLootCacheSpawnRequested: { mode: LootCacheDebugMode };
```

- [ ] **Step 6: Verify contracts**

Run: `npx vitest run tests/config/LootCacheConfig.test.ts --pool=forks --maxWorkers=1 && npm run typecheck`

Expected: config tests PASS and typecheck exits 0.

- [ ] **Step 7: Commit when authorized**

```bash
git add types/lootCache.ts types.ts types/events.ts config/LootCacheConfig.ts config/index.ts tests/config/LootCacheConfig.test.ts
git commit -m "feat(loot): define market cache contracts"
```

---

### Task 2: Implement Deterministic Smart Resolution

**Files:**
- Create: `services/gameplay/loot/LootCacheRewardResolver.ts`
- Create: `tests/services/gameplay/loot/LootCacheRewardResolver.test.ts`

**Interfaces:**
- Consumes: cache contracts, `LOOT_CACHE_CONFIG`, fragment lookup, and structural `nextFloat()` RNG.
- Produces: `LootCacheRewardResolver.resolve(input): LootCacheResolution`.

- [ ] **Step 1: Write failing deterministic tests**

Use:

```ts
class ScriptedRandom {
  private index = 0;
  constructor(private readonly values: readonly number[]) {}
  nextFloat(): number {
    const value = this.values[this.index] ?? this.values.at(-1) ?? 0;
    this.index += 1;
    return value;
  }
}
```

Create a helper with defaults `elapsedSeconds: 720`, `rarity: 'epic'`,
`hpRatio: 0.6`, `levelProgress: 0.5`, `enemyCount: 10`,
`overclockActive: false`, `pityMisses: 0`, and
`forceFragmentPreview: false`. Assert:

- legendary at 179.999 seconds cannot grant fragments;
- full HP cannot choose Liquidity;
- critical HP chooses Liquidity with a low roll;
- active Overclock cannot choose Overclock;
- Gold returns two distinct rewards;
- a malformed non-finite snapshot falls back to Data Dividend;
- pity adds no bonus through eight misses, then `0.02` per miss, caps at `0.10`,
  and resets after a fragment.

- [ ] **Step 2: Run red resolver suite**

Run: `npx vitest run tests/services/gameplay/loot/LootCacheRewardResolver.test.ts --pool=forks --maxWorkers=1`

Expected: FAIL because the resolver is missing.

- [ ] **Step 3: Implement scalar weighted selection**

Export:

```ts
export type LootCacheRandomSource = { nextFloat: () => number };
```

The resolver stores four scalar weights, applies approved bonuses/cutoffs, and
selects in fixed order Liquidity, Data, Overclock, Circuit Breaker. For Gold,
zero the primary's scalar and roll a distinct secondary. Do not create candidate
arrays. If elapsed time, HP ratio, level progress, or enemy count is non-finite,
return Data Dividend with no secondary and no fragment before weighted selection.

Fragment logic is exact:

```ts
const baseChance = getLootCacheFragmentChance(input.elapsedSeconds, input.rarity);
const eligible = baseChance > 0;
const pitySteps = Math.max(
  0,
  input.pityMisses - LOOT_CACHE_CONFIG.fragment.pityStartsAfterMisses + 1
);
const pityBonus = Math.min(
  LOOT_CACHE_CONFIG.fragment.pityMaximumBonus,
  pitySteps * LOOT_CACHE_CONFIG.fragment.pityStep
);
const fragmentChance = eligible ? baseChance + pityBonus : 0;
const fragmentAwarded =
  input.forceFragmentPreview ||
  (eligible && this.random.nextFloat() < fragmentChance);
const persistFragment = fragmentAwarded && !input.forceFragmentPreview;
const nextPityMisses = !eligible
  ? input.pityMisses
  : fragmentAwarded
    ? 0
    : input.pityMisses + 1;
```

- [ ] **Step 4: Verify resolver**

Run: `npx vitest run tests/services/gameplay/loot/LootCacheRewardResolver.test.ts --pool=forks --maxWorkers=1`

Expected: all resolver tests PASS.

- [ ] **Step 5: Commit when authorized**

```bash
git add services/gameplay/loot/LootCacheRewardResolver.ts tests/services/gameplay/loot/LootCacheRewardResolver.test.ts
git commit -m "feat(loot): add smart cache resolver"
```

---

### Task 3: Persist Encrypted Cosmetic Fragments

**Files:**
- Create: `tests/stores/cosmeticsStore.test.ts`
- Modify: `stores/cosmeticsStore.ts:14`
- Modify: `hooks/useGameEvents.ts:20`
- Modify: `tests/hooks/useGameEvents.test.tsx`

**Interfaces:**
- Consumes: `cosmeticFragmentEarned` through a React effect with cleanup.
- Produces: `encryptedFragments`, `addEncryptedFragments()`, and migration-safe persisted state.

- [ ] **Step 1: Write failing store tests**

```ts
beforeEach(() => {
  localStorage.clear();
  useCosmeticsStore.getState().reset();
});

it('adds only positive integer amounts', () => {
  useCosmeticsStore.getState().addEncryptedFragments(2.8);
  useCosmeticsStore.getState().addEncryptedFragments(-4);
  expect(useCosmeticsStore.getState().encryptedFragments).toBe(2);
});

```

In `tests/hooks/useGameEvents.test.tsx`, capture the
`cosmeticFragmentEarned` callback, invoke it with amount 1, and assert
`useCosmeticsStore.getState().encryptedFragments` becomes 1. Also unmount the
hook and assert the subscription's returned cleanup function was called.

- [ ] **Step 2: Run red store suite**

Run: `npx vitest run tests/stores/cosmeticsStore.test.ts --pool=forks --maxWorkers=1`

Expected: FAIL because fragment state/actions are missing.

- [ ] **Step 3: Add migration-safe state**

Add `encryptedFragments: number` and:

```ts
addEncryptedFragments: amount =>
  set(state => {
    const safeAmount = Number.isFinite(amount) ? Math.max(0, Math.floor(amount)) : 0;
    return safeAmount === 0
      ? state
      : { encryptedFragments: state.encryptedFragments + safeAmount };
  }),
```

Initialize/reset to zero. Add optional fragments to `syncFromServer`, clamped to a
non-negative integer. Set persist `version: 2`; migration preserves existing
owned/equipped skins and defaults invalid/missing fragments to zero.

Add a migration regression that seeds version 1 storage, calls
`useCosmeticsStore.persist.rehydrate()`, preserves the seeded skin ids, and asserts
`encryptedFragments` becomes zero:

```ts
localStorage.setItem(
  'cosmetics-storage',
  JSON.stringify({
    state: { equippedSkinId: 'default', ownedSkinIds: ['default'] },
    version: 1,
  })
);
await useCosmeticsStore.persist.rehydrate();
expect(useCosmeticsStore.getState().ownedSkinIds).toEqual(['default']);
expect(useCosmeticsStore.getState().encryptedFragments).toBe(0);
```

- [ ] **Step 4: Bridge earned events through useGameEvents**

```ts
useEffect(() => {
  const unsubscribe = EventBus.subscribe('cosmeticFragmentEarned', data => {
    useCosmeticsStore.getState().addEncryptedFragments(data.amount);
  });
  return () => unsubscribe();
}, []);
```

Debug previews never emit this event.

- [ ] **Step 5: Verify persistence**

Run: `npx vitest run tests/stores/cosmeticsStore.test.ts tests/hooks/useGameEvents.test.tsx --pool=forks --maxWorkers=1`

Expected: all tests PASS.

- [ ] **Step 6: Commit when authorized**

```bash
git add stores/cosmeticsStore.ts hooks/useGameEvents.ts tests/stores/cosmeticsStore.test.ts tests/hooks/useGameEvents.test.tsx
git commit -m "feat(cosmetics): persist encrypted fragments"
```

---

### Task 4: Implement Immediate Reward Effects

**Files:**
- Create: `services/patterns/decorators/buffs/OverclockContractDecorator.ts`
- Create: `services/gameplay/loot/LootCacheRewardApplicator.ts`
- Create: `tests/services/gameplay/loot/LootCacheRewardApplicator.test.ts`
- Modify: `services/patterns/decorators/buffs/index.ts:1`
- Modify: `services/combat/physics/MovementSystem.ts:145`
- Modify: `tests/MovementSystem.test.ts:145`

**Interfaces:**
- Produces: `OverclockContractDecorator` and `LootCacheRewardApplicator.apply()`.
- Consumes: pool, player, game state, BuffManager, EventBus, and injected RNG.

- [ ] **Step 1: Write failing effect tests**

Assert Liquidity clamps healing and grants 1500 ms protection; Data calls
`getGem` eight times with a positive total; Overclock calls `BuffManager.addBuff`;
Circuit Breaker displaces enemies and sets slow fields. Add a MovementSystem test
where a 0.5 multiplier passes half `dtFactor` to enemy behavior and expires after
2500 ms of game-time updates.

- [ ] **Step 2: Run red effect suites**

Run: `npx vitest run tests/services/gameplay/loot/LootCacheRewardApplicator.test.ts tests/MovementSystem.test.ts --pool=forks --maxWorkers=1`

Expected: applicator tests FAIL; existing movement tests stay green.

- [ ] **Step 3: Add Overclock decorator**

```ts
export class OverclockContractDecorator extends StatDecorator {
  getDamage(): number {
    return this.wrapped.getDamage() * 1.25;
  }
  getFireRate(): number {
    return this.wrapped.getFireRate() / 1.3;
  }
  getName(): string {
    return 'Overclock Contract';
  }
  getIcon(): string {
    return '⚡';
  }
  getDuration(): number {
    return LOOT_CACHE_CONFIG.rewards.overclockDurationMs;
  }
  getDescription(): string {
    return '+25% damage, +30% fire rate';
  }
}
```

Export it from the buffs index. BuffManager already supplies pause-aware timing.

- [ ] **Step 4: Implement applicator branches**

Define context:

```ts
export type LootCacheRewardApplicationContext = {
  pool: IPoolManager;
  player: Player;
  state: GameState;
  x: number;
  y: number;
  random: LootCacheRandomSource;
};
```

Implement one exhaustive switch:

- Liquidity heals `maxHp * 0.25 * strength`, clamps HP, extends
  `invulnerabilityTimer`, emits `playerHealed` and `playerHealthChange`.
- Data computes `max(1, floor(nextLevelExp * 0.35 * strength))`, splits it across
  eight pooled gems, and uses injected random values for radial positions.
- Overclock calls `BuffManager.addBuff(OverclockContractDecorator)`.
- Circuit Breaker indexed-loops enemies, pushes from the cache center, and sets
  `movementSlowTimerMs = 2500` plus `movementSlowMultiplier = 0.5`.

Every branch uses pooled floating text; none touches coins.

- [ ] **Step 5: Apply and expire slow in MovementSystem**

Before `behavior.move`:

```ts
let movementDtFactor = dtFactor;
if ((enemy.movementSlowTimerMs ?? 0) > 0) {
  movementDtFactor *= enemy.movementSlowMultiplier ?? 1;
  enemy.movementSlowTimerMs = Math.max(
    0,
    (enemy.movementSlowTimerMs ?? 0) - dtFactor * GAME_ENGINE.MS_PER_FRAME
  );
  if (enemy.movementSlowTimerMs === 0) enemy.movementSlowMultiplier = 1;
}
enemy.behavior.move(enemy, player.x, player.y, movementDtFactor);
```

- [ ] **Step 6: Verify effects**

Run: `npx vitest run tests/services/gameplay/loot/LootCacheRewardApplicator.test.ts tests/MovementSystem.test.ts tests/BuffManager.test.ts --pool=forks --maxWorkers=1`

Expected: all tests PASS.

- [ ] **Step 7: Commit when authorized**

```bash
git add services/patterns/decorators/buffs/OverclockContractDecorator.ts services/patterns/decorators/buffs/index.ts services/gameplay/loot/LootCacheRewardApplicator.ts services/combat/physics/MovementSystem.ts tests/services/gameplay/loot/LootCacheRewardApplicator.test.ts tests/MovementSystem.test.ts
git commit -m "feat(loot): apply smart cache rewards"
```

---

### Task 5: Build the Runtime-Owned Cache System

**Files:**
- Create: `services/interfaces/ILootCacheSystem.ts`
- Create: `services/gameplay/loot/LootCacheSystem.ts`
- Create: `tests/services/gameplay/loot/LootCacheSystem.test.ts`
- Modify: `constants.ts:25`
- Modify: `services/interfaces/IPoolManager.ts:127`
- Modify: `services/combat/PoolManager.ts:159`
- Modify: `tests/services/PoolManager.test.ts`

**Interfaces:**
- Produces: runtime update/open/debug/reset APIs and typed pooled cache acquire.
- Consumes: resolver, applicator, SeededRng, EventBus, casino `TIER_CONFIG`, audio.

- [ ] **Step 1: Write failing pool/system tests**

Assert `getLootCache()` initializes/reinitializes this contract:

```ts
expect(cache).toMatchObject({
  type: 'LOOT_CRATE',
  lootCacheId: 7,
  lootCacheRarity: 'epic',
  lootCachePhase: 'closed',
  lootCacheSource: 'runtime',
  health: 1,
  maxHealth: 1,
});
```

With scripted RNG prove: no early spawn; one spawn at sampled threshold; max one
active; critical HP accelerates once by at most ten seconds; pressure defers once
by at most fifteen seconds; reset clears active/pity/debug state; jackpot debug
forces Gold and fragment preview without persistence. Make `getLootCache` throw in
one test and assert `update()` does not throw, emits no spawn event, and schedules
a five-second retry instead of retrying every frame. Capture the `afterReset`
subscription, invoke it, and assert active cache and pity state are cleared.

- [ ] **Step 2: Run red system suites**

Run: `npx vitest run tests/services/PoolManager.test.ts tests/services/gameplay/loot/LootCacheSystem.test.ts --pool=forks --maxWorkers=1`

Expected: FAIL because cache APIs are missing.

- [ ] **Step 3: Add pool API and limit**

Add `INTERACTABLES: 50` under `POOL.MAX_ACTIVE`; replace the hardcoded size. Add:

```ts
getLootCache(
  cacheId: number,
  rarity: LootCacheRarity,
  source: LootCacheSource,
  x: number,
  y: number,
  color: string
): Interactable;
```

Both initializer and reinitializer set radius 20, health 1, phase `closed`, all
timers zero, proximity false, result fields empty, and fragment preview false.
Keep `getInteractable` for non-cache objects.

- [ ] **Step 4: Define narrow system interface**

```ts
export type LootCacheUpdateInput = {
  deltaMs: number;
  elapsedSeconds: number;
  width: number;
  height: number;
  reducedMotion: boolean;
  pool: IPoolManager;
  player: Player;
  state: GameState;
};

export type LootCacheOpenInput = Omit<
  LootCacheUpdateInput,
  'deltaMs' | 'width' | 'height'
>;

export interface ILootCacheSystem {
  update(input: LootCacheUpdateInput): void;
  tryOpen(cache: Interactable, input: LootCacheOpenInput): boolean;
  requestDebugSpawn(mode: LootCacheDebugMode): void;
  beginRun(seed: number): void;
  reset(): void;
  dispose(): void;
}
```

- [ ] **Step 5: Implement scalar spawn scheduling**

Store scalar next-spawn time, one active reference, pity misses, one cache id
counter, one pending debug mode, and one-time acceleration/deferral flags. Use
`SeededRng.nextFloat()` for window/rank/placement. Safe placement tries five polar
positions 180-320 px from player, clamps to 72 px viewport padding, rejects enemy
overlap within `enemy.radius + 48`, and uses the last clamped candidate as fallback.
Use `TIER_CONFIG[rarity].color`. Wrap only the event-time pool acquire in a
`try/catch`; log one warning, clear the active reference, and reschedule five
seconds later on failure. Emit `lootCacheSpawned` after successful acquire.

- [ ] **Step 6: Implement idempotent opening**

`tryOpen()` returns false unless active `LOOT_CRATE` is `closed`. On success:

1. mark `anticipation` immediately;
2. resolve with current HP, level progress, enemy count, Overclock state, and pity;
3. apply primary and optional distinct secondary once;
4. emit rarity-scaled `hitStop`;
5. apply shake only outside reduced motion;
6. emit `lootCacheOpened`;
7. emit `cosmeticFragmentEarned` only when persistence is true;
8. retain result fields for rendering.

`update()` advances idle/proximity/opening scalars. Emit pooled particles, ring,
symbols, and sounds only on phase transitions. Release at 650 ms.
Apply the run reward before the fragment event; EventBus isolates subscriber
errors, so fragment persistence failure cannot roll back the immediate reward.

- [ ] **Step 7: Implement debug request lifecycle**

Subscribe once to `debugLootCacheSpawnRequested` and once to `afterReset`; retain
both unsubscribe functions and call both in `dispose()`. The reset event calls the
same idempotent `reset()` used by GameRuntime. On the next update after a debug
request, recycle any active cache, spawn next to player, force Gold plus fragment
preview for `jackpot`, and use source `debug`. Debug previews never update pity,
fragments, analytics, or wallet data.
`beginRun(seed)` resets RNG with `seed ^ 0x4c4f4f54` and resets run-local state.

- [ ] **Step 8: Verify system**

Run: `npx vitest run tests/services/PoolManager.test.ts tests/services/gameplay/loot/LootCacheSystem.test.ts --pool=forks --maxWorkers=1`

Expected: all tests PASS.

- [ ] **Step 9: Commit when authorized**

```bash
git add constants.ts services/interfaces/IPoolManager.ts services/interfaces/ILootCacheSystem.ts services/combat/PoolManager.ts services/gameplay/loot/LootCacheSystem.ts tests/services/PoolManager.test.ts tests/services/gameplay/loot/LootCacheSystem.test.ts
git commit -m "feat(loot): add market cache runtime"
```

---

### Task 6: Switch Bullets to Player Contact

**Files:**
- Modify: `services/combat/physics/CollisionSystem.ts:500`
- Modify: `services/combat/physics/CollectionSystem.ts:18`
- Modify: `services/combat/PhysicsSystem.ts:18`
- Modify: `tests/services/physics/CollisionSystem.test.ts`
- Modify: `tests/services/physics/CollectionSystem.test.ts`

**Interfaces:**
- Consumes: `ILootCacheSystem.tryOpen()`.
- Produces: one-time contact opening and bullet immunity.

- [ ] **Step 1: Write failing interaction regressions**

For an overlapping bullet/cache assert health, active state, and bullet active state
remain unchanged. Preserve a test proving `MINING_RIG` still loses health. Inject a
mock cache system into CollectionSystem, overlap player/cache, update twice, and
assert opening is requested once after the first call changes phase.

- [ ] **Step 2: Run red interaction suites**

Run: `npx vitest run tests/services/physics/CollisionSystem.test.ts tests/services/physics/CollectionSystem.test.ts --pool=forks --maxWorkers=1`

Expected: new regressions FAIL.

- [ ] **Step 3: Ignore cache bullets**

At the start of `processInteractableBulletCandidate`, after active guards and before
hit priming:

```ts
if (obj.type === 'LOOT_CRATE') return;
```

- [ ] **Step 4: Add indexed contact collection**

Inject `ILootCacheSystem | null` into `CollectionSystem`. After gems/buff gems,
indexed-loop `activeInteractables`; for active closed `LOOT_CRATE`, compare squared
player/cache radii. On overlap call `tryOpen()` with game time, reduced-motion,
pool, player, and state, then return. Extend collection/physics update signatures
with a reduced-motion boolean and update all mocks consistently. Do not allocate a
candidate array.

- [ ] **Step 5: Verify interactions**

Run: `npx vitest run tests/services/physics/CollisionSystem.test.ts tests/services/physics/CollectionSystem.test.ts --pool=forks --maxWorkers=1`

Expected: all tests PASS.

- [ ] **Step 6: Commit when authorized**

```bash
git add services/combat/physics/CollisionSystem.ts services/combat/physics/CollectionSystem.ts services/combat/PhysicsSystem.ts tests/services/physics/CollisionSystem.test.ts tests/services/physics/CollectionSystem.test.ts
git commit -m "feat(loot): open caches on player contact"
```

---

### Task 7: Render Casino Rarity and Opening Juice

**Files:**
- Modify: `services/renderers/EntityRenderer.ts:117`
- Modify: `tests/renderers/EntityRenderer.test.ts:80`

**Interfaces:**
- Consumes: pooled cache state, `TIER_CONFIG`, performance config, reduced motion.
- Produces: closed/proximity/opening/reward/edge-marker canvas states.

- [ ] **Step 1: Write failing renderer tests**

Table-test four rarities against `TIER_CONFIG`. Assert normal opening uses canvas
transform; reduced motion avoids displaced rotation; off-screen cache draws a
clamped edge triangle; loot caches draw no health bar; mining rigs keep theirs.

- [ ] **Step 2: Run red renderer suite**

Run: `npx vitest run tests/renderers/EntityRenderer.test.ts --pool=forks --maxWorkers=1`

Expected: new tests FAIL against the flat purple square.

- [ ] **Step 3: Split cache and destructible drawing**

Replace interactable `forEach` with an indexed loop. Dispatch caches to
`drawLootCache()` and preserve other objects in `drawDestructibleInteractable()`.
The cache renderer reads shared tier color, uses idle elapsed for hover/pulse,
accelerates glow in proximity, draws lock/chip silhouette, applies 40 ms squash,
applies opening transform only outside reduced motion, and keeps rarity ring/icon
inside reduced motion. Render a one-frame white core flash at the opening
transition only when both `reducedMotion` and `disableGlow` are false; otherwise
render the rarity ring without the white core. Do not create gradients or point
arrays per frame.

- [ ] **Step 4: Add zero-allocation edge marker**

Clamp cache direction to a static viewport margin and draw a triangle directly
with `beginPath`, `moveTo`, `lineTo`, and `closePath`. Color it by rarity.

- [ ] **Step 5: Verify renderers**

Run: `npx vitest run tests/renderers/EntityRenderer.test.ts tests/GameRenderer.test.ts --pool=forks --maxWorkers=1`

Expected: renderer suites PASS.

- [ ] **Step 6: Commit when authorized**

```bash
git add services/renderers/EntityRenderer.ts tests/renderers/EntityRenderer.test.ts
git commit -m "feat(loot): add casino cache opening juice"
```

---

### Task 8: Wire Runtime, Loop, Audio, and Dev Keys

**Files:**
- Modify: `services/gameplay/GameRuntime.ts:20`
- Modify: `services/core/GameStateManager.ts:40`
- Modify: `components/GameEngine.tsx:236`
- Modify: `services/system/CheatManager.ts:15`
- Modify: `tests/services/gameplay/GameRuntimeDependencyAudit.test.ts`
- Modify: `tests/components/GameEngine.test.tsx`
- Modify: `tests/CheatManager.test.ts`
- Modify: `tests/PhysicsSystem.test.ts`
- Modify: `tests/edge/PhysicsSystem.test.ts`
- Modify: `tests/GameRenderer.test.ts`

**Interfaces:**
- Consumes: LootCacheSystem, preallocated update input, current graphics, TimeService, run seed.
- Produces: production tick/reset/dispose, rarity audio, `B` and `Shift+B`.

- [ ] **Step 1: Write failing integration tests**

Assert runtime exposes/resets/disposes one LootCacheSystem. Assert CheatManager
emits random mode for `B` and jackpot mode for `Shift+B`. Mock runtime cache update
in GameEngine; assert current elapsed time, dimensions, pool/player/state, and
reduced motion are supplied while playing and not while paused.

- [ ] **Step 2: Run red integration suites**

Run: `npx vitest run tests/services/gameplay/GameRuntimeDependencyAudit.test.ts tests/components/GameEngine.test.tsx tests/CheatManager.test.ts --pool=forks --maxWorkers=1`

Expected: new assertions FAIL.

- [ ] **Step 3: Construct one vertical slice in GameRuntime**

Create one SeededRng, resolver, applicator, and LootCacheSystem. Pass the same cache
system into CollectionSystem; pass that CollectionSystem into PhysicsSystem.
Expose `lootCacheSystem`; call reset and dispose from canonical runtime paths.

- [ ] **Step 4: Remove inline GameEngine timer**

Delete `interactableSpawnTimer` from GameEngine state and delete the fixed 30-second
spawn block. Remove the obsolete field from `GameState`, `GAME_STATE_DEFAULTS`, and
the three typed renderer/physics fixtures that currently initialize it. Create one
`useRef<LootCacheUpdateInput>` and mutate every field before physics; call
`lootCacheSystem.update()` with that shared object. Do not spread it.
When the director run id first changes, call
`beginRun(deriveDirectorSeed(runId))` exactly once.

- [ ] **Step 5: Add event-time audio**

Spawn uses a short chime; proximity uses throttled `playSlotTick()`; Silver uses a
short confirmation; Blue/Purple use `playSlotWin()`; Gold uses `playJackpot()` and
`playCoinShower()`. Trigger at phase boundaries, not timers, and respect slot mixer.

- [ ] **Step 6: Add dev keys inside CheatManager**

Add `case 'B'`, reject Ctrl/Alt, emit random or jackpot based on Shift, show a cheat
message, and list both shortcuts in help. Do not add another window listener.

- [ ] **Step 7: Verify integration**

Run: `npx vitest run tests/services/gameplay/GameRuntimeDependencyAudit.test.ts tests/components/GameEngine.test.tsx tests/CheatManager.test.ts tests/services/gameplay/loot/LootCacheSystem.test.ts --pool=forks --maxWorkers=1`

Expected: all integration tests PASS.

- [ ] **Step 8: Commit when authorized**

```bash
git add services/gameplay/GameRuntime.ts services/core/GameStateManager.ts components/GameEngine.tsx services/system/CheatManager.ts types.ts tests/services/gameplay/GameRuntimeDependencyAudit.test.ts tests/components/GameEngine.test.tsx tests/CheatManager.test.ts tests/PhysicsSystem.test.ts tests/edge/PhysicsSystem.test.ts tests/GameRenderer.test.ts
git commit -m "feat(loot): integrate market cache runtime"
```

---

### Task 9: Guard Performance, Document, and Verify

**Files:**
- Modify: `tests/services/gameplay/GameEngineHotPathAudit.test.ts`
- Modify: `public/docs/LOOTBOX_SYSTEM.md:1`
- Verify: every Task 1-8 file

**Interfaces:**
- Produces: hot-path regression gate and current documentation.

- [ ] **Step 1: Add hot-path audit coverage**

Load `LootCacheSystem.ts` and `EntityRenderer.ts`; inspect cache update/render method
spans and reject `.map(`, `.filter(`, `Array.from(`, `new Array(`, `setTimeout(`,
and `setInterval(`. Keep event-time resolution outside audited continuous methods.

- [ ] **Step 2: Run audit and fix source violations**

Run: `npx vitest run tests/services/gameplay/GameEngineHotPathAudit.test.ts --pool=forks --maxWorkers=1`

Expected: PASS. If red, replace collections with scalar weights/indexed loops and
timers with phase elapsed checks; do not weaken the audit.

- [ ] **Step 3: Update live lootbox documentation**

Document world Market Cache versus meta LootboxService, guaranteed smart reward,
fragment time gate, casino tiers, no wallet/full-skin drop, local-first cosmetic
balance, and `B`/`Shift+B` dev controls.

- [ ] **Step 4: Format and run focused vertical-slice tests**

Run: `npx prettier --write types/lootCache.ts config/LootCacheConfig.ts services/gameplay/loot services/interfaces/ILootCacheSystem.ts services/patterns/decorators/buffs/OverclockContractDecorator.ts stores/cosmeticsStore.ts hooks/useGameEvents.ts services/combat/PoolManager.ts services/combat/physics/MovementSystem.ts services/combat/physics/CollisionSystem.ts services/combat/physics/CollectionSystem.ts services/renderers/EntityRenderer.ts services/gameplay/GameRuntime.ts components/GameEngine.tsx services/system/CheatManager.ts tests/config/LootCacheConfig.test.ts tests/services/gameplay/loot tests/stores/cosmeticsStore.test.ts tests/hooks/useGameEvents.test.tsx public/docs/LOOTBOX_SYSTEM.md`

Run: `npx vitest run tests/config/LootCacheConfig.test.ts tests/services/gameplay/loot tests/stores/cosmeticsStore.test.ts tests/services/physics/CollectionSystem.test.ts tests/services/physics/CollisionSystem.test.ts tests/MovementSystem.test.ts tests/services/PoolManager.test.ts tests/renderers/EntityRenderer.test.ts tests/CheatManager.test.ts tests/services/gameplay/GameRuntimeDependencyAudit.test.ts tests/services/gameplay/GameEngineHotPathAudit.test.ts tests/components/GameEngine.test.tsx --pool=forks --maxWorkers=1`

Expected: formatter exits 0 and all focused tests PASS.

- [ ] **Step 5: Manually verify development animation**

Run `npm run dev`, start a game, and verify:

1. `B` spawns a random cache near player.
2. Walking over opens once; shooting does nothing.
3. `Shift+B` previews Gold plus fragment reveal without changing persisted balance.
4. Rarities differ by silhouette, color, label, and audio.
5. Reduced motion removes shake/displaced pieces but keeps result readable.
6. No repeated reward or console error follows contact.

- [ ] **Step 6: Run full CI-equivalent gate**

Run: `npm run check:baseline`

Expected: typecheck, architecture, reset coverage, lint, director reference, all
Vitest suites, and production build exit 0. Report unrelated warnings separately.

- [ ] **Step 7: Review final diff**

Run: `git diff --check`

Run: `git status --short`

Run: `git diff -- types/lootCache.ts config/LootCacheConfig.ts services/gameplay/loot services/interfaces/ILootCacheSystem.ts stores/cosmeticsStore.ts hooks/useGameEvents.ts services/combat/PoolManager.ts services/combat/physics/MovementSystem.ts services/combat/physics/CollisionSystem.ts services/combat/physics/CollectionSystem.ts services/renderers/EntityRenderer.ts services/gameplay/GameRuntime.ts components/GameEngine.tsx services/system/CheatManager.ts public/docs/LOOTBOX_SYSTEM.md`

Expected: no whitespace errors; only intended Market Cache changes plus explicitly
acknowledged pre-existing workspace changes.

- [ ] **Step 8: Commit when authorized**

```bash
git add tests/services/gameplay/GameEngineHotPathAudit.test.ts public/docs/LOOTBOX_SYSTEM.md
git commit -m "test(loot): verify market cache experience"
```
