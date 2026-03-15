import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

function getSupabase() {
  const url = process.env.SUPABASE_URL ?? '';
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_ANON_KEY ?? '';
  if (!url || !key) return null;
  return createClient(url, key);
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const supabase = getSupabase();
  if (!supabase) return res.status(503).json({ error: 'Database not configured' });

  try {
    const monitorId = typeof req.query.monitorId === 'string' ? req.query.monitorId : null;
    const unresolved = req.query.resolved === 'false';

    let query = supabase
      .from('alerts')
      .select('id, monitor_id, run_id, rule_type, message, severity, created_at, resolved_at')
      .order('created_at', { ascending: false })
      .limit(100);

    if (monitorId) query = query.eq('monitor_id', monitorId);
    if (unresolved) query = query.is('resolved_at', null);

    const { data, error } = await query;
    if (error) {
      if ((error as { code?: string }).code === '42P01') return res.status(200).json({ alerts: [] });
      throw error;
    }

    return res.status(200).json({ alerts: data ?? [] });
  } catch (err) {
    console.error('[alerts] Error:', err);
    return res.status(500).json({
      error: 'Failed to fetch alerts',
      details: err instanceof Error ? err.message : String(err),
    });
  }
}
