import { type StateCreator } from 'zustand';
import { nanoid } from 'nanoid';

export interface SessionInfo {
  sessionId: string;
  startTime: number;
  gamesThisSession: number;
}

export const createNewSession = (): SessionInfo => ({
  sessionId: nanoid(),
  startTime: Date.now(),
  gamesThisSession: 0,
});

export interface SessionActions {
  startNewSession: () => void;
  incrementGamesPlayed: () => void;
}

export interface SessionSlice extends SessionActions {
  session: SessionInfo;
}

export const createSessionSlice: StateCreator<SessionSlice> = (set) => ({
  session: createNewSession(),

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
});
