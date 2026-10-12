import {
  VOLATILITY_SURGE_PROFILE,
  VOLATILITY_SURGE_TELEGRAPH_TICKS,
} from '@/game-v2/config/VolatilitySurgeFamily';
import { type MarketSnapshot } from '@/game-v2/contracts/MarketSnapshot';
import {
  assertWorldEventEncounterOutput,
  type WorldEventEncounterOutput,
} from '@/game-v2/contracts/EncounterOutput';
import { IndicatorEventStateMachine } from '@/game-v2/market/IndicatorEventStateMachine';

/**
 * Every real `hazardId` any `WORLD_EVENT`-producing family currently emits
 * (`V2-209`) — `Volatility Surge` is the only such family (V2-ADR-110).
 * Consumers validate against this rather than accepting an arbitrary
 * string, mirroring `V2-208`'s own `TREND_BREAKOUT_THEME_IDS` precedent.
 */
export const VOLATILITY_SURGE_HAZARD_ID = 'volatility-tremor';

/**
 * The Volatility Surge family's concrete encounter (`V2-205`). Wraps one
 * `IndicatorEventStateMachine` driven by `VOLATILITY_SURGE_PROFILE`, sampling
 * `MarketSnapshot.atrPercent` each step and producing a bounded
 * `WorldEventEncounterOutput` exactly on the tick the profile activates.
 *
 * Not wired into any runtime yet — `V2-207`'s composer and `V2-209`'s
 * hazard-system consumption are separate tasks.
 */
export class VolatilitySurgeEncounter {
  private readonly machine = new IndicatorEventStateMachine(VOLATILITY_SURGE_PROFILE);

  public step(
    snapshot: MarketSnapshot,
    tick: number
  ): WorldEventEncounterOutput | null {
    const result = this.machine.step(snapshot.atrPercent, tick);

    if (!result.activatedThisTick) {
      return null;
    }

    return assertWorldEventEncounterOutput({
      kind: 'WORLD_EVENT',
      hazardId: VOLATILITY_SURGE_HAZARD_ID,
      telegraphTicks: VOLATILITY_SURGE_TELEGRAPH_TICKS,
    });
  }

  public reset(): void {
    this.machine.reset();
  }
}
