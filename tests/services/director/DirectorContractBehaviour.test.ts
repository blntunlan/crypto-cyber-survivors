import { describe, expect, it } from 'vitest';
import { DIRECTOR_CONFIG_V1 } from '../../../services/director/config/DirectorConfigV1';
import { EnemyStatCurve } from '../../../services/director/EnemyStatCurve';
import { PacingStateMachine } from '../../../services/director/PacingStateMachine';
import { SurvivalCurve } from '../../../services/director/SurvivalCurve';
import {
  getGreedRecoveryReduction,
  GreedStateMachine,
} from '../../../services/director/GreedStateMachine';
import { SpawnPlanBuilder } from '../../../services/director/SpawnPlanBuilder';
import { DirectorContractGuard } from '../../../services/director/DirectorContractGuard';
import { NEUTRAL_ENCOUNTER_STAT_MULTIPLIERS } from '../../../services/director/encounters/EnemyCostCatalog';
import { type GameplaySnapshot } from '../../../services/director/contracts';
import { MarketPosition } from '../../../types';

const caps = DIRECTOR_CONFIG_V1.enemyStatCaps;

const createSnapshot = (
  overrides: Partial<GameplaySnapshot> = {}
): GameplaySnapshot => ({
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
  threat: { target: 1, creditRate: 2, availableCredits: 12, maximumCredits: 16 },
  advantage: {
    creditRate: 0,
    availableCredits: 0,
    maximumCredits: 0,
    activeMechanic: null,
    movementMultiplier: 1,
    dashCooldownMultiplier: 1,
    endsAtElapsedSeconds: 0,
    activationSequence: 0,
  },
  enemy: {
    healthMultiplier: 1.5,
    damageMultiplier: 1.3,
    speedMultiplier: 1.1,
    spawnDensityMultiplier: 1,
    behaviorTier: 1,
  },
  environment: { regime: 'CALM', presentationIntensity: 0, isFavorable: false },
  encounter: {
    activeEventFamily: null,
    canStartMarketSurge: false,
    queuedEventFamily: null,
    phase: 'IDLE',
    primaryCardId: null,
    supportCardId: null,
    headwindChannels: [],
  },
  ...overrides,
});

describe('§9 enemy stats ride the survival curve up to the caps', () => {
  it('starts neutral and reaches exactly the contract caps at the pressure cap', () => {
    const curve = new EnemyStatCurve();

    const early = curve.update({
      survivalPressure: DIRECTOR_CONFIG_V1.survival.pressurePoints[0]!.pressure,
      doomStacks: 0,
      encounterModifiers: NEUTRAL_ENCOUNTER_STAT_MULTIPLIERS,
      hasSpeedBurst: false,
      hasEliteSynergy: false,
    });
    expect(early.healthMultiplier).toBeCloseTo(1, 6);
    expect(early.damageMultiplier).toBeCloseTo(1, 6);
    expect(early.speedMultiplier).toBeCloseTo(1, 6);

    const late = curve.update({
      survivalPressure: DIRECTOR_CONFIG_V1.survival.pressureCap,
      doomStacks: 0,
      encounterModifiers: NEUTRAL_ENCOUNTER_STAT_MULTIPLIERS,
      hasSpeedBurst: false,
      hasEliteSynergy: false,
    });
    expect(late.healthMultiplier).toBeCloseTo(caps.normalHealth, 6);
    expect(late.damageMultiplier).toBeCloseTo(caps.normalDamage, 6);
    expect(late.speedMultiplier).toBeCloseTo(caps.normalSpeed, 6);
  });

  it('never lets an encounter card push a stat past its cap', () => {
    const curve = new EnemyStatCurve();

    const capped = curve.update({
      survivalPressure: DIRECTOR_CONFIG_V1.survival.pressureCap,
      doomStacks: 4,
      encounterModifiers: {
        healthMultiplier: 3,
        damageMultiplier: 3,
        speedMultiplier: 3,
        spawnDensityMultiplier: 9,
      },
      hasSpeedBurst: true,
      hasEliteSynergy: true,
    });

    expect(capped.healthMultiplier).toBeLessThanOrEqual(caps.normalHealth);
    expect(capped.damageMultiplier).toBeLessThanOrEqual(caps.normalDamage);
    expect(capped.speedMultiplier).toBeLessThanOrEqual(caps.normalSpeed);
    expect(capped.spawnDensityMultiplier).toBeLessThanOrEqual(
      DIRECTOR_CONFIG_V1.encounters.maximumSpawnDensityMultiplier
    );
    expect(capped.isCapped).toBe(true);
  });
});

describe('§7 MarketSurge is a real pacing state', () => {
  const lockout = DIRECTOR_CONFIG_V1.marketEvents.initialSurgeLockoutSeconds;

  it('refuses a surge inside the opening lockout', () => {
    const pacing = new PacingStateMachine();
    pacing.update({ elapsedSeconds: 10, seed: 5, greedLevel: 0 });

    expect(pacing.requestMarketSurge('VOLUME_SURGE', lockout - 1)).toBe(false);
    expect(
      pacing.update({ elapsedSeconds: lockout - 1, seed: 5, greedLevel: 0 }).state
    ).not.toBe('MARKET_SURGE');
  });

  it('enters the surge after the telegraph and caps it at twenty seconds', () => {
    const pacing = new PacingStateMachine();
    let elapsed = lockout + 5;
    pacing.update({ elapsedSeconds: elapsed, seed: 5, greedLevel: 0 });
    expect(pacing.requestMarketSurge('VOLUME_SURGE', elapsed, elapsed + 2)).toBe(true);

    // Still telegraphing.
    expect(
      pacing.update({ elapsedSeconds: elapsed + 1, seed: 5, greedLevel: 0 }).state
    ).not.toBe('MARKET_SURGE');

    let surgeSeconds = 0;
    for (elapsed += 2; elapsed < lockout + 60; elapsed += 1) {
      const snapshot = pacing.update({
        elapsedSeconds: elapsed,
        seed: 5,
        greedLevel: 0,
      });
      if (snapshot.state !== 'MARKET_SURGE') continue;
      surgeSeconds += 1;
      expect(snapshot.threatMultiplier).toBe(
        DIRECTOR_CONFIG_V1.pacing.marketSurge.threatMultiplier
      );
      expect(snapshot.remainingSeconds).toBeLessThanOrEqual(
        DIRECTOR_CONFIG_V1.pacing.marketSurge.maxSeconds
      );
    }

    expect(surgeSeconds).toBeGreaterThan(0);
    expect(surgeSeconds).toBeLessThanOrEqual(
      DIRECTOR_CONFIG_V1.pacing.marketSurge.maxSeconds
    );
  });

  it('holds a single queue slot', () => {
    const pacing = new PacingStateMachine();
    expect(pacing.requestMarketSurge('VOLUME_SURGE', lockout + 1)).toBe(true);
    expect(pacing.requestMarketSurge('PANIC_CRASH', lockout + 1)).toBe(false);
  });
});

describe('§8/§13 Doom and Greed compress Recovery without erasing it', () => {
  it('shortens Recovery with greed and floors it at eight seconds', () => {
    const survival = new SurvivalCurve();

    expect(getGreedRecoveryReduction(0)).toBe(0);
    expect(getGreedRecoveryReduction(3)).toBeCloseTo(0.21, 6);
    expect(getGreedRecoveryReduction(99)).toBe(0.35);

    expect(survival.getRecoveryDuration(40, 0, 0)).toBe(40);
    expect(survival.getRecoveryDuration(40, 0, 0.35)).toBeCloseTo(26, 6);
    expect(survival.getRecoveryDuration(40, 20, 0.35)).toBe(8);
  });

  it('lowers support efficiency to the floor and opens complexity slots', () => {
    const survival = new SurvivalCurve();

    expect(survival.getSupportEfficiency(0)).toBe(1);
    expect(survival.getSupportEfficiency(3)).toBeCloseTo(0.7, 6);
    expect(survival.getSupportEfficiency(50)).toBe(
      DIRECTOR_CONFIG_V1.survival.minimumSupportEfficiency
    );

    expect(survival.getEncounterComplexitySlots(1)).toBe(0);
    expect(survival.getEncounterComplexitySlots(2)).toBe(1);
    expect(survival.getEncounterComplexitySlots(5)).toBe(2);
  });

  it('keeps greed monotonic and exposes its recovery reduction', () => {
    const greed = new GreedStateMachine();

    expect(greed.getSnapshot().level).toBe(0);
    greed.rejectOffer();
    greed.expireOffer();
    const snapshot = greed.getSnapshot();

    expect(snapshot.level).toBe(2);
    expect(snapshot.pressure).toBeCloseTo(0.2, 6);
    expect(snapshot.recoveryReduction).toBeCloseTo(0.14, 6);
  });
});

describe('§9 the spawn plan spends a real threat budget', () => {
  const world = {
    width: 800,
    height: 600,
    activeEnemies: 0,
    maxActiveEnemies: 40,
    position: MarketPosition.LONG,
  };

  it('carries the Director stat multipliers onto every intent', () => {
    const plan = new SpawnPlanBuilder().buildCurrent({
      tick: 4,
      seed: 11,
      snapshot: createSnapshot(),
      world,
    });

    expect(plan.intents.length).toBeGreaterThan(0);
    for (const intent of plan.intents) {
      expect(intent.healthMultiplier).toBeCloseTo(1.5, 6);
      expect(intent.damageMultiplier).toBeCloseTo(1.3, 6);
      expect(intent.speedMultiplier).toBeCloseTo(1.1, 6);
      expect(intent.threatCost).toBeGreaterThanOrEqual(1);
    }
  });

  it('never spends more than the available credits', () => {
    const snapshot = createSnapshot({
      threat: { target: 1, creditRate: 2, availableCredits: 3, maximumCredits: 16 },
    });

    const plan = new SpawnPlanBuilder().buildCurrent({
      tick: 4,
      seed: 11,
      snapshot,
      world,
    });
    const spent = plan.intents.reduce((total, intent) => total + intent.threatCost, 0);

    expect(spent).toBeLessThanOrEqual(3);
    expect(plan.spendableThreat).toBe(spent);
  });

  it('is deterministic for the same seed and revision', () => {
    const first = new SpawnPlanBuilder().buildCurrent({
      tick: 4,
      seed: 11,
      snapshot: createSnapshot(),
      world,
    });
    const second = new SpawnPlanBuilder().buildCurrent({
      tick: 4,
      seed: 11,
      snapshot: createSnapshot(),
      world,
    });

    expect(first.intents).toEqual(second.intents);
  });
});

describe('DirectorContractGuard names the rule that broke', () => {
  const pacing = {
    state: 'PEAK' as const,
    threatMultiplier: 1.25,
    remainingSeconds: 10,
    doomStacks: 0,
    queuedEventFamily: null,
    supportEfficiency: 1,
    encounterComplexitySlots: 0,
    greedRecoveryReduction: 0,
  };
  const plan = {
    revision: 1,
    seed: 1,
    spendableThreat: 0,
    composition: [],
    statTier: 0,
    maxActiveEnemies: 10,
    spawnWindowSeconds: 0.2,
    intents: [],
  };

  it('stays silent on a healthy commit', () => {
    const guard = new DirectorContractGuard();

    expect(
      guard.evaluate({
        snapshot: createSnapshot(),
        pacing,
        plan,
        elapsedSeconds: 120,
        greedLevel: 0,
        leverage: 10,
        isMarketStale: false,
      })
    ).toEqual([]);
  });

  it('flags stat cap breaches, an off-ladder leverage, and stale events', () => {
    const guard = new DirectorContractGuard();
    const snapshot = createSnapshot({
      enemy: {
        healthMultiplier: 9,
        damageMultiplier: 9,
        speedMultiplier: 9,
        spawnDensityMultiplier: 1,
        behaviorTier: 1,
      },
      encounter: {
        ...createSnapshot().encounter,
        activeEventFamily: 'PANIC_CRASH',
      },
    });

    const violations = guard.evaluate({
      snapshot,
      pacing,
      plan,
      elapsedSeconds: 120,
      greedLevel: 0,
      leverage: 50,
      isMarketStale: true,
    });

    expect(violations).toContain('ENEMY_HEALTH_CAP');
    expect(violations).toContain('ENEMY_DAMAGE_CAP');
    expect(violations).toContain('ENEMY_SPEED_CAP');
    expect(violations).toContain('LEVERAGE_OFF_LADDER');
    expect(violations).toContain('STALE_MARKET_EVENT');
  });

  it('flags a greed level that moved backwards', () => {
    const guard = new DirectorContractGuard();
    const base = {
      snapshot: createSnapshot(),
      pacing,
      plan,
      elapsedSeconds: 120,
      leverage: 10,
      isMarketStale: false,
    };

    guard.evaluate({ ...base, greedLevel: 3 });

    expect(guard.evaluate({ ...base, greedLevel: 1 })).toContain('GREED_NOT_MONOTONIC');
  });

  it('flags a surge that started inside the opening lockout', () => {
    const guard = new DirectorContractGuard();

    const violations = guard.evaluate({
      snapshot: createSnapshot(),
      pacing: { ...pacing, state: 'MARKET_SURGE', remainingSeconds: 5 },
      plan,
      elapsedSeconds: 30,
      greedLevel: 0,
      leverage: 10,
      isMarketStale: false,
    });

    expect(violations).toContain('SURGE_BEFORE_LOCKOUT');
  });
});
