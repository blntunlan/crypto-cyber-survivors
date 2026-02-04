-- ============================================
-- WALLET AUTH MIGRATION
-- Add wallet_address support to profiles
-- ============================================

-- 1. Add wallet_address column to profiles
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS wallet_address TEXT UNIQUE;

-- 2. Add wallet signature verification data (optional, for replay attack prevention)
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS wallet_last_nonce TEXT;

-- 3. Create index for wallet lookups
CREATE INDEX IF NOT EXISTS idx_profiles_wallet_address 
ON public.profiles(wallet_address) 
WHERE wallet_address IS NOT NULL;

-- 4. Update RLS for wallet-based auth
-- Allow profile creation with wallet address
DROP POLICY IF EXISTS "Allow wallet profile creation" ON public.profiles;
CREATE POLICY "Allow wallet profile creation"
  ON public.profiles FOR INSERT
  WITH CHECK (
    -- Allow if creating with wallet address (no auth required for initial wallet link)
    wallet_address IS NOT NULL
    OR
    -- Or if authenticated via Supabase Auth
    auth.uid() IS NOT NULL
  );

-- 5. Allow wallet users to view their own profile
DROP POLICY IF EXISTS "Wallet users can view own profile" ON public.profiles;
CREATE POLICY "Wallet users can view own profile"
  ON public.profiles FOR SELECT
  USING (
    -- Standard auth check
    auth_user_id = auth.uid()
    OR
    -- Public profile view (for leaderboards)
    true
  );

-- 6. Allow wallet users to update their own profile
DROP POLICY IF EXISTS "Wallet users can update own profile" ON public.profiles;
CREATE POLICY "Wallet users can update own profile"
  ON public.profiles FOR UPDATE
  USING (
    auth_user_id = auth.uid()
  )
  WITH CHECK (
    auth_user_id = auth.uid()
  );

-- 7. Create helper function to get profile by wallet
CREATE OR REPLACE FUNCTION public.get_profile_by_wallet(p_wallet_address TEXT)
RETURNS SETOF public.profiles
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT *
  FROM public.profiles
  WHERE wallet_address = p_wallet_address
  LIMIT 1;
END;
$$;

-- Grant execute to anon and authenticated
GRANT EXECUTE ON FUNCTION public.get_profile_by_wallet(TEXT) TO anon, authenticated;

-- 8. Add comment for documentation
COMMENT ON COLUMN public.profiles.wallet_address IS 'Solana wallet address for Web3 authentication (Phantom, Solflare, etc.)';

-- ============================================
-- Done! Wallet auth support added.
-- ============================================
