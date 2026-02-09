-- ============================================
-- 🛡️ AUDIT REMEDIATION: Security & Performance
-- Date: 2026-02-07
-- ============================================

BEGIN;

-- 1. FIX: Session RLS (Identity Mismatch)
-- After Auth V2, auth.uid() matches profiles.auth_user_id
DROP POLICY IF EXISTS "Users can view own sessions or anonymous" ON public.sessions;
CREATE POLICY "Users can view own sessions or anonymous" ON public.sessions
  FOR SELECT USING (
    profile_id IN (SELECT id FROM public.profiles WHERE auth_user_id = (SELECT auth.uid()))
    OR profile_id IS NULL
  );

DROP POLICY IF EXISTS "Users can update own sessions" ON public.sessions;
CREATE POLICY "Users can update own sessions" ON public.sessions
  FOR UPDATE USING (
    profile_id IN (SELECT id FROM public.profiles WHERE auth_user_id = (SELECT auth.uid()))
  );

-- 2. FIX: Balance RLS (Identity Mismatch)
DROP POLICY IF EXISTS "Users can view own balance" ON public.virtual_accounts;
CREATE POLICY "Users can view own balance" ON public.virtual_accounts
  FOR SELECT USING (
    profile_id IN (SELECT id FROM public.profiles WHERE auth_user_id = (SELECT auth.uid()))
  );

-- 3. SECURE: credit_coins RPC (Authorization Check)
CREATE OR REPLACE FUNCTION public.credit_coins(
    p_profile_id UUID, 
    p_amount BIGINT, 
    p_transaction_type TEXT, 
    p_reference_id TEXT DEFAULT NULL, 
    p_metadata JSONB DEFAULT '{}'::jsonb
) 
RETURNS JSONB AS $$
DECLARE 
    v_new_balance BIGINT;
    v_auth_user_id UUID;
BEGIN
    -- Security Check: Is the caller the owner of the profile or a service role?
    SELECT auth_user_id INTO v_auth_user_id FROM public.profiles WHERE id = p_profile_id;
    
    IF v_auth_user_id IS DISTINCT FROM auth.uid() AND auth.role() != 'service_role' THEN
        RETURN jsonb_build_object('success', false, 'error', 'Unauthorized access to this profile');
    END IF;

    UPDATE public.virtual_accounts 
    SET gold_balance = gold_balance + p_amount, 
        total_earned_gold = CASE WHEN p_amount > 0 THEN total_earned_gold + p_amount ELSE total_earned_gold END, 
        updated_at = NOW() 
    WHERE profile_id = p_profile_id 
    RETURNING gold_balance INTO v_new_balance;

    IF NOT FOUND THEN RETURN jsonb_build_object('success', false, 'error', 'Profile not found'); END IF;

    INSERT INTO public.ledger (profile_id, amount, transaction_type, reference_id, balance_after, metadata) 
    VALUES (p_profile_id, p_amount, p_transaction_type, p_reference_id, v_new_balance, p_metadata);

    RETURN jsonb_build_object('success', true, 'new_balance', v_new_balance);
EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END; $$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. PERFORMANCE: Ledger Created At Index
CREATE INDEX IF NOT EXISTS idx_ledger_created_at ON public.ledger(created_at DESC);

-- 5. FIX: identities view policy consistency
DROP POLICY IF EXISTS "Users can view own identities" ON public.identities;
CREATE POLICY "Users can view own identities" ON public.identities
  FOR SELECT USING (
    profile_id IN (SELECT id FROM public.profiles WHERE auth_user_id = (SELECT auth.uid()))
  );

COMMIT;
