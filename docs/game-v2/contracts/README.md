# Game V2 Contract Catalog

This directory will contain normative contracts implemented by the Game V2 LEGO
blocks. The design specification remains authoritative until a contract is
materialized here and linked to an implementation task.

## Contract Rules

1. Every contract has exactly one owner.
2. Consumers depend on the contract, not the owner's internal state.
3. Lifecycle/reset behavior is mandatory.
4. Inputs reject non-finite or invalid values at the boundary.
5. Gameplay clocks use simulation time; user-decision deadlines may use real
   time when explicitly stated.
6. Every material contract carries a version or schema identifier.
7. Contract changes update producers, consumers, tests, decisions, and progress
   in the same checkpoint.

## Planned Contracts

| Contract | Owner | Primary consumers | First task |
|---|---|---|---|
| `SimulationClock` | Runtime Core | All simulation systems | V2-001 |
| `RunSeed` | Runtime Core | RNG, replay, offers, encounters | V2-002 |
| `WorldSnapshot` | ECS World | Replay, render bridge, SimLab | V2-005 |
| `PlayerIntent` | Player Input | Movement, dash, ability activation | V2-008 |
| `DashState` | Player | Damage resolver, presentation | V2-009 |
| `DamageIntent` / `DamageResult` | Combat | Player, enemies, telemetry | V2-012 |
| `AbilityDefinition` / `AbilityState` | Build | Combat, HUD, cards | V2-100 |
| `CardOffer` / `CardResolution` | Progression | HUD, replay, build | V2-104 |
| `EnemyArchetype` / `SpawnIntent` | Enemies | Run Director, pools, render | V2-108 |
| `ConvergenceState` | Run Director | HUD, boss transition | V2-109 |
| `MarketSnapshotV2` | Market Adapter | Indicator profiles, replay | V2-200 |
| `PositionContext` | Market Adapter | Lethality, rewards, encounters | V2-201 |
| `CombatLethalityProfile` | Run Director | Damage resolver, balance tools | V2-202 |
| `IndicatorEventProfile` | Market Events | Event state machine | V2-203 |
| `EncounterIntent` / `EncounterOutput` | Run Director | Spawn, world event, loot | V2-207 |
| `BossState` / `BossAttackIntent` | Boss Runtime | Combat, presentation, replay | V2-302 |
| `RunPointLedger` | Economy | HUD, settlement, failure | V2-306 |
| `CashOutRequest` / `SettlementResult` | Backend Economy | Game flow, banked balance | V2-307 |
| `RenderSnapshot` | Presentation Bridge | Three.js renderers | V2-006 |
