-- 1. Add Primary Key to price_history
-- This ensures each record is uniquely identifiable and improves table management
ALTER TABLE public.price_history ADD COLUMN IF NOT EXISTS id BIGSERIAL PRIMARY KEY;

-- 2. Refine performance_metrics RLS
-- Changing 'Anyone can report performance' to be more explicit for anonymous inserts
DROP POLICY IF EXISTS "Anyone can report performance" ON public.performance_metrics;
CREATE POLICY "Enable anonymous insert for performance metrics" 
ON public.performance_metrics 
FOR INSERT 
TO anon, authenticated
WITH CHECK (true);

-- 3. Cleanup: Remove unused index if it's confirmed redundant 
-- Note: Keeping BRIN indexes as they are optimized for the '7-day rolling window' 
-- we just established for price_logs.

-- 4. Verify RLS is enabled on all critical tables
ALTER TABLE public.price_history ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public price history is readable" ON public.price_history;
CREATE POLICY "Public price history is readable" ON public.price_history 
FOR SELECT USING (true);
;
