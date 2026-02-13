import { describe, it, expect } from 'vitest';
import {
  MODERN_SCREEN_OVERLAY,
  MODERN_PANEL_FRAME,
  MODERN_PANEL_OUTER_BORDER,
  MODERN_PANEL_INNER_BORDER,
  MODERN_PANEL_TOP_ACCENT,
} from '../../config/modernSurface';

describe('modernSurface config', () => {
  it('exports non-empty class strings', () => {
    expect(MODERN_SCREEN_OVERLAY).toContain('bg-');
    expect(MODERN_PANEL_FRAME).toContain('border');
    expect(MODERN_PANEL_OUTER_BORDER).toContain('absolute');
    expect(MODERN_PANEL_INNER_BORDER).toContain('rounded');
    expect(MODERN_PANEL_TOP_ACCENT).toContain('gradient');
  });
});
