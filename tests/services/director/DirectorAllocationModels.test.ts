import { describe, expect, it } from 'vitest';
import { AdvantageAllocator } from '../../../services/director/AdvantageAllocator';
import { EncounterPlanner } from '../../../services/director/EncounterPlanner';
import { ThreatBudgetAllocator } from '../../../services/director/ThreatBudgetAllocator';
import {
  clampEncounterStatMultipliers,
  clampEnemyStatMultipliers,
} from '../../../services/director/encounters/EnemyCostCatalog';
import {
  type MarketRegimeSnapshot,
  type WorldPressureSnapshot,
} from '../../../services/director/contracts';

const createMarket = (
  overrides: Partial<MarketRegimeSnapshot> = {}
): MarketRegimeSnapshot => ({
  revision: 1,
  regime: 'VOLATILE',
  confidence: 0.8,
  pressure: 0.75,
  volatility: 0.9,
  volume: 0.85,
  trend: 0.2,
  rsiExtremity: 0.4,
  whalePressure: 0,
  activeEventFamily: 'VOLUME_SURGE',
  eventTelegraphEndsAtElapsedSeconds: 102,
  ...overrides,
});

const emptyWorld: WorldPressureSnapshot = {
  activeThreat: 0,
  activePrimaryEncounters: 0,
  activeSupportEncounters: 0,
  queuedEventFamily: null,
  doomStacks: 0,
};

describe('Director allocation models', () => {
  it('clamps threat target and caps unused credits at eight seconds', () => {
    const allocator = new ThreatBudgetAllocator();
    const frame = {
      deltaSeconds: 60,
      survivalPressure: 0.2,
      marketPressure: 1,
      headwind: 1,
      greedPressure: 0.5,
      encounterPressure: 1,
      pacingThreatMultiplier: 1.25,
    };

    const allocation = allocator.update(frame);

    expect(allocation.target).toBeCloseTo(1.7, 6);
    expect(allocation.creditRate).toBeCloseTo(2.125, 6);
    expect(allocation.availableCredits).toBeCloseTo(17, 6);
    expect(allocation.maximumCredits).toBeCloseTo(17, 6);
    expect(allocator.spend(100)).toBeCloseTo(17, 6);
    expect(allocator.getSnapshot().availableCredits).toBe(0);
    expect(allocator.update({ ...frame, deltaSeconds: -1 }).availableCredits).toBe(0);
  });

  it('accrues advantage separately and never plans a direct token mint', () => {
    const allocator = new AdvantageAllocator();
    const input = {
      deltaSeconds: 90,
      advantage: 0.5,
      regime: 'BULL_TREND' as const,
      regimeConfidence: 0.5,
      elapsedSeconds: 90,
      seed: 42,
    };

    const allocation = allocator.update(input);
    const plan = allocator.planNext(input);

    expect(allocation.creditRate).toBeCloseTo(0.4, 6);
    expect(allocation.availableCredits).toBeCloseTo(18, 6);
    expect(allocation.maximumCredits).toBeCloseTo(18, 6);
    expect(plan).not.toBeNull();
    expect(plan?.grantsToken).toBe(false);
    expect(allocator.activate(plan!)).toBe(true);
    expect(allocator.planNext(input)).toBeNull();
  });

  it('maps adverse market identity to no more than two mechanical channels', () => {
    const planner = new EncounterPlanner();
    const plan = planner.plan({
      elapsedSeconds: 100,
      seed: 8,
      market: createMarket({ regime: 'PANIC', activeEventFamily: 'PANIC_CRASH' }),
      headwind: 0.9,
      liquidationProximity: 0.1,
      availableCredits: Number.MAX_SAFE_INTEGER,
      world: emptyWorld,
    });

    expect(plan.headwindChannels).toEqual(['ELITE_SYNERGY', 'VISION_AREA_STRESS']);
    expect(plan.headwindChannels).toHaveLength(2);
  });

  it('keeps one primary plus one support encounter and has a deterministic seed plan', () => {
    const input = {
      elapsedSeconds: 100,
      seed: 7,
      market: createMarket(),
      headwind: 0.8,
      liquidationProximity: 0,
      availableCredits: Number.MAX_SAFE_INTEGER,
      world: emptyWorld,
    };

    const first = new EncounterPlanner().plan(input);
    const second = new EncounterPlanner().plan(input);
    const capped = new EncounterPlanner().plan({
      ...input,
      world: {
        ...emptyWorld,
        activePrimaryEncounters: 1,
        activeSupportEncounters: 1,
      },
    });

    expect(first).toEqual(second);
    expect(first.primary).not.toBeNull();
    expect(first.support).not.toBeNull();
    expect(capped.primary).toBeNull();
    expect(capped.support).toBeNull();
  });

  it('uses telegraph, active, recovery, and cooldown phases without a four-axis stat spike', () => {
    const planner = new EncounterPlanner();
    const input = {
      seed: 17,
      market: createMarket(),
      headwind: 0.7,
      liquidationProximity: 0,
      availableCredits: Number.MAX_SAFE_INTEGER,
      world: emptyWorld,
    };

    const telegraph = planner.plan({ ...input, elapsedSeconds: 100 });
    const active = planner.plan({ ...input, elapsedSeconds: 102 });
    const recovery = planner.plan({ ...input, elapsedSeconds: 114 });
    const cooldown = planner.plan({ ...input, elapsedSeconds: 122 });
    const modifiers = active.primary?.statModifiers;

    expect(telegraph.phase).toBe('TELEGRAPH');
    expect(active.phase).toBe('ACTIVE');
    expect(recovery.phase).toBe('RECOVERY');
    expect(cooldown.phase).toBe('COOLDOWN');
    expect(
      [
        modifiers?.healthMultiplier,
        modifiers?.damageMultiplier,
        modifiers?.speedMultiplier,
        modifiers?.spawnDensityMultiplier,
      ].filter(multiplier => (multiplier ?? 1) > 1)
    ).toHaveLength(2);
    expect(
      Object.values(
        clampEncounterStatMultipliers({
          healthMultiplier: 2,
          damageMultiplier: 2,
          speedMultiplier: 2,
          spawnDensityMultiplier: 2,
        })
      ).filter(multiplier => multiplier > 1)
    ).toHaveLength(3);
  });

  it('hard-caps normal enemy health, damage, and speed at the contract limits', () => {
    expect(
      clampEnemyStatMultipliers({
        healthMultiplier: 5,
        damageMultiplier: 5,
        speedMultiplier: 5,
      })
    ).toEqual({
      healthMultiplier: 2.2,
      damageMultiplier: 1.8,
      speedMultiplier: 1.35,
    });
  });
});
