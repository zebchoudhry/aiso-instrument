import type { VercelRequest, VercelResponse } from '@vercel/node';
import type {
  AIAnswerTestRequest,
  AIAnswerTestResult,
  AIAnswerTestSummary,
  AIAnswerTestResponse,
} from '../../types.js';

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

function detectBrandMentions(
  answer: string,
  brandName: string,
  domain: string
): { brandMentioned: boolean; brandCited: boolean } {
  const text = (answer || '').toLowerCase();
  const brand = (brandName || '').trim().toLowerCase();
  const dom = (domain || '').replace(/^https?:\/\//, '').replace(/^www\./, '').toLowerCase();
  const domNoTld = dom.split('.')[0] || '';

  if (!text) return { brandMentioned: false, brandCited: false };

  const brandMentioned =
    (brand && text.includes(brand)) ||
    (dom && text.includes(dom)) ||
    (domNoTld && domNoTld.length >= 2 && new RegExp(`\\b${domNoTld.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i').test(text)) ||
    (brand && new RegExp(`\\b${brand.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/'/g, "[']?")}\\b`, 'i').test(text));

  const hasUrlWithDomain = dom && new RegExp(`https?://[^\\s]*${dom.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`, 'i').test(text);
  const domainInLinkContext = dom && (text.includes(dom) || text.includes(`www.${dom}`));
  const brandCited = brandMentioned && (hasUrlWithDomain || domainInLinkContext);

  return { brandMentioned, brandCited };
}

const COMMON_NON_BRANDS = new Set([
  'the', 'a', 'an', 'i', 'you', 'we', 'they', 'he', 'she', 'it', 'ai', 'chatgpt', 'perplexity',
  'google', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday',
  'january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september',
  'october', 'november', 'december', 'yes', 'no', 'ok', 'etc', 'eg', 'ie',
]);

function extractCompetitors(answer: string, brandName: string): string[] {
  const brandLower = (brandName || '').trim().toLowerCase();
  const words = (answer || '').split(/\s+/);
  const seen = new Set<string>();
  const candidates: string[] = [];

  for (const w of words) {
    const cleaned = w.replace(/[^\p{L}]/gu, '').trim();
    if (cleaned.length < 2) continue;
    const first = cleaned.charAt(0);
    if (first !== first.toUpperCase() || first === first.toLowerCase()) continue;
    const lower = cleaned.toLowerCase();
    if (lower === brandLower) continue;
    if (COMMON_NON_BRANDS.has(lower)) continue;
    if (seen.has(lower)) continue;
    seen.add(lower);
    candidates.push(cleaned);
    if (candidates.length >= 3) break;
  }

  return candidates.slice(0, 3);
}

async function answerQueryWithLLM(query: string): Promise<string> {
  const prompt = `Answer this question as an AI assistant would for a user. Provide a concise factual answer.\n\nQuestion: ${query}`;
  const geminiKey = process.env.GEMINI_API_KEY ?? process.env.API_KEY;
  const anthropicKey = process.env.ANTHROPIC_API_KEY;
  const openaiKey = process.env.OPENAI_API_KEY;

  if (geminiKey) {
    try {
      const { GoogleGenAI } = await import('@google/genai');
      const ai = new GoogleGenAI({ apiKey: geminiKey });
      const response = await ai.models.generateContent({
        model: 'gemini-2.0-flash',
        contents: prompt,
      });
      const text = (response as { text?: string }).text ?? '';
      return (text || '').trim();
    } catch (err) {
      const msg = (err as Error).message?.toLowerCase() ?? '';
      if (!msg.includes('429') && !msg.includes('quota') && !msg.includes('resource_exhausted')) throw err;
    }
  }

  if (anthropicKey) {
    const Anthropic = (await import('@anthropic-ai/sdk')).default;
    const client = new Anthropic({ apiKey: anthropicKey });
    const message = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1024,
      messages: [{ role: 'user', content: prompt }],
    });
    const block = message.content.find((b: { type: string }) => b.type === 'text') as { text: string } | undefined;
    return (block?.text ?? '').trim();
  }

  if (openaiKey) {
    const OpenAI = (await import('openai')).default;
    const client = new OpenAI({ apiKey: openaiKey });
    const response = await client.chat.completions.create({
      model: 'gpt-4o-mini',
      max_tokens: 512,
      messages: [{ role: 'user', content: prompt }],
    });
    return (response.choices[0]?.message?.content ?? '').trim();
  }

  throw new Error('No LLM API key configured. Set GEMINI_API_KEY, ANTHROPIC_API_KEY, or OPENAI_API_KEY.');
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
    return res.status(429).json({
      error: 'Rate limit exceeded',
      details: 'Max 10 requests per minute. Please try again later.',
    });
  }
  res.setHeader('X-RateLimit-Remaining', String(remaining));

  const body = req.body as AIAnswerTestRequest;
  const queries = Array.isArray(body?.queries) ? body.queries.filter((q) => typeof q === 'string') : [];
  const brandName = typeof body?.brandName === 'string' ? body.brandName.trim() : '';
  const domain = typeof body?.domain === 'string' ? body.domain.trim() : '';

  if (!queries.length || !brandName || !domain) {
    return res.status(400).json({
      error: 'Missing required fields',
      details: 'queries (non-empty array), brandName, and domain are required',
    });
  }

  if (!process.env.GEMINI_API_KEY && !process.env.API_KEY && !process.env.ANTHROPIC_API_KEY && !process.env.OPENAI_API_KEY) {
    return res.status(500).json({
      error: 'No LLM API key configured',
      details: 'Set GEMINI_API_KEY, API_KEY, ANTHROPIC_API_KEY, or OPENAI_API_KEY',
    });
  }

  try {
    const results: AIAnswerTestResult[] = [];

    for (const query of queries) {
      const answer = await answerQueryWithLLM(query);
      const { brandMentioned, brandCited } = detectBrandMentions(answer, brandName, domain);
      const competitors = extractCompetitors(answer, brandName);

      results.push({
        query,
        answer,
        brandMentioned,
        brandCited,
        competitors,
      });
    }

    const mentioned = results.filter((r) => r.brandMentioned).length;
    const cited = results.filter((r) => r.brandCited).length;
    const total = results.length;

    const summary: AIAnswerTestSummary = {
      queriesTested: total,
      brandMentionRate: total > 0 ? mentioned / total : 0,
      brandCitationRate: total > 0 ? cited / total : 0,
    };

    const response: AIAnswerTestResponse = { results, summary };
    return res.status(200).json(response);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[ai-answer-test] Error:', msg);
    return res.status(500).json({
      error: 'AI answer test failed',
      details: msg,
    });
  }
}
