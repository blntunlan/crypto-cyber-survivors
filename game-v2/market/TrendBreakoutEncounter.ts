import {
  TREND_BREAKOUT_PROFILE,
  TREND_BREAKOUT_SPAWN_BUDGET,
} from '@/game-v2/config/TrendBreakoutFamily';
import { type MarketSnapshot } from '@/game-v2/contracts/MarketSnapshot';
import {
  assertSpawnEncounterOutput,
  type SpawnEncounterOutput,
} from '@/game-v2/contracts/EncounterOutput';
import { IndicatorEventStateMachine } from '@/game-v2/market/IndicatorEventStateMachine';

/**
 * `trendDirection` provably cannot be `'NEUTRAL'` when the profile
 * activates: activation requires `trendStrength > 0.5`, i.e.
 * `|rsi - 50| > 25`, i.e. `rsi < 25` or `rsi > 75` — both far outside the
 * `[45, 55]` band `indicatorService.ts` uses to derive `'NEUTRAL'`. Guarded
 * defensively anyway rather than assumed, mirroring `CombatSystem`'s own
 * defensive-guard precedent for an invariant that is real but unreachable
 * through the live pipeline.
 */
const THEME_BY_DIRECTION: Readonly<Record<'UP' | 'DOWN', string>> = {
  UP: 'bullish-breakout',
  DOWN: 'bearish-breakout',
};

/**
 * The Trend/Breakout family's concrete encounter (`V2-204`). Wraps one
 * `IndicatorEventStateMachine` driven by `TREND_BREAKOUT_PROFILE`, sampling
 * `MarketSnapshot.trendStrength` each step and producing a bounded
 * `SpawnEncounterOutput` exactly on the tick the profile activates.
 *
 * Not wired into any runtime yet — `V2-207`'s composer and `V2-208`'s spawn
 * consumption are separate tasks.
 */
export class TrendBreakoutEncounter {
  private readonly machine = new IndicatorEventStateMachine(TREND_BREAKOUT_PROFILE);

  public step(snapshot: MarketSnapshot, tick: number): SpawnEncounterOutput | null {
    const result = this.machine.step(snapshot.trendStrength, tick);

    if (!result.activatedThisTick) {
      return null;
    }

    if (snapshot.trendDirection !== 'UP' && snapshot.trendDirection !== 'DOWN') {
      throw new RangeError(
        'trend breakout activated with a NEUTRAL trendDirection, which the entry threshold should make unreachable'
      );
    }

    return assertSpawnEncounterOutput({
      kind: 'SPAWN',
      enemyBudget: TREND_BREAKOUT_SPAWN_BUDGET,
      themeId: THEME_BY_DIRECTION[snapshot.trendDirection],
    });
  }

  public reset(): void {
    this.machine.reset();
  }
}
