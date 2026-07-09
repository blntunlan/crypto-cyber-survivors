import { COLORS } from './Colors';

/**
 * MilestoneConfig - In-run milestone definitions
 *
 * Central registry for all in-run milestone thresholds shown by the
 * MilestoneAnnouncer. Names deliberately differ from the server achievement
 * catalog (railway-market-server/src/config/achievementCatalog.ts) — those are
 * cumulative profile achievements; these celebrate single-run moments.
 * PnL thresholds mirror the catalog's `conditionValue` fractions so the in-run
 * announcement and the server unlock fire on the same market move.
 */

export type MilestoneType = 'kills' | 'time' | 'level' | 'pnl' | 'danger';

export type MilestoneSeverity = 'celebration' | 'danger';

export type MilestoneSound = 'glint' | 'tension';

export interface MilestoneDefinition {
  id: string;
  type: MilestoneType;
  /** Count | seconds | level | signed raw PnL fraction (0.05 = +5%) */
  threshold: number;
  /** i18n key under `milestones.*` (resolved by MilestoneAnnouncer) */
  nameKey: string;
  /** English fallback shown when the locale has no entry */
  fallbackName: string;
  nameParams?: Record<string, string | number>;
  icon: string;
  color: string;
  severity: MilestoneSeverity;
  sound: MilestoneSound;
}

export const MILESTONE_DEFINITIONS: MilestoneDefinition[] = [
  // Kill Milestones (single-run kill count)
  {
    id: 'kills_100',
    type: 'kills',
    threshold: 100,
    nameKey: 'milestones.kills_100',
    fallbackName: 'RAMPAGE',
    icon: '⚔️',
    color: COLORS.SLOT_SILVER,
    severity: 'celebration',
    sound: 'glint',
  },
  {
    id: 'kills_250',
    type: 'kills',
    threshold: 250,
    nameKey: 'milestones.kills_250',
    fallbackName: 'MASSACRE',
    icon: '🗡️',
    color: COLORS.JACKPOT_YELLOW,
    severity: 'celebration',
    sound: 'glint',
  },
  {
    id: 'kills_500',
    type: 'kills',
    threshold: 500,
    nameKey: 'milestones.kills_500',
    fallbackName: 'BLOODBATH',
    icon: '💀',
    color: COLORS.NEON_ORANGE,
    severity: 'celebration',
    sound: 'glint',
  },
  {
    id: 'kills_1000',
    type: 'kills',
    threshold: 1000,
    nameKey: 'milestones.kills_1000',
    fallbackName: 'OBLITERATION',
    icon: '🔥',
    color: COLORS.SHORT,
    severity: 'celebration',
    sound: 'glint',
  },
  {
    id: 'kills_2500',
    type: 'kills',
    threshold: 2500,
    nameKey: 'milestones.kills_2500',
    fallbackName: 'GOD CANDLE',
    icon: '👑',
    color: COLORS.WHALE,
    severity: 'celebration',
    sound: 'glint',
  },

  // Time Milestones (seconds survived this run)
  {
    id: 'time_60',
    type: 'time',
    threshold: 60,
    nameKey: 'milestones.time_60',
    fallbackName: '1 MINUTE!',
    icon: '⏱️',
    color: COLORS.LONG,
    severity: 'celebration',
    sound: 'glint',
  },
  {
    id: 'time_180',
    type: 'time',
    threshold: 180,
    nameKey: 'milestones.time_180',
    fallbackName: '3 MINUTES!',
    icon: '⏱️',
    color: COLORS.ELECTRIC_BLUE,
    severity: 'celebration',
    sound: 'glint',
  },
  {
    id: 'time_300',
    type: 'time',
    threshold: 300,
    nameKey: 'milestones.time_300',
    fallbackName: '5 MINUTES!',
    icon: '⏱️',
    color: COLORS.CASINO_GOLD,
    severity: 'celebration',
    sound: 'glint',
  },
  {
    id: 'time_600',
    type: 'time',
    threshold: 600,
    nameKey: 'milestones.time_600',
    fallbackName: '10 MINUTES!',
    icon: '🏆',
    color: COLORS.SHORT,
    severity: 'celebration',
    sound: 'glint',
  },

  // Level Milestones (single-run level)
  {
    id: 'level_5',
    type: 'level',
    threshold: 5,
    nameKey: 'milestones.level',
    fallbackName: 'LEVEL 5',
    nameParams: { val: 5 },
    icon: '⬆️',
    color: COLORS.LONG,
    severity: 'celebration',
    sound: 'glint',
  },
  {
    id: 'level_10',
    type: 'level',
    threshold: 10,
    nameKey: 'milestones.level',
    fallbackName: 'LEVEL 10',
    nameParams: { val: 10 },
    icon: '⬆️',
    color: COLORS.ELECTRIC_BLUE,
    severity: 'celebration',
    sound: 'glint',
  },
  {
    id: 'level_15',
    type: 'level',
    threshold: 15,
    nameKey: 'milestones.level',
    fallbackName: 'LEVEL 15',
    nameParams: { val: 15 },
    icon: '⬆️',
    color: COLORS.CASINO_GOLD,
    severity: 'celebration',
    sound: 'glint',
  },
  {
    id: 'level_20',
    type: 'level',
    threshold: 20,
    nameKey: 'milestones.level',
    fallbackName: 'LEVEL 20',
    nameParams: { val: 20 },
    icon: '🌟',
    color: COLORS.SHORT,
    severity: 'celebration',
    sound: 'glint',
  },

  // PnL Milestones (raw unleveraged PnL fraction, same thresholds as the
  // server trading achievements pnl_5..pnl_50)
  {
    id: 'pnl_5',
    type: 'pnl',
    threshold: 0.05,
    nameKey: 'milestones.pnl_5',
    fallbackName: 'IN PROFIT',
    icon: '📈',
    color: COLORS.PUMP_GREEN,
    severity: 'celebration',
    sound: 'glint',
  },
  {
    id: 'pnl_10',
    type: 'pnl',
    threshold: 0.1,
    nameKey: 'milestones.pnl_10',
    fallbackName: 'UP ONLY',
    icon: '💰',
    color: COLORS.NEON_GREEN,
    severity: 'celebration',
    sound: 'glint',
  },
  {
    id: 'pnl_25',
    type: 'pnl',
    threshold: 0.25,
    nameKey: 'milestones.pnl_25',
    fallbackName: 'MOONSHOT',
    icon: '🚀',
    color: COLORS.JACKPOT_YELLOW,
    severity: 'celebration',
    sound: 'glint',
  },
  {
    id: 'pnl_50',
    type: 'pnl',
    threshold: 0.5,
    nameKey: 'milestones.pnl_50',
    fallbackName: 'SUPERNOVA',
    icon: '🌟',
    color: COLORS.BRILLIANT_ROSE,
    severity: 'celebration',
    sound: 'glint',
  },

  // Danger Announcements (negative raw PnL — tension beats, once per run)
  {
    id: 'danger_10',
    type: 'danger',
    threshold: -0.1,
    nameKey: 'milestones.danger_10',
    fallbackName: 'DRAWDOWN ALERT',
    icon: '⚠️',
    color: COLORS.DUMP_ORANGE,
    severity: 'danger',
    sound: 'tension',
  },
  {
    id: 'danger_25',
    type: 'danger',
    threshold: -0.25,
    nameKey: 'milestones.danger_25',
    fallbackName: 'LIQUIDATION ZONE',
    icon: '🩸',
    color: COLORS.SHORT,
    severity: 'danger',
    sound: 'tension',
  },
];

/**
 * MilestoneAnnouncer display timing & queue limits.
 */
export const MILESTONE_ANNOUNCEMENT = {
  /** How long a milestone/danger announcement stays on screen */
  DISPLAY_MS: 2000,
  /** How long a combo announcement stays on screen (legacy timing) */
  COMBO_DISPLAY_MS: 2500,
  /** Gap between consecutive queued announcements */
  GAP_MS: 150,
  /** Max pending announcements; oldest pending is dropped beyond this */
  MAX_QUEUE: 3,
} as const;

/** Milestone types routed to the center-screen MilestoneAnnouncer queue. */
export const ANNOUNCER_MILESTONE_TYPES: ReadonlySet<string> = new Set<MilestoneType>([
  'kills',
  'time',
  'level',
  'pnl',
  'danger',
]);
