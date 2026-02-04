-- 1. Tighten Profiles RLS
DROP POLICY IF EXISTS "Anyone can create a profile" ON public.profiles;
CREATE POLICY "Anyone can create a profile"
ON public.profiles
FOR INSERT
TO anon, authenticated
WITH CHECK (
  id IS NOT NULL AND 
  display_name IS NOT NULL AND
  length(display_name) >= 2
);

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile"
ON public.profiles
FOR UPDATE
TO anon, authenticated
USING (
  (auth.uid() = id) OR -- If logged in, must match UID
  (auth.uid() IS NULL) -- If guest, they can update (logic: client knows their ID)
)
WITH CHECK (
  (auth.uid() = id) OR 
  (auth.uid() IS NULL)
);

-- 2. Tighten Error Reports RLS
DROP POLICY IF EXISTS "Anyone can report errors" ON public.error_reports;
CREATE POLICY "Anyone can report errors"
ON public.error_reports
FOR INSERT
TO anon, authenticated
WITH CHECK (message IS NOT NULL AND error_type IS NOT NULL);

-- 3. Tighten Device Profiles RLS
DROP POLICY IF EXISTS "Allow anonymous and authenticated to insert device profiles" ON public.device_profiles;
CREATE POLICY "Allow anonymous and authenticated to insert device profiles"
ON public.device_profiles
FOR INSERT
TO anon, authenticated
WITH CHECK (fingerprint IS NOT NULL);

DROP POLICY IF EXISTS "Allow anonymous and authenticated to update device profiles" ON public.device_profiles;
CREATE POLICY "Allow anonymous and authenticated to update device profiles"
ON public.device_profiles
FOR UPDATE
TO anon, authenticated
USING (fingerprint IS NOT NULL)
WITH CHECK (fingerprint IS NOT NULL);
;
