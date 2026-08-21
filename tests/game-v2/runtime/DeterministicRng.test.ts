import { describe, expect, it } from 'vitest';
import { createRunIdentity, type RunIdentity } from '@/game-v2/contracts/RunIdentity';
import { DeterministicRng, type RngSnapshot } from '@/game-v2/runtime/DeterministicRng';

describe('DeterministicRng', () => {
  it('produces the standard xorshift32 golden sequence', () => {
    const rng = new DeterministicRng(0x12345678);
    const sequence = Array.from({ length: 8 }, () => rng.nextUint32());

    expect(sequence).toEqual([
      0x87985aa5, 0x155b24a3, 0x4820f4c4, 0x81b3ac98, 0x703a0788, 0x29a8e24d,
      0x89ca4f1d, 0xc5186e29,
    ]);
  });

  it('maps nextFloat to the half-open unit interval', () => {
    const rng = new DeterministicRng(0x12345678);

    for (let index = 0; index < 32; index += 1) {
      const value = rng.nextFloat();

      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThan(1);
    }
  });

  it('returns integer values below a positive exclusive bound', () => {
    const rng = new DeterministicRng(0x12345678);

    for (let index = 0; index < 32; index += 1) {
      const value = rng.nextInt(7);

      expect(Number.isInteger(value)).toBe(true);
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThan(7);
    }
  });

  it.each([0, -1, 1.5, Number.NaN, Number.POSITIVE_INFINITY])(
    'rejects invalid nextInt bound %s',
    bound => {
      const rng = new DeterministicRng(0x12345678);

      expect(() => rng.nextInt(bound)).toThrow(RangeError);
    }
  );

  it('normalizes the accepted zero seed to the non-zero xorshift state', () => {
    const zeroSeed = new DeterministicRng(0);
    const normalizedSeed = new DeterministicRng(0x6d2b79f5);

    expect(zeroSeed.nextUint32()).toBe(normalizedSeed.nextUint32());
  });

  it.each([
    Number.NaN,
    Number.POSITIVE_INFINITY,
    Number.NEGATIVE_INFINITY,
    -1,
    1.5,
    0x1_0000_0000,
  ])('rejects invalid seed %s', seed => {
    expect(() => new DeterministicRng(seed)).toThrow(RangeError);
  });

  it('repeats subsequent values after restoring a snapshot', () => {
    const rng = new DeterministicRng(0x12345678);

    rng.nextUint32();
    const snapshot = rng.snapshot();
    const expected = [rng.nextUint32(), rng.nextUint32(), rng.nextUint32()];

    rng.restore(snapshot);

    expect([rng.nextUint32(), rng.nextUint32(), rng.nextUint32()]).toEqual(expected);
  });

  it('rejects snapshots with the wrong schema or invalid state', () => {
    const rng = new DeterministicRng(0x12345678);

    expect(() =>
      rng.restore({ schemaVersion: 2, state: 1 } as unknown as RngSnapshot)
    ).toThrow(RangeError);
    expect(() => rng.restore({ schemaVersion: 1, state: 0 })).toThrow(RangeError);
    expect(() => rng.restore({ schemaVersion: 1, state: Number.NaN })).toThrow(
      RangeError
    );
    expect(() => rng.restore({ schemaVersion: 1, state: -1 })).toThrow(RangeError);
    expect(() => rng.restore({ schemaVersion: 1, state: 0x1_0000_0000 })).toThrow(
      RangeError
    );
  });
});

describe('createRunIdentity', () => {
  it('returns an immutable schema-versioned identity without consuming randomness', () => {
    const identity = createRunIdentity('run-42', 0x12345678);
    const typedIdentity: RunIdentity = identity;
    const rng = new DeterministicRng(typedIdentity.seed);

    expect(identity).toEqual({
      schemaVersion: 1,
      runId: 'run-42',
      seed: 0x12345678,
    });
    expect(Object.isFrozen(identity)).toBe(true);
    expect(rng.nextUint32()).toBe(0x87985aa5);
  });

  it.each(['', '   '])('rejects an empty run ID %j', runId => {
    expect(() => createRunIdentity(runId, 0x12345678)).toThrow(TypeError);
  });

  it.each([Number.NaN, Number.POSITIVE_INFINITY, -1, 1.5, 0x1_0000_0000])(
    'rejects an invalid identity seed %s',
    seed => {
      expect(() => createRunIdentity('run-42', seed)).toThrow(RangeError);
    }
  );
});
