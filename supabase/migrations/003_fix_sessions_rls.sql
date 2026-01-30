-- ============================================
-- 🔒 FIX: Sessions Table RLS Policies
-- Date: 2026-01-30
-- Version: 1.0.1
-- 
-- Issue: sessions table had RLS enabled but missing INSERT/UPDATE policies
-- This caused 400 errors when MetricsStorage tried to insert session data
-- ============================================

-- 1. Fix Sessions Table Policies
-- ============================================

-- Allow anonymous/authenticated inserts (game sessions can be created without auth)
-- Edge functions use service_role key so they bypass RLS
CREATE POLICY "Anyone can insert sessions" 
    ON public.sessions 
    FOR INSERT 
    WITH CHECK (true);

-- Allow updates only for own sessions OR when profile_id is null (anonymous)
CREATE POLICY "Users can update own sessions" 
    ON public.sessions 
    FOR UPDATE 
    USING (
        profile_id IS NULL 
        OR auth.uid() = profile_id
    );

-- Fix SELECT policy to allow viewing anonymous sessions
DROP POLICY IF EXISTS "Users can view own sessions" ON public.sessions;
CREATE POLICY "Users can view own sessions or anonymous" 
    ON public.sessions 
    FOR SELECT 
    USING (
        profile_id IS NULL 
        OR auth.uid() = profile_id
    );

-- 2. Fix Performance Metrics Table (if exists)
-- ============================================
DO $$
BEGIN
    -- Check if table exists before adding policies
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'performance_metrics') THEN
        -- Enable RLS if not already
        ALTER TABLE public.performance_metrics ENABLE ROW LEVEL SECURITY;
        
        -- Drop existing policies if any
        DROP POLICY IF EXISTS "Anyone can insert performance_metrics" ON public.performance_metrics;
        DROP POLICY IF EXISTS "Users can view own performance_metrics" ON public.performance_metrics;
        
        -- Create new policies
        EXECUTE 'CREATE POLICY "Anyone can insert performance_metrics" ON public.performance_metrics FOR INSERT WITH CHECK (true)';
        EXECUTE 'CREATE POLICY "Users can view own performance_metrics" ON public.performance_metrics FOR SELECT USING (profile_id IS NULL OR auth.uid()::uuid = profile_id)';
    END IF;
END $$;

-- 3. Fix Error Reports Table (if exists)
-- ============================================
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'error_reports') THEN
        ALTER TABLE public.error_reports ENABLE ROW LEVEL SECURITY;
        
        DROP POLICY IF EXISTS "Anyone can insert error_reports" ON public.error_reports;
        DROP POLICY IF EXISTS "Users can view own error_reports" ON public.error_reports;
        
        EXECUTE 'CREATE POLICY "Anyone can insert error_reports" ON public.error_reports FOR INSERT WITH CHECK (true)';
        EXECUTE 'CREATE POLICY "Users can view own error_reports" ON public.error_reports FOR SELECT USING (profile_id IS NULL OR auth.uid()::uuid = profile_id)';
    END IF;
END $$;

-- 4. Log Migration
-- ============================================
INSERT INTO public.schema_versions (version, description) 
VALUES ('1.0.1', 'Fix sessions RLS policies for anonymous inserts')
ON CONFLICT (version) DO NOTHING;
