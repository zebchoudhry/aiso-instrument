-- Phase 1: Dedicated monitors and monitor_runs tables
-- Run this migration in Supabase SQL editor or via supabase db push

-- monitors: one row per tracked domain
CREATE TABLE IF NOT EXISTS monitors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  domain TEXT NOT NULL UNIQUE,
  url TEXT NOT NULL,
  display_name TEXT NOT NULL,
  owner_email TEXT,
  cadence TEXT NOT NULL DEFAULT 'manual' CHECK (cadence IN ('manual', 'monthly', 'weekly')),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paused')),
  baseline_run_id UUID,
  latest_run_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- monitor_runs: one row per audit execution, links to audits for full payload
CREATE TABLE IF NOT EXISTS monitor_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  monitor_id UUID NOT NULL REFERENCES monitors(id) ON DELETE CASCADE,
  audit_id UUID REFERENCES audits(id) ON DELETE SET NULL,
  trigger_type TEXT NOT NULL DEFAULT 'manual_check' CHECK (trigger_type IN ('initial_audit', 'manual_check', 'scheduled_check')),
  status TEXT NOT NULL DEFAULT 'succeeded' CHECK (status IN ('queued', 'running', 'succeeded', 'failed')),
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,
  error_message TEXT,
  overall_score NUMERIC(5,2) NOT NULL DEFAULT 0,
  ai_visibility NUMERIC(5,2) NOT NULL DEFAULT 0,
  citation_likelihood NUMERIC(5,2) NOT NULL DEFAULT 0,
  answer_engine_readiness NUMERIC(5,2) NOT NULL DEFAULT 0,
  mention_rate NUMERIC(5,4),
  citation_rate NUMERIC(5,4),
  entity_clarity NUMERIC(5,2),
  structural_signals NUMERIC(5,2),
  compressibility NUMERIC(5,2),
  corroboration NUMERIC(5,2),
  top_finding_label TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Add FKs from monitors to monitor_runs (after monitor_runs exists)
ALTER TABLE monitors
  DROP CONSTRAINT IF EXISTS monitors_baseline_run_id_fkey,
  DROP CONSTRAINT IF EXISTS monitors_latest_run_id_fkey;
ALTER TABLE monitors
  ADD CONSTRAINT monitors_baseline_run_id_fkey FOREIGN KEY (baseline_run_id) REFERENCES monitor_runs(id) ON DELETE SET NULL;
ALTER TABLE monitors
  ADD CONSTRAINT monitors_latest_run_id_fkey FOREIGN KEY (latest_run_id) REFERENCES monitor_runs(id) ON DELETE SET NULL;

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_monitor_runs_monitor_id ON monitor_runs(monitor_id);
CREATE INDEX IF NOT EXISTS idx_monitor_runs_created_at ON monitor_runs(created_at);
CREATE INDEX IF NOT EXISTS idx_monitors_domain ON monitors(domain);
CREATE INDEX IF NOT EXISTS idx_monitors_status ON monitors(status);
