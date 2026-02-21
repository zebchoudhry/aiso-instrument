import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

function getSupabase() {
  const url = process.env.SUPABASE_URL ?? '';
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_ANON_KEY ?? '';
  if (!url || !key) return null;
  return createClient(url, key);
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // #region agent log
  fetch('http://127.0.0.1:7243/ingest/65f2ea79-8116-43c5-a03e-0378f916e883',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'e5c298'},body:JSON.stringify({sessionId:'e5c298',location:'config.ts:entry',message:'config handler hit',data:{method:req.method},timestamp:Date.now(),hypothesisId:'H4'})}).catch(()=>{});
  // #endregion
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
    if (req.method === 'GET') {
      return res.status(200).json({
        companyName: 'AISO Instrument',
        logoUrl: '',
        primaryColor: '#4F46E5',
      });
    }
    return res.status(503).json({ error: 'Database not configured' });
  }

  if (req.method === 'GET') {
    const { data, error } = await supabase
      .from('config')
      .select('value')
      .eq('key', 'whitelabel')
      .single();

    if (error) {
      return res.status(200).json({
        companyName: 'AISO Instrument',
        logoUrl: '',
        primaryColor: '#4F46E5',
      });
    }

    const v = (data?.value as any) ?? {};
    return res.status(200).json({
      companyName: v.companyName ?? 'AISO Instrument',
      logoUrl: v.logoUrl ?? '',
      primaryColor: v.primaryColor ?? '#4F46E5',
    });
  }

  if (req.method === 'PATCH') {
    const body = req.body as { companyName?: string; logoUrl?: string; primaryColor?: string };
    const value = {
      companyName: body.companyName,
      logoUrl: body.logoUrl,
      primaryColor: body.primaryColor,
    };

    const { error } = await supabase
      .from('config')
      .upsert({ key: 'whitelabel', value, updated_at: new Date().toISOString() }, { onConflict: 'key' });

    if (error) {
      return res.status(500).json({ error: 'Failed to update config' });
    }

    return res.status(200).json(value);
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
