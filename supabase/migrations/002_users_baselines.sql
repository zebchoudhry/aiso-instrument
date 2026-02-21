-- Users table for roles (admin/auditor/viewer)
CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY,
  email TEXT,
  role TEXT NOT NULL DEFAULT 'auditor',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_users_role ON public.users(role);
CREATE INDEX IF NOT EXISTS idx_users_created_at ON public.users(created_at DESC);

-- Baselines table for per-domain history (optional, future use)
CREATE TABLE IF NOT EXISTS public.baselines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID,
  domain TEXT NOT NULL,
  scores JSONB NOT NULL,
  ai_visibility_label TEXT,
  heuristic_version TEXT,
  input_signal_hash TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_baselines_user_id ON public.baselines(user_id);
CREATE INDEX IF NOT EXISTS idx_baselines_domain ON public.baselines(domain);
CREATE INDEX IF NOT EXISTS idx_baselines_created_at ON public.baselines(created_at DESC);

ALTER TABLE public.baselines ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all baselines" ON public.baselines FOR ALL USING (true);

