import { describe, expect, it, vi } from 'vitest';

import { MVP0_ENEMY_SPAWN_BUDGET } from '@/game-v2/config/Mvp0Config';
import { type EnemyDefinition } from '@/game-v2/contracts/EnemyArchetype';
import { assertSpawnEncounterOutput } from '@/game-v2/contracts/EncounterOutput';
import { DeterministicRng } from '@/game-v2/runtime/DeterministicRng';
import { EnemyComposer } from '@/game-v2/systems/EnemyComposer';
import { SpawnEncounterConsumer } from '@/game-v2/systems/SpawnEncounterConsumer';

const bullishOutput = assertSpawnEncounterOutput({
  kind: 'SPAWN',
  enemyBudget: MVP0_ENEMY_SPAWN_BUDGET,
  themeId: 'bullish-breakout',
});

const bearishOutput = assertSpawnEncounterOutput({
  kind: 'SPAWN',
  enemyBudget: MVP0_ENEMY_SPAWN_BUDGET,
  themeId: 'bearish-breakout',
});

describe('SpawnEncounterConsumer', () => {
  it('composes a real bullish-breakout output the same way EnemyComposer alone would', () => {
    const consumer = new SpawnEncounterConsumer();
    const composer = new EnemyComposer();

    const consumerOut: EnemyDefinition[] = [];
    consumer.compose(bullishOutput, new DeterministicRng(7), consumerOut);

    const composerOut: EnemyDefinition[] = [];
    composer.compose(bullishOutput.enemyBudget, new DeterministicRng(7), composerOut);

    expect(consumerOut).toEqual(composerOut);
    expect(consumerOut.length).toBeGreaterThan(0);
  });

  it('composes a real bearish-breakout output correctly', () => {
    const consumer = new SpawnEncounterConsumer();
    const out: EnemyDefinition[] = [];

    consumer.compose(bearishOutput, new DeterministicRng(3), out);

    expect(out.length).toBeGreaterThan(0);
  });

  it('throws on an unrecognized themeId', () => {
    const consumer = new SpawnEncounterConsumer();
    const out: EnemyDefinition[] = [];
    const unknownOutput = assertSpawnEncounterOutput({
      kind: 'SPAWN',
      enemyBudget: MVP0_ENEMY_SPAWN_BUDGET,
      themeId: 'sideways-chop',
    });

    expect(() => consumer.compose(unknownOutput, new DeterministicRng(1), out)).toThrow(
      'spawn encounter consumer received an unrecognized themeId: sideways-chop'
    );
  });

  it('delegates to the injected EnemyComposer with the exact budget, rng, and out', () => {
    const composeSpy = vi.fn();
    const fakeComposer = { compose: composeSpy } as unknown as EnemyComposer;
    const consumer = new SpawnEncounterConsumer(fakeComposer);

    const out: EnemyDefinition[] = [];
    const rng = new DeterministicRng(5);
    consumer.compose(bullishOutput, rng, out);

    expect(composeSpy).toHaveBeenCalledExactlyOnceWith(
      bullishOutput.enemyBudget,
      rng,
      out
    );
  });

  it('honours an injected known-theme-id set over the default', () => {
    const consumer = new SpawnEncounterConsumer(
      new EnemyComposer(),
      new Set(['sideways-chop'])
    );
    const out: EnemyDefinition[] = [];

    expect(() => consumer.compose(bullishOutput, new DeterministicRng(1), out)).toThrow(
      'spawn encounter consumer received an unrecognized themeId: bullish-breakout'
    );

    const sidewaysOutput = assertSpawnEncounterOutput({
      kind: 'SPAWN',
      enemyBudget: MVP0_ENEMY_SPAWN_BUDGET,
      themeId: 'sideways-chop',
    });
    expect(() =>
      consumer.compose(sidewaysOutput, new DeterministicRng(1), out)
    ).not.toThrow();
  });
});
