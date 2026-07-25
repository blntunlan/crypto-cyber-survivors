import { describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { MarketPosition } from '../../../types';
import { SpawnExecutor } from '../../../services/combat/SpawnExecutor';
import { SpawnPlanBuilder } from '../../../services/director/SpawnPlanBuilder';
import { resolveDirectorRuntimePlan } from '../../../services/director/DirectorRuntimeMode';
import { resolveSpawnAuthority } from '../../../services/director/SpawnAuthorityRouter';
import {
  createNeutralRuntimeDifficultySnapshot,
  type RuntimeDifficultySnapshot,
} from '../../../types/runtimeDifficulty';

const createSnapshot = (
  availableCredits: number,
  healthMultiplier = 1.3
): RuntimeDifficultySnapshot => {
  const snapshot = structuredClone(
    createNeutralRuntimeDifficultySnapshot({ tick: 30, inputRevision: 3 })
  ) as any;
  snapshot.meta.revision = 9;
  snapshot.meta.validFromTick = 30;
  snapshot.pressure.total = 0.8;
  snapshot.pressure.availableCredits = availableCredits;
  snapshot.spawn.revision = 9;
  snapshot.spawn.seed = 12_345;
  snapshot.spawn.maximumActiveEnemies = 3;
  snapshot.spawn.spawnWindowSeconds = 0.5;
  snapshot.spawn.behaviorTier = 2;
  snapshot.spawn.availableCredits = availableCredits;
  snapshot.spawn.reservedCredits = availableCredits;
  snapshot.spawn.remainingCredits = 0;
  snapshot.spawn.directives = [
    { archetype: 'bear', intent: 'pressure', allocation: 1 },
  ];
  snapshot.enemy.healthMultiplier = healthMultiplier;
  snapshot.enemy.damageMultiplier = 1.2;
  snapshot.enemy.speedMultiplier = 1.1;
  snapshot.enemy.behaviorTier = 2;
  snapshot.encounter.headwindChannels = ['MULTI_DIRECTIONAL_ENTRIES'];
  return snapshot as RuntimeDifficultySnapshot;
};

const createBuildInput = (availableCredits: number, activeEnemies = 0) => ({
  tick: 30,
  snapshot: createSnapshot(availableCredits),
  world: {
    width: 1280,
    height: 720,
    activeEnemies,
    maxActiveEnemies: 3,
    position: MarketPosition.LONG,
  },
});

describe('SpawnPlanBuilder and SpawnExecutor', () => {
  it('keeps raw market dependencies out of SpawnExecutor', () => {
    const source = readFileSync('services/combat/SpawnExecutor.ts', 'utf8');
    const imports = source
      .split('\n')
      .filter(line => line.startsWith('import'))
      .join('\n');

    expect(imports).not.toMatch(
      /services\/market|indicators|LeverageEngine|MarketData/
    );
  });

  it('replays the same seeded type, position, and tick sequence', () => {
    const first = new SpawnPlanBuilder().build(createBuildInput(3));
    const second = new SpawnPlanBuilder().build(createBuildInput(3));

    expect(first).toEqual(second);
    expect(
      first.intents.map(intent => [intent.enemyType, intent.x, intent.y, intent.tick])
    ).toEqual(
      second.intents.map(intent => [intent.enemyType, intent.x, intent.y, intent.tick])
    );
  });

  it('keeps seeded composition independent from render tick count', () => {
    const builder = new SpawnPlanBuilder();
    const at30Fps = builder.build(createBuildInput(3));
    const at120Fps = builder.build({ ...createBuildInput(3), tick: 120 });

    expect(
      at30Fps.intents.map(intent => [intent.enemyType, intent.x, intent.y])
    ).toEqual(at120Fps.intents.map(intent => [intent.enemyType, intent.x, intent.y]));
  });

  it('keeps active-enemy and threat-credit caps in the plan', () => {
    const creditLimited = new SpawnPlanBuilder().build(createBuildInput(2));
    const activeLimited = new SpawnPlanBuilder().build(createBuildInput(10, 2));

    expect(creditLimited.intents).toHaveLength(2);
    expect(creditLimited.spendableThreat).toBeLessThanOrEqual(2);
    expect(activeLimited.intents).toHaveLength(1);
    expect(activeLimited.maxActiveEnemies).toBe(3);
  });

  it('expands one snapshot revision with its enemy multipliers', () => {
    const snapshot = createSnapshot(3, 1.3);
    const plan = new SpawnPlanBuilder().build({
      ...createBuildInput(3),
      snapshot,
    });

    expect(plan.revision).toBe(9);
    expect(plan.intents.every(intent => intent.healthMultiplier === 1.3)).toBe(true);
    expect(plan.spendableThreat).toBeLessThanOrEqual(snapshot.spawn.reservedCredits);
  });

  it('executes only the plan against world state and stops at the active cap', () => {
    const plan = new SpawnPlanBuilder().build(createBuildInput(3));
    const getEnemy = vi.fn();
    const executor = new SpawnExecutor();

    const result = executor.execute(plan, {
      pool: { activeEnemies: [{}, {}], getEnemy } as never,
      position: MarketPosition.LONG,
      maxActiveEnemies: 3,
    });

    expect(result.executedCount).toBe(1);
    expect(getEnemy).toHaveBeenCalledTimes(1);
    expect(getEnemy.mock.calls[0]?.[0]).toBe(plan.intents[0]?.x);
    expect(getEnemy.mock.calls[0]?.[1]).toBe(plan.intents[0]?.y);
  });

  it('rejects replay of an already executed plan revision', () => {
    const plan = new SpawnPlanBuilder().build(createBuildInput(3));
    const getEnemy = vi.fn();
    const executor = new SpawnExecutor();
    const world = {
      pool: { activeEnemies: [], getEnemy } as never,
      position: MarketPosition.LONG,
      maxActiveEnemies: 3,
    };

    const first = { ...executor.execute(plan, world) };
    const replay = { ...executor.execute(plan, world) };

    expect(first.executedCount).toBe(3);
    expect(replay).toEqual({ executedCount: 0, spentThreat: 0 });
    expect(getEnemy).toHaveBeenCalledTimes(3);

    executor.reset();
    executor.execute(plan, world);
    expect(getEnemy).toHaveBeenCalledTimes(6);
  });

  it('keeps the Director as authority when a production plan is temporarily unavailable', () => {
    const activePlan = new SpawnPlanBuilder().build(createBuildInput(3));

    expect(resolveSpawnAuthority(resolveDirectorRuntimePlan('modular'), true)).toBe(
      'DIRECTOR'
    );
    expect(resolveSpawnAuthority(resolveDirectorRuntimePlan('current'), true)).toBe(
      'LEGACY'
    );
    expect(resolveSpawnAuthority(resolveDirectorRuntimePlan('modular'), false)).toBe(
      'DIRECTOR'
    );
    expect(activePlan.intents).toHaveLength(3);
  });
});
