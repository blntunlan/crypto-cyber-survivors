# System Overview

Status: live

## Runtime shape

Crypto Survivors is a React + Canvas action game whose live difficulty comes from market data. The runtime is split into four layers:

1. Shell and routing: `App.tsx`, `GameStateMachine`, onboarding, wallet refresh, and screen routing.
2. Hot loop: `components/GameEngine.tsx` runs the phase-based RAF loop.
3. Services: combat, difficulty, market, gameplay, auth, metrics, and sync services.
4. Persistence and backend APIs: Railway session and telemetry endpoints, IndexedDB/localStorage queues, and Supabase auth-only integrations that still exist in selected flows.

## Boot and session gating

`App.tsx` initializes market hooks, player state, theme, pause budget, and identity state before a run can start. The start flow is intentionally gated by:

- nickname availability from `UserSessionService`
- live market price readiness from `useMarketData`
- successful `GameStateManager.initializeNewGame(...)`
- a valid `GameStateMachine` transition into `PLAYING`

This keeps onboarding, session creation, and run reset logic in one place instead of spreading it across UI screens.

## Hot loop ownership

`components/GameEngine.tsx` owns the per-frame update path. The loop is coordinated through `GameLoopCoordinator`, which runs deterministic phases in order:

1. difficulty
2. input
3. combat
4. spawn
5. physics
6. effects
7. portal
8. metrics

The loop shares mutable refs and preallocated state so React does not rerender at 60 FPS.

## Market ingestion

The gameplay path no longer consumes raw exchange sockets directly. `hooks/useMarketData.ts` uses `SSEMarketService` for Railway-delivered ticks, optional worker-backed runtime snapshots, and timeout escalation. `services/market/MarketService.ts` still exists as the direct WebSocket adapter used by admin tooling and tests.

The market pipeline feeds:

- live price and indicators into the HUD
- `PriceMomentumEngine` and difficulty inputs
- runtime snapshot checksums and sequence numbers
- `MarketSyncQueue` so offline or delayed writes can still be flushed in order

## Difficulty pipeline

Difficulty comes from a rule-based stack, not the older neural director docs.

- `difficultyContext` stores mutable, hot-path inputs.
- `FlowStateManager` tracks engagement and frustration signals.
- `UnifiedDirector` applies ordered rules and smoothing to shared outputs.
- `DifficultyManager` maps those outputs into concrete spawn, HP, damage, and reward multipliers consumed by the loop.

## Rewards and verification

Reward state is intentionally split:

- `CoinService` tracks local session totals and calls a provider.
- `SupabaseCoinProvider` now acts as a Railway-backed optimistic provider despite its historical name.
- `GameSessionService` starts and verifies runs with Railway session endpoints.
- `MarketSyncQueue` is flushed before verification so the backend sees a complete audit trail.

This means the client can show immediate reward feedback while the server remains the source of truth for verified rewards.
