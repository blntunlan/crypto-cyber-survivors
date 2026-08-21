import { ZERO_SEED_FALLBACK } from '@/game-v2/contracts/RunIdentity';

export type RngSnapshot = Readonly<{ schemaVersion: 1; state: number }>;

const RNG_SNAPSHOT_SCHEMA_VERSION = 1 as const;
const UINT32_MAX = 0xffffffff;

const assertSeed = (seed: number): void => {
  if (
    !Number.isFinite(seed) ||
    !Number.isInteger(seed) ||
    seed < 0 ||
    seed > UINT32_MAX
  ) {
    throw new RangeError('seed must be a finite unsigned 32-bit integer');
  }
};

function assertState(state: unknown): asserts state is number {
  if (
    typeof state !== 'number' ||
    !Number.isFinite(state) ||
    !Number.isInteger(state) ||
    state <= 0 ||
    state > UINT32_MAX
  ) {
    throw new RangeError('snapshot state must be a non-zero unsigned 32-bit integer');
  }
}

export class DeterministicRng {
  private state: number;

  public constructor(seed: number) {
    assertSeed(seed);
    this.state = (seed === 0 ? ZERO_SEED_FALLBACK : seed) >>> 0;
  }

  public nextUint32(): number {
    let state = this.state;
    state ^= state << 13;
    state ^= state >>> 17;
    state ^= state << 5;
    this.state = state >>> 0;
    return this.state;
  }

  public nextFloat(): number {
    return this.nextUint32() / 0x1_0000_0000;
  }

  public nextInt(maxExclusive: number): number {
    if (
      !Number.isFinite(maxExclusive) ||
      !Number.isInteger(maxExclusive) ||
      maxExclusive <= 0
    ) {
      throw new RangeError('maxExclusive must be a positive finite integer');
    }

    return Math.floor(this.nextFloat() * maxExclusive);
  }

  public snapshot(): RngSnapshot {
    return Object.freeze({
      schemaVersion: RNG_SNAPSHOT_SCHEMA_VERSION,
      state: this.state,
    });
  }

  public restore(snapshot: unknown): void {
    if (snapshot === null || typeof snapshot !== 'object') {
      throw new RangeError('snapshot schemaVersion must be 1');
    }

    const candidate = snapshot as {
      schemaVersion?: unknown;
      state?: unknown;
    };
    if (candidate.schemaVersion !== RNG_SNAPSHOT_SCHEMA_VERSION) {
      throw new RangeError('snapshot schemaVersion must be 1');
    }

    assertState(candidate.state);
    this.state = candidate.state >>> 0;
  }
}
