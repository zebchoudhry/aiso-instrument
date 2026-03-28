import type { VercelRequest, VercelResponse } from '@vercel/node';

const EMPTY_CONFIG = { companyName: '', logoUrl: '', primaryColor: '' };

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, PATCH, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(204).end();

  if (req.method === 'GET') {
    return res.status(200).json(EMPTY_CONFIG);
  }

  if (req.method === 'PATCH') {
    const body = (req.body ?? {}) as Record<string, string>;
    const merged = {
      companyName: typeof body.companyName === 'string' ? body.companyName : '',
      logoUrl: typeof body.logoUrl === 'string' ? body.logoUrl : '',
      primaryColor: typeof body.primaryColor === 'string' ? body.primaryColor : '',
    };
    return res.status(200).json(merged);
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
