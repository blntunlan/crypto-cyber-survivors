# Market Ingestion Runtime

## Purpose

This workflow covers the active gameplay market path used by `useMarketData`.

## 1. Stream source

The client subscribes to Railway market streaming through `SSEMarketService`. The stream carries pair-scoped price and indicator payloads instead of raw exchange messages.

## 2. Runtime normalization

`useMarketData` converts each incoming update into the market shape used by the game. It also tracks timeout thresholds, fallback state, and runtime sequence metadata.

## 3. Optional worker authority

When market runtime mode enables it, `MarketRuntimeController` forwards ticks to a worker. The worker returns deterministic snapshots so the client can compare provisional values with authoritative runtime output.

## 4. Game loop handoff

The resulting market object is fed into `GameEngine`, where hot-path consumers such as `PriceMomentumEngine`, difficulty systems, and portal logic react without forcing React rerenders.

## 5. Audit trail

Runtime tick and snapshot data can be queued through `MarketSyncQueue` so delayed uploads still preserve run ordering. This is important for replayability, reconciliation, and verification workflows.

## 6. Failure handling

The workflow distinguishes between short gaps and fatal disconnects:

- warning thresholds surface UI alerts
- fallback data keeps the run alive during brief gaps
- longer gaps emit timeout events and can escalate to disconnect or game-over flows
