/**
 * GameStore - Global Game State Management
 *
 * Uses Zustand for lightweight, persistent state management.
 * Handles:
 * - Game settings (audio, graphics)
 * - Player progress (high scores, stats)
 * - UI state (panels, preferences)
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import {
  type MobileControlSettings,
  DEFAULT_MOBILE_SETTINGS,
} from '../types/MobileSettings';
import { type SoundCategory, type CategoryVolumes } from '../services/audio/types';
import { DEFAULT_CATEGORY_VOLUMES } from '../services/audio/constants';
import { Logger } from '../services/Logger';

// ============================================
// Types
// ============================================

export interface AudioSettings {
  masterVolume: number;
  sfxVolume: number;
  musicVolume: number;
  isMuted: boolean;
  categoryVolumes: CategoryVolumes;
}

export interface GraphicsSettings {
  showParticles: boolean;
  showScreenShake: boolean;
  showDamageNumbers: boolean;
  reducedMotion: boolean;
  hudScale: number;
  showFPS: boolean;
}

export interface GameplaySettings {
  dashKey: 'space' | 'shift';
  autoFire: boolean;
  showTutorialHints: boolean;
}

export interface PlayerProgress {
  totalGamesPlayed: number;
  totalPlayTime: number; // seconds
  highScore: number;
  highestLevel: number;
  totalKills: number;
  totalDeaths: number;
  bestSurvivalTime: number; // seconds
  favoritePosition: 'LONG' | 'SHORT' | null;
  cardsCollected: string[];
  achievementsUnlocked: string[];
}

export interface SessionInfo {
  sessionId: string;
  startTime: number;
  gamesThisSession: number;
}

export interface GameStoreState {
  // Settings
  audio: AudioSettings;
  graphics: GraphicsSettings;
  gameplay: GameplaySettings;
  mobile: MobileControlSettings;

  // Progress
  progress: PlayerProgress;

  // Session
  session: SessionInfo;

  // UI State
  hasSeenTutorial: boolean;
  lastPlayedVersion: string;
}

export interface GameStoreActions {
  // Audio
  /** Sets the master volume (0.0 to 1.0) */
  setMasterVolume: (volume: number) => void;
  /** Sets the sound effects volume (0.0 to 1.0) */
  setSfxVolume: (volume: number) => void;
  /** Sets the music volume (0.0 to 1.0) */
  setMusicVolume: (volume: number) => void;
  /** Toggles the global mute state */
  toggleMute: () => void;
  /** Sets volume for a specific category (e.g. 'combat', 'ui') */
  setCategoryVolume: (category: SoundCategory, volume: number) => void;

  // Graphics
  /** Toggles particle effects visibility */
  toggleParticles: () => void;
  /** Toggles screen shake effects */
  toggleScreenShake: () => void;
  /** Toggles damage number popups */
  toggleDamageNumbers: () => void;
  /** Toggles reduced motion accessibility mode */
  toggleReducedMotion: () => void;
  /** Sets the scale of the HUD elements */
  setHudScale: (scale: number) => void;
  /** Toggles the FPS counter display */
  toggleFPS: () => void;
  /** Sets a specific graphics setting */
  setGraphicsSetting: <K extends keyof GraphicsSettings>(
    key: K,
    value: GraphicsSettings[K]
  ) => void;

  // Progress
  /**
   * Records the statistics at the end of a game session.
   * Updates total stats and high scores if applicable.
   */
  recordGameEnd: (
    score: number,
    level: number,
    survivalTime: number,
    kills: number
  ) => void;
  /** Unlocks a collectible card if not already collected */
  addCardCollected: (cardId: string) => void;
  /** Unlocks an achievement if not already unlocked */
  unlockAchievement: (achievementId: string) => void;
  /** Resets all player progress (high scores, stats, etc) */
  resetProgress: () => void;

  // Session
  /** Starts a new tracking session with a fresh ID */
  startNewSession: () => void;
  /** Increments the count of games played in the current session */
  incrementGamesPlayed: () => void;

  // Tutorial
  /** Marks the initial tutorial as seen */
  markTutorialSeen: () => void;

  // Mobile
  /** Sets a specific mobile control setting */
  setMobileSetting: <K extends keyof MobileControlSettings>(
    key: K,
    value: MobileControlSettings[K]
  ) => void;

  /** Resets all configuration settings (audio, graphics) to defaults */
  resetSettings: () => void;
  /** Sets a specific gameplay setting */
  setGameplaySetting: <K extends keyof GameplaySettings>(
    key: K,
    value: GameplaySettings[K]
  ) => void;
}

// ============================================
// Default Values
// ============================================

const DEFAULT_AUDIO: AudioSettings = {
  masterVolume: 1.0,
  sfxVolume: 0.8,
  musicVolume: 0.5,
  isMuted: false,
  categoryVolumes: { ...DEFAULT_CATEGORY_VOLUMES },
};

const DEFAULT_GRAPHICS: GraphicsSettings = {
  showParticles: true,
  showScreenShake: true,
  showDamageNumbers: true,
  reducedMotion: false,
  hudScale: 1.0,
  showFPS: false,
};

const DEFAULT_GAMEPLAY: GameplaySettings = {
  dashKey: 'space',
  autoFire: true,
  showTutorialHints: true,
};

const DEFAULT_PROGRESS: PlayerProgress = {
  totalGamesPlayed: 0,
  totalPlayTime: 0,
  highScore: 0,
  highestLevel: 0,
  totalKills: 0,
  totalDeaths: 0,
  bestSurvivalTime: 0,
  favoritePosition: null,
  cardsCollected: [],
  achievementsUnlocked: [],
};

import { nanoid } from 'nanoid';

const createNewSession = (): SessionInfo => ({
  sessionId: nanoid(),
  startTime: Date.now(),
  gamesThisSession: 0,
});

// ============================================
// Store
// ============================================

export const useGameStore = create<GameStoreState & GameStoreActions>()(
  persist(
    (set, _get) => ({
      // Initial State
      audio: DEFAULT_AUDIO,
      graphics: DEFAULT_GRAPHICS,
      gameplay: DEFAULT_GAMEPLAY,
      mobile: DEFAULT_MOBILE_SETTINGS,
      progress: DEFAULT_PROGRESS,
      session: createNewSession(),
      hasSeenTutorial: false,
      lastPlayedVersion: '0.0.0',

      // Audio Actions
      setMasterVolume: volume =>
        set(state => ({
          audio: { ...state.audio, masterVolume: Math.max(0, Math.min(1, volume)) },
        })),

      setSfxVolume: volume =>
        set(state => ({
          audio: { ...state.audio, sfxVolume: Math.max(0, Math.min(1, volume)) },
        })),

      setMusicVolume: volume =>
        set(state => ({
          audio: { ...state.audio, musicVolume: Math.max(0, Math.min(1, volume)) },
        })),

      toggleMute: () =>
        set(state => ({
          audio: { ...state.audio, isMuted: !state.audio.isMuted },
        })),

      setCategoryVolume: (category, volume) =>
        set(state => ({
          audio: {
            ...state.audio,
            categoryVolumes: {
              ...state.audio.categoryVolumes,
              [category]: Math.max(0, Math.min(1, volume)),
            },
          },
        })),

      // Graphics Actions
      toggleParticles: () =>
        set(state => ({
          graphics: { ...state.graphics, showParticles: !state.graphics.showParticles },
        })),

      toggleScreenShake: () =>
        set(state => ({
          graphics: {
            ...state.graphics,
            showScreenShake: !state.graphics.showScreenShake,
          },
        })),

      toggleDamageNumbers: () =>
        set(state => ({
          graphics: {
            ...state.graphics,
            showDamageNumbers: !state.graphics.showDamageNumbers,
          },
        })),

      toggleReducedMotion: () =>
        set(state => ({
          graphics: { ...state.graphics, reducedMotion: !state.graphics.reducedMotion },
        })),

      setHudScale: scale =>
        set(state => ({
          graphics: {
            ...state.graphics,
            hudScale: Math.max(0.5, Math.min(2.0, scale)),
          },
        })),

      toggleFPS: () =>
        set(state => ({
          graphics: { ...state.graphics, showFPS: !state.graphics.showFPS },
        })),

      setGraphicsSetting: (key, value) =>
        set(state => ({
          graphics: { ...state.graphics, [key]: value },
        })),

      // Progress Actions
      recordGameEnd: (score, level, survivalTime, kills) =>
        set(state => ({
          progress: {
            ...state.progress,
            totalGamesPlayed: state.progress.totalGamesPlayed + 1,
            totalPlayTime: state.progress.totalPlayTime + survivalTime,
            highScore: Math.max(state.progress.highScore, score),
            highestLevel: Math.max(state.progress.highestLevel, level),
            totalKills: state.progress.totalKills + kills,
            totalDeaths: state.progress.totalDeaths + 1,
            bestSurvivalTime: Math.max(state.progress.bestSurvivalTime, survivalTime),
          },
        })),

      addCardCollected: cardId =>
        set(state => {
          if (state.progress.cardsCollected.includes(cardId)) {
            return state;
          }
          return {
            progress: {
              ...state.progress,
              cardsCollected: [...state.progress.cardsCollected, cardId],
            },
          };
        }),

      unlockAchievement: achievementId =>
        set(state => {
          if (state.progress.achievementsUnlocked.includes(achievementId)) {
            return state;
          }
          return {
            progress: {
              ...state.progress,
              achievementsUnlocked: [
                ...state.progress.achievementsUnlocked,
                achievementId,
              ],
            },
          };
        }),

      resetProgress: () =>
        set({
          progress: DEFAULT_PROGRESS,
        }),

      // Session Actions
      startNewSession: () =>
        set({
          session: createNewSession(),
        }),

      incrementGamesPlayed: () =>
        set(state => ({
          session: {
            ...state.session,
            gamesThisSession: state.session.gamesThisSession + 1,
          },
        })),

      // Tutorial
      markTutorialSeen: () =>
        set({
          hasSeenTutorial: true,
        }),

      // Mobile Actions
      setMobileSetting: (key, value) =>
        set(state => ({
          mobile: { ...state.mobile, [key]: value },
        })),

      // Reset Settings
      resetSettings: () =>
        set({
          audio: DEFAULT_AUDIO,
          graphics: DEFAULT_GRAPHICS,
          gameplay: DEFAULT_GAMEPLAY,
          mobile: DEFAULT_MOBILE_SETTINGS,
        }),

      setGameplaySetting: (key, value) =>
        set(state => ({
          gameplay: { ...state.gameplay, [key]: value },
        })),
    }),
    {
      name: 'crypto-survivors-store',
      storage: createJSONStorage(() => {
        try {
          return localStorage;
        } catch (e) {
          Logger.warn('LocalStorage access failed, falling back to memory storage', e);
          // Minimal fallback mock
          const memoryStorage: Record<string, string> = {};
          return {
            getItem: (name: string) => memoryStorage[name] ?? null,
            setItem: (name: string, value: string) => {
              memoryStorage[name] = value;
            },
            removeItem: (name: string) => {
              delete memoryStorage[name];
            },
          };
        }
      }),
      // Only persist certain fields
      partialize: state => ({
        audio: state.audio,
        graphics: state.graphics,
        gameplay: state.gameplay,
        mobile: state.mobile,
        progress: state.progress,
        hasSeenTutorial: state.hasSeenTutorial,
        lastPlayedVersion: state.lastPlayedVersion,
      }),
      // Merge strategy to handle missing fields from old storage
      merge: (persistedState, currentState) => {
        const persisted = persistedState as Partial<GameStoreState> | undefined;
        if (!persisted) return currentState;

        // Ensure categoryVolumes exists (migration for old saves)
        const audioWithCategoryVolumes = {
          ...DEFAULT_AUDIO,
          ...persisted.audio,
          categoryVolumes: {
            ...DEFAULT_CATEGORY_VOLUMES,
            ...(persisted.audio?.categoryVolumes ?? {}),
          },
        };

        return {
          ...currentState,
          ...persisted,
          audio: audioWithCategoryVolumes,
        };
      },
    }
  )
);

// ============================================
// Selectors (for performance optimization)
// ============================================

export const selectAudio = (state: GameStoreState) => state.audio;
export const selectGraphics = (state: GameStoreState) => state.graphics;
export const selectProgress = (state: GameStoreState) => state.progress;
export const selectSession = (state: GameStoreState) => state.session;

// Computed selectors
export const selectEffectiveVolume = (state: GameStoreState) =>
  state.audio.isMuted ? 0 : state.audio.masterVolume;

export const selectSfxEffectiveVolume = (state: GameStoreState) =>
  state.audio.isMuted ? 0 : state.audio.masterVolume * state.audio.sfxVolume;

export const selectMusicEffectiveVolume = (state: GameStoreState) =>
  state.audio.isMuted ? 0 : state.audio.masterVolume * state.audio.musicVolume;
