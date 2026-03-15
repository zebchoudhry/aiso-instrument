-- Phase 2: Scheduling metadata for monitors
ALTER TABLE monitors
  ADD COLUMN IF NOT EXISTS next_run_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS last_run_at TIMESTAMPTZ;

-- Index for scheduler to find due monitors
CREATE INDEX IF NOT EXISTS idx_monitors_next_run_at ON monitors(next_run_at)
  WHERE status = 'active' AND cadence != 'manual' AND next_run_at IS NOT NULL;
