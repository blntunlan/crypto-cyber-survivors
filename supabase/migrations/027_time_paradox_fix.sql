-- ============================================
-- MIGRATION 027: TIME PARADOX FIX & INTEGRITY
-- Date: 2026-01-23
-- Purpose: 
-- 1. Ensure timestamps are ALWAYS server-side (Fixing 2024 vs 2026 mismatch)
-- 2. Add automatic duration calculation
-- 3. Prevent client-side clock manipulation
-- ============================================

-- 1. Update game_sessions defaults
ALTER TABLE public.game_sessions 
  ALTER COLUMN session_timestamp SET DEFAULT NOW(),
  ALTER COLUMN start_time SET DEFAULT NOW();

-- 2. Create function to validate session timing
CREATE OR REPLACE FUNCTION public.validate_session_timing()
RETURNS TRIGGER AS $$
DECLARE
    actual_duration_ms INTEGER;
BEGIN
    -- If end_time is provided, calculate actual duration from server timestamps
    IF NEW.end_time IS NOT NULL THEN
        -- actual duration in ms = (end_time - start_time)
        actual_duration_ms := EXTRACT(EPOCH FROM (NEW.end_time - OLD.start_time)) * 1000;
        
        -- Verification: If client claims survival_time_ms is significantly LONGER than server-measured time, mark suspicious
        -- Allow 5 seconds buffer for network latency and start-session delay
        IF NEW.survival_time_ms > (actual_duration_ms + 10000) THEN
            NEW.is_suspicious := true;
            NEW.suspicion_reason := COALESCE(NEW.suspicion_reason || ' | ', '') || 'Time paradox detected: Client survival time (' || NEW.survival_time_ms || 'ms) exceeds server measured time (' || actual_duration_ms || 'ms)';
            
            -- If it's a massive discrepancy, fail verification immediately
            IF NEW.survival_time_ms > (actual_duration_ms + 60000) THEN
                NEW.is_verified := false;
                NEW.verification_error := 'Critical timing mismatch';
            END IF;
        END IF;

        -- Sync survival_seconds for consistency
        NEW.survival_seconds := FLOOR(NEW.survival_time_ms / 1000);
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Apply trigger (BEFORE UPDATE since end_time is usually added later)
DROP TRIGGER IF EXISTS trg_validate_session_timing ON public.game_sessions;
CREATE TRIGGER trg_validate_session_timing
BEFORE UPDATE OF end_time, survival_time_ms ON public.game_sessions
FOR EACH ROW
EXECUTE FUNCTION public.validate_session_timing();

-- 4. Audit View Update: Check for time drift players
CREATE OR REPLACE VIEW public.audit_time_paradoxes AS
SELECT 
    id, 
    player_id, 
    start_time, 
    end_time, 
    survival_time_ms as client_ms,
    EXTRACT(EPOCH FROM (end_time - start_time)) * 1000 as server_ms,
    ABS(survival_time_ms - (EXTRACT(EPOCH FROM (end_time - start_time)) * 1000)) as drift
FROM public.game_sessions
WHERE end_time IS NOT NULL
AND ABS(survival_time_ms - (EXTRACT(EPOCH FROM (end_time - start_time)) * 1000)) > 30000; -- 30s drift

COMMIT;
