-- ============================================
-- AUTH SYSTEM MIGRATION: Nickname → OAuth
-- Date: 2026-02-03
-- Version: 1.0.0
-- ============================================
-- This migration prepares the database for Supabase Auth integration
-- Supports: Email/Password, Twitter, Google, Discord, GitHub, Apple

-- ============================================
-- 1. PROFILES TABLE UPDATES
-- ============================================

-- Add auth_user_id column (links to Supabase Auth)
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS auth_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- Add email column
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS email TEXT;

-- Add email verification status
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS email_verified BOOLEAN DEFAULT FALSE;

-- Add primary auth provider tracking
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS primary_auth_provider TEXT DEFAULT 'email';

-- Add unique username (separate from display_name)
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS username TEXT;

-- Add updated_at column for tracking changes
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- ============================================
-- 2. INDEXES FOR PERFORMANCE
-- ============================================

CREATE INDEX IF NOT EXISTS idx_profiles_auth_user_id 
ON public.profiles(auth_user_id);

CREATE INDEX IF NOT EXISTS idx_profiles_email 
ON public.profiles(email);

CREATE UNIQUE INDEX IF NOT EXISTS idx_profiles_username_unique 
ON public.profiles(username) 
WHERE username IS NOT NULL;

-- ============================================
-- 3. TRIGGER: Auto-create profile on Auth signup
-- ============================================

CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_profile_id UUID;
  provider_name TEXT;
  user_display_name TEXT;
BEGIN
  -- Extract provider from metadata
  provider_name := COALESCE(
    NEW.raw_app_meta_data->>'provider',
    'email'
  );
  
  -- Generate display name from various sources
  user_display_name := COALESCE(
    NEW.raw_user_meta_data->>'name',
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'user_name',
    NEW.raw_user_meta_data->>'preferred_username',
    split_part(NEW.email, '@', 1)
  );
  
  -- Truncate to 16 chars max
  user_display_name := LEFT(user_display_name, 16);

  -- Check if profile already exists for this auth user
  SELECT id INTO new_profile_id
  FROM public.profiles
  WHERE auth_user_id = NEW.id;
  
  IF new_profile_id IS NULL THEN
    -- Create new profile
    INSERT INTO public.profiles (
      id,
      auth_user_id,
      email,
      email_verified,
      display_name,
      primary_auth_provider,
      created_at,
      last_seen_at,
      updated_at
    )
    VALUES (
      gen_random_uuid(),
      NEW.id,
      NEW.email,
      NEW.email_confirmed_at IS NOT NULL,
      user_display_name,
      provider_name,
      NOW(),
      NOW(),
      NOW()
    );
    
    RAISE LOG '[Auth] Created new profile for user % via %', NEW.id, provider_name;
  ELSE
    -- Update existing profile
    UPDATE public.profiles
    SET
      email = COALESCE(NEW.email, email),
      email_verified = NEW.email_confirmed_at IS NOT NULL,
      last_seen_at = NOW(),
      updated_at = NOW()
    WHERE auth_user_id = NEW.id;
    
    RAISE LOG '[Auth] Updated existing profile for user %', NEW.id;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Drop existing trigger if exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Create trigger for new signups
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_auth_user();

-- ============================================
-- 4. TRIGGER: Update profile on email confirmation
-- ============================================

CREATE OR REPLACE FUNCTION public.handle_auth_user_updated()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Update email verification status
  IF NEW.email_confirmed_at IS NOT NULL AND OLD.email_confirmed_at IS NULL THEN
    UPDATE public.profiles
    SET 
      email_verified = TRUE,
      updated_at = NOW()
    WHERE auth_user_id = NEW.id;
    
    RAISE LOG '[Auth] Email verified for user %', NEW.id;
  END IF;
  
  -- Update email if changed
  IF NEW.email IS DISTINCT FROM OLD.email THEN
    UPDATE public.profiles
    SET 
      email = NEW.email,
      email_verified = NEW.email_confirmed_at IS NOT NULL,
      updated_at = NOW()
    WHERE auth_user_id = NEW.id;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Drop existing trigger if exists
DROP TRIGGER IF EXISTS on_auth_user_updated ON auth.users;

-- Create trigger for user updates
CREATE TRIGGER on_auth_user_updated
  AFTER UPDATE ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_auth_user_updated();

-- ============================================
-- 5. IDENTITIES TABLE RLS (OAuth identities)
-- ============================================

-- Enable RLS if not already enabled
ALTER TABLE public.identities ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view own identities" ON public.identities;
DROP POLICY IF EXISTS "Users can manage own identities" ON public.identities;
DROP POLICY IF EXISTS "Users can insert own identities" ON public.identities;
DROP POLICY IF EXISTS "Users can delete own identities" ON public.identities;

-- View own identities
CREATE POLICY "Users can view own identities"
  ON public.identities
  FOR SELECT
  USING (
    profile_id IN (
      SELECT id FROM public.profiles WHERE auth_user_id = auth.uid()
    )
  );

-- Insert own identities
CREATE POLICY "Users can insert own identities"
  ON public.identities
  FOR INSERT
  WITH CHECK (
    profile_id IN (
      SELECT id FROM public.profiles WHERE auth_user_id = auth.uid()
    )
  );

-- Delete own identities
CREATE POLICY "Users can delete own identities"
  ON public.identities
  FOR DELETE
  USING (
    profile_id IN (
      SELECT id FROM public.profiles WHERE auth_user_id = auth.uid()
    )
  );

-- ============================================
-- 6. PROFILES TABLE RLS UPDATES
-- ============================================

-- Drop old policies that may conflict
DROP POLICY IF EXISTS "Public profiles are viewable" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Profiles are viewable by everyone" ON public.profiles;
DROP POLICY IF EXISTS "Auth trigger can insert profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile via auth" ON public.profiles;

-- Everyone can view profiles (leaderboard, etc.)
CREATE POLICY "Profiles are viewable by everyone"
  ON public.profiles
  FOR SELECT
  USING (true);

-- Authenticated users can update their own profile
CREATE POLICY "Users can update own profile via auth"
  ON public.profiles
  FOR UPDATE
  USING (auth_user_id = auth.uid())
  WITH CHECK (auth_user_id = auth.uid());

-- Service role can insert (for triggers)
-- Note: Triggers run with SECURITY DEFINER, bypassing RLS

-- ============================================
-- 7. HELPER FUNCTION: Get current user's profile
-- ============================================

CREATE OR REPLACE FUNCTION public.get_my_profile()
RETURNS SETOF public.profiles
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT *
  FROM public.profiles
  WHERE auth_user_id = auth.uid()
  LIMIT 1;
$$;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION public.get_my_profile() TO authenticated;

-- ============================================
-- 8. HELPER FUNCTION: Update username
-- ============================================

CREATE OR REPLACE FUNCTION public.update_my_username(new_username TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  username_valid BOOLEAN;
BEGIN
  -- Validate username format (3-16 chars, alphanumeric + underscore)
  username_valid := new_username ~ '^[a-zA-Z0-9_]{3,16}$';
  
  IF NOT username_valid THEN
    RAISE EXCEPTION 'Invalid username format. Use 3-16 alphanumeric characters or underscores.';
  END IF;
  
  -- Check if username is taken
  IF EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE username = new_username 
    AND auth_user_id != auth.uid()
  ) THEN
    RAISE EXCEPTION 'Username already taken.';
  END IF;
  
  -- Update username
  UPDATE public.profiles
  SET 
    username = new_username,
    updated_at = NOW()
  WHERE auth_user_id = auth.uid();
  
  RETURN TRUE;
END;
$$;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION public.update_my_username(TEXT) TO authenticated;

-- ============================================
-- 9. MIGRATION: Link existing nickname users (optional)
-- ============================================
-- This is a one-time migration to preserve existing nicknames as usernames
-- Should be run manually after OAuth is active

-- Commented out - run manually when ready:
/*
UPDATE public.profiles
SET username = LOWER(REGEXP_REPLACE(display_name, '[^a-zA-Z0-9_]', '', 'g'))
WHERE username IS NULL
  AND display_name IS NOT NULL
  AND LENGTH(REGEXP_REPLACE(display_name, '[^a-zA-Z0-9_]', '', 'g')) >= 3
  AND NOT EXISTS (
    SELECT 1 FROM public.profiles p2
    WHERE p2.username = LOWER(REGEXP_REPLACE(profiles.display_name, '[^a-zA-Z0-9_]', '', 'g'))
  );
*/

-- ============================================
-- 10. GRANT PERMISSIONS
-- ============================================

-- Ensure authenticated role can use these functions
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT SELECT ON public.profiles TO authenticated;
GRANT UPDATE (display_name, username, avatar_url) ON public.profiles TO authenticated;
GRANT SELECT, INSERT, DELETE ON public.identities TO authenticated;

-- ============================================
-- MIGRATION COMPLETE
-- ============================================
-- Next steps:
-- 1. Configure OAuth providers in Supabase Dashboard
-- 2. Deploy SupabaseAuthService.ts
-- 3. Update frontend auth flow
-- 4. Test with email signup first
