# 🎮 Crypto Cyber Survivors - Cascade Rules

> Project context and coding guidelines for Cascade AI assistant.

## 📋 Project Overview

**Crypto Cyber Survivors** is a Vampire Survivors-style game with real-time cryptocurrency market integration.

| Technology | Version |
|------------|---------|
| React | 19.x |
| TypeScript | 5.8+ (strict mode) |
| Vite | 6.x |
| Zustand | 5.x |
| Vitest | 4.x |
| Playwright | 1.57+ |

## 🛠️ Common Commands

```bash
# Development
npm run dev              # Start dev server (port 3000)
npm run build            # Production build

# Testing
npm run test             # Run Vitest unit tests
npm run test:watch       # Watch mode
npm run test:coverage    # Coverage report
npm run test:e2e         # Playwright E2E tests

# Code Quality
npm run lint             # ESLint check
npm run lint:fix         # Auto-fix lint issues
npm run format           # Prettier formatting
```

## 📁 Project Structure

```
├── App.tsx                    # Main application component
├── components/                # React components
│   ├── GameEngine.tsx        # Canvas render loop
│   ├── GameUI.tsx            # Responsive HUD overlay
│   ├── screens/              # Menu screens
│   └── mobile/               # Touch controls
├── services/                  # Singleton services
│   ├── EventBus.ts           # Type-safe event system
│   ├── MarketService.ts      # WebSocket price feeds
│   ├── DifficultyManager.ts  # Market-based difficulty
│   ├── PoolManager.ts        # Object pooling
│   └── renderers/            # Canvas renderers
├── hooks/                     # Custom React hooks
├── stores/                    # Zustand state
├── types/                     # TypeScript definitions
├── tests/                     # Vitest tests
└── e2e/                       # Playwright E2E tests
```

## ✅ Coding Standards

### TypeScript
- **Strict mode enabled** - All parameters and returns must be typed
- **No `any`** - Use proper types or `unknown` with type guards
- **camelCase** for variables/functions
- **PascalCase** for classes, interfaces, types

### React Patterns
- **Functional components only** - No class components
- **Custom hooks** - Extract reusable logic to `use*` hooks
- **Zustand** - Global state management (not Redux)
- **Framer Motion** - For animations

### Service Architecture
- **Singleton pattern** - All services export singleton instances
- **EventBus** - Inter-service communication via `EventBus.emit()`
- **gameReset event** - Subscribe to reset state on new game

```typescript
// Example: Service pattern
class MyServiceClass {
  private static instance: MyServiceClass | null = null;
  
  static getInstance(): MyServiceClass {
    return (MyServiceClass.instance ??= new MyServiceClass());
  }
}

export const MyService = MyServiceClass.getInstance();
```

## 🧪 Testing Rules

### Unit Tests (Vitest)
- Location: `tests/` folder or `*.test.ts`
- Use `vi.mock()` for mocking
- Minimum 80% coverage for new features

### E2E Tests (Playwright)
- Location: `e2e/` folder
- Run headless by default
- Test critical user flows

## ⛔ DO NOT

1. ❌ Modify `dist/`, `node_modules/`, `.git/`
2. ❌ Use `eval()` or `exec()`
3. ❌ Hardcode API keys or secrets
4. ❌ Commit `.env*` files
5. ❌ Use bare `catch` without specific error handling
6. ❌ Use global variables - use Zustand or singleton services
7. ❌ Use `console.log` - use `Logger.info/warn/error`

## ✅ MUST DO

1. ✅ Write JSDoc for all public methods
2. ✅ Write tests for new features (min 80% coverage)
3. ✅ Use conventional commits: `feat:`, `fix:`, `docs:`, `test:`
4. ✅ Ensure `npm run lint` passes with 0 errors
5. ✅ Type-safe code - avoid `any`
6. ✅ Subscribe to `gameReset` event for state cleanup

## 🔌 Integrations

### Supabase
- Tables: `players`, `game_sessions`, `player_wallets`, `leaderboard`
- Edge Functions: `verify-game`, `submit-score`
- RLS enabled on all tables

### WebSocket Feeds
- **Binance** (primary): `wss://stream.binance.com:9443/ws/btcusdt@kline_1m`
- **Coinbase** (fallback): `wss://ws-feed.exchange.coinbase.com`

## 📊 Performance Targets

| Metric | Target |
|--------|--------|
| FPS | 60 (mobile & desktop) |
| Bundle Size | < 500KB gzipped |
| Build Time | < 30 seconds |
| Test Suite | < 60 seconds |

## 🔍 Debug Tools

- **Admin Dashboard**: `Ctrl+Shift+A`
- **Logger**: `Logger.info()`, `Logger.warn()`, `Logger.error()`
- **FPS Monitor**: Displayed on canvas
- **Cheat Manager**: Active in development mode

## 📝 Available Workflows

Located in `.agent/workflows/`:
- `/code-review` - Comprehensive codebase review
- `/debug-push` - Test, lint, commit, and push

---

*Cascade reads this file to understand project conventions and coding standards.*
