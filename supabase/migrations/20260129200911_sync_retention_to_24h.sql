-- 1. Unschedule the old job if it exists (it was targeting price_logs by mistake)
SELECT cron.unschedule('cleanup-old-price-logs');

-- 2. Schedule a new job for price_history with 24-hour retention
-- This runs every hour to keep the table size consistent
SELECT cron.schedule(
    'cleanup-price-history-24h',
    '0 * * * *', -- Every hour
    $$ DELETE FROM public.price_history WHERE timestamp < now() - interval '24 hours' $$
);
;
