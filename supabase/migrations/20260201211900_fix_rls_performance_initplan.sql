-- ============================================================
-- Migration: fix_rls_performance_initplan
-- Purpose: Fix RLS policies that re-evaluate auth functions per row
-- Solution: Wrap auth.uid() in (select ...) for InitPlan optimization
-- ============================================================

-- Drop and recreate sessions policies with optimization
DROP POLICY IF EXISTS "Users can view own sessions or anonymous" ON public.sessions;
DROP POLICY IF EXISTS "Users can update own sessions" ON public.sessions;
DROP POLICY IF EXISTS "Users can insert own sessions" ON public.sessions;

CREATE POLICY "Users can view own sessions or anonymous" ON public.sessions
  FOR SELECT USING (
    (profile_id IS NULL) OR ((SELECT auth.uid()) = profile_id)
  );

CREATE POLICY "Users can update own sessions" ON public.sessions
  FOR UPDATE USING (
    (profile_id IS NULL) OR ((SELECT auth.uid()) = profile_id)
  );

CREATE POLICY "Users can insert own sessions" ON public.sessions
  FOR INSERT TO authenticated
  WITH CHECK (true);

-- Fix error_reports policy
DROP POLICY IF EXISTS "Users can view own error_reports" ON public.error_reports;

CREATE POLICY "Users can view own error_reports" ON public.error_reports
  FOR SELECT USING (
    (profile_id IS NULL) OR ((SELECT auth.uid()) = profile_id)
  );

-- Fix performance_metrics policy
DROP POLICY IF EXISTS "Users can view own performance_metrics" ON public.performance_metrics;

CREATE POLICY "Users can view own performance_metrics" ON public.performance_metrics
  FOR SELECT USING (
    (profile_id IS NULL) OR ((SELECT auth.uid()) = profile_id)
  );

-- Fix identities policy (already using subselect but ensure consistency)
DROP POLICY IF EXISTS "Users can view own identities" ON public.identities;

CREATE POLICY "Users can view own identities" ON public.identities
  FOR SELECT USING ((SELECT auth.uid()) = profile_id);

-- Fix profile_achievements policy
DROP POLICY IF EXISTS "Users can view own achievements" ON public.profile_achievements;

CREATE POLICY "Users can view own achievements" ON public.profile_achievements
  FOR SELECT USING ((SELECT auth.uid()) = profile_id);

-- Fix profile_inventory policy
DROP POLICY IF EXISTS "Users can view own inventory" ON public.profile_inventory;

CREATE POLICY "Users can view own inventory" ON public.profile_inventory
  FOR SELECT USING ((SELECT auth.uid()) = profile_id);

-- Fix profiles update policy
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;

CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING ((SELECT auth.uid()) = id);

-- Fix wallets policy
DROP POLICY IF EXISTS "Users can manage own wallets" ON public.wallets;

CREATE POLICY "Users can manage own wallets" ON public.wallets
  FOR ALL USING ((SELECT auth.uid()) = profile_id);;
