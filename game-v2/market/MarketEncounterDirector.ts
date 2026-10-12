import { TREND_BREAKOUT_PROFILE } from '@/game-v2/config/TrendBreakoutFamily';
import { VOLATILITY_SURGE_PROFILE } from '@/game-v2/config/VolatilitySurgeFamily';
import { VOLUME_WHALE_PROFILE } from '@/game-v2/config/VolumeWhaleFamily';
import { type MarketSnapshot } from '@/game-v2/contracts/MarketSnapshot';
import {
  EncounterComposer,
  type ComposedEncounter,
  type EncounterCandidate,
} from '@/game-v2/market/EncounterComposer';
import { TrendBreakoutEncounter } from '@/game-v2/market/TrendBreakoutEncounter';
import { VolatilitySurgeEncounter } from '@/game-v2/market/VolatilitySurgeEncounter';
import { VolumeWhaleEncounter } from '@/game-v2/market/VolumeWhaleEncounter';

/**
 * Drives the three real indicator-event families together and composes
 * their outputs (`V2-207`). Not wired into `GameV2Runtime` yet — the real
 * spawn/hazard/loot consumption tasks (`V2-208`, `V2-209`, and an
 * unassigned `LOOT_EVENT` consumption task) are separate.
 *
 * `step` allocates a fresh `ComposedEncounter` per call rather than
 * writing into a caller-owned scratch object (V2-ADR-127): market
 * encounters step at the ~1 Hz `MarketSnapshot` update cadence, not the
 * 60 Hz RAF loop the project's allocation discipline targets.
 */
export class MarketEncounterDirector {
  private readonly trendBreakout = new TrendBreakoutEncounter();
  private readonly volatilitySurge = new VolatilitySurgeEncounter();
  private readonly volumeWhale = new VolumeWhaleEncounter();
  private readonly composer = new EncounterComposer();

  public step(snapshot: MarketSnapshot, tick: number): ComposedEncounter {
    const candidates: EncounterCandidate[] = [];

    const trendOutput = this.trendBreakout.step(snapshot, tick);
    if (trendOutput !== null) {
      candidates.push({ profile: TREND_BREAKOUT_PROFILE, output: trendOutput });
    }

    const volatilityOutput = this.volatilitySurge.step(snapshot, tick);
    if (volatilityOutput !== null) {
      candidates.push({ profile: VOLATILITY_SURGE_PROFILE, output: volatilityOutput });
    }

    const whaleOutput = this.volumeWhale.step(snapshot, tick);
    if (whaleOutput !== null) {
      candidates.push({ profile: VOLUME_WHALE_PROFILE, output: whaleOutput });
    }

    const out: ComposedEncounter = { primary: null, support: null };
    this.composer.compose(candidates, out);

    return out;
  }

  public reset(): void {
    this.trendBreakout.reset();
    this.volatilitySurge.reset();
    this.volumeWhale.reset();
  }
}
