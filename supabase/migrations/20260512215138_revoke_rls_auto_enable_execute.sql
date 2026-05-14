BEGIN;

-- Supabase Security Advisor: rls_auto_enable() is SECURITY DEFINER and should
-- not be callable through /rest/v1/rpc by browser roles. The event trigger can
-- still use the function after public EXECUTE is revoked.
DO $$
BEGIN
  IF to_regprocedure('public.rls_auto_enable()') IS NOT NULL THEN
    EXECUTE 'REVOKE EXECUTE ON FUNCTION public.rls_auto_enable() FROM PUBLIC, anon, authenticated';
  END IF;
END $$;

COMMIT;
