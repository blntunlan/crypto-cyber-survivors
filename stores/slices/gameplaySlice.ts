import { type StateCreator } from 'zustand';

export interface GameplaySettings {
  dashKey: 'space' | 'shift';
  autoFire: boolean;
  showTutorialHints: boolean;
}

export const DEFAULT_GAMEPLAY: GameplaySettings = {
  dashKey: 'space',
  autoFire: true,
  showTutorialHints: true,
};

export interface GameplayActions {
  markTutorialSeen: () => void;
  setGameplaySetting: <K extends keyof GameplaySettings>(
    key: K,
    value: GameplaySettings[K]
  ) => void;
}

export interface GameplaySlice extends GameplayActions {
  gameplay: GameplaySettings;
  hasSeenTutorial: boolean;
  lastPlayedVersion: string;
}

export const createGameplaySlice: StateCreator<GameplaySlice> = set => ({
  gameplay: DEFAULT_GAMEPLAY,
  hasSeenTutorial: false,
  lastPlayedVersion: '0.0.0',

  markTutorialSeen: () =>
    set({
      hasSeenTutorial: true,
    }),

  setGameplaySetting: (key, value) =>
    set(state => ({
      gameplay: { ...state.gameplay, [key]: value },
    })),
});
