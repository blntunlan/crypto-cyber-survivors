-- ============================================================
-- Migration: fix_sessions_insert_rls_security
-- Issue: "Users can insert own sessions" policy has WITH CHECK (true)
--        which allows any authenticated user to insert sessions for ANY profile
-- Fix: Restrict INSERT to only allow users to create sessions for themselves
-- ============================================================

-- Drop the overly permissive policy
DROP POLICY IF EXISTS "Users can insert own sessions" ON public.sessions;

-- Create properly restricted policy
-- Users can only insert sessions where profile_id matches their auth.uid()
-- OR profile_id is NULL (anonymous sessions)
CREATE POLICY "Users can insert own sessions" ON public.sessions
  FOR INSERT TO authenticated
  WITH CHECK (
    (profile_id IS NULL) OR ((SELECT auth.uid()) = profile_id)
  );;
