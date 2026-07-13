import { describe, it, expect } from 'vitest';
import { SKIN_VISUAL_REGISTRY, DEFAULT_SKIN_ID } from '../../config/SkinRegistry';
import { CHARACTER_SKIN_DEFINITIONS } from '../../types/inventory';

const HEX6 = /^#[0-9A-Fa-f]{6}$/;

describe('SkinRegistry', () => {
  it('covers every character skin id', () => {
    expect(Object.keys(SKIN_VISUAL_REGISTRY).sort()).toEqual(
      Object.keys(CHARACTER_SKIN_DEFINITIONS).sort()
    );
  });

  it('keeps the default skin fully position-driven (legacy player look)', () => {
    expect(SKIN_VISUAL_REGISTRY[DEFAULT_SKIN_ID]).toEqual({});
  });

  it('uses 6-digit hex for all overrides (renderers append alpha suffixes)', () => {
    for (const definition of Object.values(SKIN_VISUAL_REGISTRY)) {
      for (const color of Object.values(definition)) {
        expect(color).toMatch(HEX6);
      }
    }
  });

  it('keeps trail and halo accent position-driven so the LONG/SHORT signal stays readable', () => {
    for (const [skinId, definition] of Object.entries(SKIN_VISUAL_REGISTRY)) {
      expect(definition.trailColor, `${skinId}.trailColor`).toBeUndefined();
      expect(definition.accentColor, `${skinId}.accentColor`).toBeUndefined();
    }
  });
});
