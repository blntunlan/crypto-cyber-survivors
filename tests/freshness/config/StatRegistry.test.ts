import { describe, it, expect } from 'vitest';
import { STAT_DEFINITIONS } from '../../../config/StatRegistry';

describe('StatRegistry', () => {
  it('keeps object keys aligned with stat ids', () => {
    for (const [key, stat] of Object.entries(STAT_DEFINITIONS)) {
      expect(stat.id).toBe(key);
      expect(Number.isFinite(stat.defaultValue)).toBe(true);
      expect(stat.label.length).toBeGreaterThan(0);
      expect(stat.description.length).toBeGreaterThan(0);
    }
  });

  it('includes all major categories', () => {
    const categories = new Set(Object.values(STAT_DEFINITIONS).map(stat => stat.category));
    expect(categories.has('combat')).toBe(true);
    expect(categories.has('defense')).toBe(true);
    expect(categories.has('movement')).toBe(true);
    expect(categories.has('economy')).toBe(true);
  });

  it('keeps special constraints coherent', () => {
    expect(STAT_DEFINITIONS.fireRate.isInverse).toBe(true);
    expect(STAT_DEFINITIONS.fireRate.cap).toBe(50);

    for (const stat of Object.values(STAT_DEFINITIONS)) {
      if (stat.isPercentage) {
        expect(stat.cap).toBeLessThanOrEqual(1);
      }
    }
  });
});
