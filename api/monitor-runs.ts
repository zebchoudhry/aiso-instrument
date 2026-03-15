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
    const limit = Math.min(parseInt(String(req.query.limit || '50'), 10), 100);
    const monitorId = typeof req.query.monitorId === 'string' ? req.query.monitorId : null;

    let query = supabase
      .from('monitor_runs')
      .select(`
        id, monitor_id, audit_id, trigger_type, status,
        started_at, completed_at, error_message,
        overall_score, created_at
      `)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (monitorId) query = query.eq('monitor_id', monitorId);

    const { data, error } = await query;
    if (error) {
      if ((error as { code?: string }).code === '42P01') return res.status(200).json({ runs: [] });
      throw error;
    }

    const runs = data ?? [];
    const monitorIds = [...new Set(runs.map((r: { monitor_id: string }) => r.monitor_id))];
    const { data: monitorRows } = await supabase
      .from('monitors')
      .select('id, domain, display_name')
      .in('id', monitorIds);
    const monitorMap = new Map((monitorRows ?? []).map((m: { id: string; domain: string; display_name: string }) => [m.id, m]));

    const enriched = runs.map((r: Record<string, unknown>) => {
      const m = monitorMap.get(r.monitor_id as string);
      return { ...r, domain: m?.domain ?? null, displayName: m?.display_name ?? null };
    });

    return res.status(200).json({ runs: enriched });
  } catch (err) {
    console.error('[monitor-runs] Error:', err);
    return res.status(500).json({
      error: 'Failed to fetch runs',
      details: err instanceof Error ? err.message : String(err),
    });
  }
}
