import { MVP0_CONFIG_VERSION, SIMULATION_HZ } from '@/game-v2/config/Mvp0Config';
import { type GameV2Phase } from '@/game-v2/contracts/GameV2Phase';
import {
  createPositionContext,
  type PositionContext,
} from '@/game-v2/contracts/PositionContext';
import { type RunCommand } from '@/game-v2/contracts/RunCommand';
import { type RunIdentity } from '@/game-v2/contracts/RunIdentity';
import {
  RUN_RECORDING_SCHEMA_VERSION,
  type RunRecording,
} from '@/game-v2/contracts/RunRecording';
import { createMvp0Runtime } from '@/game-v2/runtime/createMvp0Runtime';
import { type GameV2Runtime, type IntentSource } from '@/game-v2/runtime/GameV2Runtime';

const MILLISECONDS_PER_SECOND = 1000;
const MAX_RENDER_FPS = 1000;

export type ReplayResult = Readonly<{
  finalHash: string;
  tick: number;
  phase: GameV2Phase;
  commandsApplied: number;
}>;

export type ReplayRuntimeFactory = (
  runIdentity: RunIdentity,
  positionContext: PositionContext,
  intentSource: IntentSource
) => GameV2Runtime;

/**
 * Reconstructs the exact locked position the live run played under
 * (`V2-202`, closing `V2-ADR-089`): `positionContext` is runtime-
 * construction input, not `World` state, exactly like `runIdentity`'s seed
 * already is — a replay that silently defaulted to the leverage-`1`
 * profile regardless of what the recording actually locked would desync
 * from the live run's `playerMaxHealth` from tick one.
 */
const defaultRuntimeFactory: ReplayRuntimeFactory = (
  runIdentity,
  positionContext,
  intentSource
) => createMvp0Runtime({ runIdentity, positionContext, intentSource });

/** Takes `unknown` so a literal-typed field is still checked at runtime. */
const assertSchemaVersion = (value: unknown, expected: number, name: string): void => {
  if (value !== expected) {
    throw new RangeError(`${name} schema is unsupported`);
  }
};

const assertRenderFps = (renderFps: number): void => {
  if (
    !Number.isFinite(renderFps) ||
    !Number.isInteger(renderFps) ||
    renderFps < 1 ||
    renderFps > MAX_RENDER_FPS
  ) {
    throw new RangeError(
      `render FPS must be an integer between 1 and ${MAX_RENDER_FPS}`
    );
  }
};

/**
 * Rejects a recording before any tick runs.
 *
 * Every check here is about the recording being self-consistent and made for
 * this build; whether the recording reproduces its own initial state is checked
 * against the started runtime, because only the runtime can answer that.
 */
const assertRecording = (recording: RunRecording): void => {
  assertSchemaVersion(
    recording.schemaVersion,
    RUN_RECORDING_SCHEMA_VERSION,
    'run recording'
  );

  if (recording.configVersion !== MVP0_CONFIG_VERSION) {
    throw new RangeError('run recording was made for a different config version');
  }

  // Re-validated through the real constructor rather than a shape check, so
  // a forged/corrupt positionContext (e.g. an unregistered leverage) is
  // rejected here, before any tick runs, instead of surfacing later as a
  // confusing lethality-resolution failure or a silent desync.
  createPositionContext(recording.positionContext);

  if (typeof recording.initialHash !== 'string' || recording.initialHash.length === 0) {
    throw new RangeError('run recording is missing its initial state hash');
  }

  if (!Array.isArray(recording.frames) || recording.frames.length === 0) {
    throw new RangeError('run recording must contain at least one input frame');
  }

  for (let index = 0; index < recording.frames.length; index += 1) {
    const frame = recording.frames[index];

    if (frame === undefined || frame.tick !== index + 1) {
      throw new RangeError(`run recording is missing input tick ${index + 1}`);
    }

    if (typeof frame.dashPressed !== 'boolean') {
      throw new TypeError('recorded dashPressed must be boolean');
    }
  }

  // Multiple commands can legally share one tick: no simulation tick advances
  // while the lifecycle is paused for a level-up (V2-ADR-059), so a reroll
  // and/or a banish can land on the same paused tick as the eventual
  // choose-upgrade that resumes it. What must never repeat is the same
  // command *type* at the same tick — that would mean applying an
  // already-spent action twice without an intervening tick.
  let previousTick = 0;
  let tickCursor = -1;
  let typesSeenAtTick = new Set<RunCommand['type']>();

  for (const command of recording.commands) {
    if (command.tick !== tickCursor) {
      tickCursor = command.tick;
      typesSeenAtTick = new Set();
    }

    if (typesSeenAtTick.has(command.type)) {
      throw new RangeError(`run recording repeats a command on tick ${command.tick}`);
    }
    typesSeenAtTick.add(command.type);

    if (command.tick < previousTick) {
      throw new RangeError('run recording command ticks must not decrease');
    }

    if (command.tick > recording.frames.length) {
      throw new RangeError('run recording command lands past its last input tick');
    }

    previousTick = command.tick;
  }
};

/**
 * Replays a recording at an arbitrary render frame rate.
 *
 * Render frame rate only decides how many fixed steps a frame earns, never what
 * a step does, so a recording that ends at tick N ends at tick N with the same
 * state hash at 30, 60, or 120 FPS.
 */
export class ReplayRunner {
  private readonly createRuntime: ReplayRuntimeFactory;

  public constructor(createRuntime: ReplayRuntimeFactory = defaultRuntimeFactory) {
    this.createRuntime = createRuntime;
  }

  public run(recording: RunRecording, renderFps: number): ReplayResult {
    assertRenderFps(renderFps);
    assertRecording(recording);

    let nextFrameIndex = 0;
    const intentSource: IntentSource = {
      sample: (tick, out) => {
        const frame = recording.frames[nextFrameIndex];

        if (frame === undefined) {
          return false;
        }

        if (frame.tick !== tick) {
          throw new RangeError(
            `replay expected input tick ${tick} but the recording holds ${frame.tick}`
          );
        }

        out.moveX = frame.moveX;
        out.moveY = frame.moveY;
        out.dashPressed = frame.dashPressed;
        nextFrameIndex += 1;
        return true;
      },
    };

    const runtime = this.createRuntime(
      recording.runIdentity,
      recording.positionContext,
      intentSource
    );

    try {
      runtime.start();

      if (runtime.snapshotHash() !== recording.initialHash) {
        throw new RangeError(
          'run recording does not reproduce its own initial state; the run identity or seed differs'
        );
      }

      const frameDeltaMs = MILLISECONDS_PER_SECOND / renderFps;
      const framesPerTick = Math.max(1, Math.ceil(renderFps / SIMULATION_HZ));
      const maxFrames = (recording.frames.length + 1) * framesPerTick + MAX_RENDER_FPS;
      let commandsApplied = 0;
      let nextCommandIndex = 0;
      let framesAdvanced = 0;

      while (runtime.phase !== 'game-over') {
        if (runtime.phase === 'level-up') {
          const command = recording.commands[nextCommandIndex];

          if (command?.tick !== runtime.tick) {
            throw new RangeError(
              `run recording is missing the upgrade command for paused tick ${runtime.tick}`
            );
          }

          nextCommandIndex += 1;
          commandsApplied += 1;

          if (command.type === 'reroll-offer') {
            runtime.rerollOffer();
          } else if (command.type === 'banish-offer') {
            runtime.banishOffer(command.choiceIndex);
          } else {
            runtime.chooseUpgrade(command.choiceIndex);
          }
          continue;
        }

        if (runtime.tick >= recording.frames.length) {
          break;
        }

        framesAdvanced += 1;

        if (framesAdvanced > maxFrames) {
          throw new RangeError('replay did not reach the recorded tick count');
        }

        runtime.advanceFrame(frameDeltaMs);
      }

      if (commandsApplied !== recording.commands.length) {
        throw new RangeError(
          'run recording holds a command that never landed on a paused tick'
        );
      }

      return Object.freeze({
        finalHash: runtime.snapshotHash(),
        tick: runtime.tick,
        phase: runtime.phase,
        commandsApplied,
      });
    } finally {
      runtime.dispose();
    }
  }
}
