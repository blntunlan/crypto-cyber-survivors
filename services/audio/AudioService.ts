/**
 * AudioService - Unified Audio System Facade
 *
 * Provides a unified API for all audio operations:
 * - Synthesized sounds via Web Audio API
 * - File-based audio via Howler.js
 *
 * This is the main entry point for the audio system,
 * maintaining backward compatibility with the original API.
 */

import { type Howl } from 'howler';
import { synthEngine } from './SynthEngine';
import { howlerManager } from './HowlerManager';
import {
  type ComboMilestoneSound,
  type SoundCategory,
  type CategoryVolumes,
} from './types';
import { type WeaponId } from '../../types/weapons';

// Import sound modules
import * as GameSounds from './GameSounds';
import * as ComboSounds from './ComboSounds';
import * as SlotSounds from './SlotMachineSounds';
import { type IAudioService } from '../interfaces/IAudioService';

/**
 * Main AudioService class - Facade for all audio operations
 */
export class AudioService implements IAudioService {
  // ========================================
  // Volume & Mute Control
  // ========================================

  /**
   * Toggle mute state
   */
  toggleMute(): boolean {
    const newState = synthEngine.toggleMute();
    howlerManager.setMuted(newState);
    return newState;
  }

  /**
   * Set mute state explicitly.
   */
  setMuted(value: boolean): void {
    synthEngine.setMuted(value);
    howlerManager.setMuted(value);
  }

  /**
   * Set master volume (0-1)
   */
  setVolume(value: number): void {
    synthEngine.setVolume(value);
    howlerManager.setVolume(value);
  }

  /**
   * Get current volume
   */
  getVolume(): number {
    return synthEngine.getVolume();
  }

  /**
   * Get mute state
   */
  getMuted(): boolean {
    return synthEngine.getMuted();
  }

  // ========================================
  // Category Volume Control
  // ========================================

  /**
   * Set volume for a specific sound category (0-1)
   */
  setCategoryVolume(category: SoundCategory, value: number): void {
    synthEngine.setCategoryVolume(category, value);
  }

  /**
   * Get volume for a specific category
   */
  getCategoryVolume(category: SoundCategory): number {
    return synthEngine.getCategoryVolume(category);
  }

  /**
   * Get all category volumes
   */
  getCategoryVolumes(): CategoryVolumes {
    return synthEngine.getCategoryVolumes();
  }

  // ========================================
  // Game Sounds (Synthesized)
  // ========================================

  /**
   * Play shoot sound - quick laser pew
   */
  playShoot(fireRate: number = 1, projectileCount: number = 1): void {
    GameSounds.playShoot(fireRate, projectileCount);
  }

  /**
   * Play weapon-aware fire feedback without each caller duplicating cooldown rules.
   */
  playWeaponFire(weaponId: WeaponId, level: number = 1): void {
    switch (weaponId) {
      case 'laser':
        GameSounds.playWeaponPulse(0.45, 0.7);
        return;
      case 'spread_shot':
        GameSounds.playShoot(0.8, 3);
        return;
      case 'boomerang':
        GameSounds.playWeaponPulse(0.7, 0.9);
        return;
      case 'aoe_nuke':
        GameSounds.playWeaponPulse(0.25, 1.2);
        return;
      case 'orbit_shield':
        GameSounds.playWeaponPulse(0.55, 0.65);
        return;
      case 'hyper_cannon':
        GameSounds.playShoot(1.2 + level * 0.05, 5);
        return;
      case 'quantum_bullet':
      default:
        GameSounds.playShoot(0.6 + level * 0.03, 1);
        return;
    }
  }

  /**
   * Play critical hit sound
   */
  playCrit(): void {
    GameSounds.playCrit();
  }

  /**
   * Play hit/damage sound
   */
  playHit(): void {
    GameSounds.playHit();
  }

  /**
   * Play low HP heartbeat
   */
  playHeartbeat(): void {
    GameSounds.playHeartbeat();
  }

  /**
   * Play gem collection sound
   */
  playGem(): void {
    GameSounds.playGem();
  }

  /**
   * Play level up sound
   */
  playLevelUp(): void {
    GameSounds.playLevelUp();
  }

  /**
   * Play near miss whoosh sound
   */
  playWhoosh(): void {
    GameSounds.playWhoosh();
  }

  /**
   * Play dash sound
   */
  playDash(): void {
    GameSounds.playDash();
  }

  /**
   * Play combo sound
   */
  playCombo(multiplier: number = 1): void {
    GameSounds.playCombo(multiplier);
  }

  /**
   * Play death sound
   */
  playDeath(): void {
    GameSounds.playDeath();
  }

  /**
   * Play whale arrival sound
   */
  playWhaleArrival(): void {
    GameSounds.playWhaleArrival();
  }

  /**
   * Play button click sound
   */
  playButton(): void {
    GameSounds.playButton();
  }

  /**
   * Play menu selection/focus tick
   */
  playSelectionTick(): void {
    GameSounds.playSelectionTick();
  }

  /**
   * Play keystroke sound for typing/text
   */
  playKeystroke(): void {
    GameSounds.playKeystroke();
  }

  /**
   * Play toggle switch sound
   */
  playToggle(): void {
    GameSounds.playToggle();
  }

  /**
   * Play achievement/high score glint
   */
  playAchievementGlint(): void {
    GameSounds.playAchievementGlint();
  }

  /**
   * Play pair selection sound
   */
  playPairSelect(): void {
    GameSounds.playPairSelect();
  }

  // ========================================
  // Combo Milestone Sounds
  // ========================================

  /**
   * Play combo milestone sound based on level
   */
  playComboMilestone(sound: ComboMilestoneSound): void {
    ComboSounds.playComboMilestone(sound);
  }

  // ========================================
  // Slot Machine Sounds
  // ========================================

  /**
   * Play slot tick sound
   */
  playSlotTick(pitch: number = 1): void {
    SlotSounds.playSlotTick(pitch);
  }

  /**
   * Play reel stop sound
   */
  playReelStop(reelNumber: number): void {
    SlotSounds.playReelStop(reelNumber);
  }

  /**
   * Play slot win fanfare
   */
  playSlotWin(): void {
    SlotSounds.playSlotWin();
  }

  /**
   * Play anticipation rising tone
   */
  playAnticipation(intensity: number = 1): void {
    SlotSounds.playAnticipation(intensity);
  }

  /**
   * Play coin shower - coin rain effect
   */
  playCoinShower(): void {
    SlotSounds.playCoinShower();
  }

  /**
   * Play near miss - close win effect
   */
  playNearMiss(): void {
    SlotSounds.playNearMiss();
  }

  /**
   * Play multiplier chime - multiplier increase effect
   */
  playMultiplierChime(level: number = 1): void {
    SlotSounds.playMultiplierChime(level);
  }

  /**
   * Play slowdown tension - suspenseful rumble as reel slows
   */
  playSlowdownTension(): void {
    SlotSounds.playSlowdownTension();
  }

  /**
   * Play jackpot mega win - extended celebration
   */
  playJackpot(): void {
    SlotSounds.playJackpot();
  }

  /**
   * Play spin start - subtle whoosh
   */
  playSpinStart(): void {
    SlotSounds.playSpinStart();
  }

  // ========================================
  // Howler.js Methods (File-based Audio)
  // ========================================

  /**
   * Load a sound file
   */
  loadSound(
    id: string,
    src: string | string[],
    options?: { loop?: boolean; volume?: number }
  ): Howl {
    return howlerManager.loadSound(id, src, options);
  }

  /**
   * Play a loaded sound
   */
  playSound(id: string): number | undefined {
    return howlerManager.playSound(id);
  }

  /**
   * Stop a sound
   */
  stopSound(id: string): void {
    howlerManager.stopSound(id);
  }

  /**
   * Unload all sounds (cleanup)
   */
  unloadAll(): void {
    howlerManager.unloadAll();
  }
}

// Singleton export - maintains backward compatibility
export const audio = new AudioService();
