import { describe, it, expect } from 'vitest';
import {
  PANEL_VARIANTS,
  BUTTON_VARIANTS,
  INPUT_VARIANTS,
  TEXT_VARIANTS,
} from '../../../config/themeVariants';

describe('themeVariants', () => {
  it('defines modern and retro panel variants', () => {
    expect(PANEL_VARIANTS.modern.length).toBeGreaterThan(0);
    expect(PANEL_VARIANTS.retro.length).toBeGreaterThan(0);
  });

  it('keeps modern/retro button definitions for all button kinds', () => {
    for (const variant of Object.values(BUTTON_VARIANTS)) {
      expect(variant.modern.length).toBeGreaterThan(0);
      expect(variant.retro.length).toBeGreaterThan(0);
      expect(variant.retro).toContain('rounded-none');
    }
  });

  it('provides input and text variants for both themes', () => {
    expect(INPUT_VARIANTS.modern).toContain('rounded-lg');
    expect(INPUT_VARIANTS.retro).toContain('rounded-none');

    expect(TEXT_VARIANTS.h1.modern.length).toBeGreaterThan(0);
    expect(TEXT_VARIANTS.h1.retro.length).toBeGreaterThan(0);
    expect(TEXT_VARIANTS.body.modern.length).toBeGreaterThan(0);
    expect(TEXT_VARIANTS.body.retro.length).toBeGreaterThan(0);
  });
});
