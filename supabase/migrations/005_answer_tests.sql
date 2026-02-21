-- Answer tests: store real LLM answers and citation detection for AI visibility measurement
CREATE TABLE IF NOT EXISTS public.answer_tests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  audit_id UUID REFERENCES public.audits(id) ON DELETE CASCADE,
  query TEXT NOT NULL,
  model TEXT NOT NULL,
  answer TEXT NOT NULL,
  mentioned BOOLEAN NOT NULL,
  mention_count INTEGER NOT NULL,
  position INTEGER,
  competitors JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_answer_tests_audit_id ON public.answer_tests(audit_id);
CREATE INDEX IF NOT EXISTS idx_answer_tests_created_at ON public.answer_tests(created_at DESC);

ALTER TABLE public.answer_tests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all answer_tests" ON public.answer_tests FOR ALL USING (true);
