# Auth System Architecture

Status: live
Type: current-state architecture
Domain: identity, nickname gating, and backend trust

## Summary

Authentication and identity are currently split across local persistence, Supabase-backed auth helpers, and Railway-owned application data.

The important boundary is simple:

- identity bootstrap may involve Supabase auth flows
- application profile, wallet, leaderboard, and session APIs live on Railway
- gameplay start is still gated by a locally persisted nickname and profile identifier

## Current components

### Client identity state

`UserSessionService` and `UserPersistenceService` own the browser-side identity cache.

Responsibilities:

- store nickname and profile id locally
- provide anonymous fallback ids for pre-login metrics
- support legacy nickname-first flows that still exist in the shell

### Auth providers

`SupabaseAuthService`, `TwitterAuthService`, and `PhantomAuthService` still provide external auth integrations where needed. These services should be treated as sign-in helpers, not as the primary source of gameplay data.

### Railway-backed profile surface

After identity exists, Railway endpoints own the mutable application surface used by the game:

- profile reads and updates
- wallet balance
- session start and verification
- leaderboard and progression endpoints

### Runtime gate

A run only starts when nickname, market readiness, and session bootstrap all succeed. `App.tsx`, `GameStateManager`, and `GameSessionService` enforce that boundary.

## Environment behavior

### Development

Local and dev flows may use fallback identities or mocked session ids so gameplay remains testable without the full backend chain.

### Production

Production flows expect a valid nickname and successful backend session bootstrap. If identity lookup fails, the client routes the player back to onboarding instead of starting a partially trusted run.

## What was removed from the active doc set

Older versions of this document described Supabase RLS, trigger-managed profile creation, and database-era ownership rules as if they were the live runtime. Those details were removed from the active surface because they no longer describe the shipped architecture.

If you need the historical migration context, check `docs/archived/AUTH_MIGRATION_ROADMAP.md`.
