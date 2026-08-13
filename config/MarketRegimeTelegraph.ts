import { COLORS } from './Colors';

/**
 * Market regime telegraph — the one channel that tells the player the tape
 * changed. Kept inside the market HUD rail on purpose: the 2026-08-02 pass
 * removed the banner, the center announcements and the canvas market overlays,
 * and this must not quietly reintroduce them.
 */
export const MARKET_REGIME_TELEGRAPH = {
  /** How long the chip pulses after a shift. */
  pulseMs: 2_400,
  /** Floor between two accepted shifts, so a threshold-hugging tape can't strobe. */
  minIntervalMs: 6_000,
  /** Regimes loud enough to earn the heavier cue. */
  alertRegimes: ['PANIC', 'VOLATILE', 'SQUEEZE'] as readonly string[],
  /** Short labels — the rail is ~220px wide. */
  labels: {
    CALM: 'CALM',
    BULL_TREND: 'BULL',
    BEAR_TREND: 'BEAR',
    VOLATILE: 'VOLATILE',
    PANIC: 'PANIC',
    SQUEEZE: 'SQUEEZE',
  } as const,
  /** Casino signage tones, matching the leverage risk ramp. */
  colors: {
    CALM: COLORS.SLOT_SILVER,
    BULL_TREND: COLORS.NEON_GREEN,
    BEAR_TREND: COLORS.DUMP_ORANGE,
    VOLATILE: COLORS.NEON_ORANGE,
    PANIC: COLORS.CASINO_RED,
    SQUEEZE: COLORS.JACKPOT_YELLOW,
  } as const,
} as const;
