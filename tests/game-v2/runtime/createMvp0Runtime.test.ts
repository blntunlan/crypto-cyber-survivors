import { describe, expect, it, vi } from 'vitest';

import { MVP0_WORLD_CAPACITY } from '@/game-v2/config/Mvp0Config';
import { RUN_IDENTITY_SCHEMA_VERSION } from '@/game-v2/contracts/RunIdentity';
import {
  MVP0_RENDER_CAPACITIES,
  resolveRunIdentity,
} from '@/game-v2/runtime/createMvp0Runtime';

describe('resolveRunIdentity', () => {
  it('pins the seed and run id when the URL supplies one', () => {
    const randomSeed = vi.fn(() => 999);
    const identity = resolveRunIdentity('?seed=12345', randomSeed);

    expect(identity.seed).toBe(12345);
    expect(identity.runId).toBe('mvp0-12345');
    expect(identity.schemaVersion).toBe(RUN_IDENTITY_SCHEMA_VERSION);
    expect(randomSeed).not.toHaveBeenCalled();
  });

  it('produces the same identity for the same seed parameter', () => {
    const randomSeed = () => 0;

    expect(resolveRunIdentity('?seed=7', randomSeed)).toEqual(
      resolveRunIdentity('?other=1&seed=7', randomSeed)
    );
  });

  it.each(['', '?seed=', '?seed=abc', '?seed=-1', '?seed=1.5', '?seed=4294967296'])(
    'falls back to the random seed for %s',
    search => {
      const randomSeed = vi.fn(() => 4242);
      const identity = resolveRunIdentity(search, randomSeed);

      expect(randomSeed).toHaveBeenCalledTimes(1);
      expect(identity.seed).toBe(4242);
      expect(identity.runId).toBe('mvp0-4242');
    }
  );

  it('accepts the unsigned 32-bit boundaries', () => {
    const randomSeed = vi.fn(() => 1);

    expect(resolveRunIdentity('?seed=0', randomSeed).seed).toBe(0);
    expect(resolveRunIdentity('?seed=4294967295', randomSeed).seed).toBe(4294967295);
    expect(randomSeed).not.toHaveBeenCalled();
  });

  it('rejects a random seed outside the unsigned 32-bit range', () => {
    expect(() => resolveRunIdentity('', () => -1)).toThrow(RangeError);
    expect(() => resolveRunIdentity('', () => 1.5)).toThrow(RangeError);
  });
});

describe('MVP0_RENDER_CAPACITIES', () => {
  it('gives XP pickups the whole world so the world is the only bound', () => {
    expect(MVP0_RENDER_CAPACITIES.xpPickupCapacity).toBe(MVP0_WORLD_CAPACITY);
  });

  it('is frozen so a caller cannot resize the render categories at runtime', () => {
    expect(Object.isFrozen(MVP0_RENDER_CAPACITIES)).toBe(true);
  });
});
