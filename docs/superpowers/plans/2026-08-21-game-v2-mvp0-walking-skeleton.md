# Game V2 MVP-0 Walking Skeleton Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use
> superpowers:subagent-driven-development (recommended) or
> superpowers:executing-plans to implement this plan task-by-task. Steps use
> checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build an isolated, deterministic, playable Three.js walking skeleton
at `/game-v2` covering movement, dash, one enemy, auto-fire, damage, death, XP,
one level-up, and equal-state replay at 30/60/120 render FPS without changing the
legacy demo's default behavior.

**Architecture:** A root-level lazy entry resolver keeps the V2 module graph
separate from all legacy gameplay singletons. Game V2 owns an instance-scoped
fixed-step runtime, typed-array ECS, input-per-tick replay, and a one-way Three.js
presentation bridge; Three.js never owns simulation state. Each task closes one
typed contract and its focused RED→GREEN test cycle before composition.

**Tech Stack:** React 19.2, TypeScript 5.8 strict mode, Vite 6.4, Vitest 4.1,
Three.js 0.185.1, Playwright 1.61, typed arrays, direct Three.js API without
React Three Fiber or an external ECS/RNG library.

**Spec:**
`docs/superpowers/specs/2026-08-21-threejs-gameplay-v2-design.md`

## Global Constraints

- Keep `/` and every current public route behaviorally identical to `main`.
- Load Game V2 only for exact `/game-v2` and `/game-v2/` pathnames; query and
  hash values cannot select the runtime.
- Keep `/game-v2` private and `noindex`; do not add it to public SEO routes,
  sitemap generation, canonical routes, or localization.
- Add only `three@0.185.1` as a production dependency and
  `@types/three@0.185.1` as a development dependency after explicit user
  approval.
- Never import legacy `GameRuntime`, `GameEngine`, `TimeService`, `PoolManager`,
  `GameRenderer`, legacy replay services, global `EventBus`, or
  `ResetOrchestrator` into `game-v2/**`.
- Do not introduce a singleton. All run state is factory-created and disposed by
  the owning React entry.
- Use a 60 Hz simulation step (`1000 / 60` ms), at most 8 catch-up steps per
  render, and a 250 ms accepted render-delta cap.
- Use simulation ticks for gameplay timing. Only later card-decision UI may use
  real time; MVP-0 uses an explicit player selection with no deadline.
- Do not call `Math.random()` in `game-v2/**`.
- Do not allocate, use `map`, or use `filter` in `step()` or render-sync loops.
- Use typed arrays with a fixed `4_096` entity capacity. Entity handles carry a
  generation so stale handles cannot mutate reused slots.
- Treat ECS state as canonical. Render objects may be destroyed and recreated
  without changing a replay hash.
- Target desktop controls only: `WASD`, `Space`, and automatic targeting/fire.
- Preserve user-owned `skills-lock.json` and
  `docs/design/CORE_REDESIGN_V1.md`; never stage them.
- Each task ends with focused tests, typecheck where its public types change,
  progress-file update, and a conventional checkpoint commit.

---

## Locked File Structure

```text
entry/
  AppSurface.ts                 exact pathname resolver
  RootEntry.tsx                 lazy V2/legacy boundary
  LegacyAppEntry.tsx            unchanged legacy providers and side effects
game-v2/
  GameV2App.tsx                 V2 mount/dispose owner
  game-v2.css                   V2-root-scoped presentation reset
  config/Mvp0Config.ts          every MVP-0 tuning constant
  contracts/                    shared V2-only public types
  runtime/                      clock, RNG, lifecycle, runtime composition
  world/                        typed ECS and snapshot writer
  replay/                       input log, stable hash, headless playback
  input/                        keyboard adapter and mutable player intent
  systems/                      movement, dash, enemy, targeting, combat, XP
  presentation/                 Three scene, camera, ECS render bridge
  ui/LevelUpOverlay.tsx         MVP-0 one-choice paused offer
tests/game-v2/                  unit and walking-skeleton integration tests
e2e/game-v2-walking-skeleton.spec.ts
```

`game-v2/**` is added to Vitest coverage explicitly. It remains a clean namespace
rather than being hidden inside legacy `services/**`; production cutover later
adds its presentation files to the production UI contract manifest.

## Stable Cross-Task Interfaces

```ts
export type EntityId = number;

export type PlayerIntent = {
  moveX: number;
  moveY: number;
  dashPressed: boolean;
};

export type StepContext = {
  tick: number;
  deltaSeconds: number;
  intent: Readonly<PlayerIntent>;
};

export type ClockAdvanceResult = {
  steps: number;
  interpolationAlpha: number;
  droppedMilliseconds: number;
};

export type GameV2Phase =
  | 'idle'
  | 'playing'
  | 'level-up'
  | 'game-over'
  | 'disposed';
```

The ECS exposes preallocated component stores. Systems iterate numeric slots and
component masks; they do not receive entity objects or collections.

---

### Task 1: V2-000 — Isolated Game V2 Entry Boundary

**Files:**

- Modify: `package.json`
- Modify: `package-lock.json`
- Modify: `index.tsx`
- Modify: `server.js`
- Modify: `public/_headers`
- Modify: `vitest.config.ts`
- Create: `entry/AppSurface.ts`
- Create: `entry/RootEntry.tsx`
- Create: `entry/LegacyAppEntry.tsx`
- Create: `game-v2/GameV2App.tsx`
- Create: `game-v2/game-v2.css`
- Test: `tests/game-v2/entry/AppSurface.test.ts`
- Test: `tests/game-v2/architecture/GameV2Boundary.test.ts`
- Modify test: `tests/server.test.ts`

**Interfaces:**

- Consumes: browser `window.location.pathname`; current legacy provider tree
  copied without behavioral edits from `index.tsx`.
- Produces: `resolveAppSurface(pathname): 'legacy' | 'game-v2'`,
  `RootEntry`, and the stable `/game-v2` development entry.

- [ ] **Step 1: Obtain dependency approval and install exact packages**

Run separately:

```powershell
npm install three@0.185.1
npm install --save-dev @types/three@0.185.1
```

Expected: `package.json` and `package-lock.json` contain the exact selected
versions; no React Three Fiber, ECS, RNG, or physics dependency is added.

- [ ] **Step 2: Write failing route and boundary tests**

```ts
import { describe, expect, it } from 'vitest';
import { resolveAppSurface } from '@/entry/AppSurface';

describe('resolveAppSurface', () => {
  it.each(['/game-v2', '/game-v2/'])('selects V2 for %s', pathname => {
    expect(resolveAppSurface(pathname)).toBe('game-v2');
  });

  it.each(['/', '/docs', '/tr/', '/game-v2-preview'])(
    'keeps %s on the legacy entry',
    pathname => {
      expect(resolveAppSurface(pathname)).toBe('legacy');
    }
  );
});
```

The architecture test recursively scans `game-v2/**/*.{ts,tsx}` and fails for
imports matching:

```ts
const forbiddenImports = [
  'components/GameEngine',
  'services/gameplay/GameRuntime',
  'services/core/TimeService',
  'services/combat/PoolManager',
  'services/renderers/GameRenderer',
  'services/replay/Replay',
  'services/core/EventBus',
  'services/core/ResetOrchestrator',
];
```

- [ ] **Step 3: Run tests and verify RED**

Run:

```powershell
npx vitest run tests/game-v2/entry/AppSurface.test.ts tests/game-v2/architecture/GameV2Boundary.test.ts --pool=forks --maxWorkers=1
```

Expected: FAIL because `entry/AppSurface.ts` and the V2 boundary do not exist.

- [ ] **Step 4: Implement the exact resolver and lazy root**

```ts
export type AppSurface = 'legacy' | 'game-v2';

export const resolveAppSurface = (pathname: string): AppSurface =>
  pathname === '/game-v2' || pathname === '/game-v2/'
    ? 'game-v2'
    : 'legacy';
```

`RootEntry.tsx` uses two `React.lazy` imports. `LegacyAppEntry.tsx` owns the
existing DebugService side-effect import and the exact
Language→Theme→Game provider tree. `GameV2App.tsx` initially renders:

```tsx
export const GameV2App = (): React.ReactElement => (
  <main className="game-v2" data-testid="game-v2-root">
    <div data-testid="game-v2-stage" />
  </main>
);
```

`index.tsx` mounts only `<RootEntry surface={resolveAppSurface(pathname)} />`.
No legacy gameplay import remains in `index.tsx` or `RootEntry.tsx`.

- [ ] **Step 5: Add private SPA fallback and noindex behavior**

In `server.js`, add a separate exact private route set:

```js
const PRIVATE_SPA_ROUTE_PATHS = new Set(['/game-v2', '/game-v2/']);
```

Make `shouldServeSpaFallback` accept that set without modifying
`PUBLIC_ROUTE_PATHS`. When serving its `index.html`, add
`X-Robots-Tag: noindex, nofollow`. Add the same route pattern to
`public/_headers`. Extend `tests/server.test.ts` to prove `/game-v2` is private
SPA fallback textually and is absent from `PUBLIC_ROUTE_PATHS`.

- [ ] **Step 6: Verify GREEN and legacy safety**

Run separately:

```powershell
npx vitest run tests/game-v2/entry/AppSurface.test.ts tests/game-v2/architecture/GameV2Boundary.test.ts tests/server.test.ts tests/App.test.tsx tests/hooks/useSurfaceState.test.ts --pool=forks --maxWorkers=1
npm run typecheck
npm run build
```

Expected: all focused tests pass; the build contains a lazy Game V2 chunk; `/`
still boots the legacy application.

- [ ] **Step 7: Update checkpoint and commit**

Update `docs/game-v2/PROGRESS.md` to `V2-000 / Verification`, record commands,
then commit only Task 1 files:

```powershell
git commit -m "feat(game-v2): isolate the new runtime entry"
```

---

### Task 2: V2-001 — Fixed-Step Simulation Clock

**Files:**

- Create: `game-v2/config/Mvp0Config.ts`
- Create: `game-v2/runtime/SimulationClock.ts`
- Test: `tests/game-v2/runtime/SimulationClock.test.ts`

**Interfaces:**

- Consumes: non-negative render delta in milliseconds and a stable tick
  callback.
- Produces:
  `SimulationClock.advance(renderDeltaMs, step): ClockAdvanceResult`,
  `pause()`, `resume()`, `reset()`, and `tick`.

- [ ] **Step 1: Write failing deterministic clock tests**

```ts
const simulate = (fps: number): number => {
  const clock = new SimulationClock();
  for (let frame = 0; frame < fps * 10; frame += 1) {
    clock.advance(1000 / fps, () => undefined);
  }
  return clock.tick;
};

expect(simulate(30)).toBe(600);
expect(simulate(60)).toBe(600);
expect(simulate(120)).toBe(600);
```

Add separate assertions for pause freezing ticks, reset returning to zero,
negative/NaN delta throwing `RangeError`, 250 ms input capping, and an
eight-step catch-up maximum with positive `droppedMilliseconds`.

- [ ] **Step 2: Run and verify RED**

```powershell
npx vitest run tests/game-v2/runtime/SimulationClock.test.ts --pool=forks --maxWorkers=1
```

Expected: FAIL because `SimulationClock` does not exist.

- [ ] **Step 3: Implement the minimal clock**

Use constants from `Mvp0Config.ts`:

```ts
export const SIMULATION_HZ = 60;
export const SIMULATION_STEP_MS = 1000 / SIMULATION_HZ;
export const MAX_RENDER_DELTA_MS = 250;
export const MAX_CATCH_UP_STEPS = 8;
```

The clock owns accumulator, integer tick, and pause state. It invokes the same
callback once per fixed step, never passes variable delta to simulation, and
returns interpolation alpha without allocating internal collections.

- [ ] **Step 4: Verify GREEN and commit**

```powershell
npx vitest run tests/game-v2/runtime/SimulationClock.test.ts --pool=forks --maxWorkers=1
npm run typecheck
git commit -m "feat(game-v2): add deterministic simulation clock"
```

---

### Task 3: V2-002 — Seeded RNG and Run Identity

**Files:**

- Create: `game-v2/contracts/RunIdentity.ts`
- Create: `game-v2/runtime/DeterministicRng.ts`
- Test: `tests/game-v2/runtime/DeterministicRng.test.ts`

**Interfaces:**

- Consumes: unsigned 32-bit seed and caller-provided run ID.
- Produces: `createRunIdentity(runId, seed): RunIdentity`,
  `nextUint32()`, `nextFloat()`, `nextInt(maxExclusive)`, `snapshot()`, and
  `restore(state)`.

- [ ] **Step 1: Write failing golden-sequence tests**

```ts
const first = new DeterministicRng(0x12345678);
const second = new DeterministicRng(0x12345678);
const sequence = Array.from({ length: 8 }, () => first.nextUint32());

expect(sequence).toEqual(
  Array.from({ length: 8 }, () => second.nextUint32())
);
expect(new Set(sequence).size).toBeGreaterThan(1);
```

Also prove snapshot/restore repeats subsequent values, `nextInt(0)` and
non-integer bounds throw, and invalid/non-finite seeds are rejected.

- [ ] **Step 2: Run RED**

```powershell
npx vitest run tests/game-v2/runtime/DeterministicRng.test.ts --pool=forks --maxWorkers=1
```

Expected: FAIL on missing module.

- [ ] **Step 3: Implement an owned xorshift32 generator**

```ts
export type RngSnapshot = Readonly<{ schemaVersion: 1; state: number }>;

export class DeterministicRng {
  public constructor(seed: number);
  public nextUint32(): number;
  public nextFloat(): number;
  public nextInt(maxExclusive: number): number;
  public snapshot(): RngSnapshot;
  public restore(snapshot: RngSnapshot): void;
}
```

Normalize the forbidden all-zero xorshift state to `0x6d2b79f5` and record that
rule in the test. No simulation file may call `Math.random()`.

- [ ] **Step 4: Verify and commit**

```powershell
npx vitest run tests/game-v2/runtime/DeterministicRng.test.ts --pool=forks --maxWorkers=1
npm run typecheck
git commit -m "feat(game-v2): add seeded run identity"
```

---

### Task 4: V2-003 — Lifecycle and Reset Contract

**Files:**

- Create: `game-v2/contracts/GameV2Phase.ts`
- Create: `game-v2/runtime/GameV2Lifecycle.ts`
- Test: `tests/game-v2/runtime/GameV2Lifecycle.test.ts`

**Interfaces:**

- Consumes: explicit commands `start`, `pauseForLevelUp`, `resumeFromLevelUp`,
  `endRun`, `reset`, and `dispose`.
- Produces: current `GameV2Phase` and monotonically increasing `sessionEpoch`.

- [ ] **Step 1: Write failing transition tests**

```ts
const lifecycle = new GameV2Lifecycle();
expect(lifecycle.phase).toBe('idle');
lifecycle.start();
lifecycle.pauseForLevelUp();
lifecycle.resumeFromLevelUp();
lifecycle.endRun();
lifecycle.reset();
expect(lifecycle.phase).toBe('idle');
expect(lifecycle.sessionEpoch).toBe(1);
```

Add tests rejecting illegal transitions, proving `dispose()` is idempotent, and
proving every command except repeated dispose throws after disposal.

- [ ] **Step 2: Run RED**

```powershell
npx vitest run tests/game-v2/runtime/GameV2Lifecycle.test.ts --pool=forks --maxWorkers=1
```

- [ ] **Step 3: Implement explicit transition table**

Use a discriminated command switch and one private `transition(next)` method.
Do not register EventBus or module-global reset handlers. Reset increments the
epoch so stale render/input adapters can reject prior-session state.

- [ ] **Step 4: Verify and commit**

```powershell
npx vitest run tests/game-v2/runtime/GameV2Lifecycle.test.ts --pool=forks --maxWorkers=1
npm run typecheck
git commit -m "feat(game-v2): define run lifecycle contract"
```

---

### Task 5: V2-004 — Typed-Array ECS World

**Files:**

- Create: `game-v2/contracts/EntityId.ts`
- Create: `game-v2/world/ComponentMask.ts`
- Create: `game-v2/world/World.ts`
- Test: `tests/game-v2/world/World.test.ts`

**Interfaces:**

- Consumes: fixed capacity and component writes by validated entity handle.
- Produces: `createEntity`, `destroyEntity`, `isAlive`, `slotOf`, `reset`, and
  preallocated stores for transform, velocity, body, health, faction, player,
  enemy, projectile, and XP pickup components.

- [ ] **Step 1: Write failing allocation and stale-handle tests**

```ts
const world = new World(4);
const first = world.createEntity(ComponentMask.Transform);
const firstSlot = world.slotOf(first);
world.destroyEntity(first);
const replacement = world.createEntity(ComponentMask.Transform);

expect(world.slotOf(replacement)).toBe(firstSlot);
expect(world.isAlive(first)).toBe(false);
expect(() => world.slotOf(first)).toThrow('stale entity');
```

Also prove capacity overflow throws, component masks query correctly, destroy
clears every numeric store at the slot, and reset makes all prior handles stale.

- [ ] **Step 2: Run RED**

```powershell
npx vitest run tests/game-v2/world/World.test.ts --pool=forks --maxWorkers=1
```

- [ ] **Step 3: Implement fixed storage**

Encode handles from a slot plus generation. Preallocate:

```ts
readonly masks: Uint32Array;
readonly generations: Uint16Array;
readonly x: Float32Array;
readonly y: Float32Array;
readonly previousX: Float32Array;
readonly previousY: Float32Array;
readonly velocityX: Float32Array;
readonly velocityY: Float32Array;
readonly radius: Float32Array;
readonly health: Float32Array;
readonly maxHealth: Float32Array;
readonly faction: Int8Array;
```

Add only the primitive arrays needed by later listed systems. Keep the free-slot
stack preallocated and use numeric loops.

- [ ] **Step 4: Verify architecture and commit**

```powershell
npx vitest run tests/game-v2/world/World.test.ts tests/game-v2/architecture/GameV2Boundary.test.ts --pool=forks --maxWorkers=1
npm run typecheck
npm run check:architecture
git commit -m "feat(game-v2): add fixed-capacity ECS world"
```

---

### Task 6: V2-005 — Canonical Snapshot and Replay Hash

**Files:**

- Create: `game-v2/contracts/WorldSnapshot.ts`
- Create: `game-v2/contracts/RuntimeCheckpoint.ts`
- Create: `game-v2/replay/WorldSnapshotWriter.ts`
- Create: `game-v2/replay/StateHasher.ts`
- Create: `game-v2/replay/InputRecorder.ts`
- Test: `tests/game-v2/replay/WorldSnapshot.test.ts`

**Interfaces:**

- Consumes: world, tick, run identity, RNG snapshot, lifecycle state, and one
  normalized `PlayerIntent` per simulation tick.
- Produces: schema-versioned authoritative runtime checkpoint, lowercase
  8-character FNV-1a hex hash, and append-only input frames
  `{ tick, moveX, moveY, dashPressed }`.

- [ ] **Step 1: Write failing canonical-order tests**

```ts
const hashA = hashRuntimeCheckpoint(writeCheckpoint(runtimeA));
const hashB = hashRuntimeCheckpoint(writeCheckpoint(runtimeB));
expect(hashA).toBe(hashB);
expect(hashA).toMatch(/^[0-9a-f]{8}$/);
```

Create `runtimeA` and `runtimeB` with identical entity operations but write
component values in different property order. Add assertions proving a changed
generation, allocator free-stack order, RNG state, lifecycle phase, cooldown,
or component value changes the hash. Add rejection tests for non-finite values
and an unsupported snapshot schema.

- [ ] **Step 2: Run RED**

```powershell
npx vitest run tests/game-v2/replay/WorldSnapshot.test.ts --pool=forks --maxWorkers=1
```

- [ ] **Step 3: Implement stable encoding**

Snapshot entries are emitted in ascending slot order and include generations,
component masks, allocator state, all authoritative component values, RNG state,
lifecycle phase/epoch, run identity, config version, and tick. Numbers are
encoded from their typed stores, not locale strings. InputRecorder owns a
fixed-capacity frame buffer of `216_000` ticks (60 minutes at 60 Hz) and throws
on overflow rather than growing during a run.

- [ ] **Step 4: Verify and commit**

```powershell
npx vitest run tests/game-v2/replay/WorldSnapshot.test.ts --pool=forks --maxWorkers=1
npm run typecheck
git commit -m "feat(game-v2): add canonical replay snapshots"
```

---

### Task 7: V2-006 — One-Way Three.js Scene Bridge

**Files:**

- Create: `game-v2/contracts/RenderSnapshot.ts`
- Create: `game-v2/presentation/ThreeScene.ts`
- Create: `game-v2/presentation/RenderSnapshotWriter.ts`
- Create: `game-v2/presentation/ThreeRenderBridge.ts`
- Test: `tests/game-v2/presentation/ThreeRenderBridge.test.ts`

**Interfaces:**

- Consumes: preallocated `RenderSnapshot` and interpolation alpha.
- Produces: scene graph updates and `dispose()`; no simulation mutation API.

- [ ] **Step 1: Write failing one-way sync tests**

```ts
const beforeX = world.x[playerSlot];
writer.write(world, renderSnapshot);
bridge.sync(renderSnapshot, 0.5);
expect(playerMesh.position.x).toBeCloseTo(expectedInterpolatedX);
playerMesh.position.x = 999;
expect(world.x[playerSlot]).toBe(beforeX);
```

Add tests that destroyed entities hide their instance, capacity is bounded, and
dispose releases every geometry and material exactly once. Inject a renderer
port; never instantiate `WebGLRenderer` in jsdom.

- [ ] **Step 2: Run RED**

```powershell
npx vitest run tests/game-v2/presentation/ThreeRenderBridge.test.ts --pool=forks --maxWorkers=1
```

- [ ] **Step 3: Implement scene and instancing**

`ThreeScene` owns `Scene`, lights, materials, geometries, one player mesh, an
enemy `InstancedMesh`, projectile `InstancedMesh`, pickup `InstancedMesh`, and a
renderer port:

```ts
export type RendererPort = {
  render(scene: THREE.Scene, camera: THREE.Camera): void;
  setSize(width: number, height: number, updateStyle: boolean): void;
  dispose(): void;
};
```

RenderSnapshotWriter copies only canonical numeric state into preallocated
typed arrays outside system iteration.

- [ ] **Step 4: Verify and commit**

```powershell
npx vitest run tests/game-v2/presentation/ThreeRenderBridge.test.ts --pool=forks --maxWorkers=1
npm run typecheck
git commit -m "feat(game-v2): bridge ECS state into Three.js"
```

---

### Task 8: V2-007 — Fixed Orthographic Camera

**Files:**

- Create: `game-v2/presentation/OrthographicCameraController.ts`
- Test: `tests/game-v2/presentation/OrthographicCameraController.test.ts`

**Interfaces:**

- Consumes: viewport width/height and player center coordinates.
- Produces: fixed top-down `OrthographicCamera`, visible world width/height, and
  deterministic `resize`/`follow` behavior.

- [ ] **Step 1: Write failing aspect-ratio tests**

```ts
const controller = new OrthographicCameraController(18);
controller.resize(1600, 900);
expect(controller.visibleHeight).toBe(18);
expect(controller.visibleWidth).toBe(32);
expect(controller.camera.rotation.x).toBeCloseTo(-Math.PI / 2);
```

Add 4:3 and 21:9 cases, invalid zero dimensions, and follow assertions proving
camera rotation never changes.

- [ ] **Step 2: Run RED**

```powershell
npx vitest run tests/game-v2/presentation/OrthographicCameraController.test.ts --pool=forks --maxWorkers=1
```

- [ ] **Step 3: Implement fixed top-down framing**

Keep vertical world span at `18`, derive horizontal span from aspect, use near
`0.1`, far `200`, camera height `40`, and `up=(0,0,-1)`. Follow player X/Z without
lerp state in the simulation.

- [ ] **Step 4: Verify and commit**

```powershell
npx vitest run tests/game-v2/presentation/OrthographicCameraController.test.ts --pool=forks --maxWorkers=1
npm run typecheck
git commit -m "feat(game-v2): add fixed top-down camera"
```

---

### Task 9: V2-008 — Desktop Input and Deterministic Movement

**Files:**

- Create: `game-v2/contracts/PlayerIntent.ts`
- Create: `game-v2/input/KeyboardInput.ts`
- Create: `game-v2/systems/MovementSystem.ts`
- Test: `tests/game-v2/input/KeyboardInput.test.ts`
- Test: `tests/game-v2/systems/MovementSystem.test.ts`

**Interfaces:**

- Consumes: keyboard events and mutable output intent; world/player slot plus
  fixed `StepContext`.
- Produces: normalized `moveX/moveY`, edge-triggered `dashPressed`, and player
  transform updates.

- [ ] **Step 1: Write failing input tests**

Dispatch `KeyW`, `KeyD`, and `Space`; assert sampled diagonal magnitude is `1`,
Space is true for exactly one sample while held, blur clears every key, and
`dispose()` removes listeners.

- [ ] **Step 2: Write failing movement tests**

```ts
const intent = { moveX: 1, moveY: 0, dashPressed: false };
movement.step(world, player, { tick: 1, deltaSeconds: 1 / 60, intent });
expect(world.x[slot]).toBeCloseTo(PLAYER_MOVE_SPEED / 60);
expect(world.previousX[slot]).toBe(0);
```

Prove 60 one-tick steps equal one simulated second and a zero intent does not
drift.

- [ ] **Step 3: Run RED**

```powershell
npx vitest run tests/game-v2/input/KeyboardInput.test.ts tests/game-v2/systems/MovementSystem.test.ts --pool=forks --maxWorkers=1
```

- [ ] **Step 4: Implement without hot-path allocation**

KeyboardInput keeps booleans and writes into a caller-owned `PlayerIntent`.
MovementSystem copies current to previous position, normalizes defensively, and
uses `PLAYER_MOVE_SPEED = 6` world units/second from `Mvp0Config.ts`.

- [ ] **Step 5: Verify and commit**

```powershell
npx vitest run tests/game-v2/input/KeyboardInput.test.ts tests/game-v2/systems/MovementSystem.test.ts --pool=forks --maxWorkers=1
npm run typecheck
git commit -m "feat(game-v2): add deterministic desktop movement"
```

---

### Task 10: V2-009 — Dash and Invulnerability

**Files:**

- Create: `game-v2/systems/DashSystem.ts`
- Modify: `game-v2/config/Mvp0Config.ts`
- Modify: `game-v2/world/World.ts`
- Test: `tests/game-v2/systems/DashSystem.test.ts`

**Interfaces:**

- Consumes: player slot, normalized intent, and fixed delta.
- Produces: dash velocity/remaining time, 2.5-second cooldown, one charge, and
  180-millisecond invulnerability state in ECS numeric stores.

- [ ] **Step 1: Write failing dash tests**

Test dash begins only on a press with available charge, uses current movement
direction or last non-zero facing, moves exactly `DASH_SPEED * DASH_DURATION`,
ignores repeated press during cooldown, expires i-frames after 180 ms, restores
one charge after 2.5 seconds, and reset clears every dash field.

- [ ] **Step 2: Run RED**

```powershell
npx vitest run tests/game-v2/systems/DashSystem.test.ts --pool=forks --maxWorkers=1
```

- [ ] **Step 3: Implement ordered dash resolution**

Use tuning constants:

```ts
export const DASH_SPEED = 16;
export const DASH_DURATION_SECONDS = 0.18;
export const DASH_INVULNERABILITY_SECONDS = 0.18;
export const DASH_COOLDOWN_SECONDS = 2.5;
```

DashSystem runs before MovementSystem and writes a `movementOverride` flag plus
dash velocity into preallocated player arrays. Timers decrement only in fixed
steps.

- [ ] **Step 4: Verify and commit**

```powershell
npx vitest run tests/game-v2/systems/DashSystem.test.ts tests/game-v2/systems/MovementSystem.test.ts --pool=forks --maxWorkers=1
npm run typecheck
git commit -m "feat(game-v2): add dash timing and i-frames"
```

---

### Task 11: V2-010 — One Pooled Enemy

**Files:**

- Create: `game-v2/systems/EnemySystem.ts`
- Modify: `game-v2/config/Mvp0Config.ts`
- Test: `tests/game-v2/systems/EnemySystem.test.ts`

**Interfaces:**

- Consumes: world, player handle, RNG, and spawn request.
- Produces: one reusable enemy entity with bounded chase movement and
  `releaseEnemy(entity)`.

- [ ] **Step 1: Write failing enemy lifecycle tests**

Spawn at `(8, 0)`, step 60 ticks, and assert distance to the player decreases by
`ENEMY_MOVE_SPEED`. Destroy and respawn; assert the slot is reused with a new
generation and every prior health/velocity value is reset. Prove a zero-distance
enemy does not produce NaN.

- [ ] **Step 2: Run RED**

```powershell
npx vitest run tests/game-v2/systems/EnemySystem.test.ts --pool=forks --maxWorkers=1
```

- [ ] **Step 3: Implement ECS-backed pooling**

Use the World's free-slot allocator; do not create enemy objects. MVP-0 values
are `health=30`, `radius=0.6`, `speed=2.2`, `contactDamage=15`, `xpValue=5`.
EnemySystem updates previous/current positions with numeric loops.

- [ ] **Step 4: Verify and commit**

```powershell
npx vitest run tests/game-v2/systems/EnemySystem.test.ts tests/game-v2/world/World.test.ts --pool=forks --maxWorkers=1
npm run typecheck
git commit -m "feat(game-v2): add first pooled enemy"
```

---

### Task 12: V2-011 — Auto-Target and First Weapon

**Files:**

- Create: `game-v2/systems/TargetingSystem.ts`
- Create: `game-v2/systems/WeaponSystem.ts`
- Modify: `game-v2/config/Mvp0Config.ts`
- Test: `tests/game-v2/systems/TargetingSystem.test.ts`
- Test: `tests/game-v2/systems/WeaponSystem.test.ts`

**Interfaces:**

- Consumes: player slot, enemy component mask, RNG only for exact-distance tie
  resolution, weapon cooldown.
- Produces: nearest target handle and pooled projectile entity with fixed
  velocity, lifetime, radius, and damage.

- [ ] **Step 1: Write failing target-selection tests**

Prove nearest live enemy inside range is selected, dead/out-of-range entities
are rejected, equal-distance choice is stable for the same run seed, and no
target returns the sentinel `NO_ENTITY`.

- [ ] **Step 2: Write failing weapon tests**

Step for 120 ticks and assert the weapon fires at ticks `0`, `30`, `60`, and
`90` for a 0.5-second interval, projectile velocity is normalized toward the
selected enemy, and absent target creates no projectile.

- [ ] **Step 3: Run RED**

```powershell
npx vitest run tests/game-v2/systems/TargetingSystem.test.ts tests/game-v2/systems/WeaponSystem.test.ts --pool=forks --maxWorkers=1
```

- [ ] **Step 4: Implement bounded nearest-target scan and weapon cadence**

Use squared distance, numeric slot iteration, `WEAPON_RANGE = 12`,
`PROJECTILE_SPEED = 14`, `PROJECTILE_DAMAGE = 10`, and
`PROJECTILE_LIFETIME_SECONDS = 1.5`. Weapon cooldown is stored as integer ticks,
not floating wall-clock time.

- [ ] **Step 5: Verify and commit**

```powershell
npx vitest run tests/game-v2/systems/TargetingSystem.test.ts tests/game-v2/systems/WeaponSystem.test.ts --pool=forks --maxWorkers=1
npm run typecheck
git commit -m "feat(game-v2): add auto-target starter weapon"
```

---

### Task 13: V2-012 — Collision, Damage, and Death

**Files:**

- Create: `game-v2/systems/CombatSystem.ts`
- Modify: `game-v2/config/Mvp0Config.ts`
- Test: `tests/game-v2/systems/CombatSystem.test.ts`

**Interfaces:**

- Consumes: projectile/enemy/player stores and collision radii.
- Produces: exactly-once projectile damage, contact damage at authored cadence,
  entity destruction, and game-over signal.

- [ ] **Step 1: Write failing projectile collision tests**

Prove a projectile overlapping an enemy deals 10 once, is released immediately,
cannot damage a second enemy during the same tick, and kills/releases an enemy
at zero health.

- [ ] **Step 2: Write failing player damage tests**

Prove contact damage respects its cooldown, dash i-frames reject damage without
consuming health, health clamps at zero, and the death result emits exactly once:

```ts
expect(combat.step(world, context)).toEqual({ playerDied: true, killedEnemies: 0 });
expect(combat.step(world, nextContext)).toEqual({ playerDied: false, killedEnemies: 0 });
```

- [ ] **Step 3: Run RED**

```powershell
npx vitest run tests/game-v2/systems/CombatSystem.test.ts --pool=forks --maxWorkers=1
```

- [ ] **Step 4: Implement bounded collision pass**

MVP-0 may use a bounded projectile×single-enemy pass because V2-010 locks one
enemy. The public CombatSystem contract accepts a collision candidate provider
so MVP-1 can replace it with a spatial index without rewriting damage rules.
Reuse one mutable result object per system instance.

- [ ] **Step 5: Verify and commit**

```powershell
npx vitest run tests/game-v2/systems/CombatSystem.test.ts tests/game-v2/systems/DashSystem.test.ts --pool=forks --maxWorkers=1
npm run typecheck
git commit -m "feat(game-v2): resolve combat damage and death"
```

---

### Task 14: V2-013 — XP Pickup and One Level-Up

**Files:**

- Create: `game-v2/systems/ProgressionSystem.ts`
- Create: `game-v2/ui/LevelUpOverlay.tsx`
- Modify: `game-v2/config/Mvp0Config.ts`
- Test: `tests/game-v2/systems/ProgressionSystem.test.ts`
- Test: `tests/game-v2/ui/LevelUpOverlay.test.tsx`

**Interfaces:**

- Consumes: killed enemy position/XP value, player pickup collision, and one
  explicit upgrade selection.
- Produces: pooled XP pickup, player XP/level, `level-up` lifecycle transition,
  starter weapon damage upgrade, and resumed play.

- [ ] **Step 1: Write failing XP tests**

Prove an enemy kill creates one 5-XP pickup, player overlap consumes it once,
the first threshold at 5 XP advances level 1→2, surplus XP is retained, and the
lifecycle pauses at `level-up`.

- [ ] **Step 2: Write failing overlay test**

```tsx
render(<LevelUpOverlay damageBefore={10} onChoose={onChoose} />);
fireEvent.click(screen.getByRole('button', { name: /increase damage/i }));
expect(onChoose).toHaveBeenCalledWith('starter-damage-2');
```

Assert a single primary choice is visible and keyboard activation works. The
full three-card/13-second/timeout/reroll/banish contract belongs to V2-104; MVP-0
must not counterfeit that later scope.

- [ ] **Step 3: Run RED**

```powershell
npx vitest run tests/game-v2/systems/ProgressionSystem.test.ts tests/game-v2/ui/LevelUpOverlay.test.tsx --pool=forks --maxWorkers=1
```

- [ ] **Step 4: Implement one-choice paused upgrade**

ProgressionSystem uses ECS pickup slots. `resolveUpgrade` changes starter damage
from `10` to `15`, clears the pending offer, and calls
`lifecycle.resumeFromLevelUp()`. Overlay presentation does not modify world
state directly.

- [ ] **Step 5: Verify and commit**

```powershell
npx vitest run tests/game-v2/systems/ProgressionSystem.test.ts tests/game-v2/ui/LevelUpOverlay.test.tsx --pool=forks --maxWorkers=1
npm run typecheck
npm run check:ui-contract
git commit -m "feat(game-v2): add first paused level-up"
```

---

### Task 15: V2-014 — Runtime Composition and MVP-0 Evidence Gate

**Files:**

- Create: `game-v2/runtime/GameV2Runtime.ts`
- Create: `game-v2/runtime/createMvp0Runtime.ts`
- Create: `game-v2/replay/ReplayRunner.ts`
- Modify: `game-v2/GameV2App.tsx`
- Modify: `game-v2/game-v2.css`
- Test: `tests/game-v2/integration/Mvp0Runtime.test.ts`
- Test: `tests/game-v2/replay/ReplayRunner.test.ts`
- Create: `e2e/game-v2-walking-skeleton.spec.ts`
- Modify: `docs/game-v2/PROGRESS.md`

**Interfaces:**

- Consumes: canvas host, renderer factory, run ID/seed, keyboard adapter, and
  render-frame deltas.
- Produces: `start`, `advanceFrame`, `chooseUpgrade`, `snapshotHash`, `reset`,
  `dispose`, and a playable `/game-v2` surface.

- [ ] **Step 1: Write failing end-to-end runtime test**

Use a fake renderer and scripted input. Assert:

```ts
expect(run.phase).toBe('playing');
expect(run.playerMoved).toBe(true);
expect(run.dashPreventedDamage).toBe(true);
expect(run.enemyKilled).toBe(true);
expect(run.levelUpReached).toBe(true);
expect(run.upgradeApplied).toBe(true);
```

Then kill the player and prove one game-over transition. Reset with the same
seed and input and prove the final state hash matches.

- [ ] **Step 2: Write failing cross-FPS replay test**

```ts
const at30 = replayRunner.run(recording, 30);
const at60 = replayRunner.run(recording, 60);
const at120 = replayRunner.run(recording, 120);
expect(at30.finalHash).toBe(at60.finalHash);
expect(at120.finalHash).toBe(at60.finalHash);
expect(at30.tick).toBe(at60.tick);
expect(at120.tick).toBe(at60.tick);
```

Reject mismatched recording schema, config version, run seed, and missing input
tick.

- [ ] **Step 3: Run RED**

```powershell
npx vitest run tests/game-v2/integration/Mvp0Runtime.test.ts tests/game-v2/replay/ReplayRunner.test.ts --pool=forks --maxWorkers=1
```

- [ ] **Step 4: Compose the runtime in fixed system order**

The only legal step order is:

```text
sample recorded PlayerIntent
→ DashSystem
→ MovementSystem
→ EnemySystem
→ TargetingSystem
→ WeaponSystem
→ projectile movement
→ CombatSystem
→ ProgressionSystem
→ lifecycle terminal/level-up transition
→ optional snapshot checkpoint
```

`GameV2App` owns one runtime in a ref, starts one RAF, samples KeyboardInput into
one mutable intent, writes one RenderSnapshot, renders, pauses simulation during
level-up, and disposes RAF/input/renderer/runtime on unmount. React state changes
only for low-frequency phase/level-up UI.

- [ ] **Step 5: Verify integration GREEN**

Run separately:

```powershell
npx vitest run tests/game-v2 --pool=forks --maxWorkers=1
npm run typecheck
npm run check:architecture
npm run check:reset-coverage
npm run check:ui-contract
npm run lint
npm run build
```

Expected: every command passes with no new singleton, type, lint, UI contract,
or build regression.

- [ ] **Step 6: Add and run browser smoke**

The Playwright test opens `/game-v2?no-sw=true`, expects the WebGL canvas and V2
marker, presses `KeyD`, confirms the player render marker changes, presses
`Space`, reaches the level-up overlay through a deterministic test seed, chooses
the upgrade, and confirms play resumes. A second test opens `/?no-sw=true` and
proves the legacy landing/hub marker still renders.

Run:

```powershell
npx playwright test e2e/game-v2-walking-skeleton.spec.ts --project=chromium --workers=1 --reporter=list
```

- [ ] **Step 7: Record evidence and close MVP-0**

Record V2-000 through V2-014 as closed in `PROGRESS.md` only if every acceptance
test passed. Include exact commands, results, commit hash, known limitations,
and next task `V2-100`. `MASTER_PLAN.md` remains the immutable task-definition
and acceptance-criteria catalog. Capture no production cutover.

- [ ] **Step 8: Commit the evidence gate**

```powershell
git commit -m "feat(game-v2): complete deterministic MVP-0 skeleton"
```

---

## Agent Orchestrator Execution Policy

- Dispatch one fresh implementation agent per numbered task.
- The primary agent performs contract/spec review after each task and runs the
  focused verification before accepting it.
- A second reviewer checks architecture, determinism, lifecycle cleanup, and
  accidental legacy imports for Tasks 1, 5, 7, and 15.
- Agents may not edit another task's active files concurrently.
- Failed verification returns to the same task; the next dependency does not
  start.
- Progress and decision documents are the resume authority. Chat history is not.
- No agent may deploy, modify production economy, or approve production cutover.

## Plan Self-Review Record

- **Spec coverage:** MVP-0 V2-000 through V2-014 each maps to exactly one task;
  fixed-step, seeded RNG, lifecycle, ECS, replay, Three bridge, orthographic
  camera, desktop input, dash, enemy, weapon, combat, XP, level-up, and evidence
  gates are all covered.
- **Deferred-scope check:** market, leverage, three-card 13-second flow,
  reroll/banish, mobile, boss, cash-out, and content expansion are not
  implemented by this plan.
- **Authority check:** legacy gameplay systems are forbidden imports; Railway
  market reuse begins only in MVP-2 through a future adapter.
- **Type consistency:** `EntityId`, `PlayerIntent`, `StepContext`,
  `ClockAdvanceResult`, lifecycle phases, snapshot schema, and runtime public
  methods are defined before first use and retain one spelling.
- **Performance check:** fixed capacity, caller-owned output buffers, instancing,
  numeric loops, and no hot-path collection growth are explicit acceptance
  rules.
- **Safety check:** the default demo remains the fallback entry, Game V2 is
  noindex, and production cutover is absent.
