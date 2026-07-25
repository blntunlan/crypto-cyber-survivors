import { describe, expect, it } from 'vitest';
import {
  PRODUCTION_UI_SURFACE_MANIFEST,
  isProductionUiSurface,
} from '../../../config/ui-contract/productionSurfaceManifest';

describe('production UI surface manifest', () => {
  it('defines every critical visual regression flow', () => {
    expect(PRODUCTION_UI_SURFACE_MANIFEST.criticalFlows.map(flow => flow.id)).toEqual([
      'landing',
      'hub',
      'main-menu',
      'settings',
      'game-hud',
      'level-up',
      'game-over',
    ]);
  });

  it('includes player-facing UI while excluding development surfaces', () => {
    expect(isProductionUiSurface('components/settings/ThemeSection.tsx')).toBe(true);
    expect(isProductionUiSurface('components/admin/AdminDashboard.tsx')).toBe(false);
    expect(isProductionUiSurface('components/preview-lab/PreviewLab.tsx')).toBe(false);
  });
});
