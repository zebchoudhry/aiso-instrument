import type { VercelRequest, VercelResponse } from '@vercel/node';
import {
  performDeepDiagnostic,
  generateQueryPack,
  generateFixLibrary,
  generateClientTranslation,
  performAIOutcomeTest,
} from '../lib/geminiService.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const body = (req.body ?? {}) as Record<string, unknown>;

  if (body.queries && body.brandName && body.domain) {
    const queries = Array.isArray(body.queries) ? (body.queries as string[]).filter(Boolean) : [];
    const brandName = String(body.brandName || '').trim();
    const domain = String(body.domain || '').trim();
    if (!queries.length || !brandName || !domain) {
      return res.status(400).json({ error: 'queries, brandName, domain required for AI outcome test' });
    }
    try {
      const result = await performAIOutcomeTest(queries, brandName, domain);
      if (!result) return res.status(500).json({ error: 'AI outcome test failed (no API key?)' });
      return res.status(200).json(result);
    } catch (err) {
      console.error('[audit-enrich] AI outcome test error:', err);
      return res.status(500).json({
        error: 'AI outcome test failed',
        details: err instanceof Error ? err.message : String(err),
      });
    }
  }

  if (body.url && body.extractionData && body.audit) {
    const url = String(body.url || '');
    const name = String(body.name || '');
    const extractionData = body.extractionData as Record<string, unknown>;
    try {
      const [findings, queryPack, clientTranslation] = await Promise.all([
        performDeepDiagnostic(url, name, extractionData as any),
        generateQueryPack(url, name, extractionData as any),
        generateClientTranslation(body.audit as any),
      ]);
      const fixLibrary = findings?.length ? await generateFixLibrary(findings) : { fixes: [] };
      return res.status(200).json({
        findings: findings ?? [],
        queryPack: queryPack ?? { queries: [] },
        fixLibrary: fixLibrary ?? { fixes: [] },
        clientTranslation: clientTranslation ?? null,
      });
    } catch (err) {
      console.error('[audit-enrich] Enrichment error:', err);
      return res.status(500).json({
        error: 'Enrichment failed',
        details: err instanceof Error ? err.message : String(err),
      });
    }
  }

  return res.status(400).json({ error: 'Invalid request: provide (queries, brandName, domain) or (url, extractionData, audit)' });
}
