/**
 * VFX Catalog — Central registry of all preview modules.
 *
 * To add a new effect:
 *   1. Create a module file in `./previews/` implementing VfxPreviewModule
 *   2. Import and push it into VFX_CATALOG below
 *
 * That's it — the lab auto-discovers it via this list.
 */

import { type VfxPreviewModule } from '../../types/vfxLab';
import { OrbitShieldPreview } from './previews/OrbitShieldPreview';
import { LaserBeamPreview } from './previews/LaserBeamPreview';
import { BoomerangPreview } from './previews/BoomerangPreview';
import { QuantumBulletPreview } from './previews/QuantumBulletPreview';
import { SpreadShotPreview } from './previews/SpreadShotPreview';
import { AoeNukePreview } from './previews/AoeNukePreview';
import { GameFeelJuicePreview } from './previews/GameFeelJuicePreview';

export const VFX_CATALOG: ReadonlyArray<VfxPreviewModule> = [
  GameFeelJuicePreview,
  QuantumBulletPreview,
  SpreadShotPreview,
  LaserBeamPreview,
  BoomerangPreview,
  AoeNukePreview,
  OrbitShieldPreview,
];
