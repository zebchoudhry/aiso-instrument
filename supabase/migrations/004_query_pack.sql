-- Add query_pack column to audits for roadmap feature
ALTER TABLE public.audits ADD COLUMN IF NOT EXISTS query_pack JSONB;
COMMENT ON COLUMN public.audits.query_pack IS 'Array of query strings from the LLM query pack, used for roadmap generation';
