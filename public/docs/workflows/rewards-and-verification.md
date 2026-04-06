# :Award: Rewards and Verification

> **Status** live
> Owner: Backend & Data Engineering


## Purpose

This workflow documents how reward feedback, wallet balance, and backend verification fit together.

## 1. Reward calculation

`RewardCalculator` computes reward amounts from survival time, kills, level, PnL, and streak data. `CoinService` owns the provider abstraction and session-local totals.

## 2. Provider behavior

Despite its historical name, `SupabaseCoinProvider` now talks to Railway-backed wallet APIs for balance reads and acts as an optimistic provider for in-run credit events. It does not make the client authoritative for durable rewards.

## 3. Session-local feedback

When a reward event happens, `CoinService.creditCoins(...)` updates session totals and emits UI-facing events immediately. This keeps the run responsive even before server verification completes.

## 4. Verification boundary

Authoritative reward settlement happens only after `GameSessionService.submitSession(...)` sends the signed payload to Railway. The client flushes `MarketSyncQueue` first so the backend sees the ordered audit trail for the run.

## 5. Final balance

Wallet and long-term reward state should be treated as backend-owned. The client may show optimistic session numbers, but a refreshed balance from Railway is the durable source of truth after the run ends.
