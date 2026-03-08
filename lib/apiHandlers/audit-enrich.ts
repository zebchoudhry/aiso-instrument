import type { VercelRequest, VercelResponse } from '@vercel/node';
import {
  performDeepDiagnostic,
  generateQueryPack,
  generateFixLibrary,
  generateClientTranslation
} from '../geminiService.js';
import type { ExtractionData, AuditResponse } from '../../types.js';

const rateLimitStore = new Map<string, number[]>();
const RATE_WINDOW_MS = 60 * 1000;
const RATE_MAX_REQUESTS = 10;
function rateLimitPrune(ips: number[]): number[] {
  const cutoff = Date.now() - RATE_WINDOW_MS;
  return ips.filter((t) => t > cutoff);
}
function checkRateLimit(identifier: string): { allowed: boolean; remaining: number } {
  const now = Date.now();
  let ips = rateLimitStore.get(identifier) ?? [];
  ips = rateLimitPrune(ips);
  if (ips.length >= RATE_MAX_REQUESTS) return { allowed: false, remaining: 0 };
  ips.push(now);
  rateLimitStore.set(identifier, ips);
  return { allowed: true, remaining: RATE_MAX_REQUESTS - ips.length };
}
function getIdentifier(req: VercelRequest): string {
  const forwarded = req.headers?.['x-forwarded-for'];
  if (typeof forwarded === 'string') return forwarded.split(',')[0].trim();
  if (Array.isArray(forwarded)) return forwarded[0]?.split(',')[0].trim() ?? 'unknown';
  const realIp = req.headers?.['x-real-ip'];
  if (typeof realIp === 'string') return realIp;
  return (req as any).socket?.remoteAddress ?? 'unknown';
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const { allowed, remaining } = checkRateLimit(getIdentifier(req));
  if (!allowed) {
    res.setHeader('Retry-After', '60');
    return res.status(429).json({ error: 'Rate limit exceeded', details: 'Max 10 requests per minute. Please try again later.' });
  }
  res.setHeader('X-RateLimit-Remaining', String(remaining));

  const body = req.body as Record<string, unknown>;
  const isAiAnswerTest = Array.isArray(body?.queries) && typeof body?.brandName === 'string' && typeof body?.domain === 'string';
  if (isAiAnswerTest) {
    const aiAnswerTestHandler = (await import('./ai-answer-test.js')).default;
    return aiAnswerTestHandler(req, res);
  }

  const geminiKey = process.env.GEMINI_API_KEY ?? process.env.API_KEY;
  const anthropicKey = process.env.ANTHROPIC_API_KEY;
  if (!geminiKey && !anthropicKey) {
    return res.status(500).json({ error: 'Server configuration error', details: 'GEMINI_API_KEY, API_KEY, or ANTHROPIC_API_KEY is required' });
  }
  try {
    const { url, name, extractionData, audit } = req.body as {
      url: string; name: string; extractionData: ExtractionData; audit: AuditResponse;
    };
    if (!url || !extractionData || !audit) {
      return res.status(400).json({ error: 'Missing required fields', details: 'url, extractionData, and audit are required' });
    }
    const [findings, queryPack, clientTranslation] = await Promise.all([
      performDeepDiagnostic(url, name, extractionData, geminiKey ?? undefined),
      generateQueryPack(url, name, extractionData, geminiKey ?? undefined),
      generateClientTranslation(audit, geminiKey ?? undefined)
    ]);
    const fixLibrary = await generateFixLibrary(findings, geminiKey ?? undefined);
    return res.status(200).json({ findings, queryPack, fixLibrary, clientTranslation });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[audit-enrich] Error:', msg);
    if (err instanceof Error && err.stack) console.error('[audit-enrich] Stack:', err.stack);
    return res.status(500).json({ error: 'AI enrichment failed', details: msg });
  }
}
