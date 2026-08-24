# V2-210 — Loot-Event Consumer (Task Brief)

> Milestone: MVP-2 — Market Vertical Slice
> Depends on: `V2-207` (primary/support composer, accepted and closed)
> Design contract: `docs/superpowers/specs/2026-08-21-threejs-gameplay-v2-design.md`
> §6.2 (Encounter outputs: `LOOT_EVENT` — "Produce a lootbox or opportunity event.")
> Master plan "Done when": "Lootbox opportunity is bounded and cannot mint settlement value."
> Governing decisions: V2-ADR-137 through V2-ADR-140 (this brief)
> Live execution state: `docs/game-v2/PROGRESS.md`

## Scope Decision (recorded, not re-litigated per task)

"Cannot mint settlement value" is the load-bearing half of the "Done
when." `CLAUDE.md`'s anti-cheat guardrail is explicit: "Do not add new
optimistic credit paths. Route new rewards through the verified submit."
No loot/economy system exists anywhere in `game-v2/**` yet — `V2-306`
("Unbanked run-point ledger") is the real economy system, and it is
MVP-3, gated behind `V2-213`'s MVP-2 evidence gate. This task therefore
does not create currency, credit coins, or touch any reward/wallet
service. It produces a bounded, inert `LootOpportunity` *record* — data
only, no side effect — mirroring `V2-206`'s own reasoning for
`lootValue` being a real pass-through tier rather than an invented
economy number.

"Bounded" is enforced two ways, mirroring `V2-208`/`V2-209`'s
known-id-validation precedent: an unrecognized `lootTierId` throws, and
— new to this task — a `lootValue` that does not match that real tier's
own fixed value also throws. Without the second check, `lootValue`'s
contract-level bound is only "a positive integer" (`assertLootEventEncounterOutput`),
with no upper limit; cross-checking it against the real, whale-tier-anchored
value set (`{2, 3}`, `V2-206`) is what makes "bounded" a real, tested
guarantee rather than a documentation-only claim.

"Cannot mint settlement value" is proven two ways: structurally (the
consumer file never imports `CoinService`/`RewardCalculator`/
`WalletService`/any economy service), and by a dedicated source-scan
test reading the file's own source text and asserting the absence of
those identifiers — mirroring `tests/services/gameplay/GameRuntimeDependencyAudit.test.ts`'s
established convention for this exact kind of architectural-boundary
proof. The test's positive-control value was verified during
implementation: temporarily inserting a forbidden identifier into the
file did make the scan test fail, confirming the check is real, not
vacuous.

Two-tier mechanism/content split does not apply here the way it did for
`V2-208`/`V2-209`: `Volume/Whale` is the only `LOOT_EVENT`-producing
family (`V2-ADR-116`), and there is no separate downstream system
(`EnemyComposer`, `HazardLifecycle`) to delegate to — the whole task is
validation plus an inert record, so one class suffices.

Not wired into `GameV2Runtime` — matches `V2-203` through `V2-209`'s own
precedent.

## Done When

1. `game-v2/market/LootEventEncounterConsumer.ts`: given a
   `LootEventEncounterOutput`, validates `lootTierId` against the real
   known set and `lootValue` against that tier's real fixed value, then
   returns a bounded, inert, frozen `LootOpportunity` record. No
   currency, coin, wallet, or reward service is imported or called.
2. An unrecognized `lootTierId` throws; a `lootValue` mismatched against
   its tier's real value throws.
3. A dedicated source-scan test proves the "no economy import" property,
   and that test's positive-control value is verified (a deliberately
   introduced forbidden reference does make it fail).
4. Not wired into `GameV2Runtime`.

## Scope

In scope:

1. `game-v2/market/VolumeWhaleEncounter.ts`: export the existing local
   `LOOT_TIER_BY_WHALE_TIER` and derive/export
   `VOLUME_WHALE_LOOT_VALUE_BY_TIER_ID` (a `lootTierId → lootValue` map)
   — no behavior change.
2. `game-v2/market/LootEventEncounterConsumer.ts`: `LootOpportunity`
   type, `LootEventEncounterConsumer` class with `consume(output, tick)`.
3. Tests: `tests/game-v2/market/LootEventEncounterConsumer.test.ts` —
   real `whale-loot`/`mega-whale-loot` outputs consume correctly;
   unrecognized `lootTierId` throws; mismatched `lootValue` throws; an
   injected known-tier-to-value map is honoured over the default; the
   source-scan test for "no economy import," verified with a positive
   control.

Out of scope:

- Any real reward/currency crediting, or wiring toward
  `CoinService`/`RewardCalculator`/`WalletService`/`GameSessionService`'s
  verified-submit path.
- `V2-306`'s real economy/ledger system.
- Wiring `LootEventEncounterConsumer` into `GameV2Runtime`.

## Preflight Decisions To Record

- **V2-ADR-137 (proposed): `LootEventEncounterConsumer` produces a
  bounded, inert `LootOpportunity` record — no currency is minted, no
  reward/economy service is imported or called.** Rationale: `CLAUDE.md`'s
  explicit anti-cheat guardrail against new optimistic credit paths; no
  loot/economy system exists in `game-v2/**` yet to route a verified
  reward through even if this task wanted to (`V2-306`, MVP-3).
- **V2-ADR-138 (proposed): `lootValue` is cross-checked against its real
  `lootTierId`'s fixed value, not just validated as a positive integer.**
  Rationale: `assertLootEventEncounterOutput`'s own bound
  (`isPositiveInteger`) has no upper limit; without this cross-check,
  "bounded" would not be a real, tested guarantee for an
  otherwise-valid-looking `(lootTierId, lootValue)` pair with a mismatched
  value.
- **V2-ADR-139 (proposed): the "cannot mint settlement value" property is
  proven by a source-scan test reading the consumer file's own source
  text for forbidden economy-service identifiers, mirroring
  `GameRuntimeDependencyAudit.test.ts`'s established convention.**
  Rationale: a structural absence-of-import property cannot be proven by
  a behavioral unit test alone; the project already has precedent for
  this exact technique.
- **V2-ADR-140 (proposed): `LootEventEncounterConsumer` is not wired into
  `GameV2Runtime`.** Rationale: matches `V2-203` through `V2-209`'s own
  precedent.

## Files

- New: `game-v2/market/LootEventEncounterConsumer.ts`,
  `tests/game-v2/market/LootEventEncounterConsumer.test.ts`
- Modify: `game-v2/market/VolumeWhaleEncounter.ts` (export additions,
  no logic change).

## Steps

- [ ] **Step 1: Export `LOOT_TIER_BY_WHALE_TIER`/`VOLUME_WHALE_LOOT_VALUE_BY_TIER_ID`**

  Re-run `VolumeWhaleEncounter.test.ts` unmodified to confirm no
  behavior change.

- [ ] **Step 2: `LootEventEncounterConsumer` (RED then implement)**

  Prove: real `whale-loot`/`mega-whale-loot` outputs consume into a
  frozen `LootOpportunity`; an unrecognized `lootTierId` throws; a
  `lootValue` that does not match the known tier's real value throws; an
  injected custom map is honoured over the default; the source-scan test
  for "no economy import," with a manual positive-control check
  performed and recorded during implementation (not left in the test
  suite as a standing test, since it would require intentionally broken
  source to pass).

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

  At minimum: removing the `lootTierId` validation; removing the
  `lootValue` cross-check; the constructor ignoring its injected map.

## Acceptance Criteria

1. `LootEventEncounterConsumer.consume` validates both `lootTierId` and
   `lootValue` against real, tier-anchored values and returns a frozen,
   inert record.
2. No currency/economy/reward service is imported or called, proven by
   a source-scan test with a verified positive control.
3. Nothing outside `game-v2/market/LootEventEncounterConsumer.ts` and the
   one documented export addition in `VolumeWhaleEncounter.ts` is
   touched; no wiring into `GameV2Runtime`.
4. Every Step 3 gate passes and the Step 4 mutation pass leaves no
   survivor.
