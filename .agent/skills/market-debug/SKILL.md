---
name: market-debug
description: Debug BTC/USD price feeds, WebSocket connections, and market-driven difficulty logic
---

# Market Data Debug Skill

Binance/Coinbase WebSocket bağlantılarını ve market-driven oyun mekaniklerini debug et.

## Usage

```
/market-debug [source|logic]
```

## Data Flow Architecture

1. **Backend**: `railway-market-server` exchange'lere bağlanır.
2. **Database**: Fiyatı Supabase `market_state` tablosuna yazar.
3. **Client**: `MarketService.ts` Supabase Realtime ile tabloyu dinler.
4. **Game**: `DifficultyManager.ts` veriyi alıp zorluk çarpanlarını hesaplar.

## Debugging Steps

### 1. WebSocket Status
Check `MarketService.ts` logs:
- `MarketService: Connecting to Supabase Realtime...`
- `MarketService: Received update for BTC/USD`

### 2. Indicator Verification
`DifficultyManager` veriyi doğru işliyor mu?
- **ATR (Volatility)**: Fiyat oynaklığı spawn rate'i etkiliyor mu?
- **Trend**: Fiyat artışı/azalışı düşman hızını etkiliyor mu?

### 3. Manual Override (Testing)
Admin panelinden "Cheat Mode" açarak manuel fiyat/indicator değerleri set et:
```typescript
MarketService.setMockData({ price: 75000, atr: 1.5, trend: 'bull' });
```

## Common Issues

### Data Lag
- **Cause**: Database insertion latency.
- **Check**: Compare client-side timestamp with current time.
- **Fix**: Backend update frequency'yi optimize et.

### Realtime Subscription Dropped
- **Symptom**: Price stops updating in HUD.
- **Check**: Browser Network tab -> WS frames.
- **Fix**: Implement heartbeat/reconnection in `MarketService`.

### Difficulty Calculation Errors
- **Symptom**: Game suddenly becomes impossibly hard or empty.
- **Check**: `DifficultyManager.calculateEffectiveDifficulty()` logic.
- **Fix**: Clamp multipliers between `MIN_DIFF` and `MAX_DIFF`.

## Monitoring Commands

```bash
# Backend loglarını izle
/railway-logs railway-market-server deploy
```

```typescript
// Client-side state kontrolü
console.log(MarketService.getCurrentState());
```

## Code References

- `services/MarketService.ts`: Data acquisition & state.
- `services/DifficultyManager.ts`: Market-to-Game logic.
- `railway-market-server/src/worker.ts`: Backend logic.
