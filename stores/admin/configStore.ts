/**
 * Admin Config Store
 *
 * Zustand store for managing game configuration state
 * Handles persistence, undo/redo, and real-time sync
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Logger } from '../../services/system/Logger';
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

type SpawnUpdates = Partial<Omit<SpawnConfig, 'enemyDistribution'>> & {
  enemyDistribution?: Partial<SpawnConfig['enemyDistribution']>;
};

type ItemUpdates = Partial<Omit<ItemConfig, 'gemValues' | 'powerUpDurations'>> & {
  gemValues?: Partial<ItemConfig['gemValues']>;
  powerUpDurations?: Partial<ItemConfig['powerUpDurations']>;
};

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
  updateSpawn: (updates: SpawnUpdates) => void;
  updateItems: (updates: ItemUpdates) => void;
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
const MAX_PERSISTED_HISTORY = 10;

const ADMIN_DEFAULT_CONFIG_TEMPLATE: GameConfig = {
  version: '1.0.0',
  lastModified: 0,
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
};

type PersistedAdminConfigState = Pick<
  AdminConfigState,
  'config' | 'history' | 'historyIndex'
>;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

const cloneConfig = (config: GameConfig): GameConfig => {
  if (typeof structuredClone === 'function') {
    return structuredClone(config);
  }
  return JSON.parse(JSON.stringify(config)) as GameConfig;
};

const createDefaultConfig = (): GameConfig => ({
  ...cloneConfig(ADMIN_DEFAULT_CONFIG_TEMPLATE),
  lastModified: Date.now(),
});

const stampConfig = (config: GameConfig): GameConfig => ({
  ...cloneConfig(config),
  lastModified: Date.now(),
});

const createHistoryEntry = (
  config: GameConfig,
  description: string
): ConfigHistoryEntry => ({
  timestamp: Date.now(),
  config: cloneConfig(config),
  description,
});

const appendHistory = (
  state: Pick<AdminConfigState, 'history' | 'historyIndex' | 'maxHistorySize'>,
  config: GameConfig,
  description: string
): Pick<AdminConfigState, 'history' | 'historyIndex'> => {
  const pastHistory = state.history.slice(0, state.historyIndex + 1);
  const historyWithNewEntry = [...pastHistory, createHistoryEntry(config, description)];
  const overflowCount = Math.max(historyWithNewEntry.length - state.maxHistorySize, 0);
  const trimmedHistory =
    overflowCount > 0 ? historyWithNewEntry.slice(overflowCount) : historyWithNewEntry;

  return {
    history: trimmedHistory,
    historyIndex: trimmedHistory.length - 1,
  };
};

const mergeConfigWithDefaults = (partial: Partial<GameConfig>): GameConfig => {
  const defaults = createDefaultConfig();

  return {
    ...defaults,
    ...partial,
    version: typeof partial.version === 'string' ? partial.version : defaults.version,
    lastModified: Date.now(),
    difficulty: {
      ...defaults.difficulty,
      ...(partial.difficulty ?? {}),
    },
    spawn: {
      ...defaults.spawn,
      ...(partial.spawn ?? {}),
      enemyDistribution: {
        ...defaults.spawn.enemyDistribution,
        ...(partial.spawn?.enemyDistribution ?? {}),
      },
    },
    items: {
      ...defaults.items,
      ...(partial.items ?? {}),
      gemValues: {
        ...defaults.items.gemValues,
        ...(partial.items?.gemValues ?? {}),
      },
      powerUpDurations: {
        ...defaults.items.powerUpDurations,
        ...(partial.items?.powerUpDurations ?? {}),
      },
    },
    visuals: {
      ...defaults.visuals,
      ...(partial.visuals ?? {}),
    },
  };
};

const isImportShapeValid = (value: unknown): value is Partial<GameConfig> =>
  isRecord(value) &&
  typeof value.version === 'string' &&
  isRecord(value.difficulty) &&
  isRecord(value.spawn);

const normalizePersistedHistory = (history: unknown): ConfigHistoryEntry[] => {
  if (!Array.isArray(history)) return [];

  return history
    .map(entry => {
      if (!isRecord(entry) || !isRecord(entry.config)) return null;

      return {
        timestamp: typeof entry.timestamp === 'number' ? entry.timestamp : Date.now(),
        description:
          typeof entry.description === 'string' ? entry.description : 'Config update',
        config: mergeConfigWithDefaults(entry.config as Partial<GameConfig>),
      } satisfies ConfigHistoryEntry;
    })
    .filter((entry): entry is ConfigHistoryEntry => entry !== null);
};

const createInitialState = (): Pick<
  AdminConfigState,
  'config' | 'isDirty' | 'history' | 'historyIndex' | 'maxHistorySize'
> => {
  const initialConfig = createDefaultConfig();
  return {
    config: initialConfig,
    isDirty: false,
    history: [createHistoryEntry(initialConfig, 'Initial state')],
    historyIndex: 0,
    maxHistorySize: 50,
  };
};

export const useAdminConfigStore = create<AdminConfigState>()(
  persist(
    (set, get) => {
      const applyConfigUpdate = (
        state: Pick<AdminConfigState, 'history' | 'historyIndex' | 'maxHistorySize'>,
        config: GameConfig,
        description: string
      ): Pick<AdminConfigState, 'config' | 'isDirty' | 'history' | 'historyIndex'> => {
        const stamped = stampConfig(config);
        const nextHistory = appendHistory(state, stamped, description);

        return {
          config: stamped,
          isDirty: true,
          ...nextHistory,
        };
      };

      return {
        ...createInitialState(),

        // Set entire config
        setConfig: (config: GameConfig) =>
          set(state => applyConfigUpdate(state, config, 'Config update')),

        // Partial updates
        updateDifficulty: (updates: Partial<DifficultyConfig>) =>
          set(state =>
            applyConfigUpdate(
              state,
              {
                ...state.config,
                difficulty: { ...state.config.difficulty, ...updates },
              },
              'Difficulty update'
            )
          ),

        updateSpawn: (updates: SpawnUpdates) =>
          set(state =>
            applyConfigUpdate(
              state,
              {
                ...state.config,
                spawn: {
                  ...state.config.spawn,
                  ...updates,
                  enemyDistribution: {
                    ...state.config.spawn.enemyDistribution,
                    ...(updates.enemyDistribution ?? {}),
                  },
                },
              },
              'Spawn update'
            )
          ),

        updateItems: (updates: ItemUpdates) =>
          set(state =>
            applyConfigUpdate(
              state,
              {
                ...state.config,
                items: {
                  ...state.config.items,
                  ...updates,
                  gemValues: {
                    ...state.config.items.gemValues,
                    ...(updates.gemValues ?? {}),
                  },
                  powerUpDurations: {
                    ...state.config.items.powerUpDurations,
                    ...(updates.powerUpDurations ?? {}),
                  },
                },
              },
              'Items update'
            )
          ),

        updateVisuals: (updates: Partial<VisualConfig>) =>
          set(state =>
            applyConfigUpdate(
              state,
              {
                ...state.config,
                visuals: { ...state.config.visuals, ...updates },
              },
              'Visuals update'
            )
          ),

        // Persistence
        saveConfig: () => {
          set({ isDirty: false });
          // Persist middleware handles localStorage automatically
        },

        loadConfig: () => {
          // Persist middleware loads automatically
          set({ isDirty: false });
        },

        resetToDefaults: () =>
          set(state =>
            applyConfigUpdate(state, createDefaultConfig(), 'Reset to defaults')
          ),

        // History navigation
        undo: () =>
          set(state => {
            if (state.historyIndex <= 0) return state;

            const newIndex = state.historyIndex - 1;
            const entry = state.history[newIndex];
            if (!entry) return state;

            return {
              config: cloneConfig(entry.config),
              historyIndex: newIndex,
              isDirty: true,
            };
          }),

        redo: () =>
          set(state => {
            if (state.historyIndex >= state.history.length - 1) return state;

            const newIndex = state.historyIndex + 1;
            const entry = state.history[newIndex];
            if (!entry) return state;

            return {
              config: cloneConfig(entry.config),
              historyIndex: newIndex,
              isDirty: true,
            };
          }),

        canUndo: () => get().historyIndex > 0,
        canRedo: () => get().historyIndex < get().history.length - 1,

        // Export/Import
        exportConfig: () => {
          return JSON.stringify(cloneConfig(get().config), null, 2);
        },

        importConfig: (json: string) => {
          try {
            const parsed = JSON.parse(json) as unknown;

            // Basic validation
            if (!isImportShapeValid(parsed)) {
              Logger.error('Invalid config format');
              return false;
            }

            const normalized = mergeConfigWithDefaults(parsed);
            set(state => applyConfigUpdate(state, normalized, 'Imported config'));
            return true;
          } catch (error) {
            Logger.error('Failed to parse config JSON:', { error });
            return false;
          }
        },
      };
    },
    {
      name: STORAGE_KEY,
      partialize: state => {
        const trimmedHistory = state.history.slice(-MAX_PERSISTED_HISTORY);
        const trimOffset = Math.max(state.history.length - MAX_PERSISTED_HISTORY, 0);
        const trimmedHistoryIndex = Math.max(0, state.historyIndex - trimOffset);

        return {
          config: state.config,
          history: trimmedHistory,
          historyIndex: trimmedHistoryIndex,
        } satisfies PersistedAdminConfigState;
      },
      merge: (persistedState, currentState) => {
        const persisted = persistedState as
          | Partial<PersistedAdminConfigState>
          | undefined;
        if (!persisted) {
          return currentState;
        }

        const fallbackConfig = currentState.config;
        const normalizedConfig = persisted.config
          ? mergeConfigWithDefaults(persisted.config)
          : fallbackConfig;

        const normalizedHistory = normalizePersistedHistory(persisted.history);
        const history =
          normalizedHistory.length > 0
            ? normalizedHistory
            : [createHistoryEntry(normalizedConfig, 'Recovered state')];

        const maxIndex = history.length - 1;
        const requestedIndex =
          typeof persisted.historyIndex === 'number'
            ? persisted.historyIndex
            : maxIndex;
        const safeIndex = Math.min(Math.max(requestedIndex, 0), maxIndex);
        const activeConfig = history[safeIndex]?.config ?? normalizedConfig;

        return {
          ...currentState,
          config: cloneConfig(activeConfig),
          history,
          historyIndex: safeIndex,
          isDirty: false,
        };
      },
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
