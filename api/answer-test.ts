import type { VercelRequest, VercelResponse } from '@vercel/node';
import { GoogleGenAI } from '@google/genai';
import { createClient } from '@supabase/supabase-js';

const GEMINI_MODEL = 'gemini-2.0-flash';

function getSupabase() {
  const url = process.env.SUPABASE_URL ?? '';
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_ANON_KEY ?? '';
  if (!url || !key) return null;
  return createClient(url, key);
}

function extractDomainFromUrl(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return url.replace(/^https?:\/\//, '').replace(/^www\./, '').split('/')[0] || '';
  }
}

function analyzeMention(answer: string, domain: string, name: string): { mentioned: boolean; mentionCount: number; position: number | null } {
  const text = answer.toLowerCase();
  const domainNorm = domain.toLowerCase().replace(/^www\./, '');
  const nameNorm = (name || '').toLowerCase();

  const domainParts = domainNorm.split('.');
  const brandSlug = domainParts[0] || domainNorm;

  let mentionCount = 0;
  let position: number | null = null;

  const patterns = [
    domainNorm,
    brandSlug,
    ...(nameNorm ? [nameNorm] : [])
  ].filter(Boolean);

  for (const p of patterns) {
    if (!p) continue;
    const re = new RegExp(p.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
    const matches = answer.match(re);
    if (matches) {
      mentionCount += matches.length;
      const idx = text.indexOf(p);
      if (idx >= 0 && (position === null || idx < position)) {
        position = idx;
      }
    }
  }

  return {
    mentioned: mentionCount > 0,
    mentionCount,
    position: position !== null ? position : null
  };
}

function extractCompetitors(answer: string, excludeTerms: string[]): Array<{ name: string; count: number }> {
  const exclude = new Set(excludeTerms.map(t => t.toLowerCase()));
  const capPattern = /\b[A-Z][a-zA-Z]+(?:\s+[A-Z][a-zA-Z]+)*\b/g;
  const matches = answer.match(capPattern) || [];
  const counts = new Map<string, number>();

  for (const m of matches) {
    const n = m.trim();
    if (n.length < 2 || exclude.has(n.toLowerCase())) continue;
    counts.set(n, (counts.get(n) || 0) + 1);
  }

  return Array.from(counts.entries())
    .filter(([, c]) => c >= 1)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([name, count]) => ({ name, count }));
}

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

  const apiKey = process.env.GEMINI_API_KEY ?? process.env.API_KEY;
  if (!apiKey) {
    return res.status(503).json({
      error: 'Server configuration error',
      details: 'GEMINI_API_KEY or API_KEY is not set'
    });
  }

  try {
    const body = req.body as {
      auditId?: string;
      domain?: string;
      name?: string;
      queries?: string[];
      models?: string[];
    };

    const auditId = body.auditId || null;
    const urlOrDomain = body.domain || '';
    const domain = urlOrDomain.includes('/') ? extractDomainFromUrl(urlOrDomain) : urlOrDomain.replace(/^www\./, '');
    const name = body.name || '';
    const queries = Array.isArray(body.queries) ? body.queries.slice(0, 10) : [];
    if (queries.length === 0) {
      return res.status(400).json({ error: 'queries (array) is required and must not be empty' });
    }

    const ai = new GoogleGenAI({ apiKey });
    const supabase = getSupabase();
    const results: Array<{
      query: string;
      model: string;
      mentioned: boolean;
      mention_count: number;
      position: number | null;
      competitors: Array<{ name: string; count: number }>;
    }> = [];

    const excludeTerms = [domain, name, domain.split('.')[0]].filter(Boolean);

    for (const query of queries) {
      const prompt = `Answer this user question as an AI assistant would:

${query}

Provide a natural answer, as if responding in ChatGPT or Gemini. Do not provide JSON. Provide a normal AI answer.`;

      const response = await ai.models.generateContent({
        model: GEMINI_MODEL,
        contents: prompt
      });

      const answer = (response as { text?: string }).text ?? '';

      const { mentioned, mentionCount, position } = analyzeMention(answer, domain, name);
      const competitors = extractCompetitors(answer, excludeTerms);

      results.push({
        query,
        model: 'gemini',
        mentioned,
        mention_count: mentionCount,
        position,
        competitors
      });

      if (supabase && auditId) {
        try {
          await supabase.from('answer_tests').insert({
            audit_id: auditId,
            query,
            model: 'gemini',
            answer,
            mentioned,
            mention_count: mentionCount,
            position,
            competitors
          });
        } catch (_) {
          // Skip storage if table missing or insert fails; still return results
        }
      }
    }

    return res.status(200).json({ results });
  } catch (err) {
    console.error('answer-test error:', err);
    return res.status(500).json({
      error: 'Answer simulation failed',
      details: err instanceof Error ? err.message : String(err)
    });
  }
}
