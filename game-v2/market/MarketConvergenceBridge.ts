import {
  MARKET_CONVERGENCE_BONUS_XP_PER_UNIT,
  WORLD_EVENT_CONVERGENCE_BONUS_UNITS,
} from '@/game-v2/config/MarketConvergenceBonus';
import { type ConvergenceStepResult } from '@/game-v2/contracts/ConvergenceStepResult';
import { type EntityId } from '@/game-v2/contracts/EntityId';
import { type StepContext } from '@/game-v2/contracts/StepContext';
import { type HazardLifecycleStepResult } from '@/game-v2/market/HazardLifecycle';
import { type LootOpportunity } from '@/game-v2/market/LootEventEncounterConsumer';
import { ConvergenceSystem } from '@/game-v2/systems/ConvergenceSystem';
import { type World } from '@/game-v2/world/World';

/**
 * Connects real market-encounter completion signals to
 * `ConvergenceSystem.applyMarketBonus` (`V2-212`, design §6.3: "Market
 * encounters provide bonus progress but are not required").
 *
 * Only `WORLD_EVENT`/`LOOT_EVENT` have a real completion signal to hook:
 * a hazard's `ACTIVE → IDLE` transition (`V2-209`) and a produced
 * `LootOpportunity` (`V2-210`). `SPAWN` completion is deliberately not
 * bridged here — no batch-lifecycle tracking exists to say when a
 * `SPAWN` encounter's enemies are dealt with (V2-ADR-149).
 *
 * Never called from anywhere yet — not wired into `GameV2Runtime`
 * (V2-ADR-150), matching `V2-203` through `V2-211`'s own precedent.
 */
export class MarketConvergenceBridge {
  private readonly convergence: ConvergenceSystem;

  public constructor(convergence: ConvergenceSystem = new ConvergenceSystem()) {
    this.convergence = convergence;
  }

  /**
   * A no-op (returns `null`, applies no bonus) unless `hazardResult`
   * reports `expiredThisTick`. `WorldEventEncounterOutput` carries no
   * numeric field to scale by, so a completed hazard is a flat
   * `WORLD_EVENT_CONVERGENCE_BONUS_UNITS` (V2-ADR-148).
   */
  public onHazardExpired(
    world: World,
    playerEntity: EntityId,
    hazardResult: HazardLifecycleStepResult,
    context: StepContext
  ): ConvergenceStepResult | null {
    if (!hazardResult.expiredThisTick) {
      return null;
    }

    const bonusXp =
      WORLD_EVENT_CONVERGENCE_BONUS_UNITS * MARKET_CONVERGENCE_BONUS_XP_PER_UNIT;

    return this.convergence.applyMarketBonus(world, playerEntity, bonusXp, context);
  }

  /**
   * A produced `LootOpportunity` is its own completion instant — the
   * bonus scales directly by the real `lootValue` (the whale tier that
   * triggered it, `V2-206`).
   */
  public onLootOpportunity(
    world: World,
    playerEntity: EntityId,
    opportunity: LootOpportunity,
    context: StepContext
  ): ConvergenceStepResult {
    const bonusXp = opportunity.lootValue * MARKET_CONVERGENCE_BONUS_XP_PER_UNIT;

    return this.convergence.applyMarketBonus(world, playerEntity, bonusXp, context);
  }
}
