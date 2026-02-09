# 🔐 Supabase Security & Infrastructure Audit Report

**Date:** 2026-02-06
**Project:** Crypto Survivors
**Auditor:** Gemini CLI Agent (Supabase DB Engineer)
**Status:** ⚠️ Action Required

---

## 📋 Executive Summary
A comprehensive audit of the Supabase infrastructure was conducted, covering database schema, Row Level Security (RLS) policies, RPC functions, and Edge Functions. While the system architecture is robust (utilizing Auth V2 and layered security), several critical vulnerabilities were identified that could allow for unauthorized score manipulation and potential data leakage.

---

## 🛡️ Security Findings

### 1. 🚨 Critical: Missing HMAC Verification in `verify-game`
*   **Vulnerability:** The Edge Function responsible for verifying game sessions and awarding rewards has a placeholder for HMAC signature verification but does not implement it.
*   **Impact:** Players can spoof the payload sent to the backend, claiming impossible scores, kills, or survival times to gain unlimited Gold.
*   **Location:** `supabase/functions/verify-game/index.ts`
*   **Remediation:** Implement the `verifyHmac` call using the `session_secret` stored in the `sessions` table.

### 2. 🔐 High: Identity Mismatch in RLS Policies
*   **Vulnerability:** Many RLS policies compare `profile_id` directly with `auth.uid()`. Following the Auth V2 migration, `auth.uid()` corresponds to `profiles.auth_user_id`, not `profiles.id` (which is a separate UUID).
*   **Impact:** Authenticated users are unable to view their own sessions, balances, or achievements because the UUIDs do not match.
*   **Remediation:** Update RLS policies to use a subquery check: `profile_id IN (SELECT id FROM profiles WHERE auth_user_id = auth.uid())`.

### 3. 💸 Medium: Unauthorized Access to `credit_coins` RPC
*   **Vulnerability:** The `credit_coins` function is `SECURITY DEFINER` and lacks internal authorization checks.
*   **Impact:** If execution permissions are granted to the `authenticated` role, any user could potentially call the function with another user's `profile_id`.
*   **Remediation:** Add an internal check to verify that `auth.uid()` matches the `auth_user_id` of the profile being updated, or restrict execution to the `service_role`.

---

## 📈 Performance & Infrastructure

### 1. Missing Ledger Indexing
*   **Finding:** The `ledger` table lacks an index on `created_at`.
*   **Impact:** Querying transaction history will become significantly slower as the dataset grows.
*   **Recommendation:** Add a descending index on `public.ledger(created_at DESC)`.

### 2. Profile Sync Consistency
*   **Finding:** `ProfileService.ts` on the frontend uses `eq('id', session.user.id)` in `validateSession`.
*   **Impact:** This results in a 404 or empty result even for logged-in users.
*   **Recommendation:** Align frontend queries to use `auth_user_id` consistently.

---

## 🛠️ Actionable Remediation SQL

```sql
-- Apply these fixes to a new migration file:
-- supabase/migrations/20260207000000_audit_remediation.sql

BEGIN;

-- 1. Fix Session RLS
DROP POLICY IF EXISTS "Users can view own sessions or anonymous" ON public.sessions;
CREATE POLICY "Users can view own sessions or anonymous" ON public.sessions
  FOR SELECT USING (
    profile_id IN (SELECT id FROM public.profiles WHERE auth_user_id = (SELECT auth.uid()))
    OR profile_id IS NULL
  );

-- 2. Fix Balance RLS
DROP POLICY IF EXISTS "Users can view own balance" ON public.virtual_accounts;
CREATE POLICY "Users can view own balance" ON public.virtual_accounts
  FOR SELECT USING (
    profile_id IN (SELECT id FROM public.profiles WHERE auth_user_id = (SELECT auth.uid()))
  );

-- 3. Secure credit_coins RPC
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
    -- Authorization Check
    SELECT auth_user_id INTO v_auth_user_id FROM public.profiles WHERE id = p_profile_id;
    IF v_auth_user_id IS DISTINCT FROM auth.uid() AND auth.role() != 'service_role' THEN
        RETURN jsonb_build_object('success', false, 'error', 'Unauthorized');
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
END; $$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Performance Index
CREATE INDEX IF NOT EXISTS idx_ledger_created_at ON public.ledger(created_at DESC);

COMMIT;
```

---

## ✅ Checklist for Deployment
- [ ] Apply the SQL remediation migration.
- [ ] Update `verify-game` Edge Function with HMAC verification logic.
- [ ] Refactor `ProfileService.ts` to use `auth_user_id` for session validation.
- [ ] Run `npm run supabase:gen` to refresh TypeScript types.
