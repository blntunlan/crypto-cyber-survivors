-- ============================================
-- Market Runtime Audit Schema
-- Adds runtime ingestion and reconciliation tables
-- ============================================

BEGIN;

CREATE TABLE IF NOT EXISTS public.game_runs (
  run_id TEXT PRIMARY KEY,
  profile_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  session_id UUID REFERENCES public.sessions(id) ON DELETE SET NULL,
  pair TEXT NOT NULL,
  position TEXT NOT NULL CHECK (position IN ('LONG', 'SHORT')),
  leverage NUMERIC NOT NULL CHECK (leverage > 0),
  entry_price NUMERIC NOT NULL CHECK (entry_price > 0),
  liquidation_price NUMERIC NOT NULL CHECK (liquidation_price > 0),
  started_at TIMESTAMPTZ NOT NULL,
  ended_at TIMESTAMPTZ,
  last_seq INTEGER NOT NULL DEFAULT 0,
  algo_version TEXT NOT NULL,
  config_version TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.run_ticks (
  run_id TEXT NOT NULL REFERENCES public.game_runs(run_id) ON DELETE CASCADE,
  seq INTEGER NOT NULL CHECK (seq > 0),
  pair TEXT NOT NULL,
  source TEXT NOT NULL CHECK (source IN ('binance', 'coinbase', 'fallback')),
  source_ts TIMESTAMPTZ NOT NULL,
  recv_ts TIMESTAMPTZ NOT NULL,
  price_q NUMERIC(20, 8) NOT NULL,
  volume_q NUMERIC(20, 8) NOT NULL DEFAULT 0,
  high_q NUMERIC(20, 8) NOT NULL,
  low_q NUMERIC(20, 8) NOT NULL,
  prev_hash TEXT NOT NULL,
  hash TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (run_id, seq)
);

CREATE TABLE IF NOT EXISTS public.run_snapshots (
  run_id TEXT NOT NULL REFERENCES public.game_runs(run_id) ON DELETE CASCADE,
  seq INTEGER NOT NULL CHECK (seq > 0),
  pair TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL,
  price_q NUMERIC(20, 8) NOT NULL,
  volume_q NUMERIC(20, 8) NOT NULL DEFAULT 0,
  raw_pnl NUMERIC(20, 8) NOT NULL,
  effective_pnl NUMERIC(20, 8) NOT NULL,
  raw_pnl_bp INTEGER NOT NULL,
  effective_pnl_bp INTEGER NOT NULL,
  leverage NUMERIC NOT NULL,
  position TEXT NOT NULL CHECK (position IN ('LONG', 'SHORT')),
  entry_price NUMERIC NOT NULL,
  liquidation_price NUMERIC NOT NULL,
  is_liquidated BOOLEAN NOT NULL DEFAULT FALSE,
  rsi NUMERIC(12, 6) NOT NULL,
  atr_percent NUMERIC(20, 8) NOT NULL DEFAULT 0,
  atr_bp INTEGER NOT NULL DEFAULT 0,
  macd NUMERIC(20, 8) NOT NULL DEFAULT 0,
  difficulty NUMERIC(20, 8) NOT NULL,
  spawn_rate_multiplier NUMERIC(20, 8) NOT NULL DEFAULT 1,
  enemy_damage NUMERIC(20, 8) NOT NULL DEFAULT 1,
  enemy_speed NUMERIC(20, 8) NOT NULL DEFAULT 1,
  gem_value_multiplier NUMERIC(20, 8) NOT NULL DEFAULT 1,
  momentum NUMERIC(20, 8) NOT NULL DEFAULT 0,
  tick_hash TEXT NOT NULL,
  checksum TEXT NOT NULL,
  algo_version TEXT NOT NULL,
  config_version TEXT NOT NULL,
  PRIMARY KEY (run_id, seq)
);

CREATE TABLE IF NOT EXISTS public.run_reconcile (
  id BIGSERIAL PRIMARY KEY,
  run_id TEXT NOT NULL REFERENCES public.game_runs(run_id) ON DELETE CASCADE,
  seq INTEGER NOT NULL CHECK (seq > 0),
  client_checksum TEXT NOT NULL,
  server_checksum TEXT,
  drift_raw_pnl_bp INTEGER NOT NULL DEFAULT 0,
  drift_effective_pnl_bp INTEGER NOT NULL DEFAULT 0,
  drift_difficulty_bp INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'ok', 'mismatch', 'error')),
  details JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (run_id, seq)
);

CREATE INDEX IF NOT EXISTS idx_game_runs_profile_created
  ON public.game_runs(profile_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_run_ticks_run_recv
  ON public.run_ticks(run_id, recv_ts DESC);

CREATE INDEX IF NOT EXISTS idx_run_snapshots_run_created
  ON public.run_snapshots(run_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_run_reconcile_status_created
  ON public.run_reconcile(status, created_at DESC);

ALTER TABLE public.game_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.run_ticks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.run_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.run_reconcile ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read own game_runs" ON public.game_runs;
CREATE POLICY "Users can read own game_runs"
  ON public.game_runs
  FOR SELECT
  USING (
    profile_id IN (
      SELECT id
      FROM public.profiles
      WHERE auth_user_id = (SELECT auth.uid())
    )
    OR profile_id IS NULL
  );

DROP POLICY IF EXISTS "Service role can write game_runs" ON public.game_runs;
CREATE POLICY "Service role can write game_runs"
  ON public.game_runs
  FOR ALL
  USING ((SELECT auth.role()) = 'service_role')
  WITH CHECK ((SELECT auth.role()) = 'service_role');

DROP POLICY IF EXISTS "Users can read own run_ticks" ON public.run_ticks;
CREATE POLICY "Users can read own run_ticks"
  ON public.run_ticks
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.game_runs gr
      WHERE gr.run_id = run_ticks.run_id
        AND (
          gr.profile_id IN (
            SELECT id
            FROM public.profiles
            WHERE auth_user_id = (SELECT auth.uid())
          )
          OR gr.profile_id IS NULL
        )
    )
  );

DROP POLICY IF EXISTS "Service role can write run_ticks" ON public.run_ticks;
CREATE POLICY "Service role can write run_ticks"
  ON public.run_ticks
  FOR ALL
  USING ((SELECT auth.role()) = 'service_role')
  WITH CHECK ((SELECT auth.role()) = 'service_role');

DROP POLICY IF EXISTS "Users can read own run_snapshots" ON public.run_snapshots;
CREATE POLICY "Users can read own run_snapshots"
  ON public.run_snapshots
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.game_runs gr
      WHERE gr.run_id = run_snapshots.run_id
        AND (
          gr.profile_id IN (
            SELECT id
            FROM public.profiles
            WHERE auth_user_id = (SELECT auth.uid())
          )
          OR gr.profile_id IS NULL
        )
    )
  );

DROP POLICY IF EXISTS "Service role can write run_snapshots" ON public.run_snapshots;
CREATE POLICY "Service role can write run_snapshots"
  ON public.run_snapshots
  FOR ALL
  USING ((SELECT auth.role()) = 'service_role')
  WITH CHECK ((SELECT auth.role()) = 'service_role');

DROP POLICY IF EXISTS "Users can read own run_reconcile" ON public.run_reconcile;
CREATE POLICY "Users can read own run_reconcile"
  ON public.run_reconcile
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.game_runs gr
      WHERE gr.run_id = run_reconcile.run_id
        AND (
          gr.profile_id IN (
            SELECT id
            FROM public.profiles
            WHERE auth_user_id = (SELECT auth.uid())
          )
          OR gr.profile_id IS NULL
        )
    )
  );

DROP POLICY IF EXISTS "Service role can write run_reconcile" ON public.run_reconcile;
CREATE POLICY "Service role can write run_reconcile"
  ON public.run_reconcile
  FOR ALL
  USING ((SELECT auth.role()) = 'service_role')
  WITH CHECK ((SELECT auth.role()) = 'service_role');

COMMIT;
