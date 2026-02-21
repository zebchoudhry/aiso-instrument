import type { VercelRequest, VercelResponse } from '@vercel/node';

// In-memory rate limiter (inlined for serverless; per-instance only)
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

import {
  performDeepDiagnostic,
  generateQueryPack,
  generateFixLibrary,
  generateClientTranslation
} from './lib/geminiService';
import type { ExtractionData, AuditResponse } from '../types';

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { allowed, remaining } = checkRateLimit(getIdentifier(req));
  if (!allowed) {
    res.setHeader('Retry-After', '60');
    return res.status(429).json({ error: 'Rate limit exceeded', details: 'Max 10 requests per minute. Please try again later.' });
  }
  res.setHeader('X-RateLimit-Remaining', String(remaining));

  const apiKey = process.env.GEMINI_API_KEY ?? process.env.API_KEY;
  if (!apiKey) {
    return res.status(500).json({
      error: 'Server configuration error',
      details: 'GEMINI_API_KEY or API_KEY is not set'
    });
  }

  const enrichT0 = Date.now();
  // #region agent log
  fetch('http://127.0.0.1:7243/ingest/65f2ea79-8116-43c5-a03e-0378f916e883',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'e5c298'},body:JSON.stringify({sessionId:'e5c298',location:'audit-enrich.ts:entry',message:'audit-enrich started',data:{hasGeminiKey:!!(process.env.GEMINI_API_KEY||process.env.API_KEY)},timestamp:Date.now(),hypothesisId:'H5'})}).catch(()=>{});
  // #endregion
  try {
    const { url, name, extractionData, audit } = req.body as {
      url: string;
      name: string;
      extractionData: ExtractionData;
      audit: AuditResponse;
    };

    if (!url || !extractionData || !audit) {
      return res.status(400).json({
        error: 'Missing required fields',
        details: 'url, extractionData, and audit are required'
      });
    }

    const [findings, queryPack, clientTranslation] = await Promise.all([
      performDeepDiagnostic(url, name, extractionData, apiKey),
      generateQueryPack(url, name, extractionData, apiKey),
      generateClientTranslation(audit, apiKey)
    ]);

    const fixLibrary = await generateFixLibrary(findings, apiKey);

    // #region agent log
    fetch('http://127.0.0.1:7243/ingest/65f2ea79-8116-43c5-a03e-0378f916e883',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'e5c298'},body:JSON.stringify({sessionId:'e5c298',location:'audit-enrich.ts:success',message:'audit-enrich done',data:{ms:Date.now()-enrichT0},timestamp:Date.now(),hypothesisId:'H5'})}).catch(()=>{});
    // #endregion
    return res.status(200).json({
      findings,
      queryPack,
      fixLibrary,
      clientTranslation
    });
  } catch (err) {
    console.error('audit-enrich error:', err);
    return res.status(500).json({
      error: 'AI enrichment failed',
      details: err instanceof Error ? err.message : String(err)
    });
  }
}
