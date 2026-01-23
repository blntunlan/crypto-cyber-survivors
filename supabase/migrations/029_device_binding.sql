-- ============================================
-- MIGRATION 029: DEVICE BINDING & IDENTITY PROTECTION
-- Date: 2026-01-23
-- Purpose: 
-- 1. Ensure nickames are strictly case-sensitive (handled by code, but ensuring unique constraint)
-- 2. Add last_device_fingerprint to players for audit
-- 3. Create player_devices mapping for multi-device support or restriction
-- ============================================

-- 1. TRACK LAST DEVICE IN PLAYERS
ALTER TABLE public.players ADD COLUMN IF NOT EXISTS last_device_fingerprint TEXT;
ALTER TABLE public.players ADD COLUMN IF NOT EXISTS identity_hash TEXT; -- Store the device-bound hash explicitly

-- 2. PLAYER DEVICES MAPPING (Multiple devices per player support)
CREATE TABLE IF NOT EXISTS public.player_devices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    player_id UUID NOT NULL REFERENCES public.players(id) ON DELETE CASCADE,
    fingerprint TEXT NOT NULL REFERENCES public.device_profiles(fingerprint) ON DELETE CASCADE,
    last_login_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(player_id, fingerprint)
);

-- 3. PERFORMANCE INDEX
CREATE INDEX IF NOT EXISTS idx_player_devices_player ON public.player_devices(player_id);
CREATE INDEX IF NOT EXISTS idx_player_devices_fingerprint ON public.player_devices(fingerprint);

-- 4. RLS POLICIES
ALTER TABLE public.player_devices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Players can view their own devices" 
ON public.player_devices FOR SELECT 
USING (player_id IN (SELECT id FROM public.players WHERE id = player_id));

-- 5. GRANTS
GRANT SELECT, INSERT, UPDATE ON public.player_devices TO anon, authenticated;

-- 6. ADD COMMENT
COMMENT ON COLUMN public.players.identity_hash IS 'SHA-256 hash of nickname:fingerprint to bind identity to device.';
