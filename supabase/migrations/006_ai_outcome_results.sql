-- AI Outcome Validation: store LLM test results (mention rate, citation rate, per-query outcomes)
ALTER TABLE public.audits ADD COLUMN IF NOT EXISTS ai_outcome_results JSONB DEFAULT NULL;
