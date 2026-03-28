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
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const supabase = getSupabase();
  if (!supabase || !(process.env.SUPABASE_URL && (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY))) {
    return res.status(200).json({ runsCreated: 0 });
  }

  // Simple cadence handling: only non-manual, active monitors
  try {
    const { data: monitors, error } = await supabase
      .from('monitors')
      .select('*')
      .eq('status', 'active')
      .neq('cadence', 'manual')
      .limit(100);

    if (error) {
      console.error('[monitors-scheduler] monitor query error:', error.message);
      return res.status(500).json({ error: 'Failed to load monitors for scheduler' });
    }

    if (!monitors || monitors.length === 0) {
      return res.status(200).json({ runsCreated: 0 });
    }

    const now = new Date().toISOString();
    const runRows = monitors.map((m) => ({
      monitor_id: m.id,
      domain: m.domain,
      display_name: m.display_name ?? m.domain,
      trigger_type: 'scheduled_check',
      status: 'queued',
      overall_score: 0,
      created_at: now,
    }));

    const { data: inserted, error: insertError } = await supabase
      .from('monitor_runs')
      .insert(runRows)
      .select('id, monitor_id');

    if (insertError) {
      console.error('[monitors-scheduler] insert error:', insertError.message);
      return res.status(500).json({ error: 'Failed to create scheduled monitor runs' });
    }

    // Best-effort update of latest_run_id
    if (inserted && inserted.length > 0) {
      const updates = inserted.map((r) =>
        supabase.from('monitors').update({ latest_run_id: r.id, updated_at: now }).eq('id', r.monitor_id)
      );
      await Promise.all(updates);
    }

    return res.status(200).json({ runsCreated: inserted?.length ?? 0 });
  } catch (err) {
    console.error('[monitors-scheduler] unexpected error:', err);
    return res.status(500).json({ error: 'Failed to schedule monitor runs' });
  }
}

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

function getSupabase() {
  const url = process.env.SUPABASE_URL ?? '';
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_ANON_KEY ?? '';
  if (!url || !key) return null;
  return createClient(url, key);
}

/** Scheduler cron: select due monitors and trigger runs via API. */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const cronSecret = process.env.CRON_SECRET;
  const authHeader = req.headers.authorization;
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const supabase = getSupabase();
  if (!supabase) {
    return res.status(503).json({ error: 'Database not configured' });
  }

  const now = new Date().toISOString();
  const { data: monitors, error } = await supabase
    .from('monitors')
    .select('id, domain')
    .eq('status', 'active')
    .in('cadence', ['monthly', 'weekly'])
    .lte('next_run_at', now)
    .not('next_run_at', 'is', null);

  if (error) {
    console.error('[scheduler] Failed to fetch due monitors:', error);
    return res.status(500).json({ error: 'Failed to fetch monitors', details: error.message });
  }

  const due = (monitors ?? []).filter(Boolean);
  if (due.length === 0) {
    return res.status(200).json({ triggered: 0, message: 'No monitors due' });
  }

  const baseUrl = process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL}`
    : process.env.VERCEL_BRANCH_URL ?? 'http://localhost:3000';
  const apiUrl = `${baseUrl}/api/monitors`;

  const results: { domain: string; ok: boolean; status?: number; error?: string }[] = [];

  for (const m of due) {
    try {
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'run',
          domain: m.domain,
          triggerType: 'scheduled_check',
        }),
      });
      if (response.ok) {
        results.push({ domain: m.domain, ok: true, status: response.status });
      } else {
        const body = await response.json().catch(() => ({}));
        results.push({
          domain: m.domain,
          ok: false,
          status: response.status,
          error: (body as { error?: string }).error ?? response.statusText,
        });
      }
    } catch (e) {
      results.push({
        domain: m.domain,
        ok: false,
        error: e instanceof Error ? e.message : String(e),
      });
    }
  }

  const triggered = results.filter((r) => r.ok).length;
  return res.status(200).json({
    triggered,
    total: due.length,
    results,
  });
}
