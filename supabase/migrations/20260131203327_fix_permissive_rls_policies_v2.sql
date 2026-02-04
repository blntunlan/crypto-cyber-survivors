-- Security hardening: Fix permissive RLS policies flagged by linter

-- 1. Fix error_reports
-- Drop the overly permissive 'true' policy. 
-- Note: 'Anyone can report errors' already exists for anon/authenticated with (message IS NOT NULL).
DROP POLICY IF EXISTS "Anyone can insert error_reports" ON public.error_reports;

-- 2. Fix performance_metrics
-- Drop overly permissive policies
DROP POLICY IF EXISTS "Anyone can insert performance_metrics" ON public.performance_metrics;
DROP POLICY IF EXISTS "Enable anonymous insert for performance metrics" ON public.performance_metrics;

-- Create a refined policy for metrics
CREATE POLICY "Enable insertion of performance metrics" ON public.performance_metrics
    FOR INSERT
    TO anon, authenticated
    WITH CHECK (
        session_id IS NOT NULL AND 
        device_platform IS NOT NULL
    );

-- 3. Fix sessions
-- Drop the overly permissive policy
DROP POLICY IF EXISTS "Anyone can insert sessions" ON public.sessions;

-- Ensure anonymous users can still insert their own sessions
-- This uses profile_id IS NULL to differentiate from authenticated users
CREATE POLICY "Enable anonymous insert for sessions" ON public.sessions
    FOR INSERT
    TO anon
    WITH CHECK (
        profile_id IS NULL AND
        crypto_pair IS NOT NULL AND
        position_chosen IS NOT NULL
    );

-- Refine the authenticated user policy for sessions
DROP POLICY IF EXISTS "Users can insert own sessions" ON public.sessions;
CREATE POLICY "Users can insert own sessions" ON public.sessions
    FOR INSERT
    TO authenticated
    WITH CHECK (
        auth.uid() = profile_id AND
        crypto_pair IS NOT NULL AND
        position_chosen IS NOT NULL
    );;
