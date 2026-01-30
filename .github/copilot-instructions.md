# Crypto Survivors AI Coding Instructions

## Project Overview
Real-time market-driven Vampire Survivors game integrating live BTC price feeds with 60 FPS Canvas rendering. React 19 + TypeScript 5 + Vite, targeting 1431 passing tests.

## Architecture Fundamentals

### Singleton Service Pattern
All logic lives in **singleton services** (42+ services), never in React state. Services communicate via strongly-typed `EventBus`.

```typescript
// ✅ Correct: Singleton pattern
class MyServiceClass {
  private static instance: MyServiceClass | null = null;
  static getInstance() {
    return (MyServiceClass.instance ??= new MyServiceClass());
  }
}
export const MyService = MyServiceClass.getInstance();
```

### Critical Rule: No `useState` in Game Loop
**Never** use React state (`useState`, `setState`) inside `GameEngine.tsx` render loop or any service called at 60 FPS. Use `useRef` or singleton services only.

```typescript
// ❌ WRONG - causes re-renders, kills performance
const [enemies, setEnemies] = useState([]);

// ✅ CORRECT - GC-free, high performance
const enemiesRef = useRef<GameEnemy[]>([]);
```

### Object Pooling (services/combat/PoolManager.ts)
All repeating entities (bullets, enemies, particles) **must** use `PoolManager` for O(1) allocation/deallocation with zero GC pressure.

```typescript
// Get object from pool
const bullet = PoolManager.getBullet();
// Release back to pool
PoolManager.releaseBullet(bullet);
```

### EventBus Communication (services/core/EventBus.ts)
Type-safe Observer Pattern for all cross-component communication. 40+ event types defined in `types/events.ts`.

```typescript
// Subscribe (returns cleanup function)
const unsub = EventBus.on('enemyKilled', (data) => {
  console.log(data.x, data.y); // Fully typed
});

// Emit
EventBus.emit('enemyKilled', { x: 100, y: 200, type: 'bear' });
```

## State Management

### Zustand Store (stores/gameStore.ts)
Use **Slice Pattern** for modular state. Never put game loop data here - only settings, progress, session tracking.

```typescript
// Access graphics settings
const { particlesEnabled } = useGameStore(selectGraphics);
```

### TimeService (services/core/TimeService.ts)
All timers, delays, and time-based logic **must** use `TimeService` for pause-aware timing:

```typescript
// ❌ WRONG - ignores pause state
setTimeout(() => {...}, 1000);

// ✅ CORRECT - pauses during levelup/menu
TimeService.setTimeout(() => {...}, 1000);
```

## Testing Requirements

### Test Commands
```bash
npm run test          # 1431 unit tests
npm run test:watch    # TDD mode
npm run test:e2e      # 72 Playwright E2E tests
npm run lint          # 0 errors, 0 warnings expected
```

### Test Patterns
- **Unit Tests**: `tests/**/*.test.ts` - Use Vitest, mock services via `beforeEach` reset
- **E2E Tests**: `e2e/**/*.spec.ts` - Playwright with `@axe-core/playwright` for a11y
- **Coverage**: 65-80% minimum (check with `npm run test:coverage`)

### Critical Test Rule
Services must be **stateless singletons** - call `reset()` method in `beforeEach` to isolate tests:

```typescript
beforeEach(() => {
  MyService.reset?.(); // Reset singleton state
});
```

## Code Conventions

### TypeScript Strictness
- **Strict mode enabled** - no `any`, no unsafe indexing (`noUncheckedIndexedAccess: true`)
- Use discriminated unions for type narrowing (`type: 'bear' | 'bull'`)
- Prefer `type` over `interface` for consistency

### File Structure
- **Services**: `services/{category}/{ServiceName}.ts` (singleton export at bottom)
- **Components**: `components/{feature}/{ComponentName}.tsx` (Pascal case)
- **Hooks**: `hooks/use{HookName}.ts` (camelCase with "use" prefix)
- **Types**: `types/{domain}.ts` or `types.ts` (shared types)

### Naming Conventions
- **Services**: `MyService` (export), `MyServiceClass` (class)
- **Components**: `PascalCase` for files and exports
- **Hooks**: `useMyHook` (camelCase)
- **Constants**: `SCREAMING_SNAKE_CASE` in `constants/` or `config/`

## Common Workflows

### Adding New Enemy Type
1. Define config in `config/EnemyRegistry.ts`
2. Add factory logic in `factories/EnemyFactory.ts`
3. Update `SpawnSystem.ts` spawn logic
4. Register with `PoolManager.ts` if new pool needed

### Adding New Buff/Debuff
1. Create decorator in `services/patterns/decorators/`
2. Extend `BaseDecorator` and implement `decorate(stats: IPlayerStats)`
3. Add to `BuffManager.addBuff()` or `BuffManager.addDebuff()`
4. Emit `buffApplied`/`buffExpired` events for UI

### Debugging Game State
```typescript
// Enable EventBus tracing
EventBus.enableTracing();

// Check DebugService panels
DebugService.registerPanel('MyDebug', () => ({...}));
```

### Market Data Integration
- **MarketService**: WebSocket feeds (Binance/Coinbase) with auto-failover
- **MarketIndicatorService**: RSI, ATR, volume calculations
- **DifficultyManager**: Maps market volatility → spawn rates

## Performance Guidelines

### Canvas Rendering (services/renderers/GameRenderer.ts)
- Use `requestAnimationFrame` loop, never `setInterval`
- Batch draw calls - minimize context switches
- Use `OffscreenCanvas` for background pre-rendering

### Mobile Optimization
- Check `useDevice()` hook for mobile detection
- Use `getHUDLayout()` for responsive scaling (0.5x-1.5x)
- Profile with `DeviceBenchmarkService` for auto-quality adjust

### Spatial Optimization (services/combat/PhysicsSystem.ts)
Collision detection uses **spatial grid** (O(N) → O(N/k)) - add large objects to grid:

```typescript
PhysicsSystem.addToGrid(entity);
```

## Security & Anti-Cheat

### AntiCheatService (services/system/AntiCheatService.ts)
- Client-side validation + server-side verification (Supabase Edge Functions)
- HMAC signing for score submissions (`railway-market-server/` for price verification)
- Device fingerprinting for session tracking

### Supabase Integration
- Row Level Security (RLS) enabled on all tables
- Use `services/auth/GameSessionService.ts` for authenticated sessions
- Schema: `types/supabase.ts` (generate via `npm run supabase:gen`)

## Commit & PR Standards

### Conventional Commits (commitlint enforced)
```bash
feat: add Diamond Hands buff decorator
fix: resolve memory leak in PoolManager cleanup
perf: optimize spatial grid cell size for mobile
test: add E2E coverage for level-up flow
docs: update ARCHITECTURE.md with BuffManager
```

### Pre-commit Hooks (lint-staged + husky)
Auto-runs: `eslint --fix`, `prettier --write`, `vitest related --run`

## Deployment Workflow (deploy_final)

End-to-end deployment process covering tests → lint → build → git → deploy.

### Phase 1: Analysis
```bash
git status                    # Check branch & uncommitted changes
npm ls                        # Verify dependencies
railway version; supabase -v  # CLI availability
```

### Phase 2: Test & Auto-Fix (max 3 iterations)
```bash
npm run test                  # Run 1431 unit tests
npm run test:e2e              # Run 72 E2E tests
# Auto-fix failing tests using fix_react_test strategies
```

### Phase 3: Quality & Build
```bash
npm run lint:fix              # Fix lint errors
npm run build                 # Production build
# Verify dist/ output and bundle sizes
```

### Phase 4: Git Operations
```bash
git add -A
git commit -m "feat|fix|perf: description"  # Semantic commit
git push origin main
```

### Phase 5: Deploy (Railway auto-deploys on push)
```bash
# Supabase migrations (if any)
npm run supabase:push         # Apply database migrations

# Railway (auto-triggered by GitHub push)
railway status                # Verify deployment
railway logs                  # Monitor first 5 minutes
```

### Phase 6: Rollback (if critical errors)
```bash
railway rollback              # Revert to previous deployment
```

### Deployment Report Template
After deployment, provide summary:
- **Fixed Tests**: [count]
- **Resolved Lint Issues**: [count]
- **Build Status**: Success/Failed
- **Deploy Status**: Success
- **Production URL**: [url]

## Key Files Reference
- **Game Loop**: `components/GameEngine.tsx` (60 FPS logic)
- **Main App**: `App.tsx` (screen routing, state machine)
- **Services Index**: `services/core/` (EventBus, TimeService, MetricsService)
- **Type Definitions**: `types.ts`, `types/events.ts` (shared contracts)
- **Config Registry**: `config/EnemyRegistry.ts`, `config/StatRegistry.ts`

## Documentation
- **Architecture**: `docs/ARCHITECTURE.md` - system design rationale
- **API Docs**: Run `npm run docs` → `docs/api/` (TypeDoc generated)
- **Roadmaps**: `docs/MASTER_ROADMAP.md`, `docs/2026_ROADMAP.md`
