-- ============================================================
-- Migration: cleanup_duplicate_price_history_policies
-- Purpose: Remove duplicate permissive policies on price_history
-- Issue: Both "Price history is readable by everyone" and 
--        "Public price history is readable" exist with same effect
-- ============================================================

-- Drop the duplicate policy, keep just one
DROP POLICY IF EXISTS "Public price history is readable" ON public.price_history;

-- The remaining policy "Price history is readable by everyone" handles all SELECT access;
