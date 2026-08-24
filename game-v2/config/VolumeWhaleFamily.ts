import { SIMULATION_HZ } from '@/game-v2/config/Mvp0Config';
import { assertIndicatorEventProfile } from '@/game-v2/contracts/IndicatorEventProfile';

/**
 * The Volume/Whale indicator-event family (design §6.2/§7.4, `V2-206`).
 *
 * Unlike `V2-204`/`V2-205`, no threshold needs to be picked against a
 * continuous field: `MarketSnapshot.whaleTier` is already the server's own
 * discrete classification (`0..3`), computed by
 * `railway-market-aggregator/src/indicators/VolumeAnalyzer.ts` from real
 * z-score cutoffs (`BABY_WHALE >= 1.5σ`, `WHALE >= 2.0σ`,
 * `MEGA_WHALE >= 2.5σ`). `whaleTier` is sampled directly.
 *
 * Whale events are momentary statistical spikes, not a sustained pattern
 * to confirm — `VolumeAnalyzer`'s own anti-spam mechanism
 * (`whaleCooldownMs`) is a flat cooldown after one spike, not a
 * confirmation-holding window, which is why `confirmationTicks` is `0`
 * here, a deliberate departure from `V2-204`/`V2-205`'s
 * `SIMULATION_HZ`-tick confirmation window (V2-ADR-119).
 */

/**
 * `direction: 'above'`, so activation requires `whaleTier > 1`, i.e.
 * `WHALE` (2) or `MEGA_WHALE` (3) — `VolumeAnalyzer`'s own documented
 * ~once-per-10-min `WHALE` cadence, not the more frequent `BABY_WHALE`
 * tier (V2-ADR-118).
 */
export const VOLUME_WHALE_ENTRY_THRESHOLD = 1;

/** Matches design's own worked example precedent of an equal entry/exit threshold. */
export const VOLUME_WHALE_EXIT_THRESHOLD = VOLUME_WHALE_ENTRY_THRESHOLD;

/**
 * The domain's own integer step size: `whaleTier` must fully return to
 * `0` (`NONE`), not merely below the `WHALE` tier, before rearming.
 */
export const VOLUME_WHALE_HYSTERESIS = 1;

/** A whale spike is itself the signal; no sustained holding is required. */
export const VOLUME_WHALE_CONFIRMATION_TICKS = 0;

/**
 * `VolumeAnalyzer`'s own real `whaleCooldownMs = 30000` (30 seconds),
 * converted to ticks — not an independently chosen duration
 * (V2-ADR-120), unlike `V2-204`/`V2-205`'s narratively-justified
 * cooldowns.
 */
export const VOLUME_WHALE_COOLDOWN_MS = 30_000;
export const VOLUME_WHALE_COOLDOWN_TICKS = Math.round(
  (VOLUME_WHALE_COOLDOWN_MS / 1000) * SIMULATION_HZ
);

export const VOLUME_WHALE_PROFILE = assertIndicatorEventProfile({
  id: 'volume-whale',
  direction: 'above',
  entryThreshold: VOLUME_WHALE_ENTRY_THRESHOLD,
  exitThreshold: VOLUME_WHALE_EXIT_THRESHOLD,
  confirmationTicks: VOLUME_WHALE_CONFIRMATION_TICKS,
  cooldownTicks: VOLUME_WHALE_COOLDOWN_TICKS,
  hysteresis: VOLUME_WHALE_HYSTERESIS,
  priority: 1,
  outputKind: 'LOOT_EVENT',
  compatibleWith: [],
});
