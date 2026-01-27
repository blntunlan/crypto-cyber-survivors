/**
 * GameStore - Global Game State Management
 *
 * Uses Zustand with Slice Pattern for maintainable, modular state.
 * Combined Slices:
 * - Audio (Volume, Mute)
 * - Graphics (Particles, FPS, Scale)
 * - Progress (Scores, Achievements)
 * - Session (Session IDs, Tracking)
 * - Gameplay (Keybinds, Tutorial)
 * - Mobile (Touch Controls)
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { Logger } from '../services/system/Logger';
import { DEFAULT_CATEGORY_VOLUMES } from '../services/audio/constants';

// Slices
import { type AudioSlice, createAudioSlice, DEFAULT_AUDIO } from './slices/audioSlice';
import {
  type GraphicsSlice,
  createGraphicsSlice,
  DEFAULT_GRAPHICS,
} from './slices/graphicsSlice';
import { type ProgressSlice, createProgressSlice } from './slices/progressSlice';
import { type SessionSlice, createSessionSlice } from './slices/sessionSlice';
import {
  type GameplaySlice,
  createGameplaySlice,
  DEFAULT_GAMEPLAY,
} from './slices/gameplaySlice';
import { type MobileSlice, createMobileSlice } from './slices/mobileSlice';
import { DEFAULT_MOBILE_SETTINGS } from '../types/MobileSettings';

// Re-export types for backward compatibility
export type { AudioSettings, AudioActions } from './slices/audioSlice';
export type { GraphicsSettings, GraphicsActions } from './slices/graphicsSlice';
export type { PlayerProgress, ProgressActions } from './slices/progressSlice';
export type { SessionInfo, SessionActions } from './slices/sessionSlice';
export type { GameplaySettings, GameplayActions } from './slices/gameplaySlice';

// Combined State & Actions Type
export type GameStoreState = AudioSlice &
  GraphicsSlice &
  ProgressSlice &
  SessionSlice &
  GameplaySlice &
  MobileSlice & {
    resetSettings: () => void;
  };

// Store Implementation
export const useGameStore = create<GameStoreState>()(
  persist(
    (set, get, api) => ({
      ...createAudioSlice(set, get, api),
      ...createGraphicsSlice(set, get, api),
      ...createProgressSlice(set, get, api),
      ...createSessionSlice(set, get, api),
      ...createGameplaySlice(set, get, api),
      ...createMobileSlice(set, get, api),

      // Global Reset Action
      resetSettings: () =>
        set({
          audio: DEFAULT_AUDIO,
          graphics: DEFAULT_GRAPHICS,
          gameplay: DEFAULT_GAMEPLAY,
          mobile: DEFAULT_MOBILE_SETTINGS,
        }),
    }),
    {
      name: 'crypto-survivors-store',
      storage: createJSONStorage(() => {
        try {
          return localStorage;
        } catch (e) {
          Logger.warn('LocalStorage access failed, falling back to memory storage', e);
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
      // Fields to persist
      partialize: state => ({
        audio: state.audio,
        graphics: state.graphics,
        gameplay: state.gameplay,
        mobile: state.mobile,
        progress: state.progress,
        hasSeenTutorial: state.hasSeenTutorial,
        lastPlayedVersion: state.lastPlayedVersion,
      }),
      // Migration & Merge Strategy
      merge: (persistedState, currentState) => {
        const persisted = persistedState as Partial<GameStoreState> | undefined;
        if (!persisted) return currentState;

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

// Selectors (Maintained for Performance & Compatibility)
export const selectAudio = (state: GameStoreState) => state.audio;
export const selectGraphics = (state: GameStoreState) => state.graphics;
export const selectProgress = (state: GameStoreState) => state.progress;
export const selectSession = (state: GameStoreState) => state.session;

// Computed Selectors
export const selectEffectiveVolume = (state: GameStoreState) =>
  state.audio.isMuted ? 0 : state.audio.masterVolume;

export const selectSfxEffectiveVolume = (state: GameStoreState) =>
  state.audio.isMuted ? 0 : state.audio.masterVolume * state.audio.sfxVolume;

export const selectMusicEffectiveVolume = (state: GameStoreState) =>
  state.audio.isMuted ? 0 : state.audio.masterVolume * state.audio.musicVolume;
