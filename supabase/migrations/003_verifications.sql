-- Add verifications JSONB to store Cited/Mentioned/Not found + pasted AI responses per query
ALTER TABLE public.audits ADD COLUMN IF NOT EXISTS verifications JSONB DEFAULT NULL;

COMMENT ON COLUMN public.audits.verifications IS 'Array of { query, result, pastedResponse? } for query-pack verification';
