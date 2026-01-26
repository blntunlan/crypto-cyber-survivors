---
name: crypto-survivors-debug
description: Advanced debugging and error detection for the Crypto Survivors game project. Use when debugging TypeScript/React issues, game logic failures, WebSocket connection problems, performance bottlenecks, state management bugs, rendering issues, collision detection errors, or any runtime/compile-time errors in the Crypto Survivors codebase. Provides specialized workflows for game engine debugging, real-time market data integration issues, mobile optimization problems, and test failures.
license: MIT
---

# Crypto Survivors Debug Skill

Advanced debugging toolkit specifically designed for the Crypto Survivors game architecture, covering React 19, TypeScript 5.8, Zustand state management, WebSocket integrations, Canvas rendering, and game engine logic.

## Quick Diagnostic Workflow

When encountering any bug or error:

1. **Identify the layer** where the error occurs (Presentation, Engine, Service, Data)
2. **Check the appropriate debugging reference** from `references/` directory
3. **Apply layer-specific debugging patterns**
4. **Use provided diagnostic scripts** from `scripts/` directory
5. **Validate fix with appropriate tests**

## Core Debugging Principles

### 1. Layer-Based Debugging

The game architecture has 4 main layers. Always identify which layer the bug belongs to:

- **Presentation Layer** (`components/`, `screens/`, `HUD/`) - UI rendering, user interactions
- **Game Engine Layer** (`engine/`, `renderer/`) - Game loop, physics, collision detection
- **Service Layer** (`services/`, `hooks/`) - Business logic, state management, WebSocket
- **Data Layer** (`stores/`, Supabase) - Persistence, cloud sync, analytics

### 2. Error Categories

Classify errors into these categories for faster resolution:

- **Type Errors** - TypeScript compilation failures
- **Runtime Errors** - Exceptions during execution
- **Logic Errors** - Incorrect behavior without crashes
- **Performance Issues** - FPS drops, memory leaks, sluggishness
- **State Sync Issues** - Zustand state inconsistencies
- **Network Errors** - WebSocket disconnections, API failures
- **Rendering Issues** - Canvas drawing problems, visual artifacts
- **Test Failures** - Unit test or E2E test failures

### 3. Common Bug Patterns in This Project

#### State Management Issues
- Zustand store mutations instead of immutable updates
- Missing state dependencies in React hooks
- Race conditions between multiple state updates
- Stale closures capturing old state values

#### Game Engine Issues
- Physics grid collision misses
- Entity pooling lifecycle bugs
- Canvas coordinate system misalignment
- RequestAnimationFrame timing issues

#### WebSocket Issues
- Message parsing failures
- Reconnection logic not triggering
- Memory leaks from unclosed connections
- Missing error handlers

#### Mobile-Specific Issues
- Touch event propagation problems
- Safe area inset miscalculations
- Virtual joystick drift
- Performance profile not activating

## Debugging Workflows

### When Encountering TypeScript Errors

1. Run type checking: `npm run type-check` (if available) or check VSCode errors
2. Look for:
   - Missing type imports from `types/` directory
   - Incorrect generic type parameters
   - Strict mode violations (null/undefined checks)
   - Circular type dependencies
3. Check `references/typescript-patterns.md` for project-specific type patterns
4. Validate fix compiles without errors

### When Encountering Runtime Errors

1. **Check error stack trace** - identify the exact file and line
2. **Add breakpoints or console logs** at the error location
3. **Inspect state at failure point**:
   - For React components: Use React DevTools
   - For Zustand stores: Use Zustand DevTools or `console.log(useGameStore.getState())`
   - For game entities: Add debug overlay (Ctrl+Shift+D)
4. **Check event flow**: Use `EventBus.enableTracing()` to see all events
5. Refer to `references/runtime-debugging.md` for common runtime issues

### When Encountering Performance Issues

1. **Profile the application**:
   - Open React DevTools Profiler
   - Record a performance trace during lag
   - Check FPS counter (always visible in game)
2. **Common culprits**:
   - Too many entities not being pooled
   - Expensive operations in render loop
   - Memory leaks from event listeners
   - Unnecessary re-renders
3. Run diagnostic script: `bash scripts/performance-analysis.sh`
4. See `references/performance-debugging.md` for optimization patterns

### When Encountering Test Failures

1. **Identify test type**:
   - Unit test (Vitest): Check mocks and test isolation
   - E2E test (Playwright): Check selectors and timing
2. **Common issues**:
   - Async timing problems (missing `waitFor`)
   - Mock data not matching real data shape
   - Test environment differences
   - Flaky tests due to animation timing
3. Run single test: `npm test -- <test-file-name>`
4. See `references/test-debugging.md` for testing patterns

### When Encountering WebSocket Issues

1. **Check connection status** in Admin Dashboard (Ctrl+Shift+A)
2. **Verify WebSocket URLs** in MarketService
3. **Common issues**:
   - CORS errors (check Railway backend)
   - Message format changes from exchange APIs
   - Reconnection backoff too aggressive
   - Missing error event handlers
4. Use script: `node scripts/test-websocket.js <url>`
5. See `references/websocket-debugging.md`

### When Encountering State Sync Issues

1. **Install Zustand DevTools**: Add middleware if not present
2. **Track state mutations**:
   - Check for direct state mutations (anti-pattern)
   - Verify all updates use `set()` or `setState()`
   - Look for race conditions in async actions
3. **Compare expected vs actual state**:
   - Use `getDebugState()` methods where available
   - Add logging in store actions
4. See `references/state-debugging.md`

## Advanced Debugging Techniques

### Using the Admin Dashboard

Press `Ctrl+Shift+A` to open the admin dashboard with:
- Real-time price chart analysis
- Error report viewer
- Session analytics
- Game state inspector
- EventBus event log

### Enabling Debug Overlays

Add these to your component or game instance:

```typescript
// Show collision grid
GameEngine.showCollisionGrid = true;

// Show entity bounding boxes
GameEngine.showBoundingBoxes = true;

// Enable EventBus tracing
EventBus.enableTracing();

// Get difficulty manager debug state
const debugState = DifficultyManager.getDebugState();
console.log(debugState);
```

### Debugging Canvas Rendering

1. **Visual issues**: Check z-index/layer order in renderers
2. **Coordinate problems**: Verify camera offset calculations
3. **Performance drops**: Reduce draw calls, use object pooling
4. Run: `node scripts/canvas-debugger.js` to test rendering logic

### Debugging Game State Machine

The FSM has strict state transitions. Common issues:

- Invalid state transitions (check `GameStateMachine.ts`)
- Missing state cleanup on transition
- Events firing in wrong state

Use `scripts/fsm-validator.js` to verify state transition logic.

### Memory Leak Detection

1. Take heap snapshot before and after suspected leak
2. Common leak sources:
   - EventBus listeners not removed
   - Canvas context not released
   - WebSocket not closed properly
   - Entity pooling not returning objects
3. Use `scripts/detect-memory-leaks.sh`

## Project-Specific Debugging Notes

### Binance/Coinbase WebSocket Format Changes

If price updates stop:
1. Check console for WebSocket errors
2. Verify message structure in `MarketService.ts`
3. Test with: `node scripts/test-market-feeds.js`

### Mobile Touch Controls Not Responding

1. Check `DeviceCapabilities` detection in `MobileSettings.ts`
2. Verify touch event listeners in `VirtualJoystick.tsx`
3. Test on actual device (Chrome DevTools mobile simulation differs)

### Enemy Spawning Issues

1. Check `SpawnSystem.ts` - verify volume/RSI calculations
2. Ensure `EnemyRegistry.ts` has all enemy types
3. Validate spawn rate formulas in `DifficultyManager.ts`

### Buff/Debuff Not Applying

1. Check `BuffManager.ts` decorator pattern
2. Verify buff gem configuration in `types/BuffGem.ts`
3. Ensure buff timers respect pause state

### Collision Detection Missing Hits

1. Verify spatial grid cell size in `PhysicsSystem.ts`
2. Check entity bounding box calculations
3. Test with: `node scripts/test-collisions.js`

## Diagnostic Scripts

All diagnostic scripts are in `scripts/` directory:

- `performance-analysis.sh` - Profile FPS and memory
- `test-websocket.js` - Test WebSocket connections
- `canvas-debugger.js` - Debug rendering issues
- `fsm-validator.js` - Validate state machine
- `detect-memory-leaks.sh` - Find memory leaks
- `test-market-feeds.js` - Test Binance/Coinbase feeds
- `test-collisions.js` - Test collision detection
- `type-check.sh` - Run full TypeScript check
- `lint-check.sh` - Check for common code issues

## Reference Documentation

For detailed debugging patterns, see:

- `references/typescript-patterns.md` - TypeScript debugging patterns
- `references/runtime-debugging.md` - Runtime error debugging
- `references/performance-debugging.md` - Performance optimization
- `references/test-debugging.md` - Test debugging strategies
- `references/websocket-debugging.md` - WebSocket issue resolution
- `references/state-debugging.md` - Zustand state debugging
- `references/canvas-debugging.md` - Canvas rendering issues
- `references/mobile-debugging.md` - Mobile-specific debugging

## Integration with Existing Debug Tools

This skill complements the existing debug tools in the project:

- **Cheat Manager** (dev mode) - For testing game mechanics
- **FPS Monitor** - For performance monitoring
- **EventBus Tracing** - For event flow analysis
- **Admin Dashboard** - For analytics and error reports

Use this skill to systematically approach bugs that these tools help surface.

## Best Practices

1. **Always reproduce the bug first** before attempting fixes
2. **Write a failing test** that captures the bug (when possible)
3. **Fix one issue at a time** - don't bundle multiple fixes
4. **Verify the fix** doesn't break existing functionality
5. **Document unusual bugs** in code comments for future reference
6. **Update tests** to prevent regression

## Emergency Debugging Checklist

When completely stuck:

- [ ] Clear browser cache and local storage
- [ ] Restart dev server
- [ ] Check for TypeScript errors: `npm run build`
- [ ] Check for ESLint errors: `npm run lint`
- [ ] Run all tests: `npm test && npm run test:e2e`
- [ ] Check git diff for recent changes
- [ ] Review error logs in Admin Dashboard
- [ ] Check browser console for errors
- [ ] Verify environment variables are set correctly
- [ ] Test in different browser
- [ ] Test in incognito mode (to rule out extensions)

## Getting Help

If unable to resolve after following these workflows:

1. Gather debugging information:
   - Error message and stack trace
   - Steps to reproduce
   - Expected vs actual behavior
   - Debug state outputs
   - Recent code changes

2. Check project documentation:
   - `docs/ARCHITECTURE_REVIEW.md`
   - `docs/MASTER_ROADMAP.md`
   - Relevant files in `docs/completed/`

3. Review similar issues in test files for patterns
