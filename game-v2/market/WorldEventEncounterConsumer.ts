import { VOLATILITY_SURGE_ACTIVE_TICKS } from '@/game-v2/config/VolatilitySurgeFamily';
import { type WorldEventEncounterOutput } from '@/game-v2/contracts/EncounterOutput';
import {
  HazardLifecycle,
  type HazardLifecycleStepResult,
} from '@/game-v2/market/HazardLifecycle';
import { VOLATILITY_SURGE_HAZARD_ID } from '@/game-v2/market/VolatilitySurgeEncounter';

const DEFAULT_ACTIVE_TICKS_BY_HAZARD_ID: ReadonlyMap<string, number> = new Map([
  [VOLATILITY_SURGE_HAZARD_ID, VOLATILITY_SURGE_ACTIVE_TICKS],
]);

/**
 * Turns a composed `WorldEventEncounterOutput` into a running hazard
 * lifecycle (`V2-209`). Its only input is the already-composed output —
 * never `MarketSnapshot` or a raw indicator value — mirroring
 * `SpawnEncounterConsumer`'s own structural boundary (`V2-208`,
 * V2-ADR-128).
 *
 * `activeTicks` is resolved per real `hazardId` rather than accepted as a
 * caller-supplied number, since it is real, derived family content
 * (V2-ADR-134), not a generic mechanism parameter — an unrecognized
 * `hazardId` throws, matching `SpawnEncounterConsumer`'s `themeId`
 * validation (V2-ADR-129/V2-ADR-135).
 */
export class WorldEventEncounterConsumer {
  private readonly lifecycle: HazardLifecycle;
  private readonly activeTicksByHazardId: ReadonlyMap<string, number>;

  public constructor(
    lifecycle: HazardLifecycle = new HazardLifecycle(),
    activeTicksByHazardId: ReadonlyMap<
      string,
      number
    > = DEFAULT_ACTIVE_TICKS_BY_HAZARD_ID
  ) {
    this.lifecycle = lifecycle;
    this.activeTicksByHazardId = activeTicksByHazardId;
  }

  public activate(output: WorldEventEncounterOutput, tick: number): void {
    const activeTicks = this.activeTicksByHazardId.get(output.hazardId);

    if (activeTicks === undefined) {
      throw new RangeError(
        `world event encounter consumer received an unrecognized hazardId: ${output.hazardId}`
      );
    }

    this.lifecycle.activate(output, activeTicks, tick);
  }

  public step(tick: number): HazardLifecycleStepResult {
    return this.lifecycle.step(tick);
  }

  public reset(): void {
    this.lifecycle.reset();
  }
}
