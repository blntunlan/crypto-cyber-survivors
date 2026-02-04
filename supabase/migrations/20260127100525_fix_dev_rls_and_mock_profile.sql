-- 1. Create the Mock Developer Profile (if not exists)
INSERT INTO public.profiles (id, display_name, is_tester, metadata)
VALUES ('00000000-0000-4000-a000-000000000000', 'LocalDev', true, '{"is_mock": true}'::jsonb)
ON CONFLICT (id) DO NOTHING;

-- 2. Create Virtual Account for Mock Profile
INSERT INTO public.virtual_accounts (profile_id, gold_balance, gems_balance)
VALUES ('00000000-0000-4000-a000-000000000000', 1000, 100)
ON CONFLICT (profile_id) DO NOTHING;

-- 3. Relax RLS for error_reports (Allow any insert)
DROP POLICY IF EXISTS "Anyone can report errors" ON public.error_reports;
CREATE POLICY "Anyone can report errors"
ON public.error_reports
FOR INSERT
TO anon, authenticated
WITH CHECK (true);

-- 4. Relax RLS for virtual_accounts (Allow reading balance if you know the profile_id)
-- This allows guests/localhost to see their balance
DROP POLICY IF EXISTS "Users can view own balance" ON public.virtual_accounts;
CREATE POLICY "Anyone can view a balance"
ON public.virtual_accounts
FOR SELECT
TO anon, authenticated
USING (true);

-- 5. Ensure Profiles are selectable by guests
DROP POLICY IF EXISTS "Public profiles are viewable" ON public.profiles;
CREATE POLICY "Profiles are viewable by anyone"
ON public.profiles
FOR SELECT
TO anon, authenticated
USING (true);

-- 6. Allow anonymous nickname registration (INSERT into profiles)
DROP POLICY IF EXISTS "Anyone can create a profile" ON public.profiles;
CREATE POLICY "Anyone can create a profile"
ON public.profiles
FOR INSERT
TO anon, authenticated
WITH CHECK (true);
;
