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
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PATCH, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'GET' && req.method !== 'POST' && req.method !== 'PATCH') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  const supabase = getSupabase();
  if (!supabase || !(process.env.SUPABASE_URL && (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY))) {
    if (req.method === 'POST') return res.status(201).json({ id: null, saved: false, message: 'Database not configured; audit not persisted.' });
    return res.status(200).json({ audits: [] });
  }
  if (req.method === 'POST') {
    try {
      const body = req.body as any;
      if (!body?.auditResult) return res.status(400).json({ error: 'auditResult required' });
      const scores = body.auditResult?.summary?.scores ?? null;
      const { data, error } = await supabase.from('audits').insert({
        url: body.url ?? '', name: body.name ?? '', extraction_data: body.extractionData ?? null,
        audit_result: body.auditResult, scores, findings: body.findings ?? null,
        fix_library: body.fixLibrary ?? null, client_briefing: body.clientBriefing ?? null,
        query_pack: body.queryPack ?? null, user_id: body.userId ?? null,
      }).select('id, created_at').single();
      if (error) return res.status(500).json({ error: 'Failed to save audit', details: error.message });
      return res.status(201).json({ id: data.id, createdAt: data.created_at, saved: true });
    } catch (err) {
      return res.status(500).json({ error: 'Internal server error' });
    }
  }
  if (req.method === 'PATCH') {
    const patchBody = req.body as any;
    const id = typeof req.query.id === 'string' ? req.query.id : patchBody?.id;
    if (!id) return res.status(400).json({ error: 'id required' });
    const updates: Record<string, unknown> = {};
    if (patchBody.findings !== undefined) updates.findings = patchBody.findings;
    if (patchBody.fixLibrary !== undefined) updates.fix_library = patchBody.fixLibrary;
    if (patchBody.clientBriefing !== undefined) updates.client_briefing = patchBody.clientBriefing;
    if (patchBody.queryPack !== undefined) updates.query_pack = patchBody.queryPack;
    if (patchBody.verifications !== undefined) updates.verifications = patchBody.verifications;
    const { error } = await supabase.from('audits').update(updates).eq('id', id);
    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json({ ok: true });
  }
  if (req.method === 'GET') {
    try {
      const id = typeof req.query.id === 'string' ? req.query.id : null;
      const userId = typeof req.query.userId === 'string' ? req.query.userId : null;
      const domain = typeof req.query.domain === 'string' ? req.query.domain.trim() : null;
      const orderAsc = req.query.order === 'asc';
      const limit = Math.min(parseInt(String(req.query.limit || '50'), 10), 100);
      const offset = parseInt(String(req.query.offset || '0'), 10);
      if (id) {
        const { data, error } = await supabase.from('audits').select('*').eq('id', id).single();
        if (error || !data) return res.status(404).json({ error: 'Audit not found' });
        return res.status(200).json({
          id: data.id, url: data.url, name: data.name, auditResult: data.audit_result,
          extractionData: data.extraction_data ?? null, findings: data.findings,
          fixLibrary: data.fix_library, clientBriefing: data.client_briefing,
          verifications: data.verifications ?? null, queryPack: data.query_pack ?? null, createdAt: data.created_at,
        });
      }
      let query = supabase.from('audits').select('id, url, name, scores, created_at', { count: 'exact' })
        .order('created_at', { ascending: orderAsc }).range(offset, offset + limit - 1);
      if (domain) query = query.ilike('url', `%${domain}%`);
      if (userId) query = query.or(`user_id.eq.${userId},user_id.is.null`);
      const { data, error } = await query;
      if (error) return res.status(500).json({ error: 'Failed to list audits' });
      return res.status(200).json({ audits: data ?? [] });
    } catch (err) {
      return res.status(500).json({ error: 'Internal server error' });
    }
  }
  return res.status(405).json({ error: 'Method not allowed' });
}
