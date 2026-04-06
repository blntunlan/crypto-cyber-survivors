-- Migration 004: Audit log table and cleanup function

CREATE TABLE IF NOT EXISTS audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  resource TEXT NOT NULL,
  details JSONB DEFAULT '{}',
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_log_profile ON audit_log(profile_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_action ON audit_log(action);
CREATE INDEX IF NOT EXISTS idx_audit_log_created ON audit_log(created_at);

CREATE OR REPLACE FUNCTION cleanup_old_audit_logs(days_ago INT DEFAULT 90, batch_size INT DEFAULT 5000)
RETURNS INT AS $$
DECLARE
  deleted_count INT;
BEGIN
  WITH to_delete AS (
    SELECT id
    FROM audit_log
    WHERE created_at < NOW() - (days_ago || ' days')::INTERVAL
    LIMIT batch_size
    FOR UPDATE SKIP LOCKED
  )
  DELETE FROM audit_log
  WHERE id IN (SELECT id FROM to_delete);

  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;
