import type { VercelRequest, VercelResponse } from '@vercel/node';
import { generateDeploymentChecklist } from '../geminiService.js';
import type { PrescriptionExecutionCard } from '../../types.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  try {
    const body = req.body as { card?: PrescriptionExecutionCard; subjectName?: string };
    if (!body?.card) return res.status(400).json({ error: 'card is required' });
    const checklist = await generateDeploymentChecklist(body.card, body.subjectName ?? '');
    return res.status(200).json(checklist);
  } catch (err) {
    console.error('deployment-checklist error:', err);
    return res.status(500).json({ error: 'Deployment checklist failed', details: err instanceof Error ? err.message : String(err) });
  }
}
