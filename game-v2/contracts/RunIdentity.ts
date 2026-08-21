export const RUN_IDENTITY_SCHEMA_VERSION = 1 as const;
export const ZERO_SEED_FALLBACK = 0x6d2b79f5;

export type RunIdentity = Readonly<{
  schemaVersion: typeof RUN_IDENTITY_SCHEMA_VERSION;
  runId: string;
  seed: number;
}>;

const assertSeed = (seed: number): void => {
  if (
    !Number.isFinite(seed) ||
    !Number.isInteger(seed) ||
    seed < 0 ||
    seed > 0xffffffff
  ) {
    throw new RangeError('seed must be a finite unsigned 32-bit integer');
  }
};

export const createRunIdentity = (runId: string, seed: number): RunIdentity => {
  if (typeof runId !== 'string' || runId.trim().length === 0) {
    throw new TypeError('runId must be a non-empty string');
  }

  assertSeed(seed);

  return Object.freeze({
    schemaVersion: RUN_IDENTITY_SCHEMA_VERSION,
    runId,
    seed,
  });
};
