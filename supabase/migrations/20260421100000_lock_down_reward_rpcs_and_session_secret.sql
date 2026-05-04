BEGIN;

-- ============================================
-- Lock down legacy Supabase reward/shop surfaces
-- - credit_coins / purchase_item should not be callable from browser roles
-- - sessions.session_secret must never leak through broad SELECT grants
-- ============================================

DO $$
BEGIN
  IF to_regprocedure('public.credit_coins(uuid,bigint,text,text,jsonb)') IS NOT NULL THEN
    EXECUTE 'REVOKE EXECUTE ON FUNCTION public.credit_coins(UUID, BIGINT, TEXT, TEXT, JSONB) FROM PUBLIC, anon, authenticated';
    EXECUTE 'GRANT EXECUTE ON FUNCTION public.credit_coins(UUID, BIGINT, TEXT, TEXT, JSONB) TO service_role';
  END IF;

  IF to_regprocedure('public.purchase_item(uuid,uuid)') IS NOT NULL THEN
    EXECUTE 'REVOKE EXECUTE ON FUNCTION public.purchase_item(UUID, UUID) FROM PUBLIC, anon, authenticated';
    EXECUTE 'GRANT EXECUTE ON FUNCTION public.purchase_item(UUID, UUID) TO service_role';
  END IF;

  IF to_regprocedure('public.purchase_item(uuid,text)') IS NOT NULL THEN
    EXECUTE 'REVOKE EXECUTE ON FUNCTION public.purchase_item(UUID, TEXT) FROM PUBLIC, anon, authenticated';
    EXECUTE 'GRANT EXECUTE ON FUNCTION public.purchase_item(UUID, TEXT) TO service_role';
  END IF;
END $$;

DO $$
BEGIN
  IF to_regclass('public.sessions') IS NOT NULL THEN
    -- Table-level SELECT had become too broad in earlier migrations.
    -- Re-grant only the safe gameplay columns, excluding session_secret.
    EXECUTE 'REVOKE SELECT ON TABLE public.sessions FROM anon, authenticated';
    EXECUTE '
      GRANT SELECT (
        id,
        profile_id,
        crypto_pair,
        position_chosen,
        leverage,
        entry_price,
        exit_price,
        survival_seconds,
        kills,
        reward_amount,
        is_verified,
        created_at
      ) ON TABLE public.sessions TO anon, authenticated
    ';
  END IF;
END $$;

COMMIT;
