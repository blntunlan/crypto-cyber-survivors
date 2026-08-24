/**
 * Real anchor (`V2-211`): `services/market/DataResilienceService.ts`'s own
 * `RESILIENCE_CONFIG.STALE_THRESHOLD_MS` — the legacy pipeline's own
 * already-calibrated SSE-staleness threshold. Copied as a literal value
 * rather than imported cross-module, matching `V2-205`/`V2-206`'s own
 * "reuse the real value, not the legacy module" precedent (V2-ADR-141):
 * `V2-ADR-085`'s exclusion covers legacy gameplay-multiplier *outputs*,
 * not a raw data-freshness threshold.
 */
export const MARKET_STALE_THRESHOLD_MS = 30_000;
