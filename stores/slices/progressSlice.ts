import { type StateCreator } from 'zustand';

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

export const DEFAULT_PROGRESS: PlayerProgress = {
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

export interface ProgressActions {
  recordGameEnd: (
    score: number,
    level: number,
    survivalTime: number,
    kills: number
  ) => void;
  addCardCollected: (cardId: string) => void;
  unlockAchievement: (achievementId: string) => void;
  resetProgress: () => void;
}

export interface ProgressSlice extends ProgressActions {
  progress: PlayerProgress;
}

export const createProgressSlice: StateCreator<ProgressSlice> = (set) => ({
  progress: DEFAULT_PROGRESS,

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
});
