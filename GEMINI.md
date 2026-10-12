# GEMINI.md — Crypto Survivors

Context for the Antigravity CLI (`agy`) when it works in this repository.

`CLAUDE.md` and `AGENTS.md` are the deeper references and are also loaded — read `CLAUDE.md`
first for architecture. This file adds what is specific to running as a **delegated agent**.

---

## The delegation contract

You are usually invoked non-interactively by an orchestrator (Claude Code) against a written
spec, and a human reviews your diff before it lands. That shapes what "done" means.

**Verify before you build.** The spec was written by someone reading the code from the outside.
If it names a file, a line number, or a behaviour, confirm it yourself first. A spec that turns
out to be wrong is a finding to report, not an obstacle to work around. Say so and stop.

**Trace every signal to its real producer.** The most expensive bug this repo has shipped from a
delegated task was a feature wired to a variable whose name suggested player input but whose
value came from an automatic system. It passed every test, because every test supplied the
variable by hand. Before you consume a value, grep for where it is actually assigned in
production, and follow it back to the source. Name-based assumptions are how dead features get
merged green.

**A passing test is not evidence on its own.** For anything that consumes runtime state, at
least one test must drive the real call path rather than injecting the input directly. If you
cannot reach the production path from a test, say so in your report instead of settling for the
isolated one.

**Every new parameter needs a production call site.** If you add an argument and nothing passes
a real value for it, you have added dead weight that reads as a working feature. Either wire it
or leave it out.

**Do not duplicate tuning constants.** If a number has to stay equal to a number somewhere else,
import it or assert the equality in a test. Two copies silently drift.

**Stay inside the spec.** Do not reformat files you were not asked to touch, do not run a
repo-wide formatter, and do not fix unrelated things you notice — report them instead.

**Never write to git.** No `add`, `commit`, `push`, `checkout`, `restore`, `stash`, or branch
operations. Leave everything in the working tree; the orchestrator handles version control.

**Report honestly.** State what you did not finish, what you were unsure about, and what you
deliberately left alone. An accurate "I could not verify this" is worth more than a confident
summary that has to be re-checked from scratch.

---

## Project shape

Real-time market-driven survival game (Vampire Survivors style). Live BTC/USD price data drives
difficulty, enemy behaviour and rewards. React 19 + TypeScript 5.8 + Vite 6, 60 FPS target.

**Three independent packages**, each with its own `package.json`/`tsconfig`/lockfile:
- **root** — the React/Vite game client.
- **`railway-market-server/`** — stateless REST API (profile, sessions, wallet, leaderboard,
  telemetry). Owns the Postgres schema.
- **`railway-market-aggregator/`** — the market pipeline: Binance/Coinbase WebSocket → indicators
  → SSE stream. This is the WebSocket service, not the market server.

**There is no Supabase.** No dependency, no directory, no imports. Older docs that describe a
Supabase backend are history. Auth is Railway-native (`services/auth/RailwayAuthService.ts`,
JWT signed by the API server).

## Performance rules (non-negotiable)

1. **No allocation in the RAF loop** — no `new Object()`, `[].map()`, `[].filter()` inside
   `GameEngine.tsx` or anything it calls per frame. Pre-allocated arrays and object pools only.
2. **No `useState`/`setState` for 60 FPS data** — `useRef` or singleton service state.
3. **Object pooling** for bullets/enemies/particles via `PoolManager` (`services/combat/`).
4. **Spatial hashing** for collision via `SpatialGrid`. Never O(N²).
5. **Pause-aware timers** — drive gameplay timing from `TimeService` (`getDeltaTime()` returns 0
   while paused, `getGameTime()` is the frozen-aware clock), never native `setTimeout`. There is
   no `TimeService.setTimeout`; older docs claimed one.

## Conventions

- `strict` TypeScript with `noUncheckedIndexedAccess`. No `any` outside tests. Prefer `type` over
  `interface`. Type-only imports: `import { type Foo } from './bar'`.
- Tunable numbers live in `config/`, or beside the existing config block for the service that
  owns them — never inlined at the use site.
- Singletons are `class FooClass { static getInstance() }` + `export const Foo = ...`. **Prefer
  not to add new ones**: a new singleton needs an entry in
  `config/architecture/singleton-whitelist.json` and reset registration, and an injected instance
  is usually the better answer.
- Cross-run state resets through the `gameReset` event and `services/core/ResetOrchestrator.ts`.
- Naming: `camelCase` values, `PascalCase` types/components, `UPPER_SNAKE_CASE` constants.

## Game V2 (`game-v2/**`) — a second runtime with different rules

`game-v2/**` is an isolated Three.js runtime behind the private `/game-v2` route. **Every rule in
"Performance rules" above describes the legacy runtime and does not transfer.** The mechanisms
named there are forbidden here:

> Never import `GameRuntime`, `GameEngine`, `TimeService`, `PoolManager`, `GameRenderer`, legacy
> replay services, the global `EventBus`, or `ResetOrchestrator` into `game-v2/**`.
> `tests/game-v2/architecture/GameV2Boundary.test.ts` enforces this with TypeScript AST parsing
> across alias, relative, named, default, dynamic and side-effect import forms. Do not route
> around it — if a task seems to need one of these, the task is wrong; stop and report.

The same goals are met by different means:

| Legacy mechanism | Game V2 equivalent |
|---|---|
| `PoolManager` | The ECS `World`'s own free-slot allocator (`game-v2/world/World.ts`) |
| `TimeService` | Fixed 60 Hz `SimulationClock`; systems receive a `StepContext` |
| Global `EventBus` | Direct calls; systems are constructed and sequenced by the caller |
| `SpatialGrid` | Numeric slot scans over fixed 4,096 capacity (MVP-0 scale) |
| Singleton `getInstance()` | **No singletons at all.** Plain classes the caller constructs |

### Determinism is the product here

The runtime must replay to an identical state hash at 30/60/120 render FPS, so:

- **No `Math.random()`, `Date.now()`, `performance.now()`, `setTimeout`, or `setInterval`** anywhere
  in `game-v2/**`. Randomness comes from an injected `DeterministicRng` (xorshift32, golden
  sequence pinned by test).
- **Never consume an RNG sample on a path that can still fail.** Validate the request, then check
  capacity, then sample. A sample drawn before a throw desynchronises every later replay. This has
  already caused one review round.
- Gameplay timing is **integer ticks**, never fractional wall-clock seconds. Derive tick counts as
  `Math.ceil(seconds * SIMULATION_HZ)` in `game-v2/config/Mvp0Config.ts` — never hardcode a tick
  count that a seconds constant already expresses.
- Tie-breaks and iteration order must be positional (ascending slot), not random.

### ECS conventions

- `World` owns parallel typed-array component stores at a fixed `4_096` capacity. Entity handles
  encode `generation * capacity + slot`; **that encoding has exactly one owner — never re-derive it
  from `world.masks.length` in a system.**
- `0` is a valid entity id (generation 0, slot 0). The "no entity" sentinel is `NO_ENTITY = -1`.
- Match component masks **all-bit** (`(mask & REQUIRED) === REQUIRED`), never any-bit.
- Capture `previousX`/`previousY` **before** integrating a position — the renderer interpolates
  between them.
- A released slot is cleared by `World`, so a reused slot must carry no state from its previous
  occupant. When you add a component store, add it to `clearSlot` too.

### Style the reviewer expects

- **Validate the whole boundary before mutating anything.** Rejections must be atomic: no partial
  writes, no entity created, no counter advanced. Systems here follow a two-pass shape — validate
  every slot you will touch, then act.
- **Overflow-safe normalisation.** Coordinates can sit near the Float32 limit, where `dx*dx + dy*dy`
  becomes `Infinity`. Use the existing max-axis scaling idiom (`DashSystem`, `EnemySystem`,
  `TargetingSystem`) rather than inventing a second numeric approach.
- `noUncheckedIndexedAccess` is on: a typed-array read is `T | undefined`. Narrow it. Never `!`.
- No allocation in `step()` or render-sync loops — no `new`, no object/array literals, no
  `.map`/`.filter`/`.forEach`, no per-tick closures. Numeric `for` loops only.

### Working on a Game V2 task

The written record is the authority, not any prompt: `docs/game-v2/MASTER_PLAN.md` (stable task
IDs and acceptance criteria), `docs/game-v2/PROGRESS.md` (live checkpoint — repository reality,
not intent), `docs/game-v2/DECISIONS.md` (append-only ADRs), and the MVP-0 plan at
`docs/superpowers/plans/2026-08-21-game-v2-mvp0-walking-skeleton.md`.

Focused verification, which is what to run while iterating:

```bash
npx vitest run tests/game-v2 --pool=forks --maxWorkers=1
npm run typecheck
npm run check:architecture
```

Expect a deliberate mutation pass to be requested: break the rule the test claims to protect and
confirm the test actually fails. A mutant that kills nothing means the test is decorative.

`skills-lock.json` and `docs/design/CORE_REDESIGN_V1.md` are user-owned working-tree changes.
Never edit or revert them.

## Commands

```bash
npm run typecheck        # tsc --noEmit
npm run lint             # ESLint (expect 0 errors)
npm run test             # Vitest — also runs railway-market-server/test/**
npm run check:baseline   # the full gate CI runs; see package.json for the current chain
```

Run the narrowest check that covers your change while iterating; run the full gate before
declaring done. `check:baseline` is slow — do not run it in a loop.

## Debug shortcuts

`Ctrl+Shift+A` analytics · `Ctrl+Shift+D` admin · `Ctrl+Shift+V` VFX lab · `F1` cheats (dev only)
· `EventBus.enableTracing()` to log every event emission.
