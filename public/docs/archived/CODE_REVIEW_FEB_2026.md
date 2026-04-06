# Code Review Report - February 2026

## 1. Executive Summary
This review focuses on identifying architectural coupling issues, GC-heavy patterns in critical paths, and deprecated legacy code. The codebase (React 19, Vite, Custom Canvas Engine) is generally modern and performant, but specific areas violate the project's strict "GC-Free Loop" and "Decoupled Architecture" rules.

## 2. Critical Performance Issues (GC Allocations in Render Loop)

### 2.1 GameEngine.tsx (Line 529) - `forEach` Allocation
**Severity:** Critical
**Location:** `components/GameEngine.tsx`
**Issue:**
```typescript
p.activeEnemies.forEach(enemy => { ... })
```
Using `.forEach()` inside the main `requestAnimationFrame` loop creates a new function closure allocation **every frame (60 times/sec)**. This puts unnecessary pressure on the Garbage Collector and can cause micro-stutters.
**Recommendation:** Replace with a standard `for` loop.

### 2.2 SpawnSystem.ts (Line 98) - Array Allocation
**Severity:** High
**Location:** `services/combat/SpawnSystem.ts`
**Issue:**
```typescript
const keys = Array.from(this.activeEvents.keys());
```
`Array.from()` creates a new array every frame inside the `update` method.
**Recommendation:** Use a `for..of` iterator loop directly on `this.activeEvents.keys()`.

## 3. Architectural Coupling & Separation of Concerns

### 3.1 Gatekeeper Movement Logic Leaking into GameEngine
**Severity:** High
**Location:** `components/GameEngine.tsx` (Lines 530-546)
**Issue:**
Specific movement logic for "gatekeeper" enemies (orbiting behaviors) is hardcoded inside the main `GameEngine` loop. This violates the Single Responsibility Principle and couples the Engine to specific enemy types.
**Recommendation:** Move this logic to `MovementSystem.ts` or a dedicated `EnemyBehaviorSystem`.

### 3.2 Portal Collision Logic Leaking into GameEngine
**Severity:** Medium
**Location:** `components/GameEngine.tsx` (Lines 548-555)
**Issue:**
Collision detection between the Player and the Portal is performed manually in the Engine loop.
**Recommendation:** Move this to `CollisionSystem.ts` or `PortalSystem.update()`.

### 3.3 DifficultyManager Coupling to UI Store
**Severity:** Medium
**Location:** `services/gameplay/DifficultyManager.ts`
**Issue:**
The Service layer imports `useAdminConfigStore` (a React/Zustand store hook) directly:
```typescript
import { useAdminConfigStore } from '../../stores/admin/configStore';
```
This couples core game logic to the UI layer, making it harder to test or run disjointly (e.g., in a worker or server context).
**Recommendation:** Inject configuration via `Dependency Injection` or `EventBus`, or pass config as an argument to `update()`.

## 4. Deprecated / Legacy Code

### 4.1 DifficultyManager Legacy Methods
**Severity:** Low (Cleanup)
**Location:** `services/gameplay/DifficultyManager.ts`
**Issue:**
Several methods are marked as "Legacy V1 Support":
- `getCycleNumber`
- `getCycleProgress`
- `getTimeRemainingInCycle`
These refer to a removed "Wave Cycle" mechanic.
**Recommendation:** Verify explicit usage. If unused, remove. If utilized by legacy UI, mark with `@deprecated`.

### 4.2 GameHUD Inline Styles
**Severity:** Low
**Location:** `components/GameHUD.tsx`
**Issue:**
Inline style object created on every render.
**Recommendation:** Memoize the style object or move static properties to CSS classes.

## 5. Next Steps
1. **Refactor GameEngine Loop**: Convert `forEach` to `for` loops.
2. **Decouple Gatekeeper/Portal Logic**: Move to respective Systems.
3. **Optimize SpawnSystem**: fix `Array.from`.
4. **Cleanup DifficultyManager**: Deprecate/Remove legacy methods.
