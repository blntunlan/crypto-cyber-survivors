import { describe, expect, it } from 'vitest';

import { MVP0_CONFIG_VERSION } from '@/game-v2/config/Mvp0Config';
import {
  RUN_RECORDING_SCHEMA_VERSION,
  type RunRecording,
} from '@/game-v2/contracts/RunRecording';
import { PASSIVE_MOVE_SPEED_BY_LEVEL } from '@/game-v2/contracts/PassiveSlot';
import { ReplayRunner } from '@/game-v2/replay/ReplayRunner';

import { SCENARIO_SEED, driveScriptedRun } from '../support/scriptedRun';

let scenario: { recording: RunRecording; liveHash: string } | undefined;

/** The scripted run is deterministic, so one recording serves every case. */
const buildScenarioRecording = (): { recording: RunRecording; liveHash: string } => {
  if (scenario === undefined) {
    const run = driveScriptedRun(SCENARIO_SEED);
    scenario = {
      recording: run.runtime.exportRecording(),
      liveHash: run.runtime.snapshotHash(),
    };
    run.runtime.dispose();
  }

  return scenario;
};

describe('ReplayRunner', () => {
  it('produces the same final state at 30, 60, and 120 render FPS', () => {
    const { recording, liveHash } = buildScenarioRecording();
    const replayRunner = new ReplayRunner();

    const at30 = replayRunner.run(recording, 30);
    const at60 = replayRunner.run(recording, 60);
    const at120 = replayRunner.run(recording, 120);

    expect(at30.finalHash).toBe(at60.finalHash);
    expect(at120.finalHash).toBe(at60.finalHash);
    expect(at30.tick).toBe(at60.tick);
    expect(at120.tick).toBe(at60.tick);
    expect(at60.finalHash).toBe(liveHash);
    expect(at60.phase).toBe('game-over');
  });

  it('applies the recorded upgrade command at the paused tick', () => {
    const { recording } = buildScenarioRecording();

    expect(recording.commands.length).toBeGreaterThan(0);

    const replayRunner = new ReplayRunner();
    const result = replayRunner.run(recording, 60);

    expect(result.commandsApplied).toBe(recording.commands.length);
  });

  it('replays a recorded reroll and banish to the same offer, choice, and RNG state at every frame rate', () => {
    const run = driveScriptedRun(SCENARIO_SEED, 'ability', true);
    const recording = run.runtime.exportRecording();
    const liveHash = run.runtime.snapshotHash();
    run.runtime.dispose();

    expect(run.upgradeApplied).toBe(true);
    const types = recording.commands.map(command => command.type);
    // The reroll and banish are spent on the first card, which is followed by
    // its own `choose-upgrade`. Since `V2-112`'s repeating curve the run then
    // resolves further cards, each adding one more `choose-upgrade` and
    // nothing else — the charges are once per run.
    expect(types.slice(0, 3)).toEqual([
      'reroll-offer',
      'banish-offer',
      'choose-upgrade',
    ]);
    expect(types.filter(type => type === 'reroll-offer')).toHaveLength(1);
    expect(types.filter(type => type === 'banish-offer')).toHaveLength(1);
    expect(types.filter(type => type === 'choose-upgrade')).toHaveLength(
      run.upgradesResolved
    );

    // The first card's three commands share one tick: no simulation tick
    // advances while paused.
    const firstCardTicks = new Set(
      recording.commands.slice(0, 3).map(command => command.tick)
    );
    expect(firstCardTicks.size).toBe(1);

    const replayRunner = new ReplayRunner();
    const at30 = replayRunner.run(recording, 30);
    const at60 = replayRunner.run(recording, 60);
    const at120 = replayRunner.run(recording, 120);

    expect(at60.finalHash).toBe(liveHash);
    expect(at30.finalHash).toBe(at60.finalHash);
    expect(at120.finalHash).toBe(at60.finalHash);
    expect(at60.commandsApplied).toBe(recording.commands.length);
    expect(at60.commandsApplied).toBe(run.upgradesResolved + 2);
  });

  it('replays a recorded passive choice to the same state at every frame rate', () => {
    const run = driveScriptedRun(SCENARIO_SEED, 'passive');
    const recording = run.runtime.exportRecording();
    const liveHash = run.runtime.snapshotHash();
    // Captured before dispose so the state the hash was taken from is
    // provably a real passive upgrade — a raw `choiceIndex` bound check
    // (0..2) is true by construction for any `OfferCandidateIndex` and
    // proves nothing about which candidate was actually resolved.
    const liveReadout = run.runtime.readout();
    run.runtime.dispose();

    expect(run.upgradeApplied).toBe(true);
    expect(liveReadout.moveSpeedLevel).toBe(1);
    expect(liveReadout.moveSpeed).toBe(PASSIVE_MOVE_SPEED_BY_LEVEL[1]);
    // The single passive identity can be crowded out of the offer by
    // V2-107's eight abilities, in which case `driveScriptedRun` rerolls
    // once (a real, recorded command) before choosing — so the
    // `choose-upgrade` command is not necessarily first.
    const upgradeCommand = recording.commands.find(
      command => command.type === 'choose-upgrade'
    );
    if (upgradeCommand === undefined) {
      throw new Error('expected a choose-upgrade command');
    }

    const replayRunner = new ReplayRunner();
    const at30 = replayRunner.run(recording, 30);
    const at60 = replayRunner.run(recording, 60);
    const at120 = replayRunner.run(recording, 120);

    expect(at60.finalHash).toBe(liveHash);
    expect(at30.finalHash).toBe(at60.finalHash);
    expect(at120.finalHash).toBe(at60.finalHash);
    expect(at60.commandsApplied).toBe(recording.commands.length);
  });

  it('rejects an unsupported recording schema version', () => {
    const { recording } = buildScenarioRecording();
    const replayRunner = new ReplayRunner();

    expect(() =>
      replayRunner.run(
        {
          ...recording,
          schemaVersion: (RUN_RECORDING_SCHEMA_VERSION +
            1) as typeof RUN_RECORDING_SCHEMA_VERSION,
        },
        60
      )
    ).toThrow(/schema is unsupported/);
  });

  it('rejects a recording built for a different config version', () => {
    const { recording } = buildScenarioRecording();
    const replayRunner = new ReplayRunner();

    expect(() =>
      replayRunner.run({ ...recording, configVersion: MVP0_CONFIG_VERSION + 1 }, 60)
    ).toThrow(/different config version/);
  });

  it('rejects a recording whose run seed does not reproduce its initial state', () => {
    const { recording } = buildScenarioRecording();
    const replayRunner = new ReplayRunner();

    expect(() =>
      replayRunner.run(
        {
          ...recording,
          runIdentity: {
            ...recording.runIdentity,
            seed: recording.runIdentity.seed + 1,
          },
        },
        60
      )
    ).toThrow(/initial state/);
  });

  it('rejects a recording with a missing input tick', () => {
    const { recording } = buildScenarioRecording();
    const frames = recording.frames.filter((_frame, index) => index !== 5);
    const replayRunner = new ReplayRunner();

    expect(() => replayRunner.run({ ...recording, frames }, 60)).toThrow(
      /missing input tick 6/
    );
  });

  it('rejects a duplicate upgrade command', () => {
    const { recording } = buildScenarioRecording();
    const firstCommand = recording.commands[0];

    expect(firstCommand).toBeDefined();

    const replayRunner = new ReplayRunner();

    expect(() =>
      replayRunner.run({ ...recording, commands: [firstCommand!, firstCommand!] }, 60)
    ).toThrow(/repeats a command/);
  });

  it('rejects a recording missing the upgrade command its pause requires', () => {
    const { recording } = buildScenarioRecording();
    const replayRunner = new ReplayRunner();

    expect(() => replayRunner.run({ ...recording, commands: [] }, 60)).toThrow(
      /missing the upgrade command for paused tick/
    );
  });

  it('rejects a command whose tick lands beside the pause', () => {
    const { recording } = buildScenarioRecording();
    const firstCommand = recording.commands[0];

    expect(firstCommand).toBeDefined();

    const replayRunner = new ReplayRunner();

    expect(() =>
      replayRunner.run(
        {
          ...recording,
          commands: [{ ...firstCommand!, tick: firstCommand!.tick + 1 }],
        },
        60
      )
    ).toThrow(/missing the upgrade command for paused tick/);
  });

  it('rejects a recording holding a command that never lands on a pause', () => {
    const { recording } = buildScenarioRecording();
    const firstCommand = recording.commands[0];

    expect(firstCommand).toBeDefined();

    // Every real command is kept, so no pause goes unanswered and the
    // missing-command guard cannot fire first — since `V2-112`'s repeating
    // curve the run pauses many times, so dropping the tail no longer works.
    // The orphan sits on the run's final tick, which ends in `game-over` and
    // therefore never pauses, so only the unconsumed-command guard can reject
    // it.
    const lastTick = recording.frames.length - 1;
    const orphan = { ...firstCommand!, tick: lastTick };
    const replayRunner = new ReplayRunner();

    expect(recording.commands.every(command => command.tick < lastTick)).toBe(true);
    expect(() =>
      replayRunner.run({ ...recording, commands: [...recording.commands, orphan] }, 60)
    ).toThrow(/never landed on a paused tick/);
  });

  it.each([0, -60, 0.5, Number.NaN, Number.POSITIVE_INFINITY])(
    'rejects render FPS %s',
    fps => {
      const { recording } = buildScenarioRecording();
      const replayRunner = new ReplayRunner();

      expect(() => replayRunner.run(recording, fps)).toThrow(/render FPS/);
    }
  );
});
