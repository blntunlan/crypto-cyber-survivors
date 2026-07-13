import { describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { MarketPosition } from '../../../types';
import { SpawnExecutor } from '../../../services/combat/SpawnExecutor';
import { SpawnPlanBuilder } from '../../../services/director/SpawnPlanBuilder';
import { type GameplaySnapshot } from '../../../services/director/contracts';
import { resolveDirectorRuntimePlan } from '../../../services/director/DirectorRuntimeMode';
import { resolveSpawnAuthority } from '../../../services/director/SpawnAuthorityRouter';

const createSnapshot = (availableCredits: number): GameplaySnapshot => ({
  revision: 3,
  validFromTick: 30,
  pacing: { state: 'PEAK', threatMultiplier: 1.25, remainingSeconds: 20 },
  threat: {
    target: 1.2,
    creditRate: 1.5,
    availableCredits,
    maximumCredits: 12,
  },
  advantage: {
    creditRate: 0,
    availableCredits: 0,
    maximumCredits: 0,
    activeMechanic: null,
  },
  environment: {
    regime: 'VOLATILE',
    presentationIntensity: 0.8,
    isFavorable: false,
  },
  encounter: {
    activeEventFamily: 'VOLUME_SURGE',
    canStartMarketSurge: true,
    queuedEventFamily: null,
    phase: 'ACTIVE',
    primaryCardId: 'VOLUME_DENSE_WAVE',
    supportCardId: 'VOLUME_FLANK_SUPPORT',
    headwindChannels: ['SPAWN_DENSITY', 'MULTI_DIRECTIONAL_ENTRIES'],
  },
});

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
  seed: 12345,
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

  it('keeps active-enemy and threat-credit caps in the plan', () => {
    const creditLimited = new SpawnPlanBuilder().build(createBuildInput(2));
    const activeLimited = new SpawnPlanBuilder().build(createBuildInput(10, 2));

    expect(creditLimited.intents).toHaveLength(2);
    expect(creditLimited.spendableThreat).toBeLessThanOrEqual(2);
    expect(activeLimited.intents).toHaveLength(1);
    expect(activeLimited.maxActiveEnemies).toBe(3);
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

  it('keeps the Director as authority when a production plan is temporarily unavailable', () => {
    const activePlan = new SpawnPlanBuilder().build(createBuildInput(3));

    expect(
      resolveSpawnAuthority(resolveDirectorRuntimePlan('NEW_AUTHORITY'), true)
    ).toBe('DIRECTOR');
    expect(resolveSpawnAuthority(resolveDirectorRuntimePlan('LEGACY'), true)).toBe(
      'LEGACY'
    );
    expect(
      resolveSpawnAuthority(resolveDirectorRuntimePlan('NEW_AUTHORITY'), false)
    ).toBe('DIRECTOR');
    expect(activePlan.intents).toHaveLength(3);
  });
});
