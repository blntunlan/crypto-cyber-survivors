# :Shield: Replay & Anti-Cheat Validation

> **Status** live

> Owner: Security & Backend Engineering

## Overview

Crypto Survivors relies on a client-authoritative gameplay loop for responsiveness, which introduces inherent security risks. To mitigate cheating, the game implements a robust **Replay Recording** and **Offline Verification Queue** system.

## Active Beta Contract

| Concern | Contract |
|---|---|
| Save endpoint | `POST /api/v1/replays/save` |
| Auth | Railway bearer token required |
| Session relation | Replay save is accepted only after the referenced session belongs to the caller and `sessions.is_verified = true` |
| Payload format | `replayData` is base64 JSON playback data from `ReplayRecorderService` |
| Size limit | Decoded replay payload must be `<= 500000` bytes before DB access |
| Persistence | Replay is stored in Railway PostgreSQL `game_replays.replay_data` as `BYTEA`; no object storage upload is active for beta |
| Idempotency | `game_replays.session_id` is unique; duplicate save returns `409` |
| Pruning | DB trigger `after_replay_insert` runs `prune_old_replays()` and keeps top 5 replays per player |
| Reward authority | Replay data is not part of the reward HMAC and does not credit coins |

The beta decision is explicit: replay storage is an optional post-verification artifact. Reward verification remains owned by `POST /api/v1/sessions/verify`; replay save happens after authoritative verification succeeds and can fail without changing wallet, ledger, or session verification state.

## Replay Recording

The `ReplayRecorderService` runs continuously during an active game session, capturing crucial state data without impacting the 60 FPS render loop.

**Snapshot Logic**
The engine periodically records `PlaybackSnapshot`s containing:
- Player coordinates
- Health Points
- Current level

**Event Logging**
Critical moments are logged as discrete `PlaybackEvent`s:
- Enemy Kills
- Level Ups
- Weapon Acquisitions

**Compression & Payload Limits**
When the game ends, the recorded snapshots and events are bundled into a `PlaybackData` object and encoded. 

To protect the backend from DDOS or memory exhaustion attacks, the client skips save when the encoded replay exceeds `500000` characters. The backend also decodes the submitted base64 payload and rejects payloads over `500000` bytes with `413` before DB access.

## Replay API Failure Modes

| Case | Response | Effect |
|---|---|---|
| Missing `sessionId`, `replayData`, `pair`, or `position` | `400` | No DB write |
| Missing/invalid auth | `401` | No DB write |
| Profile missing | `404` | No DB write |
| Decoded replay over `500000` bytes | `413` | No DB write |
| Session not owned by caller | `403` | No DB write |
| Session owned but not verified | `409` | No DB write |
| Replay already exists for session | `409` | Existing replay remains |
| Insert or DB failure | `500` | Client logs warning; reward/session state stays unchanged |

`ReplayRecorderService.saveReplay()` catches save failures and emits only a warning. This is intentional for beta because replay storage is valuable for playback and audit, but not required for reward settlement.

## Cryptographic Signatures

Before a session is submitted for validation, the `VerificationQueueService` generates an **HMAC Signature** of the core session metrics. 

Cryptographic utilities ensure that the core metrics haven't been tampered with in transit between the client and the server.

Replay payload is not included in the authoritative reward HMAC. The signed verification payload carries core run facts such as session id, pair, position, leverage, entry/exit price, PnL, kills, level, survival seconds, exit type, portal type, and max streak. Replay save only references the verified `sessionId`.

## Offline Verification Queue

Mobile and desktop players often experience intermittent network drops. If a session ends while the player is offline, or if the server is temporarily unreachable, the session results must not be lost.

**Exponential Backoff**
The `VerificationQueueService` implements an offline queue using local storage. 

If a verification request fails:
1. It is saved to the queue.
2. The service attempts to resend the payload using an **Exponential Backoff** algorithm.
3. Retries are attempted up to a maximum threshold before the session is marked as permanently failed.

**Online/Offline Listeners**
The service actively listens to browser connection events. Processing is suspended when the network drops and resumes automatically when the connection is restored.

## Beta Acceptance

- `ReplayRecorderService.saveReplay()` is called only when session submission returns `success` and `verified`.
- Backend rejects unverified session replay saves with `409`.
- Backend rejects oversized decoded replay payloads with `413` before DB access.
- Backend returns `409` for duplicate replay save attempts.
- Public replay download returns base64 `replayData` for `ReplayPlayerService.loadReplayFromServer()`.
- Replay save failure does not mutate `sessions`, `virtual_accounts`, or `ledger`.
