import { VOLUME_WHALE_PROFILE } from '@/game-v2/config/VolumeWhaleFamily';
import { type MarketSnapshot } from '@/game-v2/contracts/MarketSnapshot';
import {
  assertLootEventEncounterOutput,
  type LootEventEncounterOutput,
} from '@/game-v2/contracts/EncounterOutput';
import { IndicatorEventStateMachine } from '@/game-v2/market/IndicatorEventStateMachine';

/**
 * `whaleTier` provably cannot be `0` or `1` when the profile activates:
 * activation requires `whaleTier > VOLUME_WHALE_ENTRY_THRESHOLD (1)`, i.e.
 * `2` (`WHALE`) or `3` (`MEGA_WHALE`). Guarded defensively anyway rather
 * than assumed, mirroring `V2-204`'s `'NEUTRAL'`-direction guard.
 */
export const LOOT_TIER_BY_WHALE_TIER: Readonly<Record<2 | 3, string>> = {
  2: 'whale-loot',
  3: 'mega-whale-loot',
};

/**
 * Every real `(lootTierId, lootValue)` pair any `LOOT_EVENT`-producing
 * family currently emits (`V2-210`) — `Volume/Whale` is the only such
 * family (V2-ADR-116). Consumers validate both the id and its paired
 * value against this rather than accepting an arbitrary combination,
 * mirroring `V2-208`'s `TREND_BREAKOUT_THEME_IDS`/`V2-209`'s
 * `VOLATILITY_SURGE_HAZARD_ID` precedent.
 */
export const VOLUME_WHALE_LOOT_VALUE_BY_TIER_ID: ReadonlyMap<string, number> = new Map(
  Object.entries(LOOT_TIER_BY_WHALE_TIER).map(([whaleTier, tierId]) => [
    tierId,
    Number(whaleTier),
  ])
);

/**
 * The Volume/Whale family's concrete encounter (`V2-206`). Wraps one
 * `IndicatorEventStateMachine` driven by `VOLUME_WHALE_PROFILE`, sampling
 * `MarketSnapshot.whaleTier` directly each step (no continuous-threshold
 * derivation, unlike `TrendBreakoutEncounter`/`VolatilitySurgeEncounter`)
 * and producing a bounded `LootEventEncounterOutput` — themed and valued
 * by the triggering tier — exactly on the tick the profile activates.
 *
 * Not wired into any runtime yet — `V2-207`'s composer and any real
 * loot/economy-system consumption of the output are separate, currently
 * unassigned tasks.
 */
export class VolumeWhaleEncounter {
  private readonly machine = new IndicatorEventStateMachine(VOLUME_WHALE_PROFILE);

  public step(snapshot: MarketSnapshot, tick: number): LootEventEncounterOutput | null {
    const result = this.machine.step(snapshot.whaleTier, tick);

    if (!result.activatedThisTick) {
      return null;
    }

    if (snapshot.whaleTier !== 2 && snapshot.whaleTier !== 3) {
      throw new RangeError(
        'volume whale activated with a whaleTier the entry threshold should make unreachable'
      );
    }

    return assertLootEventEncounterOutput({
      kind: 'LOOT_EVENT',
      lootTierId: LOOT_TIER_BY_WHALE_TIER[snapshot.whaleTier],
      lootValue: snapshot.whaleTier,
    });
  }

  public reset(): void {
    this.machine.reset();
  }
}
