import { INPUT_RECORDING_CAPACITY } from '@/game-v2/config/Mvp0Config';
import { type PlayerIntent } from '@/game-v2/contracts/PlayerIntent';

const assertIntent = (intent: Readonly<PlayerIntent>): void => {
  if (!Number.isFinite(intent.moveX) || !Number.isFinite(intent.moveY)) {
    throw new RangeError('movement must be finite');
  }

  if (intent.moveX * intent.moveX + intent.moveY * intent.moveY > 1) {
    throw new RangeError('movement vector magnitude must not exceed 1');
  }

  if (typeof intent.dashPressed !== 'boolean') {
    throw new TypeError('dashPressed must be boolean');
  }
};

export class InputRecorder {
  public readonly ticks = new Uint32Array(INPUT_RECORDING_CAPACITY);
  public readonly moveX = new Float32Array(INPUT_RECORDING_CAPACITY);
  public readonly moveY = new Float32Array(INPUT_RECORDING_CAPACITY);
  public readonly dashPressed = new Uint8Array(INPUT_RECORDING_CAPACITY);

  private framesInUse = 0;

  public get count(): number {
    return this.framesInUse;
  }

  public record(tick: number, intent: Readonly<PlayerIntent>): void {
    if (this.framesInUse >= INPUT_RECORDING_CAPACITY) {
      throw new RangeError('input recording capacity exhausted');
    }

    const expectedTick = this.framesInUse + 1;
    if (!Number.isSafeInteger(tick) || tick !== expectedTick) {
      throw new RangeError(`input tick must be contiguous; expected ${expectedTick}`);
    }

    assertIntent(intent);

    const index = this.framesInUse;
    this.ticks[index] = tick;
    this.moveX[index] = intent.moveX;
    this.moveY[index] = intent.moveY;
    this.dashPressed[index] = intent.dashPressed ? 1 : 0;
    this.framesInUse = index + 1;
  }
}
