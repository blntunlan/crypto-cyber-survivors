import { type LootEventEncounterOutput } from '@/game-v2/contracts/EncounterOutput';
import { VOLUME_WHALE_LOOT_VALUE_BY_TIER_ID } from '@/game-v2/market/VolumeWhaleEncounter';

/**
 * A bounded, inert record of a loot opportunity — never currency, never a
 * reward. Carries only what the real family already produced plus the
 * tick it was recorded on.
 */
export type LootOpportunity = Readonly<{
  lootTierId: string;
  lootValue: number;
  tick: number;
}>;

/**
 * Turns a composed `LootEventEncounterOutput` into a bounded, inert loot
 * opportunity record (`V2-210`, design's "Lootbox opportunity is bounded
 * and cannot mint settlement value"). Deliberately does not mint, credit,
 * or compute any settlement/currency value — no economy, coin, wallet, or
 * reward service is imported or called anywhere in this file, proven both
 * structurally (no such import exists) and by a dedicated source-scan
 * test mirroring `GameRuntimeDependencyAudit.test.ts`'s own convention.
 * `CLAUDE.md`: "Do not add new optimistic credit paths... route new
 * rewards through the verified submit." No loot/economy system exists in
 * `game-v2/**` yet for this to route a reward through even if it wanted
 * to (`V2-306`, MVP-3).
 *
 * "Bounded" is enforced two ways: an unrecognized `lootTierId` throws
 * (mirroring `SpawnEncounterConsumer`'s `themeId`/`WorldEventEncounterConsumer`'s
 * `hazardId` validation), and a `lootValue` that does not match that real
 * tier's own fixed value throws too — so a caller cannot pair a known,
 * real `lootTierId` with an arbitrary, unbounded `lootValue`.
 */
export class LootEventEncounterConsumer {
  private readonly lootValueByTierId: ReadonlyMap<string, number>;

  public constructor(
    lootValueByTierId: ReadonlyMap<string, number> = VOLUME_WHALE_LOOT_VALUE_BY_TIER_ID
  ) {
    this.lootValueByTierId = lootValueByTierId;
  }

  public consume(output: LootEventEncounterOutput, tick: number): LootOpportunity {
    const expectedValue = this.lootValueByTierId.get(output.lootTierId);

    if (expectedValue === undefined) {
      throw new RangeError(
        `loot event encounter consumer received an unrecognized lootTierId: ${output.lootTierId}`
      );
    }

    if (output.lootValue !== expectedValue) {
      throw new RangeError(
        `loot event encounter consumer received a lootValue (${output.lootValue}) that does not match the real value (${expectedValue}) for lootTierId: ${output.lootTierId}`
      );
    }

    return Object.freeze({
      lootTierId: output.lootTierId,
      lootValue: output.lootValue,
      tick,
    });
  }
}
