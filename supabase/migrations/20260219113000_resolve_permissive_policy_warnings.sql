BEGIN;

-- Resolve remaining advisor WARNs: multiple permissive policies.
-- Keep one canonical INSERT/UPDATE policy per action on affected tables.

DO $$
BEGIN
  IF to_regclass('public.profiles') IS NOT NULL THEN
    -- Remove overlapping INSERT policies.
    DROP POLICY IF EXISTS "Allow wallet profile creation" ON public.profiles;
    DROP POLICY IF EXISTS "Authenticated can insert profiles" ON public.profiles;

    -- Canonical INSERT policy for anon/authenticated profile creation.
    DROP POLICY IF EXISTS "Anyone can create a profile" ON public.profiles;
    CREATE POLICY "Anyone can create a profile"
      ON public.profiles
      FOR INSERT
      TO anon, authenticated
      WITH CHECK (
        display_name IS NOT NULL
        AND length(display_name) >= 2
        AND (
          (((SELECT auth.role()) = 'anon') AND auth_user_id IS NULL)
          OR (
            ((SELECT auth.role()) = 'authenticated')
            AND (auth_user_id = (SELECT auth.uid()) OR auth_user_id IS NULL)
          )
        )
      );

    -- Remove duplicate UPDATE policy.
    DROP POLICY IF EXISTS "Wallet users can update own profile" ON public.profiles;

    -- Canonical UPDATE policy.
    DROP POLICY IF EXISTS "Users can update own profile via auth" ON public.profiles;
    CREATE POLICY "Users can update own profile via auth"
      ON public.profiles
      FOR UPDATE
      USING (auth_user_id = (SELECT auth.uid()))
      WITH CHECK (auth_user_id = (SELECT auth.uid()));
  END IF;
END $$;

DO $$
BEGIN
  IF to_regclass('public.device_profiles') IS NOT NULL THEN
    -- Remove overlapping INSERT policies.
    DROP POLICY IF EXISTS "Users can register their devices" ON public.device_profiles;
    DROP POLICY IF EXISTS "Allow anonymous and authenticated to insert device profiles" ON public.device_profiles;

    -- Canonical INSERT policy.
    CREATE POLICY "Allow anonymous and authenticated to insert device profiles"
      ON public.device_profiles
      FOR INSERT
      TO anon, authenticated
      WITH CHECK (
        fingerprint IS NOT NULL
        AND length(fingerprint) >= 16
      );

    -- Remove overlapping UPDATE policies.
    DROP POLICY IF EXISTS "Allow update of own device profile" ON public.device_profiles;
    DROP POLICY IF EXISTS "Users can update own or unclaimed device status" ON public.device_profiles;

    -- Canonical UPDATE policy.
    CREATE POLICY "Users can update own or unclaimed device status"
      ON public.device_profiles
      FOR UPDATE
      TO anon, authenticated
      USING (
        profile_id IS NULL
        OR profile_id IN (
          SELECT id
          FROM public.profiles
          WHERE auth_user_id = (SELECT auth.uid())
        )
      )
      WITH CHECK (
        fingerprint IS NOT NULL
        AND length(fingerprint) >= 16
        AND (
          profile_id IS NULL
          OR profile_id IN (
            SELECT id
            FROM public.profiles
            WHERE auth_user_id = (SELECT auth.uid())
          )
        )
      );
  END IF;
END $$;

COMMIT;
