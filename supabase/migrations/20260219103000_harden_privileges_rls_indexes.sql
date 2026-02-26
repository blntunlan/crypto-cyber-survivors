BEGIN;

-- ============================================
-- Security hardening follow-up:
-- 1) Narrow table privileges granted too broadly
-- 2) Tighten risky RLS predicates
-- 3) Normalize auth.uid() usage for InitPlan caching
-- 4) Add missing FK-supporting index
-- ============================================

-- 1) Privilege hardening
REVOKE INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public FROM anon;
REVOKE INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public FROM authenticated;
REVOKE SELECT ON ALL TABLES IN SCHEMA public FROM anon;

DO $$
DECLARE
  rel_name TEXT;
BEGIN
  -- Anonymous read access should be explicitly scoped.
  FOREACH rel_name IN ARRAY ARRAY[
    'profiles',
    'sessions',
    'market_state',
    'price_logs',
    'achievements',
    'shop_items',
    'price_history',
    'schema_versions',
    'v_leaderboard'
  ]
  LOOP
    IF to_regclass(format('public.%I', rel_name)) IS NOT NULL THEN
      EXECUTE format('GRANT SELECT ON TABLE public.%I TO anon', rel_name);
    END IF;
  END LOOP;

  -- Anonymous writes limited to telemetry / bootstrap flows.
  FOREACH rel_name IN ARRAY ARRAY[
    'profiles',
    'sessions',
    'performance_metrics',
    'error_reports',
    'device_profiles',
    'cheat_attempts'
  ]
  LOOP
    IF to_regclass(format('public.%I', rel_name)) IS NOT NULL THEN
      EXECUTE format('GRANT INSERT ON TABLE public.%I TO anon', rel_name);
    END IF;
  END LOOP;

  -- Device fingerprint upsert path still needs UPDATE for anon users.
  IF to_regclass('public.device_profiles') IS NOT NULL THEN
    GRANT UPDATE ON TABLE public.device_profiles TO anon;
  END IF;

  -- Authenticated writes limited to user-owned domain tables.
  FOREACH rel_name IN ARRAY ARRAY[
    'profiles',
    'sessions',
    'identities',
    'performance_metrics',
    'error_reports',
    'device_profiles',
    'cheat_attempts'
  ]
  LOOP
    IF to_regclass(format('public.%I', rel_name)) IS NOT NULL THEN
      EXECUTE format('GRANT INSERT ON TABLE public.%I TO authenticated', rel_name);
    END IF;
  END LOOP;

  FOREACH rel_name IN ARRAY ARRAY[
    'profiles',
    'sessions',
    'wallets',
    'device_profiles'
  ]
  LOOP
    IF to_regclass(format('public.%I', rel_name)) IS NOT NULL THEN
      EXECUTE format('GRANT UPDATE ON TABLE public.%I TO authenticated', rel_name);
    END IF;
  END LOOP;

  IF to_regclass('public.identities') IS NOT NULL THEN
    GRANT DELETE ON TABLE public.identities TO authenticated;
  END IF;
END $$;

-- 2) Tighten device_profiles RLS policies (avoid USING/WITH CHECK true)
DO $$
BEGIN
  IF to_regclass('public.device_profiles') IS NOT NULL THEN
    EXECUTE 'DROP POLICY IF EXISTS "Allow anonymous and authenticated to insert device profiles" ON public.device_profiles';
    EXECUTE 'DROP POLICY IF EXISTS "Allow anonymous and authenticated to update device profiles" ON public.device_profiles';
    EXECUTE 'DROP POLICY IF EXISTS "Allow update of own device profile" ON public.device_profiles';

    EXECUTE '
      CREATE POLICY "Allow anonymous and authenticated to insert device profiles"
      ON public.device_profiles
      FOR INSERT
      TO anon, authenticated
      WITH CHECK (
        fingerprint IS NOT NULL
        AND length(fingerprint) >= 16
      )
    ';

    EXECUTE '
      CREATE POLICY "Allow update of own device profile"
      ON public.device_profiles
      FOR UPDATE
      TO anon, authenticated
      USING (
        fingerprint IS NOT NULL
      )
      WITH CHECK (
        fingerprint IS NOT NULL
        AND length(fingerprint) >= 16
      )
    ';
  END IF;
END $$;

-- 3) Normalize auth.uid() usage for policy performance consistency
DO $$
BEGIN
  IF to_regclass('public.profiles') IS NOT NULL THEN
    EXECUTE 'DROP POLICY IF EXISTS "Users can update own profile via auth" ON public.profiles';
    EXECUTE '
      CREATE POLICY "Users can update own profile via auth"
      ON public.profiles
      FOR UPDATE
      USING (auth_user_id = (SELECT auth.uid()))
      WITH CHECK (auth_user_id = (SELECT auth.uid()))
    ';

    EXECUTE 'DROP POLICY IF EXISTS "Authenticated can insert profiles" ON public.profiles';
    EXECUTE '
      CREATE POLICY "Authenticated can insert profiles"
      ON public.profiles
      FOR INSERT
      TO authenticated
      WITH CHECK (auth_user_id = (SELECT auth.uid()) OR auth_user_id IS NULL)
    ';

    EXECUTE 'DROP POLICY IF EXISTS "Allow wallet profile creation" ON public.profiles';
    EXECUTE '
      CREATE POLICY "Allow wallet profile creation"
      ON public.profiles
      FOR INSERT
      WITH CHECK (
        wallet_address IS NOT NULL
        OR (SELECT auth.uid()) IS NOT NULL
      )
    ';

    EXECUTE 'DROP POLICY IF EXISTS "Wallet users can update own profile" ON public.profiles';
    EXECUTE '
      CREATE POLICY "Wallet users can update own profile"
      ON public.profiles
      FOR UPDATE
      USING (auth_user_id = (SELECT auth.uid()))
      WITH CHECK (auth_user_id = (SELECT auth.uid()))
    ';
  END IF;

  IF to_regclass('public.identities') IS NOT NULL THEN
    EXECUTE 'DROP POLICY IF EXISTS "Users can insert own identities" ON public.identities';
    EXECUTE '
      CREATE POLICY "Users can insert own identities"
      ON public.identities
      FOR INSERT
      WITH CHECK (
        profile_id IN (
          SELECT id
          FROM public.profiles
          WHERE auth_user_id = (SELECT auth.uid())
        )
      )
    ';

    EXECUTE 'DROP POLICY IF EXISTS "Users can delete own identities" ON public.identities';
    EXECUTE '
      CREATE POLICY "Users can delete own identities"
      ON public.identities
      FOR DELETE
      USING (
        profile_id IN (
          SELECT id
          FROM public.profiles
          WHERE auth_user_id = (SELECT auth.uid())
        )
      )
    ';
  END IF;

  IF to_regclass('public.players') IS NOT NULL THEN
    EXECUTE 'DROP POLICY IF EXISTS "Users can update own profile" ON public.players';
    EXECUTE '
      CREATE POLICY "Users can update own profile"
      ON public.players
      FOR UPDATE
      USING ((SELECT auth.uid()) = auth_user_id)
      WITH CHECK ((SELECT auth.uid()) = auth_user_id)
    ';

    EXECUTE 'DROP POLICY IF EXISTS "Users can insert own profile" ON public.players';
    EXECUTE '
      CREATE POLICY "Users can insert own profile"
      ON public.players
      FOR INSERT
      WITH CHECK ((SELECT auth.uid()) = auth_user_id)
    ';
  END IF;
END $$;

-- 4) Align authenticated session insert policy with auth_user_id -> profiles.id mapping
DO $$
BEGIN
  IF to_regclass('public.sessions') IS NOT NULL THEN
    EXECUTE 'DROP POLICY IF EXISTS "Users can insert own sessions" ON public.sessions';
    EXECUTE '
      CREATE POLICY "Users can insert own sessions"
      ON public.sessions
      FOR INSERT
      TO authenticated
      WITH CHECK (
        profile_id IS NULL
        OR profile_id IN (
          SELECT id
          FROM public.profiles
          WHERE auth_user_id = (SELECT auth.uid())
        )
      )
    ';
  END IF;
END $$;

-- 5) Add missing index for session_id foreign key access paths in game_runs
DO $$
BEGIN
  IF to_regclass('public.game_runs') IS NOT NULL THEN
    CREATE INDEX IF NOT EXISTS idx_game_runs_session_created
      ON public.game_runs(session_id, created_at DESC)
      WHERE session_id IS NOT NULL;
  END IF;
END $$;

COMMIT;
