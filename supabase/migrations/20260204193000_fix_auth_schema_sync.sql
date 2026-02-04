-- ============================================
-- FIX AUTH SCHEMA SYNC MIGRATION
-- Date: 2026-02-04
-- Version: 1.0.0
-- ============================================
-- Bu migration, kod ile veritabanı arasındaki
-- kopuklukları düzeltir ve auth sistemini senkronize eder.
-- ============================================

-- ============================================
-- 1. PROFILES TABLOSUNA EKSİK KOLONLARI EKLE
-- ============================================

-- Add auth_user_id column (links to Supabase Auth)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'profiles' 
    AND column_name = 'auth_user_id'
  ) THEN
    ALTER TABLE public.profiles
    ADD COLUMN auth_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;
    
    RAISE NOTICE 'Added auth_user_id column to profiles';
  END IF;
END $$;

-- Add email column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'profiles' 
    AND column_name = 'email'
  ) THEN
    ALTER TABLE public.profiles
    ADD COLUMN email TEXT;
    
    RAISE NOTICE 'Added email column to profiles';
  END IF;
END $$;

-- Add email_verified column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'profiles' 
    AND column_name = 'email_verified'
  ) THEN
    ALTER TABLE public.profiles
    ADD COLUMN email_verified BOOLEAN DEFAULT FALSE;
    
    RAISE NOTICE 'Added email_verified column to profiles';
  END IF;
END $$;

-- Add username column (unique, separate from display_name)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'profiles' 
    AND column_name = 'username'
  ) THEN
    ALTER TABLE public.profiles
    ADD COLUMN username TEXT;
    
    RAISE NOTICE 'Added username column to profiles';
  END IF;
END $$;

-- Add primary_auth_provider column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'profiles' 
    AND column_name = 'primary_auth_provider'
  ) THEN
    ALTER TABLE public.profiles
    ADD COLUMN primary_auth_provider TEXT DEFAULT 'nickname';
    
    RAISE NOTICE 'Added primary_auth_provider column to profiles';
  END IF;
END $$;

-- ============================================
-- 2. INDEXES FOR NEW COLUMNS
-- ============================================

CREATE INDEX IF NOT EXISTS idx_profiles_auth_user_id 
ON public.profiles(auth_user_id);

CREATE INDEX IF NOT EXISTS idx_profiles_email 
ON public.profiles(email);

CREATE UNIQUE INDEX IF NOT EXISTS idx_profiles_username_unique 
ON public.profiles(username) 
WHERE username IS NOT NULL;

-- ============================================
-- 3. UPDATE EXISTING PROFILES WITH DEFAULT VALUES
-- ============================================

-- Set existing profiles to 'nickname' auth provider
UPDATE public.profiles
SET primary_auth_provider = 'nickname'
WHERE primary_auth_provider IS NULL;

-- ============================================
-- 4. TRIGGER: Auto-create profile on Auth signup
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

-- Drop and recreate trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_auth_user();

-- ============================================
-- 5. TRIGGER: Update profile on email confirmation
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

DROP TRIGGER IF EXISTS on_auth_user_updated ON auth.users;

CREATE TRIGGER on_auth_user_updated
  AFTER UPDATE ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_auth_user_updated();

-- ============================================
-- 6. UPDATE PROFILES RLS POLICIES
-- ============================================

-- Drop old policies
DROP POLICY IF EXISTS "Public profiles are viewable" ON public.profiles;
DROP POLICY IF EXISTS "Profiles are viewable by everyone" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile via auth" ON public.profiles;
DROP POLICY IF EXISTS "Auth trigger can insert profiles" ON public.profiles;
DROP POLICY IF EXISTS "Anon can insert profiles" ON public.profiles;
DROP POLICY IF EXISTS "Authenticated can insert profiles" ON public.profiles;
DROP POLICY IF EXISTS "Service role can manage profiles" ON public.profiles;

-- Everyone can view profiles (leaderboard, etc.)
CREATE POLICY "Profiles are viewable by everyone"
  ON public.profiles
  FOR SELECT
  USING (true);

-- Authenticated users can update their own profile (via auth_user_id)
CREATE POLICY "Users can update own profile via auth"
  ON public.profiles
  FOR UPDATE
  USING (auth_user_id = auth.uid())
  WITH CHECK (auth_user_id = auth.uid());

-- Anon users can insert new profiles (for nickname-based registration)
-- This allows the old nickname system to still work
CREATE POLICY "Anon can insert profiles"
  ON public.profiles
  FOR INSERT
  TO anon
  WITH CHECK (auth_user_id IS NULL);

-- Authenticated users can insert their own profile
CREATE POLICY "Authenticated can insert profiles"
  ON public.profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (auth_user_id = auth.uid() OR auth_user_id IS NULL);

-- ============================================
-- 7. HELPER FUNCTIONS
-- ============================================

-- Get current user's profile
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

GRANT EXECUTE ON FUNCTION public.get_my_profile() TO authenticated;

-- Update username
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

GRANT EXECUTE ON FUNCTION public.update_my_username(TEXT) TO authenticated;

-- ============================================
-- 8. GRANT PERMISSIONS
-- ============================================

GRANT USAGE ON SCHEMA public TO authenticated;
GRANT SELECT ON public.profiles TO authenticated;
GRANT UPDATE (display_name, username, avatar_url) ON public.profiles TO authenticated;
GRANT SELECT, INSERT, DELETE ON public.identities TO authenticated;

-- ============================================
-- MIGRATION COMPLETE
-- ============================================
