import { describe, it, expect } from 'vitest';
import {
  calculateLevelFactor,
  getLevelCapForLeverage,
} from '../../../../../services/difficulty/factors/LevelFactor';

describe('LevelFactor', () => {
  it('returns baseline factor for level 1 or lower', () => {
    expect(calculateLevelFactor({ level: 1, leverage: 1 })).toBe(1);
    expect(calculateLevelFactor({ level: 0, leverage: 1 })).toBe(1);
  });

  it('scales harder with higher leverage at the same level', () => {
    const lowLeverage = calculateLevelFactor({ level: 10, leverage: 1 });
    const highLeverage = calculateLevelFactor({ level: 10, leverage: 100 });

    expect(highLeverage).toBeGreaterThan(lowLeverage);
  });

  it('caps factor at 2.0x', () => {
    expect(calculateLevelFactor({ level: 999, leverage: 100 })).toBe(2);
  });

  it('reaches cap at lower levels when leverage is higher', () => {
    expect(getLevelCapForLeverage(100)).toBeLessThan(getLevelCapForLeverage(1));
  });
});
