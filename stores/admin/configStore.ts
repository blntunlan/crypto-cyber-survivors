/**
 * Admin Config Store
 *
 * Zustand store for managing game configuration state
 * Handles persistence, undo/redo, and real-time sync
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Logger } from '../../services/Logger';
import type {
  GameConfig,
  DifficultyConfig,
  SpawnConfig,
  ItemConfig,
  VisualConfig,
} from '../../types/admin';

// Re-export defaults for convenience
export { DEFAULT_GAME_CONFIG } from '../../types/admin';

// =============================================================================
// STORE TYPES
// =============================================================================

interface ConfigHistoryEntry {
  timestamp: number;
  config: GameConfig;
  description: string;
}

interface AdminConfigState {
  // Current config
  config: GameConfig;
  isDirty: boolean;

  // History
  history: ConfigHistoryEntry[];
  historyIndex: number;
  maxHistorySize: number;

  // Actions
  setConfig: (config: GameConfig) => void;
  updateDifficulty: (updates: Partial<DifficultyConfig>) => void;
  updateSpawn: (updates: Partial<SpawnConfig>) => void;
  updateItems: (updates: Partial<ItemConfig>) => void;
  updateVisuals: (updates: Partial<VisualConfig>) => void;

  // Persistence
  saveConfig: () => void;
  loadConfig: () => void;
  resetToDefaults: () => void;

  // History
  undo: () => void;
  redo: () => void;
  canUndo: () => boolean;
  canRedo: () => boolean;

  // Export/Import
  exportConfig: () => string;
  importConfig: (json: string) => boolean;
}

// =============================================================================
// STORE IMPLEMENTATION
// =============================================================================

const STORAGE_KEY = 'admin_game_config';

// Import default config inline to avoid circular dependency
const getDefaultConfig = (): GameConfig => ({
  version: '1.0.0',
  lastModified: Date.now(),
  difficulty: {
    base: 5,
    volatilityMultiplier: 1.0,
    timeMultiplier: 0.1,
    maxDifficulty: 10,
    curve: 'linear',
  },
  spawn: {
    baseInterval: 1000,
    minInterval: 200,
    maxEnemies: 200,
    waveIntensity: 0.5,
    bossSpawnTime: 120000,
    enemyDistribution: {
      normal: 50,
      fast: 25,
      tank: 15,
      ranged: 10,
    },
  },
  items: {
    gemDropRate: 0.8,
    healthDropRate: 0.05,
    powerUpDropRate: 0.02,
    gemValues: {
      small: 5,
      medium: 15,
      large: 50,
    },
    powerUpDurations: {
      shield: 5000,
      speedBoost: 3000,
      damage: 10000,
      magnet: 8000,
    },
  },
  visuals: {
    theme: 'btc',
    particleDensity: 0.7,
    screenShake: true,
    glowEffects: true,
  },
});

export const useAdminConfigStore = create<AdminConfigState>()(
  persist(
    (set, get) => ({
      // Initial state
      config: getDefaultConfig(),
      isDirty: false,
      history: [
        { timestamp: Date.now(), config: getDefaultConfig(), description: 'Initial state' },
      ],
      historyIndex: 0,
      maxHistorySize: 50,

      // Set entire config
      setConfig: (config: GameConfig) => {
        const state = get();
        // Create new entry
        const newEntry: ConfigHistoryEntry = {
          timestamp: Date.now(),
          config: config,
          description: 'Config update',
        };

        // If we are in the middle of history, discard the future
        const pastHistory = state.history.slice(0, state.historyIndex + 1);

        // Add new entry
        const newHistory = [...pastHistory, newEntry].slice(-state.maxHistorySize);

        set({
          config: { ...config, lastModified: Date.now() },
          isDirty: true,
          history: newHistory,
          historyIndex: newHistory.length - 1,
        });
      },

      // Partial updates
      updateDifficulty: (updates: Partial<DifficultyConfig>) => {
        const state = get();
        state.setConfig({
          ...state.config,
          difficulty: { ...state.config.difficulty, ...updates },
        });
      },

      updateSpawn: (updates: Partial<SpawnConfig>) => {
        const state = get();
        state.setConfig({
          ...state.config,
          spawn: { ...state.config.spawn, ...updates },
        });
      },

      updateItems: (updates: Partial<ItemConfig>) => {
        const state = get();
        state.setConfig({
          ...state.config,
          items: { ...state.config.items, ...updates },
        });
      },

      updateVisuals: (updates: Partial<VisualConfig>) => {
        const state = get();
        state.setConfig({
          ...state.config,
          visuals: { ...state.config.visuals, ...updates },
        });
      },

      // Persistence
      saveConfig: () => {
        set({ isDirty: false });
        // Persist middleware handles localStorage automatically
      },

      loadConfig: () => {
        // Persist middleware loads automatically
        set({ isDirty: false });
      },

      resetToDefaults: () => {
        const state = get();
        state.setConfig(getDefaultConfig());
      },

      // History navigation
      undo: () => {
        const state = get();
        if (state.historyIndex > 0) {
          const newIndex = state.historyIndex - 1;
          const entry = state.history[newIndex];
          if (entry) {
            set({
              config: entry.config,
              historyIndex: newIndex,
              isDirty: true,
            });
          }
        }
      },

      redo: () => {
        const state = get();
        if (state.historyIndex < state.history.length - 1) {
          const newIndex = state.historyIndex + 1;
          const entry = state.history[newIndex];
          if (entry) {
            set({
              config: entry.config,
              historyIndex: newIndex,
              isDirty: true,
            });
          }
        }
      },

      canUndo: () => get().historyIndex > 0,
      canRedo: () => get().historyIndex < get().history.length - 1,

      // Export/Import
      exportConfig: () => {
        return JSON.stringify(get().config, null, 2);
      },

      importConfig: (json: string) => {
        try {
          const parsed = JSON.parse(json) as Partial<GameConfig>;

          // Basic validation
          if (!parsed.version || !parsed.difficulty || !parsed.spawn) {
            Logger.error('Invalid config format');
            return false;
          }

          get().setConfig(parsed as GameConfig);
          return true;
        } catch (error) {
          Logger.error('Failed to parse config JSON:', { error });
          return false;
        }
      },
    }),
    {
      name: STORAGE_KEY,
      partialize: state => ({
        config: state.config,
        history: state.history.slice(-10), // Only persist last 10 history entries
      }),
    }
  )
);

// =============================================================================
// SELECTORS (for performance optimization)
// =============================================================================

export const selectConfig = (state: AdminConfigState) => state.config;
export const selectDifficulty = (state: AdminConfigState) => state.config.difficulty;
export const selectSpawn = (state: AdminConfigState) => state.config.spawn;
export const selectItems = (state: AdminConfigState) => state.config.items;
export const selectVisuals = (state: AdminConfigState) => state.config.visuals;
export const selectIsDirty = (state: AdminConfigState) => state.isDirty;
