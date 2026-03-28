import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

function getSupabase(): SupabaseClient | null {
  const url = process.env.SUPABASE_URL ?? '';
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_ANON_KEY ?? '';
  if (!url || !key) return null;
  return createClient(url, key);
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const supabase = getSupabase();
  if (!supabase || !(process.env.SUPABASE_URL && (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY))) {
    return res.status(200).json({ alerts: [] });
  }

  const resolvedParam = req.query.resolved;
  const resolvedFilter =
    typeof resolvedParam === 'string' ? resolvedParam.toLowerCase() === 'true' : null;

  try {
    let query = supabase.from('alerts').select('*').order('created_at', { ascending: false }).limit(200);
    if (resolvedFilter !== null) {
      query = query.eq('resolved', resolvedFilter);
    }

    const { data, error } = await query;
    if (error) {
      console.error('[alerts] list error:', error.message);
      return res.status(500).json({ error: 'Failed to list alerts' });
    }

    return res.status(200).json({ alerts: data ?? [] });
  } catch (err) {
    console.error('[alerts] unexpected error:', err);
    return res.status(500).json({ error: 'Failed to list alerts' });
  }
}
