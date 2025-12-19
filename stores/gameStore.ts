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
import { nanoid } from 'nanoid';

// ============================================
// Types
// ============================================

export interface AudioSettings {
    masterVolume: number;
    sfxVolume: number;
    musicVolume: number;
    isMuted: boolean;
}

export interface GraphicsSettings {
    showParticles: boolean;
    showScreenShake: boolean;
    showDamageNumbers: boolean;
    reducedMotion: boolean;
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
    setMasterVolume: (volume: number) => void;
    setSfxVolume: (volume: number) => void;
    setMusicVolume: (volume: number) => void;
    toggleMute: () => void;

    // Graphics
    toggleParticles: () => void;
    toggleScreenShake: () => void;
    toggleDamageNumbers: () => void;
    toggleReducedMotion: () => void;

    // Progress
    recordGameEnd: (score: number, level: number, survivalTime: number, kills: number) => void;
    addCardCollected: (cardId: string) => void;
    unlockAchievement: (achievementId: string) => void;
    resetProgress: () => void;

    // Session
    startNewSession: () => void;
    incrementGamesPlayed: () => void;

    // Tutorial
    markTutorialSeen: () => void;

    // Utility
    resetSettings: () => void;
}

// ============================================
// Default Values
// ============================================

const DEFAULT_AUDIO: AudioSettings = {
    masterVolume: 1.0,
    sfxVolume: 0.8,
    musicVolume: 0.5,
    isMuted: false,
};

const DEFAULT_GRAPHICS: GraphicsSettings = {
    showParticles: true,
    showScreenShake: true,
    showDamageNumbers: true,
    reducedMotion: false,
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

const createNewSession = (): SessionInfo => ({
    sessionId: nanoid(12),
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
            progress: DEFAULT_PROGRESS,
            session: createNewSession(),
            hasSeenTutorial: false,
            lastPlayedVersion: '0.0.0',

            // Audio Actions
            setMasterVolume: (volume) =>
                set((state) => ({
                    audio: { ...state.audio, masterVolume: Math.max(0, Math.min(1, volume)) },
                })),

            setSfxVolume: (volume) =>
                set((state) => ({
                    audio: { ...state.audio, sfxVolume: Math.max(0, Math.min(1, volume)) },
                })),

            setMusicVolume: (volume) =>
                set((state) => ({
                    audio: { ...state.audio, musicVolume: Math.max(0, Math.min(1, volume)) },
                })),

            toggleMute: () =>
                set((state) => ({
                    audio: { ...state.audio, isMuted: !state.audio.isMuted },
                })),

            // Graphics Actions
            toggleParticles: () =>
                set((state) => ({
                    graphics: { ...state.graphics, showParticles: !state.graphics.showParticles },
                })),

            toggleScreenShake: () =>
                set((state) => ({
                    graphics: { ...state.graphics, showScreenShake: !state.graphics.showScreenShake },
                })),

            toggleDamageNumbers: () =>
                set((state) => ({
                    graphics: { ...state.graphics, showDamageNumbers: !state.graphics.showDamageNumbers },
                })),

            toggleReducedMotion: () =>
                set((state) => ({
                    graphics: { ...state.graphics, reducedMotion: !state.graphics.reducedMotion },
                })),

            // Progress Actions
            recordGameEnd: (score, level, survivalTime, kills) =>
                set((state) => ({
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

            addCardCollected: (cardId) =>
                set((state) => {
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

            unlockAchievement: (achievementId) =>
                set((state) => {
                    if (state.progress.achievementsUnlocked.includes(achievementId)) {
                        return state;
                    }
                    return {
                        progress: {
                            ...state.progress,
                            achievementsUnlocked: [...state.progress.achievementsUnlocked, achievementId],
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
                set((state) => ({
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

            // Reset Settings
            resetSettings: () =>
                set({
                    audio: DEFAULT_AUDIO,
                    graphics: DEFAULT_GRAPHICS,
                    gameplay: DEFAULT_GAMEPLAY,
                }),
        }),
        {
            name: 'crypto-survivors-store',
            storage: createJSONStorage(() => localStorage),
            // Only persist certain fields
            partialize: (state) => ({
                audio: state.audio,
                graphics: state.graphics,
                gameplay: state.gameplay,
                progress: state.progress,
                hasSeenTutorial: state.hasSeenTutorial,
                lastPlayedVersion: state.lastPlayedVersion,
            }),
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
