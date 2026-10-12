import { describe, expect, it } from 'vitest';

import { COMMAND_RECORDING_CAPACITY } from '@/game-v2/config/Mvp0Config';
import { type RunCommand } from '@/game-v2/contracts/RunCommand';
import { CommandRecorder } from '@/game-v2/replay/CommandRecorder';

describe('CommandRecorder', () => {
  it('records and reads back a choose-upgrade command', () => {
    const recorder = new CommandRecorder();
    const command: RunCommand = { tick: 10, type: 'choose-upgrade', choiceIndex: 1 };

    recorder.record(command);

    expect(recorder.count).toBe(1);
    expect(recorder.read(0)).toEqual(command);
  });

  it('records and reads back a reroll-offer command with no choiceIndex field', () => {
    const recorder = new CommandRecorder();
    const command: RunCommand = { tick: 10, type: 'reroll-offer' };

    recorder.record(command);

    const stored = recorder.read(0);
    expect(stored).toEqual({ tick: 10, type: 'reroll-offer' });
    expect(Object.hasOwn(stored, 'choiceIndex')).toBe(false);
  });

  it('records and reads back a banish-offer command', () => {
    const recorder = new CommandRecorder();
    const command: RunCommand = { tick: 10, type: 'banish-offer', choiceIndex: 2 };

    recorder.record(command);

    expect(recorder.read(0)).toEqual(command);
  });

  it('allows reroll, banish, and choose-upgrade to share one tick in application order', () => {
    const recorder = new CommandRecorder();

    recorder.record({ tick: 10, type: 'reroll-offer' });
    recorder.record({ tick: 10, type: 'banish-offer', choiceIndex: 0 });
    recorder.record({ tick: 10, type: 'choose-upgrade', choiceIndex: 1 });

    expect(recorder.count).toBe(3);
    expect(recorder.read(0).type).toBe('reroll-offer');
    expect(recorder.read(1).type).toBe('banish-offer');
    expect(recorder.read(2).type).toBe('choose-upgrade');
  });

  it('rejects the same command type repeated at the same tick', () => {
    const recorder = new CommandRecorder();
    recorder.record({ tick: 10, type: 'reroll-offer' });

    expect(() => recorder.record({ tick: 10, type: 'reroll-offer' })).toThrow(
      /repeats a command on tick 10/
    );
  });

  it('rejects a tick that decreases relative to the previous command', () => {
    const recorder = new CommandRecorder();
    recorder.record({ tick: 10, type: 'reroll-offer' });

    expect(() =>
      recorder.record({ tick: 9, type: 'choose-upgrade', choiceIndex: 0 })
    ).toThrow('command ticks must be non-decreasing');
  });

  it('rejects a reroll-offer command carrying a stray choiceIndex', () => {
    const recorder = new CommandRecorder();
    const malformed = { tick: 1, type: 'reroll-offer', choiceIndex: 0 };

    expect(() => recorder.record(malformed as unknown as RunCommand)).toThrow(
      'reroll-offer command must not carry a choiceIndex'
    );
  });

  it.each([-1, 3, 1.5, Number.NaN])(
    'rejects a banish-offer command with out-of-range choiceIndex %s',
    choiceIndex => {
      const recorder = new CommandRecorder();
      const malformed = { tick: 1, type: 'banish-offer', choiceIndex };

      expect(() => recorder.record(malformed as unknown as RunCommand)).toThrow(
        'unsupported banish choice'
      );
    }
  );

  it('rejects an unsupported command type', () => {
    const recorder = new CommandRecorder();
    const malformed = { tick: 1, type: 'not-a-real-command' };

    expect(() => recorder.record(malformed as unknown as RunCommand)).toThrow(
      'unsupported run command'
    );
  });

  it('rejects a non-object command', () => {
    const recorder = new CommandRecorder();

    expect(() => recorder.record(null as unknown as RunCommand)).toThrow(
      'run command must be an object'
    );
  });

  it.each([-1, 1.5, Number.NaN])('rejects an invalid tick %s', tick => {
    const recorder = new CommandRecorder();
    const malformed = { tick, type: 'reroll-offer' };

    expect(() => recorder.record(malformed as unknown as RunCommand)).toThrow(
      'command tick must be a non-negative safe integer'
    );
  });

  it('reports capacity and rejects recording past it', () => {
    const recorder = new CommandRecorder();
    expect(recorder.capacity).toBe(COMMAND_RECORDING_CAPACITY);

    for (let tick = 1; tick <= COMMAND_RECORDING_CAPACITY; tick += 1) {
      recorder.record({ tick, type: 'reroll-offer' });
    }

    expect(recorder.count).toBe(COMMAND_RECORDING_CAPACITY);
    expect(() =>
      recorder.record({ tick: COMMAND_RECORDING_CAPACITY + 1, type: 'reroll-offer' })
    ).toThrow('command recording capacity exhausted');
  });

  it('resets to empty and rejects an out-of-bounds read', () => {
    const recorder = new CommandRecorder();
    recorder.record({ tick: 1, type: 'reroll-offer' });

    recorder.reset();

    expect(recorder.count).toBe(0);
    expect(() => recorder.read(0)).toThrow('command index is out of bounds');
  });

  it('returns frozen command records', () => {
    const recorder = new CommandRecorder();
    recorder.record({ tick: 1, type: 'choose-upgrade', choiceIndex: 0 });

    expect(Object.isFrozen(recorder.read(0))).toBe(true);
  });
});
