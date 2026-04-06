# :Power: Game Session Lifecycle

> **Status** live
> Owner: Core Engineering


## Purpose

This workflow explains how a player moves from the shell into a verified run and back out again.

## 1. Shell bootstrap

`App.tsx` wires surface state, market hooks, player state, pause budget, wallet balance refresh, and identity state before a run can begin.

## 2. Entry gates

A run starts only when all of the following are true:

- the game is still in `MENU`
- a nickname exists
- live market price is available
- `GameStateManager.initializeNewGame(...)` succeeds

If identity is missing or the backend rejects session bootstrap, the flow routes back to onboarding instead of partially starting a run.

## 3. Session start

When the gates pass:

- leverage and side are stored
- `CoinService.resetSession()` clears prior totals
- `GameSessionService.startSession(...)` opens the server-side session
- the app transitions through `GameStateMachine` into `PLAYING`

## 4. In-run ownership

During the run:

- `GameEngine` owns the hot loop
- `GameLoopCoordinator` runs ordered phases each frame
- `useMarketData` keeps market snapshots current
- `TimeService` keeps pause-aware timers coherent

## 5. End-of-run path

Game over, cash-out, and cycle completion all converge on the same rule: runtime state must be reset and difficulty context must not leak into the next run.

Before final verification the client flushes `MarketSyncQueue`, signs the session payload, and submits the result to Railway. Only after that does the app clear active session state and refresh wallet or reward UI.
