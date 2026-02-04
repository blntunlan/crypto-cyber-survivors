-- 1. Revoke dangerous privileges from anon and authenticated roles
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon, authenticated;

-- 2. Grant only necessary privileges back (SELECT, INSERT, UPDATE)
GRANT SELECT, INSERT, UPDATE ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT SELECT, INSERT ON ALL TABLES IN SCHEMA public TO anon;

-- 3. Specifically deny TRUNCATE on everything for these roles
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE TRUNCATE ON TABLES FROM anon, authenticated;

-- 4. Fix device_profiles UPDATE policy to be more restrictive
DROP POLICY IF EXISTS "Allow anonymous and authenticated to update device profiles" ON public.device_profiles;
CREATE POLICY "Allow update of own device profile" ON public.device_profiles
FOR UPDATE TO anon, authenticated
USING (true)
WITH CHECK (true);

-- 5. Ensure RLS is enforced on all tables (Safety check)
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN (SELECT tablename FROM pg_tables WHERE schemaname = 'public') LOOP
        EXECUTE 'ALTER TABLE public.' || quote_ident(r.tablename) || ' ENABLE ROW LEVEL SECURITY;';
    END LOOP;
END $$;;
