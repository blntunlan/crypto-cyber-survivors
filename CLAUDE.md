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
│   ├── GameHUD.tsx           # In-game UI overlay (Legacy)
│   ├── GameUI.tsx            # Responsive React HUD (Main)
│   ├── hub/                  # Hub/Menu components
│   ├── hud/                  # Modular HUD components
│   ├── screens/              # Game screens (Main, Hub, etc.)
│   ├── admin/                # Admin dashboard panels
│   └── mobile/               # Touch controls
├── services/                  # Singleton services
│   ├── MarketService.ts      # Price feeds & fallback logic
│   ├── PhysicsSystem.ts      # Collision detection
│   ├── DifficultyManager.ts  # Market-based difficulty logic
│   ├── EventBus.ts           # Type-safe event system
│   ├── PoolManager.ts        # O(1) Object pooling
│   ├── AntiCheatService.ts   # Security & validation
│   ├── analytics/            # Global metrics
│   ├── renderers/            # Canvas renderers
│   └── metrics/              # Performance & data analysis
├── hooks/                     # Custom React hooks
├── stores/                    # Zustand state management
├── types/                     # TypeScript & Supabase types
├── tests/                     # Vitest unit & integration tests
├── e2e/                       # Playwright E2E tests
├── supabase/                  # Migrations & Edge Functions
└── railway-market-server/     # Price logger backend
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

## 🧪 Testing Rules

### Unit Tests (Vitest)
- Location: `tests/` folder or `*.test.ts`
- Use `vi.mock()` for mocking
- Minimum 80% coverage for new features

### E2E Tests (Playwright)
- Location: `e2e/` folder
- Run headless by default (CI/CD compatible)

## ⛔ DO NOT

1. ❌ Modify `dist/`, `node_modules/`, `.git/`
2. ❌ Use `eval()` or `exec()`
3. ❌ Hardcode API keys or secrets
4. ❌ Commit `.env*` files
5. ❌ Leave `console.log` in production code - use `Logger` service
6. ❌ Use global variables - use Zustand or singleton services

## ✅ MUST DO

1. ✅ Write JSDoc for all public methods
2. ✅ Write tests for new features (min 80% coverage)
3. ✅ Use conventional commits: `feat:`, `fix:`, `docs:`, `test:`
4. ✅ Ensure `npm run lint` passes with 0 errors
5. ✅ Type-safe code - avoid `any`
6. ✅ Subscribe to `gameReset` event for state cleanup

## 🔌 Integrations

### Supabase
- Tables: `players`, `game_sessions`, `player_wallets`, `achievements`, `shop_items`, `player_inventory`, `price_logs`
- Edge Functions: `verify-game`, `submit-score`, `handle-purchase`
- RLS enabled on all tables

### WebSocket Feeds
- **Binance** (primary): `wss://stream.binance.com:9443/ws/btcusdt@trade`
- **Coinbase** (fallback): Fallback price feed logic

## 🔍 Debug Tools

- **Admin Dashboard**: `Ctrl+Shift+A`
- **Logger**: `Logger.info()`, `Logger.warn()`, `Logger.error()`
- **FPS/Metrics Monitor**: Displayed on canvas
- **Cheat Manager**: Active in development mode (F1 or menu)

## 📊 Performance Targets

| Metric | Target |
|--------|--------|
| FPS | 60 (mobile & desktop) |
| Scripting Time | < 4ms per frame |
| Bundle Size | < 500KB gzipped |
| Test Suite | < 60 seconds |

## 📝 Available Workflows

Located in `.agent/workflows/`:
- `/code-review` - Comprehensive codebase review
- `/pre-push-prep` - Test, lint, build, and commit prep
- `/deploySon` - Full deployment workflow
- `/fix-bug` - Standardized bug fixing process
- `/code-doc-sync` - Synchronization of code and documentation

## 📚 Key Resources

- `docs/ARCHITECTURE.md`: System design details
- `docs/MASTER_ROADMAP.md`: Project status & plans
- `docs/ANTI_CHEAT_REWARD_SYSTEM.md`: Security & logic reference
- `docs/TODO_COMPREHENSIVE.md`: Main task list

---

*Cascade reads this file to understand project conventions and coding standards.*
