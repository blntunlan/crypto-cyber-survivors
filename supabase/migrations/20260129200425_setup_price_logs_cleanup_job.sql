-- 1. Enable the pg_cron extension
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- 2. Schedule the cleanup job
-- This will run every day at 00:00 (midnight)
-- It deletes records from price_logs where created_at is older than 7 days
SELECT cron.schedule(
    'cleanup-old-price-logs', -- unique name for the job
    '0 0 * * *',             -- cron schedule (midnight every day)
    $$ DELETE FROM public.price_logs WHERE created_at < now() - interval '7 days' $$
);
;
