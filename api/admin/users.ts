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
  res.setHeader('Access-Control-Allow-Methods', 'GET, PATCH, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  if (req.method !== 'GET' && req.method !== 'PATCH') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const supabase = getSupabase();
  if (!supabase || !(process.env.SUPABASE_URL && (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY))) {
    return res.status(200).json({ users: [] });
  }

  if (req.method === 'GET') {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('id, email, role, created_at')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('[admin/users] List error:', error);
        return res.status(500).json({ error: 'Failed to list users' });
      }

      return res.status(200).json({ users: data ?? [] });
    } catch (err) {
      console.error('[admin/users] Error:', err);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  if (req.method === 'PATCH') {
    try {
      const body = req.body as { id?: string; role?: string };
      if (!body?.id || !body?.role) {
        return res.status(400).json({ error: 'id and role are required' });
      }

      const { error } = await supabase
        .from('users')
        .update({ role: body.role })
        .eq('id', body.id);

      if (error) {
        console.error('[admin/users] Update error:', error);
        return res.status(500).json({ error: 'Failed to update user role', details: error.message });
      }

      return res.status(200).json({ ok: true });
    } catch (err) {
      console.error('[admin/users] Error:', err);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}

