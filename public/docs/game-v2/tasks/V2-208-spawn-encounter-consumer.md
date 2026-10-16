# V2-208 — Spawn Encounter Consumer (Task Brief)

> Milestone: MVP-2 — Market Vertical Slice
> Depends on: `V2-207` (primary/support composer, accepted and closed)
> Design contract: `docs/superpowers/specs/2026-08-21-threejs-gameplay-v2-design.md`
> §6.2 (Encounter outputs: `SPAWN` — "Produce a bounded, themed enemy composition.")
> Master plan "Done when": "Market intent selects composition without raw
> indicator reads in enemies."
> Governing decisions: V2-ADR-128 through V2-ADR-131 (this brief)
> Live execution state: `docs/game-v2/PROGRESS.md`

## Scope Decision (recorded, not re-litigated per task)

The "Done when" property is structural: an enemy-composition consumer must
select composition from an already-composed `SpawnEncounterOutput` —
never from `MarketSnapshot` or a raw indicator value directly. This task
proves that boundary by construction: `SpawnEncounterConsumer`'s public API
accepts only a `SpawnEncounterOutput`, and nothing in `game-v2/systems/**`
imports `MarketSnapshot`.

`enemyBudget` is spent through the existing, already-tested
`EnemyComposer.compose` — reused unmodified, not reimplemented.

`themeId` is validated against the real set of theme ids any real family
currently produces (`'bullish-breakout'`/`'bearish-breakout'`, from
`TrendBreakoutEncounter.ts`'s `THEME_BY_DIRECTION`, the only family that
produces a `SPAWN` output per V2-ADR-104) rather than accepted blindly.
This gives the field a real reader for the first time since `V2-204`,
mirroring `V2-207`'s own precedent of finally reading `priority`/
`compatibleWith`. An unrecognized `themeId` throws — the same
fail-loud convention `EnemyComposer`'s constructor and every `assertX`
validator in this project already use, rather than silently falling back.

What this task deliberately does **not** do: build a themeId → distinct
enemy registry mapping that differentiates composition per theme. Only one
enemy registry exists (`MVP1_ENEMY_REGISTRY`, three archetypes, none
directionally tagged) — `V2-300` (Six enemy archetypes, MVP-3) is where
themed content would be authored. Building a registry-of-registries today,
with every entry pointing at the same array, would be indirection with no
behavioral difference — the kind of premature abstraction this project's
own conventions avoid (`CLAUDE.md`: "don't design for hypothetical future
requirements"). Both known theme ids resolve to the same real
`EnemyComposer`/`MVP1_ENEMY_REGISTRY` pairing today; a future task can add
real per-theme differentiation once `V2-300`'s content exists, at which
point `SpawnEncounterConsumer`'s constructor-injected `EnemyComposer`
already gives that a seam to extend through (inject a themed composer
rather than the shared default).

Not wired into `GameV2Runtime` — matches `V2-203` through `V2-207`'s own
precedent. `GameV2Runtime`'s spawn cadence still runs its fixed
`MVP0_ENEMY_SPAWN_BUDGET`/`MVP0_ENEMY_SPAWN_INTERVAL_TICKS` loop unchanged;
replacing that cadence with `MarketEncounterDirector`-driven spawning is a
larger runtime-wiring change out of this task's scope, matching every
`game-v2/market/**`-only MVP-2 task since `V2-203`.

## Done When

1. `game-v2/systems/SpawnEncounterConsumer.ts`: given a `SpawnEncounterOutput`
   and an RNG, produces the same bounded enemy composition
   `EnemyComposer.compose(enemyBudget, rng, out)` would produce for that
   output's `enemyBudget` — its only input is the already-composed output,
   never `MarketSnapshot` or a raw indicator value.
2. An unrecognized `themeId` throws rather than silently composing.
3. `EnemyComposer` is reused unmodified (no logic duplicated or
   reimplemented).
4. Not wired into `GameV2Runtime`.

## Scope

In scope:

1. `game-v2/market/TrendBreakoutEncounter.ts`: export the existing
   `THEME_BY_DIRECTION` object (renamed `TREND_BREAKOUT_THEME_BY_DIRECTION`
   for consistency with this family's other exported constants) and a
   derived `TREND_BREAKOUT_THEME_IDS: readonly string[]` — no behavior
   change, only exposing what already exists for reuse.
2. `game-v2/systems/SpawnEncounterConsumer.ts`: `SpawnEncounterConsumer`
   class. Constructor takes an optional injected `EnemyComposer` (defaults
   to `new EnemyComposer()`, i.e. `MVP1_ENEMY_REGISTRY`) and an optional
   injected known-theme-id set (defaults to
   `new Set(TREND_BREAKOUT_THEME_IDS)`), mirroring `CombatSystem`'s own
   optional-injected-dependency pattern (V2-ADR-098). `compose(output, rng,
   out)` validates `output.themeId` against the known set, then delegates
   `output.enemyBudget` to the injected `EnemyComposer.compose`.
3. Tests: `tests/game-v2/systems/SpawnEncounterConsumer.test.ts` — real
   `bullish-breakout`/`bearish-breakout` outputs compose correctly via the
   real `EnemyComposer`; an unrecognized `themeId` throws; the injected
   `EnemyComposer` and RNG are the ones actually used (proven with a spy);
   an injected custom known-theme-id set is honoured over the default.

Out of scope:

- A themeId → distinct-registry mapping (no anchored content to
  differentiate on; deferred to `V2-300`+).
- Any change to `EnemyComposer`, `EnemySystem`, or `EnemyRegistry.ts`.
- Wiring `SpawnEncounterConsumer` into `GameV2Runtime`'s spawn cadence.
- `WORLD_EVENT`/`LOOT_EVENT` consumption (`V2-209`/`V2-210`).

## Preflight Decisions To Record

- **V2-ADR-128 (proposed): `SpawnEncounterConsumer`'s only input is a
  `SpawnEncounterOutput` — never `MarketSnapshot` or a raw indicator
  value.** Rationale: this is the literal, structural proof of the
  master-plan "Done when" property ("market intent selects composition
  without raw indicator reads in enemies"), enforced by the type
  signature, not just by convention.
- **V2-ADR-129 (proposed): an unrecognized `themeId` throws.** Rationale:
  matches `EnemyComposer`'s constructor and every `assertX` validator's
  fail-loud convention; a silent fallback could mask a real typo/drift
  between a family's produced theme ids and the consumer's known set.
- **V2-ADR-130 (proposed): both known theme ids
  (`bullish-breakout`/`bearish-breakout`) resolve to the same
  `MVP1_ENEMY_REGISTRY` — no themeId-differentiated registry is built in
  this task.** Rationale: only one enemy registry with no directional
  tagging exists; inventing a differentiation with no anchored content
  would be indirection with no behavioral difference, deferred to
  `V2-300`+ once themed archetype content exists.
- **V2-ADR-131 (proposed): `SpawnEncounterConsumer` is not wired into
  `GameV2Runtime`.** Rationale: matches `V2-203` through `V2-207`'s own
  precedent; replacing the fixed spawn cadence with market-driven spawning
  is a larger runtime-wiring change, out of this task's scope.

## Files

- New: `game-v2/systems/SpawnEncounterConsumer.ts`,
  `tests/game-v2/systems/SpawnEncounterConsumer.test.ts`
- Modify: `game-v2/market/TrendBreakoutEncounter.ts` (export rename +
  one new derived constant, no logic change).

## Steps

- [ ] **Step 1: Export `TREND_BREAKOUT_THEME_BY_DIRECTION`/`TREND_BREAKOUT_THEME_IDS`**

  Rename the existing local `THEME_BY_DIRECTION` to
  `TREND_BREAKOUT_THEME_BY_DIRECTION` and export it; add and export
  `TREND_BREAKOUT_THEME_IDS = Object.freeze(Object.values(...))`. Re-run
  `TrendBreakoutEncounter.test.ts` unmodified to confirm no behavior
  change.

- [ ] **Step 2: `SpawnEncounterConsumer` (RED then implement)**

  Prove: a real `bullish-breakout` output composes a batch spending
  exactly what `EnemyComposer.compose` alone would produce for the same
  budget/rng seed (delegation, not reimplementation); same for
  `bearish-breakout`; an unrecognized `themeId` throws; an injected mock
  `EnemyComposer` receives the exact `(enemyBudget, rng, out)` call,
  proving delegation rather than direct reimplementation; an injected
  custom known-theme-id set is honoured over the default.

- [ ] **Step 3: Verify (GREEN)**

  ```powershell
  npx vitest run tests/game-v2 --pool=forks --maxWorkers=1
  npm run typecheck
  npm run check:architecture
  npm run check:reset-coverage
  npm run check:ui-contract
  npm run check:event-contract
  npm run build
  ```

- [ ] **Step 4: Mutation pass**

  At minimum: removing the `themeId` validation (unknown id no longer
  throws); ignoring the injected `EnemyComposer`/known-id-set constructor
  arguments (always using the default); swapping which argument
  (`enemyBudget` vs `rng`) is forwarded to the injected composer.

## Acceptance Criteria

1. `SpawnEncounterConsumer.compose` produces the same composition
   `EnemyComposer.compose` would for the same real budget/rng, driven
   only by a `SpawnEncounterOutput`.
2. An unrecognized `themeId` throws.
3. `EnemyComposer`/`EnemySystem`/`EnemyRegistry.ts` are unmodified.
4. Nothing outside `game-v2/systems/SpawnEncounterConsumer.ts` and the one
   documented export addition in `TrendBreakoutEncounter.ts` is touched;
   no wiring into `GameV2Runtime`.
5. Every Step 3 gate passes and the Step 4 mutation pass leaves no
   survivor.
