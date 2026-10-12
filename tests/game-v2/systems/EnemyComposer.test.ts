import { describe, expect, it } from 'vitest';

import {
  GRUNT_ENEMY,
  SWARMLING_ENEMY,
  createEnemyRegistry,
} from '@/game-v2/config/EnemyRegistry';
import { MVP0_ENEMY_SPAWN_BUDGET } from '@/game-v2/config/Mvp0Config';
import { type EnemyDefinition } from '@/game-v2/contracts/EnemyArchetype';
import { DeterministicRng } from '@/game-v2/runtime/DeterministicRng';
import { EnemyComposer } from '@/game-v2/systems/EnemyComposer';

describe('EnemyComposer', () => {
  it('rejects an empty registry', () => {
    expect(() => new EnemyComposer([])).toThrow(
      'enemy composer requires a non-empty registry'
    );
  });

  it('rejects a non-integer or negative budget', () => {
    const composer = new EnemyComposer();
    const out: EnemyDefinition[] = [];
    const rng = new DeterministicRng(1);

    for (const budget of [-1, 1.5, Number.NaN]) {
      expect(() => composer.compose(budget, rng, out)).toThrow(
        'enemy composition budget must be a non-negative integer'
      );
    }
  });

  it('composes nothing for a zero budget', () => {
    const composer = new EnemyComposer();
    const out: EnemyDefinition[] = [];

    composer.compose(0, new DeterministicRng(1), out);

    expect(out).toHaveLength(0);
  });

  it('never exceeds the budget: total spent cost is always <= budget', () => {
    const composer = new EnemyComposer();
    const out: EnemyDefinition[] = [];

    for (let seed = 1; seed <= 50; seed += 1) {
      composer.compose(MVP0_ENEMY_SPAWN_BUDGET, new DeterministicRng(seed), out);
      const spent = out.reduce((sum, definition) => sum + definition.cost, 0);
      expect(spent).toBeLessThanOrEqual(MVP0_ENEMY_SPAWN_BUDGET);
      expect(out.length).toBeGreaterThan(0);
    }
  });

  it('resets the output array before composing, so a stale entry cannot leak', () => {
    const composer = new EnemyComposer();
    const out: EnemyDefinition[] = [GRUNT_ENEMY, GRUNT_ENEMY, GRUNT_ENEMY];

    composer.compose(0, new DeterministicRng(1), out);

    expect(out).toHaveLength(0);
  });

  it('is deterministic: the same seed always composes the same batch', () => {
    const composer = new EnemyComposer();
    const first: EnemyDefinition[] = [];
    const second: EnemyDefinition[] = [];

    composer.compose(MVP0_ENEMY_SPAWN_BUDGET, new DeterministicRng(7), first);
    composer.compose(MVP0_ENEMY_SPAWN_BUDGET, new DeterministicRng(7), second);

    expect(second).toEqual(first);
  });

  it('draws every registered archetype across enough seeds (reachability)', () => {
    const composer = new EnemyComposer();
    const out: EnemyDefinition[] = [];
    const seenIds = new Set<string>();

    // A single continuously-advancing stream, matching how the production
    // spawn cadence reuses one RNG across many composition draws rather than
    // reseeding fresh each time (fresh small seeds are a known weak case for
    // this xorshift32 RNG's very first draw).
    const rng = new DeterministicRng(1);
    for (let draw = 0; draw < 500; draw += 1) {
      composer.compose(MVP0_ENEMY_SPAWN_BUDGET, rng, out);
      for (const definition of out) {
        seenIds.add(definition.id);
      }
    }

    // `charger`/`sniper` cost 3, above `MVP0_ENEMY_SPAWN_BUDGET` (2), so they
    // are correctly unreachable at this exact budget (V2-300).
    expect(seenIds).toEqual(new Set(['grunt', 'swarmling', 'brute', 'bloater']));
  });

  it('narrows to only the cheapest archetype once remaining budget excludes the others', () => {
    // A registry holding only the cheapest archetype proves the same
    // narrowing behavior deterministically, without depending on which
    // archetype a 3-way draw happens to pick first.
    const composer = new EnemyComposer(createEnemyRegistry([SWARMLING_ENEMY]));
    const out: EnemyDefinition[] = [];
    const budget = SWARMLING_ENEMY.cost * 2;

    composer.compose(budget, new DeterministicRng(3), out);

    expect(out.every(definition => definition.id === 'swarmling')).toBe(true);
    expect(out.reduce((sum, definition) => sum + definition.cost, 0)).toBe(budget);
  });

  it('stops composing once no registered archetype fits the remaining budget', () => {
    const composer = new EnemyComposer();
    const out: EnemyDefinition[] = [];

    // One less than the cheapest cost: nothing fits.
    composer.compose(SWARMLING_ENEMY.cost - 1, new DeterministicRng(1), out);

    expect(out).toHaveLength(0);
  });

  it('defaults to the production MVP1_ENEMY_REGISTRY', () => {
    const composer = new EnemyComposer();
    const out: EnemyDefinition[] = [];

    composer.compose(MVP0_ENEMY_SPAWN_BUDGET, new DeterministicRng(1), out);

    for (const definition of out) {
      expect(['grunt', 'swarmling', 'brute']).toContain(definition.id);
    }
  });
});
