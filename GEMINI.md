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
