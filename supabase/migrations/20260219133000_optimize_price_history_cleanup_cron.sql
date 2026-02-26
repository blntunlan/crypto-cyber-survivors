BEGIN;

-- Replace expensive full-table retention delete with batched cleanup RPC.
-- This keeps retention guarantees while reducing lock pressure and query latency.

DO $$
DECLARE
  v_job_id bigint;
BEGIN
  SELECT jobid
  INTO v_job_id
  FROM cron.job
  WHERE jobname = 'cleanup-price-history-24h'
  LIMIT 1;

  IF v_job_id IS NOT NULL THEN
    PERFORM cron.unschedule(v_job_id);
  END IF;

  SELECT jobid
  INTO v_job_id
  FROM cron.job
  WHERE jobname = 'cleanup-old-price-logs'
  LIMIT 1;

  IF v_job_id IS NOT NULL THEN
    PERFORM cron.unschedule(v_job_id);
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM cron.job
    WHERE jobname = 'cleanup-price-history-24h-batched'
  ) THEN
    PERFORM cron.schedule(
      'cleanup-price-history-24h-batched',
      '*/10 * * * *',
      $job$
        SELECT public.cleanup_old_price_history(
          now() - interval '24 hours',
          5000
        );
      $job$
    );
  END IF;
END
$$;

COMMIT;
