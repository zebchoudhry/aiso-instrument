import type { VercelRequest, VercelResponse } from '@vercel/node';
import { processHtml } from './extract';

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
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const { allowed, remaining } = checkRateLimit(getIdentifier(req));
  if (!allowed) {
    res.setHeader('Retry-After', '60');
    return res.status(429).json({
      error: 'Rate limit exceeded',
      details: 'Max 10 requests per minute. Please try again later.',
    });
  }
  res.setHeader('X-RateLimit-Remaining', String(remaining));
  const { html, url } = (req.body || {}) as { html?: string; url?: string };
  if (!html || typeof html !== 'string') {
    return res.status(400).json({ error: 'HTML content required' });
  }
  const baseUrl = url && typeof url === 'string' ? url : 'https://example.com';
  try {
    const result = processHtml(html, baseUrl);
    return res.status(200).json(result);
  } catch (err: any) {
    console.error('[extract-from-html] Error:', err);
    return res.status(500).json({
      error: 'HTML processing failed',
      details: err instanceof Error ? err.message : String(err),
    });
  }
}
