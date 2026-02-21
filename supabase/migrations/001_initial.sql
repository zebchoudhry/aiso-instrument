-- Config (white-label)
CREATE TABLE IF NOT EXISTS public.config (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Audits
CREATE TABLE IF NOT EXISTS public.audits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID,
  url TEXT NOT NULL,
  name TEXT NOT NULL,
  extraction_data JSONB,
  audit_result JSONB NOT NULL,
  scores JSONB,
  findings JSONB,
  fix_library JSONB,
  client_briefing JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audits_user_id ON public.audits(user_id);
CREATE INDEX IF NOT EXISTS idx_audits_created_at ON public.audits(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audits_url ON public.audits(url);

-- RLS (relaxed for now; tighten when auth is added)
ALTER TABLE public.config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all config read" ON public.config FOR SELECT USING (true);
CREATE POLICY "Allow service config" ON public.config FOR ALL USING (true);

CREATE POLICY "Allow all audits" ON public.audits FOR ALL USING (true);

-- Insert default config
INSERT INTO public.config (key, value) VALUES
  ('whitelabel', '{"companyName":"AISO Instrument","logoUrl":"","primaryColor":"#4F46E5"}')
ON CONFLICT (key) DO NOTHING;
