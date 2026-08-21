import { describe, expect, it } from 'vitest';
import { GameV2Lifecycle } from '@/game-v2/runtime/GameV2Lifecycle';
import type { GameV2Phase } from '@/game-v2/contracts/GameV2Phase';

type LifecycleCommand = keyof Pick<
  GameV2Lifecycle,
  'start' | 'pauseForLevelUp' | 'resumeFromLevelUp' | 'endRun' | 'reset' | 'dispose'
>;

const runCommand = (lifecycle: GameV2Lifecycle, command: LifecycleCommand): void => {
  lifecycle[command]();
};

describe('GameV2Lifecycle', () => {
  it('runs a level-up cycle, ends the run, and resets into a new session', () => {
    const lifecycle = new GameV2Lifecycle();

    expect(lifecycle.phase).toBe('idle');
    expect(lifecycle.sessionEpoch).toBe(0);

    lifecycle.start();
    expect(lifecycle.phase).toBe('playing');
    lifecycle.pauseForLevelUp();
    expect(lifecycle.phase).toBe('level-up');
    lifecycle.resumeFromLevelUp();
    expect(lifecycle.phase).toBe('playing');
    lifecycle.endRun();
    expect(lifecycle.phase).toBe('game-over');
    lifecycle.reset();

    expect(lifecycle.phase).toBe('idle');
    expect(lifecycle.sessionEpoch).toBe(1);
  });

  it.each([
    ['idle', ['pauseForLevelUp', 'resumeFromLevelUp', 'endRun'] as LifecycleCommand[]],
    ['playing', ['start', 'resumeFromLevelUp'] as LifecycleCommand[]],
    ['level-up', ['start', 'pauseForLevelUp', 'endRun'] as LifecycleCommand[]],
    [
      'game-over',
      ['start', 'pauseForLevelUp', 'resumeFromLevelUp', 'endRun'] as LifecycleCommand[],
    ],
  ] as const)(
    'rejects every illegal command from %s without mutating state',
    (phase, commands) => {
      const lifecycle = new GameV2Lifecycle();

      if (phase !== 'idle') {
        lifecycle.start();
      }
      if (phase === 'level-up') {
        lifecycle.pauseForLevelUp();
      }
      if (phase === 'game-over') {
        lifecycle.endRun();
      }

      const beforeEpoch = lifecycle.sessionEpoch;
      expect(lifecycle.phase).toBe(phase);

      for (const command of commands) {
        expect(() => runCommand(lifecycle, command)).toThrow(
          new RegExp(`${command}.*${phase}`, 'i')
        );
        expect(lifecycle.phase).toBe(phase);
        expect(lifecycle.sessionEpoch).toBe(beforeEpoch);
      }
    }
  );

  it.each(['idle', 'playing', 'level-up', 'game-over'] as const)(
    'increments sessionEpoch exactly once when reset starts from %s',
    phase => {
      const lifecycle = new GameV2Lifecycle();

      if (phase !== 'idle') {
        lifecycle.start();
      }
      if (phase === 'level-up') {
        lifecycle.pauseForLevelUp();
      }
      if (phase === 'game-over') {
        lifecycle.endRun();
      }

      lifecycle.reset();
      expect(lifecycle.phase).toBe('idle');
      expect(lifecycle.sessionEpoch).toBe(1);

      lifecycle.reset();
      expect(lifecycle.phase).toBe('idle');
      expect(lifecycle.sessionEpoch).toBe(2);
    }
  );

  it('disposes from every live phase without changing the session epoch', () => {
    const livePhases: Array<{
      expectedPhase: Exclude<GameV2Phase, 'disposed'>;
      prepare: (lifecycle: GameV2Lifecycle) => void;
    }> = [
      { expectedPhase: 'idle', prepare: () => undefined },
      { expectedPhase: 'playing', prepare: lifecycle => lifecycle.start() },
      {
        expectedPhase: 'level-up',
        prepare: lifecycle => {
          lifecycle.start();
          lifecycle.pauseForLevelUp();
        },
      },
      {
        expectedPhase: 'game-over',
        prepare: lifecycle => {
          lifecycle.start();
          lifecycle.endRun();
        },
      },
    ];

    for (const { expectedPhase, prepare } of livePhases) {
      const lifecycle = new GameV2Lifecycle();
      prepare(lifecycle);
      const beforeEpoch = lifecycle.sessionEpoch;
      expect(lifecycle.phase).toBe(expectedPhase);

      lifecycle.dispose();

      expect(lifecycle.phase).toBe('disposed');
      expect(lifecycle.sessionEpoch).toBe(beforeEpoch);
      lifecycle.dispose();
      expect(lifecycle.phase).toBe('disposed');
      expect(lifecycle.sessionEpoch).toBe(beforeEpoch);
    }
  });

  it('rejects every command after disposal except repeated dispose', () => {
    const lifecycle = new GameV2Lifecycle();
    lifecycle.dispose();
    const commands: LifecycleCommand[] = [
      'start',
      'pauseForLevelUp',
      'resumeFromLevelUp',
      'endRun',
      'reset',
    ];

    for (const command of commands) {
      expect(() => runCommand(lifecycle, command)).toThrow(
        new RegExp(`${command}.*disposed`, 'i')
      );
      expect(lifecycle.phase).toBe('disposed');
      expect(lifecycle.sessionEpoch).toBe(0);
    }

    expect(() => lifecycle.dispose()).not.toThrow();
    expect(lifecycle.phase).toBe('disposed');
    expect(lifecycle.sessionEpoch).toBe(0);
  });
});
