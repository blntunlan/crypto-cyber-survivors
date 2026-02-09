-- ============================================
-- 🏛️ RENAISSANCE MASTER SCHEMA: PHASE 1
-- Date: 2026-01-26
-- Version: 1.0.0
-- ============================================

-- CLEANUP PREVIOUS VERSIONS (Internal Renaissance Reset)
DROP TABLE IF EXISTS public.performance_metrics CASCADE;
DROP TABLE IF EXISTS public.error_reports CASCADE;
DROP TABLE IF EXISTS public.ledger CASCADE;
DROP TABLE IF EXISTS public.virtual_accounts CASCADE;
DROP TABLE IF EXISTS public.wallets CASCADE;
DROP TABLE IF EXISTS public.identities CASCADE;
DROP TABLE IF EXISTS public.profiles CASCADE;
DROP TABLE IF EXISTS public.schema_versions CASCADE;

-- EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 0. SCHEMA METADATA
-- ============================================
CREATE TABLE public.schema_versions (
    version TEXT PRIMARY KEY,
    description TEXT,
    installed_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO public.schema_versions (version, description) 
VALUES ('1.0.0', 'Initial Renaissance Schema: Identity, Performance, Errors')
ON CONFLICT (version) DO NOTHING;

-- 1. IDENTITY & PROFILES (Multi-Auth Ready)
-- ============================================
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    display_name TEXT UNIQUE NOT NULL,
    avatar_url TEXT,
    level INTEGER DEFAULT 1,
    xp BIGINT DEFAULT 0,
    is_banned BOOLEAN DEFAULT FALSE,
    is_tester BOOLEAN DEFAULT FALSE, -- Early adopter / Beta flag
    metadata JSONB DEFAULT '{}'::jsonb, -- Store dynamic user preferences
    last_seen_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Linked accounts (Twitter, Discord, Email, Wallet)
CREATE TABLE IF NOT EXISTS public.identities (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    profile_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    provider TEXT NOT NULL, -- 'email', 'twitter', 'discord', 'google', 'phantom'
    provider_id TEXT NOT NULL, -- External ID from provider
    identity_data JSONB DEFAULT '{}'::jsonb,
    last_login_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(provider, provider_id)
);

-- Web3 Wallets (Shadow & Linked)
CREATE TABLE IF NOT EXISTS public.wallets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    profile_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    address TEXT UNIQUE NOT NULL,
    chain TEXT DEFAULT 'solana', -- 'solana', 'ethereum', etc.
    wallet_type TEXT DEFAULT 'phantom', -- 'phantom', 'internal', 'metamask'
    is_primary BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. ECONOMY & LEDGER (Blockchain-Ready)
-- ============================================

-- Virtual Accounts (Gold, Gems)
CREATE TABLE IF NOT EXISTS public.virtual_accounts (
    profile_id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
    gold_balance BIGINT DEFAULT 0,
    gems_balance BIGINT DEFAULT 0,
    total_earned_gold BIGINT DEFAULT 0,
    total_spent_gold BIGINT DEFAULT 0,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- The Ledger (Immutable Audit Trail)
CREATE TABLE IF NOT EXISTS public.ledger (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    profile_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    amount BIGINT NOT NULL, -- Positive for credit, negative for debit
    currency TEXT DEFAULT 'gold', -- 'gold', 'gems'
    transaction_type TEXT NOT NULL, -- 'game_reward', 'shop_purchase', 'airdrop', 'adjustment'
    reference_id TEXT, -- Session ID or Shop Item ID
    balance_after BIGINT NOT NULL,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. OBSERVABILITY (Errors & Performance)
-- ============================================

-- Detailed Error Logging
CREATE TABLE IF NOT EXISTS public.error_reports (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    profile_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    error_type TEXT NOT NULL, -- 'runtime', 'network', 'render', 'auth'
    message TEXT NOT NULL,
    stack_trace TEXT,
    device_info JSONB DEFAULT '{}'::jsonb, -- OS, Browser, Model
    context_data JSONB DEFAULT '{}'::jsonb, -- Game state when error occurred
    severity TEXT DEFAULT 'medium', -- 'low', 'medium', 'high', 'critical'
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Performance Benchmarks & Metrics
CREATE TABLE IF NOT EXISTS public.performance_metrics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    profile_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    session_id UUID, -- Link to game session if applicable
    device_platform TEXT NOT NULL, -- 'mobile', 'desktop', 'web'
    device_model TEXT,
    os_info TEXT,
    cpu_cores INTEGER,
    memory_gb NUMERIC(5,2),
    avg_fps NUMERIC(5,2),
    min_fps NUMERIC(5,2),
    max_fps NUMERIC(5,2),
    frame_drops INTEGER,
    resolution TEXT,
    gpu_info TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. UTILS & TRIGGERS
-- ============================================

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER trg_virtual_accounts_updated_at BEFORE UPDATE ON public.virtual_accounts FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Automatically create virtual account on profile creation
CREATE OR REPLACE FUNCTION public.handle_new_profile()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.virtual_accounts (profile_id) VALUES (NEW.id);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_on_profile_created AFTER INSERT ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.handle_new_profile();

-- 5. RLS POLICIES (Security First)
-- ============================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.virtual_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ledger ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.error_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.performance_metrics ENABLE ROW LEVEL SECURITY;

-- Profiles: Public can read, user can update own
CREATE POLICY "Public profiles are viewable" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- Accounts: Only user can see own balance
CREATE POLICY "Users can view own balance" ON public.virtual_accounts FOR SELECT USING (auth.uid() = profile_id);

-- Error Reports: Insert only for users, select only for admins (can be refined later)
CREATE POLICY "Anyone can report errors" ON public.error_reports FOR INSERT WITH CHECK (true);
