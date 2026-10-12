import { type MarketSnapshot } from '@/game-v2/contracts/MarketSnapshot';
import { type ComposedEncounter } from '@/game-v2/market/EncounterComposer';
import { isMarketSnapshotStale } from '@/game-v2/market/MarketFreshness';
import { MarketEncounterDirector } from '@/game-v2/market/MarketEncounterDirector';

/**
 * Wraps `MarketEncounterDirector` (`V2-207`) with design §7.5's freshness
 * rules (`V2-211`) — without modifying it (V2-ADR-143), so its own
 * already-shipped contract and tests stay untouched.
 *
 * While stale: the wrapped director's `step` is never called, so a stale
 * snapshot's indicator values can never advance any family's
 * `ARMED → CONFIRMING` transition ("stale data cannot author new market
 * events"); instead the wrapped director is `reset()`, forcing every
 * family's `IndicatorEventStateMachine` back to `ARMED` — the one state
 * representing "no effect," design's "existing market effects transition
 * to neutral." No encounter is reported for that tick.
 *
 * "Reconnect does not replay missed events" needs no new bookkeeping
 * here (V2-ADR-144): neither this wrapper nor `MarketEncounterDirector`
 * ever buffers a snapshot — each call only evaluates the one snapshot
 * passed to it for that one tick, so there is nothing to replay once
 * fresh data resumes.
 */
export class StaleAwareMarketEncounterDirector {
  private readonly director: MarketEncounterDirector;

  public constructor(
    director: MarketEncounterDirector = new MarketEncounterDirector()
  ) {
    this.director = director;
  }

  public step(
    snapshot: MarketSnapshot,
    tick: number,
    nowMs: number
  ): ComposedEncounter {
    if (isMarketSnapshotStale(snapshot, nowMs)) {
      this.director.reset();
      return { primary: null, support: null };
    }

    return this.director.step(snapshot, tick);
  }

  public reset(): void {
    this.director.reset();
  }
}
