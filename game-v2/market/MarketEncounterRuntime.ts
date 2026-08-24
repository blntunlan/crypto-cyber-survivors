import { type EnemyDefinition } from '@/game-v2/contracts/EnemyArchetype';
import { type EntityId } from '@/game-v2/contracts/EntityId';
import { type EncounterOutput } from '@/game-v2/contracts/EncounterOutput';
import { type StepContext } from '@/game-v2/contracts/StepContext';
import { type HazardLifecycleStepResult } from '@/game-v2/market/HazardLifecycle';
import { LootEventEncounterConsumer } from '@/game-v2/market/LootEventEncounterConsumer';
import { type LootOpportunity } from '@/game-v2/market/LootEventEncounterConsumer';
import { MarketConvergenceBridge } from '@/game-v2/market/MarketConvergenceBridge';
import { type MarketSnapshotAdapter } from '@/game-v2/market/MarketSnapshotAdapter';
import { SpawnEncounterConsumer } from '@/game-v2/systems/SpawnEncounterConsumer';
import { StaleAwareMarketEncounterDirector } from '@/game-v2/market/StaleAwareMarketEncounterDirector';
import { WorldEventEncounterConsumer } from '@/game-v2/market/WorldEventEncounterConsumer';
import { type DeterministicRng } from '@/game-v2/runtime/DeterministicRng';
import { type World } from '@/game-v2/world/World';

export type MarketSnapshotSource = Pick<MarketSnapshotAdapter, 'latest'>;

export type MarketEncounterRuntimeDependencies = {
  /** `null` (the default) means no market feed is wired — fully inert. */
  snapshotSource?: MarketSnapshotSource | null;
  director?: StaleAwareMarketEncounterDirector;
  spawnConsumer?: SpawnEncounterConsumer;
  worldEventConsumer?: WorldEventEncounterConsumer;
  lootConsumer?: LootEventEncounterConsumer;
  convergenceBridge?: MarketConvergenceBridge;
};

const collectOutputs = (
  primary: EncounterOutput | null,
  support: EncounterOutput | null
): readonly EncounterOutput[] => {
  const outputs: EncounterOutput[] = [];

  if (primary !== null) {
    outputs.push(primary);
  }
  if (support !== null) {
    outputs.push(support);
  }

  return outputs;
};

/**
 * Wires the three real market-encounter output kinds together into one
 * per-tick facade (`V2-213`). Fully inert with no `snapshotSource`
 * (`V2-ADR-152`) — every existing caller that does not supply one is
 * unaffected, matching design's "market encounters provide bonus
 * progress but are not required."
 *
 * `step` and `applyPendingConvergenceBonus` are deliberately two calls,
 * not one (`V2-ADR-155`): a market bonus is not itself combat-outcome-
 * dependent, but for strict consistency with `ConvergenceSystem`'s own
 * established death-dominance rule (`V2-ADR-027`), the bonus is only
 * applied once the caller knows the tick was not lethal.
 */
export class MarketEncounterRuntime {
  private readonly snapshotSource: MarketSnapshotSource | null;
  private readonly director: StaleAwareMarketEncounterDirector;
  private readonly spawnConsumer: SpawnEncounterConsumer;
  private readonly worldEventConsumer: WorldEventEncounterConsumer;
  private readonly lootConsumer: LootEventEncounterConsumer;
  private readonly convergenceBridge: MarketConvergenceBridge;

  private pendingHazardExpiry: HazardLifecycleStepResult | null = null;
  private pendingLootOpportunity: LootOpportunity | null = null;

  public constructor(dependencies: MarketEncounterRuntimeDependencies = {}) {
    this.snapshotSource = dependencies.snapshotSource ?? null;
    this.director = dependencies.director ?? new StaleAwareMarketEncounterDirector();
    this.spawnConsumer = dependencies.spawnConsumer ?? new SpawnEncounterConsumer();
    this.worldEventConsumer =
      dependencies.worldEventConsumer ?? new WorldEventEncounterConsumer();
    this.lootConsumer = dependencies.lootConsumer ?? new LootEventEncounterConsumer();
    this.convergenceBridge =
      dependencies.convergenceBridge ?? new MarketConvergenceBridge();
  }

  /**
   * Samples the latest snapshot (a no-op if no source is wired), composes
   * this tick's primary/support outputs, writes any `SPAWN` composition
   * into `spawnOut` (caller-owned, cleared first), and either activates a
   * fresh `WORLD_EVENT` or advances the hazard lifecycle one tick — never
   * both on the same tick (`HazardLifecycle`'s own monotonic-tick
   * contract forbids `activate()` and `step()` on the identical tick).
   *
   * A hypothetical primary+support pair sharing the same output `kind`
   * is a known, currently-unreachable limitation (V2-ADR-157): the
   * second call would silently overwrite rather than accumulate. No real
   * family's `compatibleWith` is populated today, so this cannot occur
   * through the real pipeline.
   */
  public step(
    rng: Pick<DeterministicRng, 'nextInt'>,
    tick: number,
    nowMs: number,
    spawnOut: EnemyDefinition[]
  ): void {
    spawnOut.length = 0;
    this.pendingHazardExpiry = null;
    this.pendingLootOpportunity = null;

    const snapshot = this.snapshotSource === null ? null : this.snapshotSource.latest();
    const composed =
      snapshot === null ? null : this.director.step(snapshot, tick, nowMs);

    let hazardActivatedThisTick = false;

    for (const output of collectOutputs(
      composed?.primary ?? null,
      composed?.support ?? null
    )) {
      if (output.kind === 'SPAWN') {
        this.spawnConsumer.compose(output, rng, spawnOut);
      } else if (output.kind === 'WORLD_EVENT') {
        this.worldEventConsumer.activate(output, tick);
        hazardActivatedThisTick = true;
      } else {
        this.pendingLootOpportunity = this.lootConsumer.consume(output, tick);
      }
    }

    if (!hazardActivatedThisTick) {
      const hazardResult = this.worldEventConsumer.step(tick);

      if (hazardResult.expiredThisTick) {
        this.pendingHazardExpiry = hazardResult;
      }
    }
  }

  /**
   * Applies whatever `step` recorded this tick. Call only once the
   * caller knows the tick was not lethal — skip entirely on a
   * `playerDied` tick, mirroring `ConvergenceSystem.step`'s own
   * death-dominance placement.
   */
  public applyPendingConvergenceBonus(
    world: World,
    playerEntity: EntityId,
    context: StepContext
  ): void {
    if (this.pendingHazardExpiry !== null) {
      this.convergenceBridge.onHazardExpired(
        world,
        playerEntity,
        this.pendingHazardExpiry,
        context
      );
    }

    if (this.pendingLootOpportunity !== null) {
      this.convergenceBridge.onLootOpportunity(
        world,
        playerEntity,
        this.pendingLootOpportunity,
        context
      );
    }

    this.pendingHazardExpiry = null;
    this.pendingLootOpportunity = null;
  }

  public reset(): void {
    this.director.reset();
    this.worldEventConsumer.reset();
    this.pendingHazardExpiry = null;
    this.pendingLootOpportunity = null;
  }
}
