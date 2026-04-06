# :Activity: MarketService

> **Status** live
> Owner: Data Engineering


Type: service adapter
Domain: market connectivity

## What this service is now

`services/market/MarketService.ts` is the direct exchange WebSocket adapter for Binance and Coinbase. It is still useful for admin tooling, diagnostics, and test coverage, but the main gameplay path now consumes Railway-delivered data through `SSEMarketService` in `hooks/useMarketData.ts`.

## Responsibilities

- connect to Binance as the primary stream
- fail over to Coinbase when the primary feed is unhealthy
- monitor heartbeat and data gaps
- expose connection status to callers
- emit fallback price updates from the last healthy sample when short gaps occur

## Important runtime behavior

**Data gap monitor**

The service tracks `lastPriceTime`, `disconnectStartTime`, and `fatalDisconnectEmitted`.

- After 5 seconds without data, fallback mode can reuse the last known price.
- After 15 seconds without recovery, the disconnect is treated as fatal for consumers that care.
- Visibility handling uses a grace period before pausing sockets so quick tab switches do not churn connections.

**Status contract**

Callers can subscribe to a `ConnectionStatus` object containing:

- Binance and Coinbase connection states
- last price time
- total disconnect duration
- whether fallback data is currently being used

## Relationship to gameplay runtime

Gameplay no longer reads a `priceUpdated` EventBus broadcast from this service. Instead:

- `hooks/useMarketData.ts` uses `SSEMarketService`
- worker-backed runtime snapshots are coordinated by `MarketRuntimeController`
- `GameEngine` consumes the resulting `marketData` object and emits `gameMarketUpdate` for hot-loop subscribers

Use `MarketService` when you need direct exchange sockets. Use `SSEMarketService` and the runtime pipeline when you need gameplay-authoritative market data.
