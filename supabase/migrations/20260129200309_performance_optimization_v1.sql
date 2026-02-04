-- 1. Optimize RLS policies by wrapping auth functions in SELECT for caching
-- Profiles
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile" ON public.profiles 
FOR UPDATE USING ((SELECT auth.uid()) = id);

-- Sessions
DROP POLICY IF EXISTS "Users can insert own sessions" ON public.sessions;
CREATE POLICY "Users can insert own sessions" ON public.sessions 
FOR INSERT WITH CHECK ((SELECT auth.uid()) = profile_id);

DROP POLICY IF EXISTS "Users can view own sessions" ON public.sessions;
CREATE POLICY "Users can view own sessions" ON public.sessions 
FOR SELECT USING ((SELECT auth.uid()) = profile_id);

-- Identities
DROP POLICY IF EXISTS "Users can view own identities" ON public.identities;
CREATE POLICY "Users can view own identities" ON public.identities 
FOR SELECT USING ((SELECT auth.uid()) = profile_id);

-- Performance Metrics
DROP POLICY IF EXISTS "Anyone can report performance" ON public.performance_metrics;
CREATE POLICY "Anyone can report performance" ON public.performance_metrics 
FOR INSERT WITH CHECK (true); -- Optimized (no subquery needed if public)

-- Achievements & Inventory
DROP POLICY IF EXISTS "Users can view own achievements" ON public.profile_achievements;
CREATE POLICY "Users can view own achievements" ON public.profile_achievements 
FOR SELECT USING ((SELECT auth.uid()) = profile_id);

DROP POLICY IF EXISTS "Users can view own inventory" ON public.profile_inventory;
CREATE POLICY "Users can view own inventory" ON public.profile_inventory 
FOR SELECT USING ((SELECT auth.uid()) = profile_id);

-- 2. Consolidate Wallets Policies (Fixing Multiple Permissive Policies)
DROP POLICY IF EXISTS "Users can view own wallets" ON public.wallets;
DROP POLICY IF EXISTS "Users can manage own wallets" ON public.wallets;
CREATE POLICY "Users can manage own wallets" ON public.wallets 
FOR ALL USING ((SELECT auth.uid()) = profile_id);

-- 3. Add missing indexes for Foreign Keys to improve JOIN performance
CREATE INDEX IF NOT EXISTS idx_error_reports_profile_id ON public.error_reports(profile_id);
CREATE INDEX IF NOT EXISTS idx_identities_profile_id ON public.identities(profile_id);
CREATE INDEX IF NOT EXISTS idx_ledger_profile_id ON public.ledger(profile_id);
CREATE INDEX IF NOT EXISTS idx_performance_metrics_profile_id ON public.performance_metrics(profile_id);
CREATE INDEX IF NOT EXISTS idx_sessions_profile_id ON public.sessions(profile_id);
CREATE INDEX IF NOT EXISTS idx_wallets_profile_id ON public.wallets(profile_id);
CREATE INDEX IF NOT EXISTS idx_profile_achievements_achievement_id ON public.profile_achievements(achievement_id);
CREATE INDEX IF NOT EXISTS idx_profile_inventory_item_id ON public.profile_inventory(item_id);
;
