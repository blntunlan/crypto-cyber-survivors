BEGIN;

-- Query-performance tuning based on observed workload.

-- 1) Faster retention scans/deletes on price_history.
CREATE INDEX IF NOT EXISTS idx_price_history_timestamp_id
  ON public.price_history ("timestamp", id);

-- 2) Align with hot read path: wallet transaction history by profile, newest first.
CREATE INDEX IF NOT EXISTS idx_ledger_profile_created_at_desc
  ON public.ledger (profile_id, created_at DESC);

-- 3) Align with profile session lookups by recency.
CREATE INDEX IF NOT EXISTS idx_sessions_profile_created_at_desc
  ON public.sessions (profile_id, created_at DESC);

-- 4) DB-side batch cleanup to avoid client-side select+delete round-trips.
CREATE OR REPLACE FUNCTION public.cleanup_old_price_history(
  p_cutoff timestamptz,
  p_batch_size integer DEFAULT 5000
)
RETURNS integer
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  WITH rows_to_delete AS (
    SELECT id
    FROM public.price_history
    WHERE "timestamp" < p_cutoff
    ORDER BY "timestamp" ASC, id ASC
    LIMIT GREATEST(p_batch_size, 1)
  ),
  deleted AS (
    DELETE FROM public.price_history ph
    USING rows_to_delete r
    WHERE ph.id = r.id
    RETURNING 1
  )
  SELECT COUNT(*)::integer FROM deleted;
$$;

GRANT EXECUTE ON FUNCTION public.cleanup_old_price_history(timestamptz, integer)
  TO service_role;

-- 5) Replace redundant single-column ledger indexes with the composite index above.
DROP INDEX IF EXISTS public.idx_ledger_created_at;
DROP INDEX IF EXISTS public.idx_ledger_profile_id;

COMMIT;
