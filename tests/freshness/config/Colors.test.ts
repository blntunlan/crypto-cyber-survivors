import { describe, it, expect } from 'vitest';
import { COLORS, type ColorKey } from '../../../config/Colors';

describe('COLORS', () => {
  it('contains required market colors with valid hex values', () => {
    const required: ColorKey[] = ['LONG', 'SHORT', 'BG', 'TEXT'];

    for (const key of required) {
      expect(COLORS[key]).toMatch(/^#[0-9A-Fa-f]{6}$/);
    }

    expect(COLORS.LONG).not.toBe(COLORS.SHORT);
  });

  it('keeps intentional color aliases in sync', () => {
    expect(COLORS.GEM).toBe(COLORS.CRIT);
  });

  it('defines both cyber and retro palettes', () => {
    expect(COLORS.PRIMARY_CYBER).toMatch(/^#[0-9A-Fa-f]{6}$/);
    expect(COLORS.BG_CYBER).toMatch(/^#[0-9A-Fa-f]{6}$/);
    expect(COLORS.PRIMARY_RETRO).toMatch(/^#[0-9A-Fa-f]{6}$/);
    expect(COLORS.BG_RETRO).toMatch(/^#[0-9A-Fa-f]{6}$/);
  });
});
