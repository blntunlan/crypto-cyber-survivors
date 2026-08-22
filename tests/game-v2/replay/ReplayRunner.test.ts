import { describe, expect, it } from 'vitest';

import { MVP0_CONFIG_VERSION } from '@/game-v2/config/Mvp0Config';
import {
  RUN_RECORDING_SCHEMA_VERSION,
  type RunRecording,
} from '@/game-v2/contracts/RunRecording';
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

  it('replays a recorded passive choice to the same state at every frame rate', () => {
    const run = driveScriptedRun(SCENARIO_SEED, 'passive-move-speed');
    const recording = run.runtime.exportRecording();
    const liveHash = run.runtime.snapshotHash();
    run.runtime.dispose();

    expect(run.upgradeApplied).toBe(true);
    expect(recording.commands[0]?.choiceId).toBe('passive-move-speed');

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

    // The run pauses exactly once, so a second well-formed command on a later
    // tick can never be consumed. This is the only case that reaches the
    // unconsumed-command guard rather than the missing-command-at-pause guard.
    const orphan = { ...firstCommand!, tick: firstCommand!.tick + 100 };
    const replayRunner = new ReplayRunner();

    expect(orphan.tick).toBeLessThanOrEqual(recording.frames.length);
    expect(() =>
      replayRunner.run({ ...recording, commands: [firstCommand!, orphan] }, 60)
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
