import { describe, expect, it } from 'vitest';
import { RollingAtrPercentile } from '../../../services/market/regime/RollingAtrPercentile';

describe('RollingAtrPercentile', () => {
  it('uses a neutral midpoint for one sample and deterministic ranks thereafter', () => {
    const window = new RollingAtrPercentile(4);

    expect(window.update(1, 0.01)).toBe(0.5);
    expect(window.update(2, 0.02)).toBe(1);
    expect(window.update(3, 0.005)).toBe(0);
  });

  it('ignores duplicate and out-of-order canonical sequences', () => {
    const window = new RollingAtrPercentile(4);
    window.update(10, 0.01);
    const before = window.update(11, 0.02);

    expect(window.update(11, 10)).toBe(before);
    expect(window.update(9, 10)).toBe(before);
    expect(window.getSampleCount()).toBe(2);
  });

  it('rolls over its fixed-capacity ring without retaining evicted samples', () => {
    const window = new RollingAtrPercentile(3);
    window.update(1, 1);
    window.update(2, 2);
    window.update(3, 3);

    expect(window.update(4, 0)).toBe(0);
    expect(window.getSampleCount()).toBe(3);
  });
});
