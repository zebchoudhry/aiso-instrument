import type { VercelRequest, VercelResponse } from '@vercel/node';
import { performQuickAudit } from './lib/geminiService';
import type { ExtractionData } from '../types';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const t0 = Date.now();
  // #region agent log
  fetch('http://127.0.0.1:7243/ingest/65f2ea79-8116-43c5-a03e-0378f916e883',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'e5c298'},body:JSON.stringify({sessionId:'e5c298',location:'quick-audit.ts:entry',message:'quick-audit handler hit',data:{hasGeminiKey:!!(process.env.GEMINI_API_KEY||process.env.API_KEY)},timestamp:Date.now(),hypothesisId:'H1'})}).catch(()=>{});
  // #endregion
  try {
    const body = req.body as { url?: string; name?: string; extractionData?: ExtractionData };
    const url = body.url ?? '';
    const name = body.name ?? '';
    const extractionData = body.extractionData;

    if (!url || !extractionData) {
      return res.status(400).json({ error: 'url and extractionData are required' });
    }

    const audit = await performQuickAudit(url, name, extractionData);
    // #region agent log
    fetch('http://127.0.0.1:7243/ingest/65f2ea79-8116-43c5-a03e-0378f916e883',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'e5c298'},body:JSON.stringify({sessionId:'e5c298',location:'quick-audit.ts:success',message:'quick-audit done',data:{ms:Date.now()-t0},timestamp:Date.now(),hypothesisId:'H3'})}).catch(()=>{});
    // #endregion
    return res.status(200).json(audit);
  } catch (err) {
    // #region agent log
    fetch('http://127.0.0.1:7243/ingest/65f2ea79-8116-43c5-a03e-0378f916e883',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'e5c298'},body:JSON.stringify({sessionId:'e5c298',location:'quick-audit.ts:catch',message:'quick-audit failed',data:{errMsg:String(err?.message||err)},timestamp:Date.now(),hypothesisId:'H3'})}).catch(()=>{});
    // #endregion
    console.error('quick-audit error:', err);
    return res.status(500).json({
      error: 'Quick audit failed',
      details: err instanceof Error ? err.message : String(err)
    });
  }
}
