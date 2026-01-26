---
name: Error Handling System
description: Guidelines and tools for implementing robust error handling, reporting, and recovery in Crypto Survivors.
---

# 🛡️ Error Handling System Skill

This skill provides a comprehensive framework for managing errors across the Crypto Survivors application. It ensures that errors are caught, logged, reported, and recovered from without crashing the user experience.

## 📋 Core Principles

1.  **Never Crash**: Use `ErrorBoundary` to isolate UI failures.
2.  **Report & Log**: Every catch block must use `Logger.error`.
3.  **Recover Gracefully**: Use `ErrorRecoveryService` for network/socket issues.
4.  **Inform the User**: Use `EventBus.emit('gameNotification', ...)` for user-facing errors.
5.  **Secure by Default**: Log security-related "errors" via `AntiCheatService`.

---

## 🛠️ Key Components

### 1. Logger Service (`services/Logger.ts`)
The central hub for all logs. Use it for everything from debug tracing to critical errors.
- `Logger.debug/info/warn/error(message, data?)`
- **Hook into it**: `Logger.onError((msg, err) => { ... })` for global tracking.

### 2. Error Recovery Service (`services/ErrorRecoveryService.ts`)
Handles automated recovery strategies with exponential backoff.
- **WebSocket Reconnection**: Automatically triggered on `marketDataTimeout`.
- **Connectivity Changes**: Listens to browser `online`/`offline` events.

### 3. React Error Boundary (`components/ErrorBoundary.tsx`)
Wraps major layout components (like `App.tsx`) to catch rendering errors.
- Styled with "LIQUIDATED" theme to match the game's aesthetic.

---

## 🚀 Implementation Patterns

### 🔹 1. Async Data Fetching
Always wrap external API/database calls in try-catch and report to the recovery service if it's a transient failure.

```typescript
try {
  const data = await supabase.from('...').select();
} catch (err) {
  Logger.error('[Service] Failed to fetch data', err);
  ErrorRecoveryService.reportError('MyService.fetch', err);
}
```

### 🔹 2. UI Action Feedback
When an action fails (e.g., "Purchase Failed"), notify the user immediately.

```typescript
const handleAction = async () => {
  try {
    await service.execute();
  } catch (err) {
    EventBus.emit('gameNotification', {
      title: 'Action Failed',
      message: 'Insuficient funds or connection error.',
      type: 'error'
    });
  }
};
```

### 🔹 3. WebSocket / Real-time Streams
Do not just let them die. Emit a timeout or error event let the `ErrorRecoveryService` handle it.

```typescript
socket.onerror = (err) => {
  Logger.error('WS Error', err);
  EventBus.emit('marketDataTimeout', { source: 'Binance' });
};
```

---

## 🔍 Audit Checklist for New Features

- [ ] Does it have a try-catch for async operations?
- [ ] Are errors logged via `Logger.error`?
- [ ] If it's a critical UI section, is it wrapped in an `ErrorBoundary`?
- [ ] If it depends on network, does it have a retry/recovery path?
- [ ] Is the user notified if an operation they initiated fails?

## 🚨 Troubleshooting Common Errors

| Error | Root Cause | Solution |
|-------|------------|----------|
| `Blank Screen` | Syntax error or failed lazy-load | Check browser console; Ensure all constants are exported. |
| `Market Disconnected` | WebSocket drop | `ErrorRecoveryService` will auto-retry. Check `MarketService` logs. |
| `Supabase 403` | RLS Policy violation | Check `supabase/migrations` for missing policies. |
| `Zustand State Mismatch` | Non-serializable data | Only store primitives/POJOs in Zustand stores. |

---

*Last Updated: 2026-01-24*
