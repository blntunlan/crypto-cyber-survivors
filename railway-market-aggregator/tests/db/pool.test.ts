import { describe, expect, it } from 'vitest';
import { getPoolUsageSnapshot } from '../../src/db/pool';

describe('pool usage monitoring', () => {
  it('does not warn when created clients are busy but configured capacity remains available', () => {
    const usage = getPoolUsageSnapshot(
      {
        totalCount: 2,
        idleCount: 0,
        waitingCount: 0,
      },
      5
    );

    expect(usage.active).toBe(2);
    expect(usage.capacityUsage).toBe(0.4);
    expect(usage.shouldWarn).toBe(false);
  });

  it('warns near configured pool capacity', () => {
    const usage = getPoolUsageSnapshot(
      {
        totalCount: 5,
        idleCount: 1,
        waitingCount: 0,
      },
      5
    );

    expect(usage.active).toBe(4);
    expect(usage.capacityUsage).toBe(0.8);
    expect(usage.shouldWarn).toBe(true);
  });

  it('warns when queries are waiting', () => {
    const usage = getPoolUsageSnapshot(
      {
        totalCount: 5,
        idleCount: 0,
        waitingCount: 1,
      },
      5
    );

    expect(usage.shouldWarn).toBe(true);
  });
});
