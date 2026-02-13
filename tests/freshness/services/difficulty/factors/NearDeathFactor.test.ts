import { describe, it, expect } from 'vitest';
import {
  calculateNearDeathFactor,
  getHealthDangerLevel,
  shouldApplyMercy,
} from '../../../../../services/difficulty/factors/NearDeathFactor';

describe('NearDeathFactor', () => {
  it('stays neutral above threshold and clamps to 0.5 at very low hp', () => {
    expect(calculateNearDeathFactor({ hpPercent: 0.31 })).toBe(1);
    expect(calculateNearDeathFactor({ hpPercent: 0.05 })).toBe(0.5);
    expect(calculateNearDeathFactor({ hpPercent: 0.01 })).toBe(0.5);
  });

  it('interpolates linearly between 30% and 5% hp', () => {
    expect(calculateNearDeathFactor({ hpPercent: 0.175 })).toBeCloseTo(0.75, 6);
  });

  it('classifies hp danger levels', () => {
    expect(getHealthDangerLevel(0.5)).toBe('safe');
    expect(getHealthDangerLevel(0.25)).toBe('warning');
    expect(getHealthDangerLevel(0.15)).toBe('danger');
    expect(getHealthDangerLevel(0.09)).toBe('critical');
  });

  it('applies mercy only below 30% hp', () => {
    expect(shouldApplyMercy(0.29)).toBe(true);
    expect(shouldApplyMercy(0.3)).toBe(false);
  });
});
