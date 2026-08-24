# V2-202 — Five Lethality Profiles (Task Brief)

> Milestone: MVP-2 — Market Vertical Slice
> Depends on: `V2-201` (locked position context, accepted and closed)
> Design contract: `docs/superpowers/specs/2026-08-21-threejs-gameplay-v2-design.md`
> §7.3 (Leverage risk modes)
> Governing decisions: V2-ADR-092 through V2-ADR-098 (this brief)
> Live execution state: `docs/game-v2/PROGRESS.md`

## Scope Decision (recorded, not re-litigated per task)

Design §7.3 lists seven fields a `CombatLethalityProfile` must contain:
player base-health budget, player armor budget, incoming-damage envelope,
enemy authored-damage profile, recovery tolerance, encounter
pressure/complexity limits, and liquidation distance/reward ceiling. Two
scope questions were put to the user directly, since real infrastructure for
most of these fields does not exist yet (no encounter system before
`V2-207`, no economy/liquidation system before `V2-306`, no heal/regen
mechanic anywhere in `game-v2/**`):

1. **Field scope**: model all seven fields now, not only the three a system
   can consume today. Chosen over the narrower "only build what
   `CombatSystem` reads" option, overriding the recommendation — the four
   fields with no current consumer are still typed, validated, and derived
   from a real existing constant wherever one exists, explicitly documented
   as placeholders pending the task that gives each a reader (mirrors
   `AbilitySlot.startEligible`'s accepted precedent, V2-ADR-062: correct
   data waiting on a consumer is not the same defect class as a store no
   reader can even reach).
2. **Armor mechanic**: percentage damage reduction,
   `finalDamage = rawDamage * enemyDamageMultiplier * (1 - playerArmor)`,
   one composer, one multiplication, one reduction — directly satisfies
   design line 264's "cannot enter two independent multiplier pipelines"
   and the master plan's own Done-When ("no double scaling").

Every profile's `1×` mode must reproduce today's exact behavior byte-for-
byte: `playerMaxHealth = PLAYER_MAX_HEALTH`, `enemyDamageMultiplier = 1`,
`playerArmor = 0`. This is non-negotiable because `UNSPECIFIED_POSITION_CONTEXT`
(`V2-201`) has `leverage: 1`, and every pre-existing MVP-0/MVP-1 test that
never locks a real position depends on that default reproducing today's
constants exactly.

## Done When

Per `MASTER_PLAN.md`: "1×/5×/10×/25×/50× resolve through one composer with
no double scaling." Concretely:

1. `CombatLethalityProfile` is a frozen, versioned contract covering all
   seven design fields, validated by a constructor that rejects malformed
   input.
2. `LEVERAGE_LETHALITY_PROFILES` authors exactly the five displayed modes,
   pairwise distinct by leverage, each passing validation.
3. `resolveIncomingDamage(profile, rawDamage)` is the single composer:
   exactly one multiplication by `enemyDamageMultiplier`, exactly one
   reduction by `(1 - playerArmor)`, a safety floor at zero. No other code
   path scales incoming damage.
4. `CombatSystem` consumes the locked run's profile: `resetPlayer` sets
   `playerMaxHealth` from the profile, `resolveContactDamage` routes raw
   `world.contactDamage` through the composer before applying it to health.
5. Replay determinism is preserved for every leverage mode, not only the
   default: a recording captures the locked `PositionContext` it was made
   under, and replay reconstructs the exact same profile before the first
   tick — closing the `V2-ADR-089` deferral this task inherits.
6. Every pre-existing headless/test call site that never locks a real
   position keeps working unmodified, because the default profile (leverage
   `1`) is byte-identical to today's constants.

## Design: the derivations

`playerMaxHealth(leverage) = round(PLAYER_MAX_HEALTH / leverage)` —
leverage is literally the divisor of the player's health budget, mirroring
how real leveraged-trading liquidation distance shrinks proportionally with
leverage. `enemyDamageMultiplier = 1` and `playerArmor = 0` for every mode:
all five modes differ through exactly one dial (health budget), which is
what makes "no double scaling" true by construction rather than by careful
bookkeeping across two dials. `V2-405` (MVP-4, lethality balance audit) is
the task whose explicit job is tuning these five profiles against "no
unavoidable-death fixture" — this task derives the mechanism and the
anchor, not the final balance.

The four fields with no current reader are still derived from real existing
constants, never invented, and documented as placeholders:

- `incomingDamageEnvelope`: `{ min, max }`, the composer applied to the
  registry's lowest (`SWARMLING_ENEMY_CONTACT_DAMAGE`) and highest
  (`BRUTE_ENEMY_CONTACT_DAMAGE`) authored contact damage at this profile.
  Informational only — no field is authored separately, so it cannot drift
  from the real composer output.
- `recoveryToleranceTicks`: `floor(playerMaxHealth / ENEMY_CONTACT_DAMAGE) *
  ENEMY_CONTACT_COOLDOWN_TICKS` — ticks of continuous worst-case unmitigated
  contact the player could tank before dying. No regen/heal mechanic exists
  to consume this yet.
- `encounterPressureLimit`: `MVP0_MAX_LIVE_ENEMIES` (the real existing live-
  enemy cap), identical across modes today — no encounter system
  (`V2-207`+) exists to differentiate it by leverage yet.
- `encounterComplexityLimit`: `MVP0_ENEMY_SPAWN_BUDGET` (the real existing
  per-interval composition spend), identical across modes today, same
  reason.
- `liquidationDistance`: alias of `playerMaxHealth` — the health-equivalent
  buffer before death, until a real price-distance formula exists (needs
  entry price plus volatility, outside this vertical slice).
- `rewardCeiling`: alias of `leverage` itself — a placeholder for the real
  run-points economy math `V2-306`+ (MVP-3) will define.

## Scope

In scope:

1. `game-v2/contracts/CombatLethalityProfile.ts`: the frozen type and
   `assertCombatLethalityProfile` (mirrors `assertEnemyDefinition`'s shape).
2. `game-v2/config/LethalityRegistry.ts`: `resolveIncomingDamage`, the five
   authored `CombatLethalityProfile` values (derived per the section above),
   `LEVERAGE_LETHALITY_PROFILES` (a `Record<LeverageMode, CombatLethalityProfile>`),
   and `resolveLethalityProfile(leverage)`.
3. `game-v2/systems/CombatSystem.ts`: constructor gains an optional
   `profile` parameter (default: the leverage-`1` profile, matching the
   existing `candidateProvider`/`killCapacity` optional-parameter pattern);
   `resetPlayer` uses `profile.playerMaxHealth`; `resolveContactDamage`
   routes `world.contactDamage` through `resolveIncomingDamage`.
4. `game-v2/contracts/RunRecording.ts`: gains `positionContext:
   PositionContext` (schema version `1 → 2`).
5. `game-v2/runtime/GameV2Runtime.ts`: `exportRecording()` includes the
   locked position.
6. `game-v2/replay/ReplayRunner.ts`: `ReplayRuntimeFactory` gains a
   `positionContext` parameter; `defaultRuntimeFactory` and `assertRecording`
   updated so replay reconstructs the exact locked profile and rejects a
   forged/invalid `positionContext` before the first tick.
7. `game-v2/runtime/createMvp0Runtime.ts`: resolves the profile from
   `positionContext.leverage` and constructs `CombatSystem` with it.
8. Tests: `CombatLethalityProfile.ts` validation; `LethalityRegistry.ts`
   (all five profiles validate, pairwise distinct, `1×` exact-equals
   today's constants, `resolveIncomingDamage`'s no-double-scaling math);
   `CombatSystem.test.ts` (profile-driven `resetPlayer`/damage resolution,
   default-profile backward compatibility); `RunRecording`/`ReplayRunner`
   round-trip for a non-default leverage; a real production-path
   integration test proving two runs at different leverage modes produce
   different `playerMaxHealth` through `GameV2Runtime`, and that each
   replays correctly.

Out of scope:

- Tuning the four placeholder fields' per-leverage values (`V2-405`).
- Any encounter/economy system consuming `encounterPressureLimit`,
  `encounterComplexityLimit`, `liquidationDistance`, or `rewardCeiling`
  (`V2-207`+, `V2-306`+).
- A `RuntimeCheckpoint`/`WorldSnapshot`/`StateHasher` schema bump —
  `PositionContext` is runtime-construction input reconstructed via
  `RunRecording`, exactly like `RunIdentity` already is, not `World` state.
- Player outgoing weapon/ability damage — leverage affects incoming
  exposure, not the player's own weapon tier output.

## Preflight Decisions To Record

- **V2-ADR-092 (proposed): `1×` reproduces today's exact constants
  (`playerMaxHealth = PLAYER_MAX_HEALTH`, `enemyDamageMultiplier = 1`,
  `playerArmor = 0`), pinned by an exact-equality test.** Rationale: see
  Scope Decision above — every pre-existing headless/test call site depends
  on this.
- **V2-ADR-093 (proposed): `playerMaxHealth(leverage) = round(PLAYER_MAX_HEALTH
  / leverage)`; `enemyDamageMultiplier` and `playerArmor` stay fixed
  (`1`/`0`) across all five modes.** Rationale: leverage is literally the
  divisor of the health budget — a direct, defensible link to leverage's
  own meaning. Keeping the other two dials fixed means exactly one value
  scales with leverage, which is what makes "no double scaling" true by
  construction rather than by careful cross-checking of two independently
  varying multipliers.
- **V2-ADR-094 (proposed): the armor mechanic is
  `finalDamage = max(0, rawDamage * enemyDamageMultiplier * (1 -
  playerArmor))`, one function, `resolveIncomingDamage`.** Rationale: user-
  confirmed via `AskUserQuestion`; directly satisfies design line 264.
- **V2-ADR-095 (proposed): the four fields with no current gameplay reader
  (`encounterPressureLimit`, `encounterComplexityLimit`, `liquidationDistance`,
  `rewardCeiling`) are each derived from a real existing constant or an
  alias of an already-derived field, never an invented number, and
  documented as placeholders pending the task that gives each a reader.**
  Rationale: the user chose to model all seven design fields now rather
  than only the three with a today reader; this decision is how that choice
  stays inside the "derived, not felt" bar every other numeric constant in
  this project meets, rather than introducing genuinely arbitrary balance
  numbers this project has consistently avoided everywhere else.
- **V2-ADR-096 (proposed): `incomingDamageEnvelope` is computed from the
  enemy registry's authored min/max contact damage rather than being a
  separately authored field.** Rationale: a field that is a pure function of
  already-real data cannot silently drift from what the composer actually
  produces, unlike a hand-authored `{ min: X, max: Y }` a future edit could
  forget to update.
- **V2-ADR-097 (proposed): `PositionContext` is carried by `RunRecording`
  (schema version `1 → 2`) and reconstructed by `ReplayRunner`'s default
  factory, rather than by threading it into `WorldSnapshot`/`StateHasher`.**
  Rationale: closes the `V2-ADR-089` deferral. `PositionContext` is
  runtime-construction input, not `World` state — it is locked once, before
  the runtime exists, exactly like `RunIdentity`'s seed already is, and
  `RunIdentity` is carried by `RunRecording` for exactly this reason rather
  than being hashed into `WorldSnapshot`. This avoids a `World`
  schema-version bump and a golden-hash ripple entirely, which `V2-ADR-089`
  expected might be unavoidable but turns out not to be.
- **V2-ADR-098 (proposed): `CombatSystem` takes an optional injected
  `CombatLethalityProfile`, defaulting to the leverage-`1` profile,
  mirroring the existing `candidateProvider`/`killCapacity` optional-
  parameter pattern.** Rationale: keeps every pre-existing direct
  `new CombatSystem()` test construction working unmodified, matching
  `V2-ADR-039`'s injected-dependency precedent.

## Files

- New: `game-v2/contracts/CombatLethalityProfile.ts`,
  `game-v2/config/LethalityRegistry.ts`,
  `tests/game-v2/contracts/CombatLethalityProfile.test.ts`,
  `tests/game-v2/config/LethalityRegistry.test.ts`,
  `tests/game-v2/integration/LethalityProfile.test.ts`
- Modify: `game-v2/systems/CombatSystem.ts`, `game-v2/contracts/RunRecording.ts`,
  `game-v2/runtime/GameV2Runtime.ts`, `game-v2/replay/ReplayRunner.ts`,
  `game-v2/runtime/createMvp0Runtime.ts`
- Test: `tests/game-v2/systems/CombatSystem.test.ts`,
  `tests/game-v2/replay/ReplayRunner.test.ts` (schema version ripple)

## Steps

- [ ] **Step 1: Contract + registry (RED then implement)**

  `CombatLethalityProfile.ts` and `LethalityRegistry.ts`. Prove: all five
  profiles validate; pairwise distinct leverage; `1×` exact-equals today's
  constants; `resolveIncomingDamage`'s math (one multiplication, one
  reduction, zero floor); each placeholder field's derivation formula.

- [ ] **Step 2: `CombatSystem` wiring (RED then implement)**

  Prove: default-profile behavior is byte-identical to pre-task
  `CombatSystem` output (existing tests pass unmodified); an injected
  non-default profile changes `resetPlayer`'s health and
  `resolveContactDamage`'s output through the composer, not through a
  second path.

- [ ] **Step 3: Replay/recording wiring (RED then implement)**

  `RunRecording` schema bump, `GameV2Runtime.exportRecording()`,
  `ReplayRunner`'s factory and validation. Prove: a recording made under a
  non-default leverage replays to the identical final hash; a forged
  `positionContext` in a recording is rejected before the first tick.

- [ ] **Step 4: Production integration (RED then implement)**

  A real `createMvp0Runtime`-driven test proving two different leverage
  modes produce different `playerMaxHealth` through the live runtime, and
  each replays correctly.

- [ ] **Step 5: Verify (GREEN)**

  ```powershell
  npx vitest run tests/game-v2 --pool=forks --maxWorkers=1
  npm run typecheck
  npm run check:architecture
  npm run check:reset-coverage
  npm run check:ui-contract
  npm run check:event-contract
  npm run build
  npx playwright test e2e/game-v2-walking-skeleton.spec.ts --project=chromium --workers=1 --reporter=list
  ```

- [ ] **Step 6: Mutation pass**

  At minimum: `resolveIncomingDamage` missing the multiplier term; missing
  the armor term; missing the safety floor; `CombatSystem.resetPlayer`
  reverted to the hardcoded `PLAYER_MAX_HEALTH` constant; `ReplayRunner`
  reconstructing with `UNSPECIFIED_POSITION_CONTEXT` regardless of the
  recording's actual `positionContext`.

## Acceptance Criteria

1. `CombatLethalityProfile` covers all seven design fields, validated and
   frozen; the five authored profiles are pairwise distinct and `1×`
   reproduces today's exact behavior.
2. `resolveIncomingDamage` is the single composer; no other code path
   scales incoming damage.
3. `CombatSystem` consumes the locked profile for both player health and
   incoming contact damage.
4. Replay is deterministic for every leverage mode, not only the default,
   with no `World`/`WorldSnapshot`/`StateHasher` schema change.
5. Every pre-existing headless/test call site keeps working unmodified.
6. Every Step 5 gate passes and the Step 6 mutation pass leaves no survivor.
