# :Globe: Market Server Infrastructure

> **Status** live

> Owner: Backend & Data Engineering

## Overview

Crypto Survivors relies on live crypto market data to drive game difficulty and weapon performance. To ensure the game can scale to thousands of concurrent players without rate-limiting issues from public exchanges (like Binance), the backend is split into two distinct Node.js services hosted on Railway:

1. **Market Aggregator** (`railway-market-aggregator`)
2. **API Server** (`railway-market-server`)

Both services share the same Railway PostgreSQL database but handle completely different workloads.

## 1. Market Aggregator (`:3002`)

The Aggregator acts as the single source of truth for live market data. It sits between public crypto exchanges and the game clients.

**Responsibilities:**
- **WebSocket Ingestion**: Maintains a single, persistent WebSocket connection to Binance (`BinanceService.ts`).
- **Data Persistence**: Writes the latest tick data to the `market_state` and `price_history` PostgreSQL tables (`PriceLogger.ts`).
- **Client Broadcasting**: Exposes a Server-Sent Events (SSE) endpoint (`/api/v1/market/stream?pair=BTC`). Game clients connect to this endpoint instead of Binance directly. This allows us to serve 10,000 players using only 1 Binance connection.
- **Data Pruning**: Runs a periodic `CleanupCron` to delete outdated `price_history` rows, preventing the database from bloating.

## 2. API Server (`:3001`)

The API Server is the traditional backend for game logic, progression, and security.

**Responsibilities:**
- **Authentication**: Validates Railway-native JWTs and handles Twitter OAuth.
- **Session Verification**: Receives cryptographic payloads from the client (`ReplayRecorderService`), verifies the HMAC signatures, and records valid game sessions.
- **Progression & Economy**: Updates player profiles, wallets (Gold), meta-progression, and daily challenges.
- **Leaderboards**: Serves paginated leaderboard data.

**Rate Limiting & Security**
Because the API Server handles database writes, it is protected by strict Express rate limiters:
- **Global Limiter**: Restricts general request frequency per IP.
- **Write Limiter**: Strict limits on endpoints like `/api/v1/sessions/save` to prevent DB spam.

## Database Topology (Railway PostgreSQL)

Both the Aggregator and API Server connect to the same PostgreSQL database via `pg` connection pools.

- **`market_state`**: A single-row-per-pair table that is constantly `UPSERT`ed by the Aggregator.
- **`price_history`**: An append-only log of historical prices used to calculate technical indicators (RSI, ATR) on the fly.
- **`sessions` / `profiles`**: Managed exclusively by the API Server.

## Flow Summary

1. **Aggregator** pulls BTC data from Binance at 1-second intervals.
2. **Aggregator** saves data to DB and broadcasts to all connected **Game Clients** via SSE.
3. **Game Client** adjusts difficulty and plays the session.
4. **Game Client** finishes the session, signs the payload, and sends it to the **API Server**.
5. **API Server** validates the payload and updates the DB.
