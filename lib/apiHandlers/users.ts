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
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const supabase = getSupabase();
  if (!supabase || !(process.env.SUPABASE_URL && (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY))) {
    return res.status(200).json({ user: null });
  }

  try {
    const id = typeof req.query.id === 'string' ? req.query.id : null;
    const email = typeof req.query.email === 'string' ? req.query.email : null;

    if (!id) {
      return res.status(400).json({ error: 'id required' });
    }

    const { data: existing, error: selectError } = await supabase
      .from('users')
      .select('id, email, role, created_at')
      .eq('id', id)
      .maybeSingle();

    if (selectError) {
      console.error('[users] Select error:', selectError);
    }

    if (existing) {
      return res.status(200).json({
        user: {
          id: existing.id,
          email: existing.email,
          role: existing.role,
          createdAt: existing.created_at,
        },
      });
    }

    const { data, error: insertError } = await supabase
      .from('users')
      .insert({
        id,
        email: email ?? null,
        role: 'auditor',
      })
      .select('id, email, role, created_at')
      .single();

    if (insertError) {
      console.error('[users] Insert error:', insertError);
      return res.status(500).json({ error: 'Failed to create user', details: insertError.message });
    }

    return res.status(201).json({
      user: {
        id: data.id,
        email: data.email,
        role: data.role,
        createdAt: data.created_at,
      },
    });
  } catch (err) {
    console.error('[users] Error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

