import { describe, expect, it, vi } from 'vitest';
import {
  DirectorEffectApplier,
  type DirectorEffectInput,
} from '../../../services/director/effects/DirectorEffectApplier';
import { ZoneField } from '../../../services/director/zones/ZoneField';
import { ZoneDirector } from '../../../services/director/zones/ZoneDirector';
import { ZoneEffectResolver } from '../../../services/director/zones/ZoneEffectResolver';
import { EnemyStatCurve } from '../../../services/director/EnemyStatCurve';
import { DIRECTOR_CONFIG_V1 } from '../../../services/director/config/DirectorConfigV1';
import { NEUTRAL_ENCOUNTER_STAT_MULTIPLIERS } from '../../../services/director/encounters/EnemyCostCatalog';
import { SpawnPlanBuilder } from '../../../services/director/SpawnPlanBuilder';
import { type GameplaySnapshot } from '../../../services/director/contracts';
import { MarketPosition } from '../../../types';

const createSnapshot = (
  advantage: Partial<GameplaySnapshot['advantage']> = {},
  headwindChannels: string[] = []
): GameplaySnapshot =>
  ({
    revision: 1,
    validFromTick: 1,
    pacing: {
      state: 'PEAK',
      threatMultiplier: 1.25,
      remainingSeconds: 10,
      doomStacks: 0,
      supportEfficiency: 1,
    },
    greed: { level: 0, pressure: 0, recoveryReduction: 0 },
    threat: { target: 1, creditRate: 2, availableCredits: 20, maximumCredits: 20 },
    advantage: {
      creditRate: 1,
      availableCredits: 4,
      maximumCredits: 45,
      activeMechanic: null,
      movementMultiplier: 1,
      dashCooldownMultiplier: 1,
      endsAtElapsedSeconds: 0,
      activationSequence: 0,
      ...advantage,
    },
    enemy: {
      healthMultiplier: 1,
      damageMultiplier: 1,
      speedMultiplier: 1,
      spawnDensityMultiplier: 1,
      behaviorTier: 0,
    },
    environment: { regime: 'CALM', presentationIntensity: 0, isFavorable: true },
    encounter: {
      activeEventFamily: null,
      canStartMarketSurge: false,
      queuedEventFamily: null,
      phase: 'IDLE',
      primaryCardId: null,
      supportCardId: null,
      headwindChannels,
    },
  }) as GameplaySnapshot;

const createHooks = () => ({
  applyMomentumWindow: vi.fn(() => true),
  dropLiquidity: vi.fn(),
  applyZoneDamage: vi.fn(),
});

const createApplier = (hooks: ReturnType<typeof createHooks>) => {
  const field = new ZoneField();
  return new DirectorEffectApplier(hooks, {
    zoneDirector: new ZoneDirector(field),
    zoneEffects: new ZoneEffectResolver(field),
  });
};

const withDefaults = (
  partial: Pick<DirectorEffectInput, 'snapshot' | 'player' | 'elapsedSeconds'>
): DirectorEffectInput => ({
  ...partial,
  deltaSeconds: 0.2,
  world: { width: 800, height: 600 },
  seed: 11,
  liquidationProximity: 0,
});

describe('§10 advantage becomes gameplay exactly once per activation', () => {
  it('applies the momentum window and its dash relief, then clears both', () => {
    const hooks = createHooks();
    const applier = createApplier(hooks);
    const player = { x: 10, y: 20, dashCooldownMultiplier: 1 };
    const active = createSnapshot({
      activeMechanic: 'MOMENTUM_WINDOW',
      movementMultiplier: 1.1,
      dashCooldownMultiplier: 0.9,
      endsAtElapsedSeconds: 108,
      activationSequence: 1,
    });

    applier.apply(withDefaults({ snapshot: active, player, elapsedSeconds: 100 }));
    expect(hooks.applyMomentumWindow).toHaveBeenCalledTimes(1);
    expect(player.dashCooldownMultiplier).toBe(0.9);

    // Re-committing the same activation must not stack the buff.
    applier.apply(withDefaults({ snapshot: active, player, elapsedSeconds: 101 }));
    expect(hooks.applyMomentumWindow).toHaveBeenCalledTimes(1);

    applier.apply(
      withDefaults({
        snapshot: createSnapshot({ activationSequence: 1 }),
        player,
        elapsedSeconds: 110,
      })
    );
    expect(player.dashCooldownMultiplier).toBe(1);
  });

  it('drops liquidity at the player once and never grants a token', () => {
    const hooks = createHooks();
    const applier = createApplier(hooks);
    const player = { x: 42, y: 84, dashCooldownMultiplier: 1 };
    const snapshot = createSnapshot({
      activeMechanic: 'LIQUIDITY_DROP',
      activationSequence: 1,
      endsAtElapsedSeconds: 101,
    });

    applier.apply(withDefaults({ snapshot, player, elapsedSeconds: 100 }));
    applier.apply(withDefaults({ snapshot, player, elapsedSeconds: 100.2 }));

    expect(hooks.dropLiquidity).toHaveBeenCalledTimes(1);
    expect(hooks.dropLiquidity).toHaveBeenCalledWith(42, 84);
    expect(hooks.applyMomentumWindow).not.toHaveBeenCalled();
  });

  it('fires again after a new activation', () => {
    const hooks = createHooks();
    const applier = createApplier(hooks);
    const player = { x: 0, y: 0, dashCooldownMultiplier: 1 };

    applier.apply(
      withDefaults({
        snapshot: createSnapshot({
          activeMechanic: 'MOMENTUM_WINDOW',
          activationSequence: 1,
        }),
        player,
        elapsedSeconds: 100,
      })
    );
    applier.apply(
      withDefaults({ snapshot: createSnapshot(), player, elapsedSeconds: 110 })
    );
    applier.apply(
      withDefaults({
        snapshot: createSnapshot({
          activeMechanic: 'MOMENTUM_WINDOW',
          activationSequence: 2,
        }),
        player,
        elapsedSeconds: 200,
      })
    );

    expect(hooks.applyMomentumWindow).toHaveBeenCalledTimes(2);
  });

  it('survives a null player without throwing', () => {
    const hooks = createHooks();
    const applier = createApplier(hooks);

    expect(() =>
      applier.apply(
        withDefaults({
          snapshot: createSnapshot({
            activeMechanic: 'LIQUIDITY_DROP',
            activationSequence: 1,
          }),
          player: null,
          elapsedSeconds: 100,
        })
      )
    ).not.toThrow();
    expect(hooks.dropLiquidity).not.toHaveBeenCalled();
  });
});

describe('§11 headwind channels reach real mechanics', () => {
  it('lets a telegraphed burst spike speed but never past the cap', () => {
    const curve = new EnemyStatCurve();
    const base = {
      survivalPressure: 0.55,
      doomStacks: 0,
      encounterModifiers: NEUTRAL_ENCOUNTER_STAT_MULTIPLIERS,
      hasEliteSynergy: false,
    };

    const calm = curve.update({ ...base, hasSpeedBurst: false });
    const calmSpeed = calm.speedMultiplier;
    const burst = curve.update({ ...base, hasSpeedBurst: true });

    expect(burst.speedMultiplier).toBeGreaterThan(calmSpeed);
    expect(burst.speedMultiplier).toBeLessThanOrEqual(
      DIRECTOR_CONFIG_V1.enemyStatCaps.normalSpeed
    );
  });

  it('raises behaviour tier on elite synergy without touching stat caps', () => {
    const curve = new EnemyStatCurve();
    const base = {
      survivalPressure: 0.55,
      doomStacks: 0,
      encounterModifiers: NEUTRAL_ENCOUNTER_STAT_MULTIPLIERS,
      hasSpeedBurst: false,
    };

    const plain = curve.update({ ...base, hasEliteSynergy: false });
    const plainTier = plain.behaviorTier;
    const plainHealth = plain.healthMultiplier;
    const elite = curve.update({ ...base, hasEliteSynergy: true });

    expect(elite.behaviorTier).toBe(plainTier + 1);
    expect(elite.healthMultiplier).toBeCloseTo(plainHealth, 6);
  });

  it('spreads multi-directional entries across all four edges', () => {
    const world = {
      width: 800,
      height: 600,
      activeEnemies: 0,
      maxActiveEnemies: 40,
      position: MarketPosition.LONG,
    };

    const plan = new SpawnPlanBuilder().buildCurrent({
      tick: 1,
      seed: 7,
      snapshot: createSnapshot({}, ['MULTI_DIRECTIONAL_ENTRIES']),
      world,
    });

    expect(plan.intents.length).toBeGreaterThanOrEqual(4);
    const edges = new Set(
      plan.intents.map(intent => {
        if (intent.y < 0) return 'top';
        if (intent.y > world.height) return 'bottom';
        if (intent.x < 0) return 'left';
        return 'right';
      })
    );
    expect(edges.size).toBe(4);
  });
});
