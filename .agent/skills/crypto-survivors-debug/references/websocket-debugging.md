# WebSocket Debugging Reference

This guide provides specialized patterns for debugging WebSocket connection issues in the Crypto Survivors project.

## 1. Diagnostic Indicators

### Connection States
- `disconnected`: The default state or transition after `disconnect()`
- `connecting`: Handshake in progress
- `connected`: Active data flow
- `reconnecting`: Attempting to re-establish connection after failure

### Common Symptoms
- **Constant Reconnecting**: Exponential backoff triggers but fails immediately.
- **Silent Failure**: Connection shows `connected` but `onmessage` is never called.
- **Parsing Errors**: Data arrives but fails schema validation (check `marketSchemas.ts`).
- **Mixed Content/CORS**: Browser blocks connection (usually environment-related).

## 2. MarketService Debugging

### Trace Logging
Enable debug logs for `MarketService`:
```typescript
import { Logger } from './Logger';
Logger.setLogLevel('debug'); // To see "Ignoring message for wrong pair"
```

### Manual Reconnect Trigger
From the browser console or Admin Dashboard:
```javascript
// Access via singleton if available
window.marketService.reconnect();
```

## 3. External Feed Verification

### Binance
- **Base URL**: `wss://stream.binance.com:9443/ws`
- **Stream Format**: `<symbol>@trade` or `<symbol>@kline_<interval>`
- **Test Command**: `wscat -c wss://stream.binance.com:9443/ws/btcusdt@trade`

### Coinbase
- **Base URL**: `wss://ws-feed.exchange.coinbase.com`
- **Subscription Required**: Needs a `subscribe` message after `onopen`.
- **Test Command**: `wscat -c wss://ws-feed.exchange.coinbase.com` -> then send `{"type": "subscribe", "product_ids": ["BTC-USD"], "channels": ["ticker"]}`

## 4. Reconnection Logic Logic
The project uses exponential backoff:
- `INITIAL_DELAY`: 1000ms
- `MULTIPLIER`: 2x
- `MAX_DELAY`: 30000ms

If stuck in a loop, verify `wasClosedIntentionally` flag is not preventing reconnection erroneously.

## 5. Tab Visibility Interaction
`MarketService` automatically pauses connections when the tab is hidden to save bandwidth.
- **Check**: Is `document.hidden` true?
- **Debug**: Check `visibilitychange` listener activation.

## 6. Common Fixes
1. **URL Update**: Check `constants.ts` for updated WS endpoints.
2. **Schema Update**: Ensure `parseBinanceData` and `parseCoinbaseData` match the current API response format.
3. **Environment Variables**: Ensure `VITE_WS_ENABLED` is not set to `false`.
