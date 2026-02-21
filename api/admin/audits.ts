import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

function getSupabase() {
  const url = process.env.SUPABASE_URL ?? '';
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_ANON_KEY ?? '';
  if (!url || !key) return null;
  return createClient(url, key);
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const supabase = getSupabase();
  if (!supabase || !(process.env.SUPABASE_URL && (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY))) {
    return res.status(200).json({ audits: [] });
  }

  const limit = Math.min(parseInt(String(req.query.limit || '50'), 10), 100);
  const offset = parseInt(String(req.query.offset || '0'), 10);

  const { data, error } = await supabase
    .from('audits')
    .select('id, url, name, scores, created_at')
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) {
    return res.status(500).json({ error: error.message });
  }

  return res.status(200).json({ audits: data ?? [] });
}
