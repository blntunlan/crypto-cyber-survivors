BEGIN;

-- Disable legacy full-delete retention job that conflicts with the batched cleanup strategy.
DO $$
DECLARE
  v_job_id bigint;
BEGIN
  SELECT jobid
  INTO v_job_id
  FROM cron.job
  WHERE jobname = 'cleanup-price-history-6h'
  LIMIT 1;

  IF v_job_id IS NOT NULL THEN
    PERFORM cron.unschedule(v_job_id);
  END IF;
END
$$;

COMMIT;
