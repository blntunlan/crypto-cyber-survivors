/**
 * Drizzle ORM schema — only the tables the aggregator writes to.
 * The full schema lives in railway-market-server/src/db/schema.ts.
 */
import {
  pgTable,
  text,
  timestamp,
  bigserial,
  doublePrecision,
  integer,
  jsonb,
  index,
  unique,
} from 'drizzle-orm/pg-core';
// ── market_state (upserted by IndicatorService) ─────────────────────────────

export const marketState = pgTable('market_state', {
  pair: text('pair').primaryKey(),
  price: doublePrecision('price').notNull().default(0),
  volume: doublePrecision('volume').notNull().default(0),
  high: doublePrecision('high').notNull().default(0),
  low: doublePrecision('low').notNull().default(0),
  rsi: doublePrecision('rsi').notNull().default(50),
  rsiState: text('rsi_state').notNull().default('NEUTRAL'),
  atr: doublePrecision('atr').notNull().default(0),
  atrPercent: doublePrecision('atr_percent').notNull().default(0),
  spawnRateMultiplier: doublePrecision('spawn_rate_multiplier').notNull().default(1),
  normalizedVolume: doublePrecision('normalized_volume').notNull().default(0),
  volumePercentile: doublePrecision('volume_percentile').notNull().default(0),
  volumeZScore: doublePrecision('volume_z_score').notNull().default(0),
  volumeMean: doublePrecision('volume_mean').notNull().default(0),
  volumeStdDev: doublePrecision('volume_std_dev').notNull().default(0),
  whaleTier: integer('whale_tier').notNull().default(0),
  volumeHistoryMin: doublePrecision('volume_history_min').notNull().default(0),
  volumeHistoryMax: doublePrecision('volume_history_max').notNull().default(0),
  volumeHistoryCount: integer('volume_history_count').notNull().default(0),
  enemyAggroMultiplierLong: doublePrecision('enemy_aggro_multiplier_long')
    .notNull()
    .default(1),
  enemyAggroMultiplierShort: doublePrecision('enemy_aggro_multiplier_short')
    .notNull()
    .default(1),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

// ── price_history (inserted by PriceLogger) ─────────────────────────────────

export const priceHistory = pgTable(
  'price_history',
  {
    id: bigserial('id', { mode: 'number' }).primaryKey(),
    pair: text('pair').notNull(),
    price: doublePrecision('price').notNull(),
    volume: doublePrecision('volume').notNull().default(0),
    timestamp: timestamp('timestamp', { withTimezone: true }).notNull(),
    metadata: jsonb('metadata').default({}),
  },
  table => [
    unique('price_history_pair_timestamp_key').on(table.pair, table.timestamp),
    index('idx_price_history_pair_ts').on(table.pair, table.timestamp),
  ]
);

// ── error_reports (inserted by ErrorReporter via raw query) ─────────────────
// No Drizzle table needed — ErrorReporter uses raw SQL through pool.query()
