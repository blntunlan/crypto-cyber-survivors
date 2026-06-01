import { type ComboMilestoneSound } from '../audio/types';
import { type WeaponId } from '../../types/weapons';

/**
 * Interface for the Audio Service.
 * Provides a unified API for playing synthesized and file-based audio.
 */
export interface IAudioService {
  toggleMute(): boolean;
  setMuted(value: boolean): void;
  setVolume(value: number): void;
  getVolume(): number;
  getMuted(): boolean;

  playShoot(fireRate?: number, projectileCount?: number): void;
  playWeaponFire(weaponId: WeaponId, level?: number): void;
  playCrit(): void;
  playHit(): void;
  playHeartbeat(): void;
  playGem(): void;
  playLevelUp(): void;
  playWhoosh(): void;
  playDash(): void;
  playCombo(multiplier?: number): void;
  playDeath(): void;
  playWhaleArrival(): void;
  playButton(): void;

  playComboMilestone(sound: ComboMilestoneSound): void;

  playSlotTick(pitch?: number): void;
  playReelStop(reelNumber: number): void;
  playSlotWin(): void;
  playAnticipation(intensity?: number): void;
  playCoinShower(): void;
  playNearMiss(): void;
  playMultiplierChime(level?: number): void;
  playSlowdownTension(): void;
  playJackpot(): void;
  playSpinStart(): void;
}
