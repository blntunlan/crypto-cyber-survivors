import { type MarketPosition } from '../types';
import { type EnemyDefinition } from '../config/EnemyRegistry';

export type PreviewTabId = 'vfx' | 'assets' | 'sounds';

export type PreviewTheme = 'cyberpunk' | 'retro-16bit';

export type AssetKind = 'enemy' | 'player';

export interface AssetPreviewEntry {
  id: string;
  kind: AssetKind;
  label: string;
  category: 'enemy' | 'player';
  description?: string;
  radius: number;
  color: string;
  isElite?: boolean;
  isBoss?: boolean;
  isOppositeColor?: boolean;
  preserveIdentity?: boolean;
  stats?: {
    baseHealth?: number;
    baseSpeed?: number;
    baseDamage?: number;
    spawnWeight?: number;
    combatRole?: EnemyDefinition['combatRole'];
  };
}

export type AudioPreviewKind = 'preset' | 'composite';

export interface AudioPreviewEntry {
  id: string;
  label: string;
  category: string;
  description?: string;
  kind: AudioPreviewKind;
  presetId?: string;
  compositeId?: CompositeAudioId;
  hasRetroVariant?: boolean;
}

export type CompositeAudioId =
  | 'playLevelUp'
  | 'playDeath'
  | 'playJackpot'
  | 'playCombo'
  | 'playCoinShower'
  | 'playAnticipation'
  | 'playMultiplierChime'
  | 'playSlowdownTension'
  | 'playSpinStart'
  | 'playSlotWin'
  | 'playWeaponFire'
  | 'playComboMilestone1'
  | 'playComboMilestone5';

export type PreviewStatus = 'draft' | 'review' | 'approved' | 'in-game' | 'rejected';

export interface PreviewStatusRecord {
  status: PreviewStatus;
  notes?: string;
  updatedAt: number;
}

export type PreviewMarketPosition = MarketPosition;
