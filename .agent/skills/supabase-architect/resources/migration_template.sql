-- ============================================
-- MIGRATION XXX: [Title]
-- Date: [YYYY-MM-DD]
-- Author: Senior DB Architect (Antigravity)
-- Purpose: [Detailed description of the change]
-- ============================================

BEGIN;

-- 1. SCHEMA CHANGES
-- CREATE TABLE IF NOT EXISTS public.example (...);
-- ALTER TABLE public.example ADD COLUMN IF NOT EXISTS ...;

-- 2. SECURITY (RLS)
-- ALTER TABLE public.example ENABLE ROW LEVEL SECURITY;
-- DROP POLICY IF EXISTS "Policy Name" ON public.example;
-- CREATE POLICY "Policy Name" ON public.example FOR SELECT USING (...);

-- 3. PERFORMANCE (INDEXES)
-- CREATE INDEX IF NOT EXISTS idx_example_lookup ON public.example(column);

-- 4. LOGIC (TRIGGERS/FUNCTIONS)
-- CREATE OR REPLACE FUNCTION public.example_trigger_fn() ...

-- 5. DATA MIGRATION (IF NEEDED)
-- UPDATE public.example SET column = 'default' WHERE column IS NULL;

COMMIT;
