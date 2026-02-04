ALTER TABLE public.market_state
ADD COLUMN IF NOT EXISTS high numeric,
ADD COLUMN IF NOT EXISTS low numeric,
ADD COLUMN IF NOT EXISTS volume_z_score numeric,
ADD COLUMN IF NOT EXISTS volume_mean numeric,
ADD COLUMN IF NOT EXISTS volume_std_dev numeric,
ADD COLUMN IF NOT EXISTS volume_history_min numeric,
ADD COLUMN IF NOT EXISTS volume_history_max numeric,
ADD COLUMN IF NOT EXISTS volume_history_count integer;;
