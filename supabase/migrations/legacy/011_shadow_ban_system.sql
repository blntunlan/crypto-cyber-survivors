-- 1. Add shadow_ban status to players
ALTER TABLE public.players
ADD COLUMN IF NOT EXISTS is_shadow_banned boolean DEFAULT false NOT NULL,
ADD COLUMN IF NOT EXISTS shadow_ban_reason text;

-- 2. Update Leaderboard View to exclude shadow banned players
-- (We keep them in the database, but hide them from public rankings)
CREATE OR REPLACE VIEW public.leaderboard AS
SELECT 
  p.id as player_id,
  p.display_name,
  p.high_score,
  p.total_kills,
  p.total_sessions,
  p.avatar_url,
  RANK() OVER (ORDER BY p.high_score DESC) as rank
FROM public.players p
WHERE p.is_banned = false
  AND p.is_shadow_banned = false  -- NEW FILTER
  AND p.high_score > 0
ORDER BY p.high_score DESC
LIMIT 100;

-- 3. Function to automatically detect and shadow ban cheaters
CREATE OR REPLACE FUNCTION public.auto_shadow_ban_logic()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  suspicious_count integer;
BEGIN
  -- We only care if the new session is suspicious or rejected
  IF (NEW.is_suspicious = true OR NEW.verification_status = 'rejected') THEN
    
    -- Count how many suspicious sessions this player has in the last 24 hours
    SELECT COUNT(*) INTO suspicious_count
    FROM public.game_sessions
    WHERE player_id = NEW.player_id
      AND (is_suspicious = true OR verification_status = 'rejected')
      AND session_timestamp > NOW() - INTERVAL '24 hours';

    -- Threshold: 3 suspicious activities in 24 hours -> Shadow Ban
    IF suspicious_count >= 3 THEN
      UPDATE public.players
      SET 
        is_shadow_banned = true,
        shadow_ban_reason = 'Auto: 3+ suspicious sessions in 24h'
      WHERE id = NEW.player_id
        AND is_shadow_banned = false; -- prevent redundant updates
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- 4. Trigger for the auto-ban logic
DROP TRIGGER IF EXISTS trg_auto_shadow_ban ON public.game_sessions;

CREATE TRIGGER trg_auto_shadow_ban
AFTER INSERT OR UPDATE ON public.game_sessions
FOR EACH ROW
EXECUTE FUNCTION public.auto_shadow_ban_logic();

COMMENT ON TRIGGER trg_auto_shadow_ban ON public.game_sessions IS 'Automatically shadow bans players with excessive suspicious activity';
