-- ============================================
-- 🔐 SECURITY AUDIT FIXES: PHASE 2
-- Goal: Set search_path for SECURITY DEFINER functions
-- ============================================

-- 1. credit_coins
ALTER FUNCTION public.credit_coins(UUID, BIGINT, TEXT, TEXT, JSONB) 
SET search_path = public;

-- 2. get_leaderboard
ALTER FUNCTION public.get_leaderboard(INTEGER) 
SET search_path = public;

-- 3. purchase_item (Since we have multiple overloads from previous tests, let's fix the UUID one)
ALTER FUNCTION public.purchase_item(UUID, UUID) 
SET search_path = public;

-- Cleanup: Drop the temporary/legacy overloads if they exist (cleanliness)
DROP FUNCTION IF EXISTS public.purchase_item(UUID, TEXT);
;
