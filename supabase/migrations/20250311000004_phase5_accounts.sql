-- Phase 5: Account ownership and monitor-level access (foundation for multi-tenant)
ALTER TABLE monitors ADD COLUMN IF NOT EXISTS account_id TEXT;
CREATE INDEX IF NOT EXISTS idx_monitors_account_id ON monitors(account_id) WHERE account_id IS NOT NULL;
