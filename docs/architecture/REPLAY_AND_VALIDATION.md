# :Shield: Replay & Anti-Cheat Validation

> **Status** live

> Owner: Security & Backend Engineering

## Overview

Crypto Survivors relies on a client-authoritative gameplay loop for responsiveness, which introduces inherent security risks. To mitigate cheating, the game implements a robust **Replay Recording** and **Offline Verification Queue** system.

## 1. Replay Recording (`ReplayRecorderService.ts`)

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

To protect the backend from DDOS or memory exhaustion attacks, the system enforces a strict size limit on the encoded replay payload. If the payload exceeds this limit, the replay is discarded, and the session relies purely on the cryptographic signature for validation.

## 2. Cryptographic Signatures

Before a session is submitted for validation, the `VerificationQueueService` generates an **HMAC Signature** of the core session metrics. 

Cryptographic utilities ensure that the core metrics haven't been tampered with in transit between the client and the server.

## 3. The Offline Verification Queue (`VerificationQueue.ts`)

Mobile and desktop players often experience intermittent network drops. If a session ends while the player is offline, or if the server is temporarily unreachable, the session results must not be lost.

**Exponential Backoff**
The `VerificationQueueService` implements an offline queue using local storage. 

If a verification request fails:
1. It is saved to the queue.
2. The service attempts to resend the payload using an **Exponential Backoff** algorithm.
3. Retries are attempted up to a maximum threshold before the session is marked as permanently failed.

**Online/Offline Listeners**
The service actively listens to browser connection events. Processing is suspended when the network drops and resumes automatically when the connection is restored.