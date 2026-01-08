# Context Pattern Refactoring Plan

This document outlines the plan to refactor key application systems using the React Context Pattern. The goal is to improve state management, reduce "prop drilling," and increase code modularity and testability.

## Why Context Pattern?

Currently, the application relies heavily on:
1.  **Static Singletons**: (e.g., `UserSessionService`, `AudioService`) which are not naturally reactive in React components.
2.  **Prop Drilling**: Passing state (like `marketData`, `playerStats`, `gameStatus`) from `App.tsx` down through multiple layers of components.
3.  **Local State in Root**: `App.tsx` manages too much state, making it complex and hard to maintain.

Adapting these into Context Providers will allow any component to access the data it needs via a simple hook (e.g., `useAudio()`), automatically triggering re-renders only when relevant data changes.

---

## 1. UserSession Context (Priority: High)
**Current State:** `UserSessionService` is a static class accessing `localStorage`. Components check `hasStoredUser()` imperatively or rely on `useAppInitialization` to set a one-time boolean.
**Refactor Goal:** Create `UserProvider` and `useUser` hook.

### Proposed Interface
```typescript
interface UserContextType {
  user: StoredUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (nickname: string) => Promise<void>;
  logout: () => void;
  updateLastSeen: () => Promise<void>;
}
```

### Benefits
-   Reactive user state (UI updates immediately upon login/logout).
-   Centralized auth logic (loading states, error handling).
-   Easier integration with Supabase (future proofing).

---

## 2. Audio Context (Priority: Medium)
**Current State:** `AudioService` is a singleton. `App.tsx` manages `isMuted` state locally. Components import `audio` directly.
**Refactor Goal:** Create `AudioProvider` and `useAudio` hook.

### Proposed Interface
```typescript
interface AudioContextType {
  isMuted: boolean;
  masterVolume: number;
  toggleMute: () => void;
  setVolume: (vol: number) => void;
  playSound: (id: string) => void;
  playMusic: (trackId: string) => void;
}
```

### Benefits
-   Global volume/mute control available anywhere (e.g., `SettingsPanel`, `PauseMenu`).
-   Decouples components from the specific audio implementation (Howler/Synth).

---

## 3. Game State Context (Priority: High - Complex)
**Current State:** `App.tsx` holds `gameStatus`, `marketData`, `position`, `playerStats`, etc., and passes them to `GameEngine` and `GameUI`.
**Refactor Goal:** Create `GameProvider`.

### Proposed Interface
```typescript
interface GameContextType {
  status: GameStatus;
  market: MarketData;
  player: PlayerStats;
  controls: {
    startGame: (options: GameOptions) => void;
    pauseGame: () => void;
    resumeGame: () => void;
    endGame: (reason: string) => void;
  };
}
```

### Benefits
-   Drastically cleans up `App.tsx`.
-   `GameUI` can access `marketData` directly without it being passed down.
-   `MainMenu` can access `startGame` without prop drilling.

---

## 4. Settings Context (Priority: Medium)
**Current State:** Settings like `isRetro` are in `ThemeContext`. Other settings (graphics, controls) are likely local or scattered.
**Refactor Goal:** Expand `ThemeContext` into a broader `SettingsContext` or keep separate.

### Proposed Interface
```typescript
interface SettingsContextType {
  theme: 'retro' | 'cyberpunk';
  graphicsQuality: 'low' | 'high';
  showDebug: boolean;
  audioSettings: AudioConfig; // or handled by AudioContext
  updateSetting: (key: string, value: any) => void;
}
```

---

## Refactoring Roadmap

1.  **Phase 1: Foundation (User & Audio)**
    -   Implement `UserContext`.
    -   Refactor `NicknameEntryScreen` and `MainMenu` to use `useUser`.
    -   Implement `AudioContext`.
    -   Refactor `PauseMenu` and `SettingsPanel` to use `useAudio`.

2.  **Phase 2: Core Gameplay (Game Context)**
    -   Move `useMarketData`, `usePlayerState`, `useGameStatus` logic inside `GameProvider`.
    -   Wrap `GameEngine` and `GameUI` with `GameProvider`.
    -   Remove props from `App.tsx`.

3.  **Phase 3: Cleanup**
    -   Remove static service usage where Context is now used.
    -   Update tests to wrap components in appropriate Providers.

