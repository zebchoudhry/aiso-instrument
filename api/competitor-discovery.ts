import type { VercelRequest, VercelResponse } from '@vercel/node';
import { GoogleGenAI, Type } from '@google/genai';

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

const GEMINI_MODEL = 'gemini-2.0-flash';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { allowed, remaining } = checkRateLimit(getIdentifier(req));
  if (!allowed) {
    res.setHeader('Retry-After', '60');
    return res.status(429).json({ error: 'Rate limit exceeded', details: 'Max 10 requests per minute.' });
  }
  res.setHeader('X-RateLimit-Remaining', String(remaining));

  const apiKey = process.env.GEMINI_API_KEY ?? process.env.API_KEY;
  if (!apiKey) {
    return res.status(503).json({
      error: 'Server configuration error',
      details: 'GEMINI_API_KEY or API_KEY is not set'
    });
  }

  try {
    const { queries, domain, name } = req.body as {
      queries?: string[];
      domain?: string;
      name?: string;
    };

    if (!queries || !Array.isArray(queries) || queries.length === 0) {
      return res.status(400).json({
        error: 'Missing required field',
        details: 'queries (array of strings) is required'
      });
    }

    const ai = new GoogleGenAI({ apiKey });
    const queryList = queries.slice(0, 10).join('\n- ');
    const brandContext = name ? ` (audited brand: ${name})` : domain ? ` (audited domain: ${domain})` : '';

    const prompt = `For these user questions that someone might ask an AI assistant:

- ${queryList}

List brands, companies, or products that AI assistants typically mention or recommend when answering these questions. Exclude the audited brand${brandContext} from the list. Return JSON only.`;

    const response = await ai.models.generateContent({
      model: GEMINI_MODEL,
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          required: ['competitors'],
          properties: {
            competitors: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  name: { type: Type.STRING },
                  domain: { type: Type.STRING },
                  context: { type: Type.STRING }
                }
              }
            }
          }
        }
      }
    });

    const text = (response as { text?: string }).text ?? '';
    const parsed = JSON.parse(text || '{"competitors":[]}');
    const raw = Array.isArray(parsed.competitors) ? parsed.competitors : [];

    const seen = new Set<string>();
    const competitors = raw
      .filter((c: { name?: string }) => c && typeof c.name === 'string' && c.name.trim().length > 0)
      .map((c: { name?: string; domain?: string; context?: string }) => ({
        name: String(c.name).trim(),
        domain: typeof c.domain === 'string' ? c.domain.trim() || undefined : undefined,
        context: typeof c.context === 'string' ? c.context.trim() || undefined : undefined
      }))
      .filter((c: { name: string }) => {
        const key = c.name.toLowerCase();
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });

    return res.status(200).json({ competitors });
  } catch (err) {
    console.error('competitor-discovery error:', err);
    return res.status(500).json({
      error: 'Competitor discovery failed',
      details: err instanceof Error ? err.message : String(err)
    });
  }
}
