# :Shield: Security Architecture

> **Status** live

> Owner: Security Engineering

Type: runtime security overview
Domain: anti-cheat, verification, and trust boundaries

## Security layers

Crypto Survivors uses multiple overlapping protections instead of relying on a single validator.

**Client-side protections**

`AntiCheatService` provides lightweight local detection for runtime anomalies, debugger manipulation, and value tampering, alongside server-side cheat reporting through Railway APIs when enabled.

These checks raise events and telemetry, but they are not the final authority for rewards.

**Session verification boundary**

The authoritative session flow is handled by Railway-backed endpoints through `GameSessionService`:

- `POST /api/v1/sessions/start`
- `POST /api/v1/sessions/verify`
- `POST /api/v1/sessions/sync`

The client signs the final session payload with the session secret and submits it only after flushing `MarketSyncQueue`.

**Audit trail and replayability**

`MarketSyncQueue` persists market audit batches so a run can still be verified after brief disconnects or offline periods. This queue is a core part of the trust model because it preserves ordered runtime evidence instead of trusting the final summary alone.

**Identity and API boundary**

The project is now centered on Railway-native identity:

- Railway auth routes issue JWTs and own account/profile identity
- Railway backend routes own wallet, profile, leaderboard, and session persistence
- `VerificationQueue` submits to Railway session verification and should remain a migration boundary until all replay/economy flows are unified

**Optional edge hardening**

`useCloudflareSession` and `CloudflareService` add an extra session wrapper when enabled. Treat this as a supplemental protection layer, not a replacement for Railway verification.

## Source of truth

For live operational behavior, trust the code paths below over older roadmaps:

- `services/system/AntiCheatService.ts`
- `services/auth/GameSessionService.ts`
- `services/market/sync/MarketSyncQueue.ts`
- `services/verification/VerificationQueue.ts`
- `hooks/useCloudflareSession.ts`
