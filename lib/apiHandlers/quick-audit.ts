import type { VercelRequest, VercelResponse } from '@vercel/node';
import { performQuickAudit } from '../geminiService';
import type { ExtractionData } from '../../types';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  try {
    const body = req.body as { url?: string; name?: string; extractionData?: ExtractionData };
    const url = body.url ?? '';
    const name = body.name ?? '';
    const extractionData = body.extractionData;
    if (!url || !extractionData) {
      return res.status(400).json({ error: 'url and extractionData are required' });
    }
    const audit = await performQuickAudit(url, name, extractionData);
    return res.status(200).json(audit);
  } catch (err) {
    console.error('quick-audit error:', err);
    return res.status(500).json({
      error: 'Quick audit failed',
      details: err instanceof Error ? err.message : String(err),
    });
  }
}
