import { COMMAND_RECORDING_CAPACITY } from '@/game-v2/config/Mvp0Config';
import { type RunCommand } from '@/game-v2/contracts/RunCommand';

function assertCommand(command: unknown): asserts command is RunCommand {
  if (command === null || typeof command !== 'object') {
    throw new TypeError('run command must be an object');
  }

  const candidate = command as {
    tick?: unknown;
    type?: unknown;
    choiceId?: unknown;
  };
  if (
    typeof candidate.tick !== 'number' ||
    !Number.isSafeInteger(candidate.tick) ||
    candidate.tick < 0
  ) {
    throw new RangeError('command tick must be a non-negative safe integer');
  }

  if (candidate.type !== 'choose-upgrade') {
    throw new TypeError('unsupported run command');
  }

  if (candidate.choiceId !== 'starter-damage-2') {
    throw new TypeError('unsupported upgrade choice');
  }
}

export class CommandRecorder {
  readonly #commands: Array<RunCommand | undefined> = new Array(
    COMMAND_RECORDING_CAPACITY
  );

  #commandsInUse = 0;

  public get count(): number {
    return this.#commandsInUse;
  }

  public get capacity(): number {
    return COMMAND_RECORDING_CAPACITY;
  }

  public record(command: RunCommand): void {
    if (this.#commandsInUse >= COMMAND_RECORDING_CAPACITY) {
      throw new RangeError('command recording capacity exhausted');
    }

    assertCommand(command);

    const previous =
      this.#commandsInUse === 0 ? undefined : this.#commands[this.#commandsInUse - 1];
    if (previous !== undefined && command.tick <= previous.tick) {
      throw new RangeError('command ticks must be strictly increasing');
    }

    this.#commands[this.#commandsInUse] = Object.freeze({
      tick: command.tick,
      type: command.type,
      choiceId: command.choiceId,
    });
    this.#commandsInUse += 1;
  }

  public read(index: number): RunCommand {
    if (!Number.isSafeInteger(index) || index < 0 || index >= this.#commandsInUse) {
      throw new RangeError('command index is out of bounds');
    }

    const command = this.#commands[index];
    if (command === undefined) {
      throw new Error('command recording storage is corrupt');
    }
    return command;
  }
}
