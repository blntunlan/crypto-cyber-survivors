/**
 * Drizzle ORM schema — mirrors the tables/indexes/constraints created by
 * src/db/migrate.ts (migrations 000-010). migrate.ts is the source of truth
 * for the live DB; this file keeps Drizzle ORM in sync for typed queries.
 * schema.sql is a human-readable current-state snapshot of the same.
 */
import {
  pgTable,
  uuid,
  text,
  timestamp,
  boolean,
  integer,
  bigint,
  bigserial,
  doublePrecision,
  numeric,
  jsonb,
  date,
  index,
  unique,
  check,
  customType,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

// ── Custom types ─────────────────────────────────────────────────────────────

const bytea = customType<{ data: Buffer; driverValue: Buffer }>({
  dataType() {
    return 'bytea';
  },
});

// ── Railway-native accounts foundation ──────────────────────────────────────

export const accounts = pgTable(
  'accounts',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    accountType: text('account_type').notNull().default('anonymous'),
    status: text('status').notNull().default('active'),
    displayName: text('display_name'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
    lastSeenAt: timestamp('last_seen_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    check('ck_accounts_type', sql`${table.accountType} IN ('anonymous', 'registered', 'service')`),
    check('ck_accounts_status', sql`${table.status} IN ('active', 'suspended', 'deleted')`),
    index('idx_accounts_type').on(table.accountType),
    index('idx_accounts_status').on(table.status),
    index('idx_accounts_last_seen').on(table.lastSeenAt),
  ]
);

export const accountIdentities = pgTable(
  'account_identities',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    accountId: uuid('account_id')
      .notNull()
      .references(() => accounts.id, { onDelete: 'cascade' }),
    provider: text('provider').notNull(),
    providerSubject: text('provider_subject').notNull(),
    providerUsername: text('provider_username'),
    metadata: jsonb('metadata').notNull().default({}),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    unique('account_identities_provider_subject_key').on(table.provider, table.providerSubject),
    index('idx_account_identities_account').on(table.accountId),
    index('idx_account_identities_provider').on(table.provider),
  ]
);

// ── 1. profiles ──────────────────────────────────────────────────────────────

export const profiles = pgTable(
  'profiles',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    authUserId: uuid('auth_user_id').unique(),
    nickname: text('nickname').unique(),
    displayName: text('display_name'),
    avatarUrl: text('avatar_url'),
    walletAddress: text('wallet_address').unique(),
    primaryAuthProvider: text('primary_auth_provider').default('railway'),
    lastSeenAt: timestamp('last_seen_at', { withTimezone: true }).notNull().defaultNow(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('idx_profiles_auth_user_id').on(table.authUserId),
    index('idx_profiles_nickname').on(table.nickname),
  ]
);

// ── Railway-native economy foundation ───────────────────────────────────────

export const wallets = pgTable(
  'wallets',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    accountId: uuid('account_id')
      .unique()
      .notNull()
      .references(() => accounts.id, { onDelete: 'cascade' }),
    profileId: uuid('profile_id')
      .unique()
      .references(() => profiles.id, { onDelete: 'set null' }),
    balance: bigint('balance', { mode: 'number' }).notNull().default(0),
    currency: text('currency').notNull().default('gold'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    check('ck_wallets_balance_non_negative', sql`${table.balance} >= 0`),
    index('idx_wallets_profile').on(table.profileId),
  ]
);

export const ledgerEntries = pgTable(
  'ledger_entries',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    accountId: uuid('account_id')
      .notNull()
      .references(() => accounts.id, { onDelete: 'cascade' }),
    walletId: uuid('wallet_id')
      .notNull()
      .references(() => wallets.id, { onDelete: 'cascade' }),
    profileId: uuid('profile_id').references(() => profiles.id, { onDelete: 'set null' }),
    amount: bigint('amount', { mode: 'number' }).notNull(),
    balanceAfter: bigint('balance_after', { mode: 'number' }).notNull(),
    entryType: text('entry_type').notNull(),
    referenceType: text('reference_type'),
    referenceId: text('reference_id'),
    idempotencyKey: text('idempotency_key'),
    metadata: jsonb('metadata').notNull().default({}),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    check('ck_ledger_entries_balance_after_non_negative', sql`${table.balanceAfter} >= 0`),
    unique('idx_ledger_entries_idempotency').on(table.accountId, table.idempotencyKey),
    index('idx_ledger_entries_account_created').on(table.accountId, table.createdAt),
    index('idx_ledger_entries_wallet_created').on(table.walletId, table.createdAt),
    index('idx_ledger_entries_reference').on(table.referenceType, table.referenceId),
    index('idx_ledger_entries_profile').on(table.profileId),
  ]
);

export const rewardClaims = pgTable(
  'reward_claims',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    accountId: uuid('account_id')
      .notNull()
      .references(() => accounts.id, { onDelete: 'cascade' }),
    profileId: uuid('profile_id').references(() => profiles.id, { onDelete: 'set null' }),
    sessionId: uuid('session_id')
      .unique()
      .notNull()
      .references(() => sessions.id, { onDelete: 'cascade' }),
    amount: bigint('amount', { mode: 'number' }).notNull(),
    status: text('status').notNull().default('claimed'),
    idempotencyKey: text('idempotency_key'),
    metadata: jsonb('metadata').notNull().default({}),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    check('ck_reward_claims_amount_non_negative', sql`${table.amount} >= 0`),
    check('ck_reward_claims_status', sql`${table.status} IN ('claimed', 'reversed', 'rejected')`),
    unique('idx_reward_claims_idempotency').on(table.accountId, table.idempotencyKey),
    index('idx_reward_claims_account_created').on(table.accountId, table.createdAt),
    index('idx_reward_claims_profile').on(table.profileId),
  ]
);

export const runEscrows = pgTable(
  'run_escrows',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    sessionId: uuid('session_id')
      .unique()
      .notNull()
      .references(() => sessions.id, { onDelete: 'cascade' }),
    profileId: uuid('profile_id')
      .notNull()
      .references(() => profiles.id, { onDelete: 'cascade' }),
    state: text('state').notNull().default('active'),
    greedLevel: integer('greed_level').notNull().default(0),
    timeWeightedAlignment: doublePrecision('time_weighted_alignment').notNull().default(0),
    alignmentSampleCount: integer('alignment_sample_count').notNull().default(0),
    lastMarketSequence: bigint('last_market_sequence', { mode: 'number' }),
    marketStaleSince: timestamp('market_stale_since', { withTimezone: true }),
    safeExitAvailableAt: timestamp('safe_exit_available_at', { withTimezone: true }),
    primaryRewardPoints: doublePrecision('primary_reward_points').notNull().default(0),
    settledAt: timestamp('settled_at', { withTimezone: true }),
    failureType: text('failure_type'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    check(
      'ck_run_escrows_state',
      sql`${table.state} IN ('active', 'quote_open', 'settled', 'failed')`
    ),
    check('ck_run_escrows_greed', sql`${table.greedLevel} >= 0`),
    check('ck_run_escrows_alignment_samples', sql`${table.alignmentSampleCount} >= 0`),
    check('ck_run_escrows_points', sql`${table.primaryRewardPoints} >= 0`),
    index('idx_run_escrows_profile_state').on(table.profileId, table.state, table.updatedAt),
  ]
);

export const cashOutQuotes = pgTable(
  'cash_out_quotes',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    escrowId: uuid('escrow_id')
      .notNull()
      .references(() => runEscrows.id, { onDelete: 'cascade' }),
    quoteId: text('quote_id').unique().notNull(),
    canonicalSequence: bigint('canonical_sequence', { mode: 'number' }).notNull(),
    rewardPoints: doublePrecision('reward_points').notNull(),
    signature: text('signature').notNull(),
    status: text('status').notNull().default('open'),
    issuedAt: timestamp('issued_at', { withTimezone: true }).notNull().defaultNow(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    respondedAt: timestamp('responded_at', { withTimezone: true }),
    idempotencyKey: text('idempotency_key'),
  },
  (table) => [
    check(
      'ck_cash_out_quotes_status',
      sql`${table.status} IN ('open', 'accepted', 'rejected', 'expired', 'safe_exit')`
    ),
    check('ck_cash_out_quotes_points', sql`${table.rewardPoints} >= 0`),
    index('idx_cash_out_quotes_escrow').on(table.escrowId, table.status),
  ]
);

export const shardEntries = pgTable(
  'shard_entries',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    sessionId: uuid('session_id')
      .unique()
      .notNull()
      .references(() => sessions.id, { onDelete: 'cascade' }),
    profileId: uuid('profile_id')
      .notNull()
      .references(() => profiles.id, { onDelete: 'cascade' }),
    amount: integer('amount').notNull(),
    failureType: text('failure_type').notNull(),
    participationVerified: boolean('participation_verified').notNull(),
    metadata: jsonb('metadata').notNull().default({}),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    check('ck_shard_entries_amount', sql`${table.amount} >= 0 AND ${table.amount} <= 220`),
    index('idx_shard_entries_profile_created').on(table.profileId, table.createdAt),
  ]
);

export const rewardPointEntries = pgTable(
  'reward_point_entries',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    sessionId: uuid('session_id')
      .unique()
      .notNull()
      .references(() => sessions.id, { onDelete: 'cascade' }),
    escrowId: uuid('escrow_id')
      .notNull()
      .references(() => runEscrows.id, { onDelete: 'cascade' }),
    profileId: uuid('profile_id')
      .notNull()
      .references(() => profiles.id, { onDelete: 'cascade' }),
    amount: doublePrecision('amount').notNull(),
    entryType: text('entry_type').notNull(),
    quoteId: text('quote_id').references(() => cashOutQuotes.quoteId, { onDelete: 'set null' }),
    metadata: jsonb('metadata').notNull().default({}),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    check('ck_reward_point_entries_amount', sql`${table.amount} >= 0`),
    check(
      'ck_reward_point_entries_type',
      sql`${table.entryType} IN ('cash_out_accepted', 'safe_exit')`
    ),
    index('idx_reward_point_entries_profile_created').on(table.profileId, table.createdAt),
    index('idx_reward_point_entries_escrow').on(table.escrowId),
  ]
);

export const idempotencyKeys = pgTable(
  'idempotency_keys',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    accountId: uuid('account_id').references(() => accounts.id, { onDelete: 'cascade' }),
    key: text('key').notNull(),
    scope: text('scope').notNull(),
    requestHash: text('request_hash'),
    responseBody: jsonb('response_body'),
    statusCode: integer('status_code'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  },
  (table) => [
    unique('idempotency_keys_scope_key').on(table.scope, table.key),
    index('idx_idempotency_keys_account').on(table.accountId),
    index('idx_idempotency_keys_expires').on(table.expiresAt),
  ]
);

export const auditEvents = pgTable(
  'audit_events',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    accountId: uuid('account_id').references(() => accounts.id, { onDelete: 'set null' }),
    profileId: uuid('profile_id').references(() => profiles.id, { onDelete: 'set null' }),
    eventType: text('event_type').notNull(),
    resource: text('resource'),
    severity: text('severity').notNull().default('info'),
    metadata: jsonb('metadata').notNull().default({}),
    ipAddress: text('ip_address'),
    userAgent: text('user_agent'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    check('ck_audit_events_severity', sql`${table.severity} IN ('debug', 'info', 'warn', 'error', 'critical')`),
    index('idx_audit_events_account_created').on(table.accountId, table.createdAt),
    index('idx_audit_events_profile_created').on(table.profileId, table.createdAt),
    index('idx_audit_events_type_created').on(table.eventType, table.createdAt),
  ]
);

// ── 2. identities ────────────────────────────────────────────────────────────

export const identities = pgTable(
  'identities',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    profileId: uuid('profile_id')
      .notNull()
      .references(() => profiles.id, { onDelete: 'cascade' }),
    provider: text('provider').notNull(),
    providerUserId: text('provider_user_id').notNull(),
    providerUsername: text('provider_username'),
    accessToken: text('access_token'),
    refreshToken: text('refresh_token'),
    tokenExpiresAt: timestamp('token_expires_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    unique('identities_provider_provider_user_id_key').on(table.provider, table.providerUserId),
    index('idx_identities_profile_id').on(table.profileId),
  ]
);

// ── 3. virtual_accounts ──────────────────────────────────────────────────────

export const virtualAccounts = pgTable(
  'virtual_accounts',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    profileId: uuid('profile_id')
      .unique()
      .notNull()
      .references(() => profiles.id, { onDelete: 'cascade' }),
    goldBalance: bigint('gold_balance', { mode: 'number' }).notNull().default(0),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    check('virtual_accounts_gold_balance_check', sql`${table.goldBalance} >= 0`),
  ]
);

// ── 4. ledger ────────────────────────────────────────────────────────────────

export const ledger = pgTable(
  'ledger',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    profileId: uuid('profile_id')
      .notNull()
      .references(() => profiles.id, { onDelete: 'cascade' }),
    amount: bigint('amount', { mode: 'number' }).notNull(),
    transactionType: text('transaction_type').notNull(),
    referenceId: text('reference_id'),
    metadata: jsonb('metadata').default({}),
    balanceAfter: bigint('balance_after', { mode: 'number' }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('idx_ledger_profile_id').on(table.profileId),
    index('idx_ledger_reference_id').on(table.referenceId),
    index('idx_ledger_created_at').on(table.createdAt),
  ]
);

// ── 5. sessions ──────────────────────────────────────────────────────────────

export const sessions = pgTable(
  'sessions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    profileId: uuid('profile_id')
      .notNull()
      .references(() => profiles.id, { onDelete: 'cascade' }),
    pair: text('pair').notNull(),
    position: text('position').notNull(),
    leverage: integer('leverage').notNull(),
    entryPrice: doublePrecision('entry_price'),
    exitPrice: doublePrecision('exit_price'),
    sessionSecret: text('session_secret').notNull(),
    isVerified: boolean('is_verified').notNull().default(false),
    rewardAmount: integer('reward_amount').default(0),
    survivalSeconds: integer('survival_seconds').default(0),
    kills: integer('kills').default(0),
    level: integer('level').default(1),
    exitType: text('exit_type'),
    portalType: text('portal_type'),
    // max_streak: server-trusted kill streak (migration 014); NULL on legacy rows
    maxStreak: integer('max_streak'),
    // price_check: 'ok' | 'partial' | 'skipped' — whether the price_history
    // reconciliation in /verify found real entry/exit prices; NULL on legacy rows
    priceCheck: text('price_check'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    verifiedAt: timestamp('verified_at', { withTimezone: true }),
  },
  (table) => [
    check('sessions_position_check', sql`${table.position} IN ('LONG', 'SHORT')`),
    check('sessions_leverage_check', sql`${table.leverage} >= 1 AND ${table.leverage} <= 500`),
    check('sessions_reward_amount_check', sql`${table.rewardAmount} >= 0`),
    check('sessions_survival_seconds_check', sql`${table.survivalSeconds} >= 0`),
    check('sessions_kills_check', sql`${table.kills} >= 0`),
    check('sessions_level_check', sql`${table.level} >= 1`),
    check('ck_sessions_max_streak', sql`${table.maxStreak} IS NULL OR ${table.maxStreak} >= 0`),
    check(
      'ck_sessions_price_check',
      sql`${table.priceCheck} IS NULL OR ${table.priceCheck} IN ('ok', 'partial', 'skipped')`
    ),
    index('idx_sessions_profile_id').on(table.profileId),
    // idx_sessions_is_verified dropped in migration 014 — the leading column of
    // idx_sessions_verified_pair_survival covers is_verified-only filters
    index('idx_sessions_verified_pair_survival').on(
      table.isVerified,
      table.pair,
      table.survivalSeconds
    ),
  ]
);

// ── Railway-native market runtime audit ──────────────────────────────────────

export const marketRuntimeAudit = pgTable(
  'market_runtime_audit',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    accountId: uuid('account_id')
      .notNull()
      .references(() => accounts.id, { onDelete: 'cascade' }),
    profileId: uuid('profile_id').references(() => profiles.id, {
      onDelete: 'set null',
    }),
    sessionId: uuid('session_id').references(() => sessions.id, {
      onDelete: 'set null',
    }),
    runId: text('run_id').notNull(),
    seq: integer('seq').notNull(),
    pair: text('pair').notNull(),
    source: text('source'),
    runConstants: jsonb('run_constants').notNull(),
    tick: jsonb('tick').notNull(),
    snapshot: jsonb('snapshot').notNull(),
    tickHash: text('tick_hash'),
    snapshotChecksum: text('snapshot_checksum'),
    clientCreatedAt: timestamp('client_created_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    check('ck_market_runtime_audit_seq', sql`${table.seq} >= 0`),
    unique('market_runtime_audit_account_run_seq_key').on(
      table.accountId,
      table.runId,
      table.seq
    ),
    index('idx_market_runtime_audit_account_run').on(
      table.accountId,
      table.runId,
      table.seq
    ),
    index('idx_market_runtime_audit_profile_created').on(
      table.profileId,
      table.createdAt
    ),
    index('idx_market_runtime_audit_session_seq').on(table.sessionId, table.seq),
    index('idx_market_runtime_audit_pair_created').on(table.pair, table.createdAt),
  ]
);

// ── 6. market_state ──────────────────────────────────────────────────────────

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
  enemyAggroMultiplierLong: doublePrecision('enemy_aggro_multiplier_long').notNull().default(1),
  enemyAggroMultiplierShort: doublePrecision('enemy_aggro_multiplier_short').notNull().default(1),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

// ── 7. price_history ─────────────────────────────────────────────────────────

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
  (table) => [
    // idx_price_history_pair_ts dropped in migration 014 — the UNIQUE index
    // serves (pair, timestamp DESC) queries via backward scan
    unique('price_history_pair_timestamp_key').on(table.pair, table.timestamp),
  ]
);

// ── 8. error_reports ─────────────────────────────────────────────────────────

export const errorReports = pgTable(
  'error_reports',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    errorType: text('error_type').notNull(),
    message: text('message').notNull(),
    stackTrace: text('stack_trace'),
    severity: text('severity').notNull().default('medium'),
    category: text('category').notNull().default('runtime'),
    pageUrl: text('page_url'),
    browserInfo: text('browser_info'),
    contextData: jsonb('context_data').default({}),
    status: text('status').notNull().default('new'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index('idx_error_reports_created_at').on(table.createdAt)]
);

// ── 9. cheat_attempts ────────────────────────────────────────────────────────

export const cheatAttempts = pgTable(
  'cheat_attempts',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    profileId: uuid('profile_id').references(() => profiles.id, { onDelete: 'set null' }),
    sessionId: uuid('session_id').references(() => sessions.id, { onDelete: 'set null' }),
    cheatType: text('cheat_type').notNull(),
    details: jsonb('details').default({}),
    severity: text('severity').notNull().default('medium'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('idx_cheat_attempts_profile_id').on(table.profileId),
    index('idx_cheat_attempts_session_id').on(table.sessionId),
    index('idx_cheat_attempts_created_at').on(table.createdAt),
  ]
);

// ── 10. device_profiles ──────────────────────────────────────────────────────

export const deviceProfiles = pgTable(
  'device_profiles',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    fingerprint: text('fingerprint').unique().notNull(),
    deviceType: text('device_type'),
    browser: text('browser'),
    screenWidth: integer('screen_width'),
    screenHeight: integer('screen_height'),
    hardwareConcurrency: integer('hardware_concurrency'),
    deviceMemory: numeric('device_memory'),
    recommendedProfile: text('recommended_profile'),
    benchmarkScore: numeric('benchmark_score'),
    firstSeenAt: timestamp('first_seen_at', { withTimezone: true }).notNull().defaultNow(),
    lastSeenAt: timestamp('last_seen_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index('idx_device_profiles_fingerprint').on(table.fingerprint)]
);

// ── 11. performance_metrics ──────────────────────────────────────────────────

export const performanceMetrics = pgTable(
  'performance_metrics',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    profileId: uuid('profile_id').references(() => profiles.id, { onDelete: 'set null' }),
    sessionId: uuid('session_id').references(() => sessions.id, { onDelete: 'set null' }),
    devicePlatform: text('device_platform'),
    deviceModel: text('device_model'),
    osInfo: text('os_info'),
    memoryGb: numeric('memory_gb'),
    cpuCores: integer('cpu_cores'),
    avgFps: numeric('avg_fps'),
    minFps: numeric('min_fps'),
    maxFps: numeric('max_fps'),
    frameDrops: integer('frame_drops').default(0),
    resolution: text('resolution'),
    gpuInfo: text('gpu_info'),
    metadata: jsonb('metadata').default({}),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('idx_performance_metrics_session').on(table.sessionId),
    index('idx_performance_metrics_profile').on(table.profileId),
    index('idx_performance_metrics_created_at').on(table.createdAt),
  ]
);

// ── Product telemetry events ────────────────────────────────────────────────

export const productTelemetryEvents = pgTable(
  'product_telemetry_events',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    profileId: uuid('profile_id').references(() => profiles.id, {
      onDelete: 'set null',
    }),
    sessionId: uuid('session_id').references(() => sessions.id, {
      onDelete: 'set null',
    }),
    eventType: text('event_type').notNull(),
    seasonId: text('season_id'),
    questId: text('quest_id'),
    referralCode: text('referral_code'),
    walletProvider: text('wallet_provider'),
    walletAddressHash: text('wallet_address_hash'),
    metadata: jsonb('metadata').notNull().default({}),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    check(
      'ck_product_telemetry_events_type',
      sql`${table.eventType} IN (
        'wallet_connected',
        'wallet_connect_failed',
        'season_joined',
        'quest_completed',
        'leaderboard_submitted',
        'leaderboard_viewed',
        'referral_joined'
      )`
    ),
    index('idx_product_events_created').on(table.createdAt),
    index('idx_product_events_type_created').on(table.eventType, table.createdAt),
    index('idx_product_events_season_created').on(table.seasonId, table.createdAt),
    index('idx_product_events_profile_created').on(table.profileId, table.createdAt),
    index('idx_product_events_wallet_hash').on(table.walletAddressHash),
    index('idx_product_events_session').on(table.sessionId),
  ]
);

// ── 12. meta_progression ─────────────────────────────────────────────────────

export const metaProgression = pgTable(
  'meta_progression',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    profileId: uuid('profile_id')
      .unique()
      .notNull()
      .references(() => profiles.id, { onDelete: 'cascade' }),
    metaCoins: bigint('meta_coins', { mode: 'number' }).notNull().default(0),
    upgrades: jsonb('upgrades').notNull().default({}),
    totalRunsCompleted: integer('total_runs_completed').notNull().default(0),
    totalMetaCoinsEarned: bigint('total_meta_coins_earned', { mode: 'number' }).notNull().default(0),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    check('meta_progression_meta_coins_check', sql`${table.metaCoins} >= 0`),
    check('meta_progression_total_runs_check', sql`${table.totalRunsCompleted} >= 0`),
    check('meta_progression_total_earned_check', sql`${table.totalMetaCoinsEarned} >= 0`),
    // idx_meta_progression_profile dropped in migration 014 — profile_id is
    // already UNIQUE (constraint index)
  ]
);

// ── 13. daily_challenges ─────────────────────────────────────────────────────

export const dailyChallenges = pgTable(
  'daily_challenges',
  {
    id: text('id').primaryKey(),
    type: text('type').notNull(),
    name: text('name').notNull(),
    description: text('description').notNull(),
    constraints: jsonb('constraints').notNull().default([]),
    objectives: jsonb('objectives').notNull().default([]),
    reward: jsonb('reward').notNull().default({}),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    seed: bigint('seed', { mode: 'number' }).notNull(),
    isActive: boolean('is_active').notNull().default(true),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    check('daily_challenges_type_check', sql`${table.type} IN ('daily', 'weekly')`),
    index('idx_daily_challenges_type').on(table.type),
    index('idx_daily_challenges_expires').on(table.expiresAt),
  ]
);

// ── 14. challenge_completions ────────────────────────────────────────────────

export const challengeCompletions = pgTable(
  'challenge_completions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    profileId: uuid('profile_id')
      .notNull()
      .references(() => profiles.id, { onDelete: 'cascade' }),
    challengeId: text('challenge_id')
      .notNull()
      .references(() => dailyChallenges.id, { onDelete: 'cascade' }),
    sessionId: uuid('session_id').references(() => sessions.id, { onDelete: 'set null' }),
    score: integer('score').notNull().default(0),
    survivalSeconds: integer('survival_seconds').notNull().default(0),
    kills: integer('kills').notNull().default(0),
    levelReached: integer('level_reached').notNull().default(1),
    objectivesCompleted: jsonb('objectives_completed').notNull().default([]),
    completedAt: timestamp('completed_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    unique('challenge_completions_profile_challenge_key').on(table.profileId, table.challengeId),
    index('idx_challenge_completions_profile').on(table.profileId),
    index('idx_challenge_completions_challenge').on(table.challengeId),
    index('idx_challenge_completions_score').on(table.score),
    index('idx_challenge_completions_session_id').on(table.sessionId),
    index('idx_challenge_completions_challenge_score').on(table.challengeId, table.score),
  ]
);

// ── 15. game_replays ─────────────────────────────────────────────────────────

export const gameReplays = pgTable(
  'game_replays',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    sessionId: uuid('session_id')
      .notNull()
      .unique()
      .references(() => sessions.id, { onDelete: 'cascade' }),
    profileId: uuid('profile_id')
      .notNull()
      .references(() => profiles.id, { onDelete: 'cascade' }),
    score: integer('score').notNull().default(0),
    durationMs: integer('duration_ms').notNull().default(0),
    finalLevel: integer('final_level').notNull().default(1),
    totalKills: integer('total_kills').notNull().default(0),
    pair: text('pair').notNull(),
    position: text('position').notNull(),
    leverage: integer('leverage').notNull().default(1),
    replayData: bytea('replay_data').notNull(),
    replaySize: integer('replay_size').notNull().default(0),
    version: integer('version').notNull().default(2),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    check('game_replays_score_check', sql`${table.score} >= 0`),
    check(
      'game_replays_replay_size_check',
      sql`${table.replaySize} >= 0 AND ${table.replaySize} <= 512000`
    ),
    check('game_replays_position_check', sql`${table.position} IN ('LONG', 'SHORT')`),
    check(
      'game_replays_leverage_check',
      sql`${table.leverage} >= 1 AND ${table.leverage} <= 500`
    ),
    index('idx_game_replays_profile').on(table.profileId),
    index('idx_game_replays_score').on(table.profileId, table.score),
    index('idx_game_replays_created').on(table.createdAt),
  ]
);

// ── 16. challenge_seed_log ───────────────────────────────────────────────────

export const challengeSeedLog = pgTable(
  'challenge_seed_log',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    challengeDate: date('challenge_date').notNull(),
    challengeType: text('challenge_type').notNull(),
    seed: bigint('seed', { mode: 'number' }).notNull(),
    challengeId: text('challenge_id').references(() => dailyChallenges.id, {
      onDelete: 'set null',
    }),
    generatedAt: timestamp('generated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    check(
      'challenge_seed_log_type_check',
      sql`${table.challengeType} IN ('daily', 'weekly')`
    ),
    unique('challenge_seed_log_date_type_key').on(table.challengeDate, table.challengeType),
    index('idx_challenge_seed_log_challenge_id').on(table.challengeId),
  ]
);

// ── 17. audit_log ───────────────────────────────────────────────────────────

export const auditLog = pgTable(
  'audit_log',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    profileId: uuid('profile_id').references(() => profiles.id, { onDelete: 'set null' }),
    action: text('action').notNull(),
    resource: text('resource').notNull(),
    details: jsonb('details').default({}),
    ipAddress: text('ip_address'),
    userAgent: text('user_agent'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  },
  (table) => [
    index('idx_audit_log_profile').on(table.profileId),
    index('idx_audit_log_action').on(table.action),
    index('idx_audit_log_created').on(table.createdAt),
  ]
);

// ── 18. player_achievements ─────────────────────────────────────────────────

export const playerAchievements = pgTable(
  'player_achievements',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    profileId: uuid('profile_id')
      .notNull()
      .references(() => profiles.id, { onDelete: 'cascade' }),
    achievementId: text('achievement_id').notNull(),
    sessionId: uuid('session_id').references(() => sessions.id, { onDelete: 'set null' }),
    unlockedAt: timestamp('unlocked_at', { withTimezone: true }).notNull().defaultNow(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    check('player_achievements_achievement_id_check', sql`${table.achievementId} <> ''`),
    unique('uq_player_achievements_profile_achievement').on(table.profileId, table.achievementId),
    index('idx_player_achievements_profile').on(table.profileId),
    index('idx_player_achievements_achievement').on(table.achievementId),
    index('idx_player_achievements_unlocked_at').on(table.unlockedAt),
  ]
);
