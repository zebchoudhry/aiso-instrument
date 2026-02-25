import type { VercelRequest, VercelResponse } from '@vercel/node';
import type { RoadmapPayload, RoadmapResponse } from '../../types.js';

function buildPrompt(payload: RoadmapPayload): string {
  return `You are an AI Visibility Strategy Engine.

Based on the following audit results, generate a structured 90-day AI Visibility Execution Roadmap.

Audit Data:
Overall Score: ${payload.overallScore}
Signal Coverage: ${payload.signalCoverageScore}
Citation Health: ${payload.citationHealthScore}
Content Depth: ${payload.contentDepthScore}
Authority Signals: ${payload.authoritySignalsScore}
Weak Signals: ${payload.identifiedWeakSignals.join(', ')}
Schema Types: ${payload.schemaTypes.length > 0 ? payload.schemaTypes.join(', ') : 'none'}
Key Headings: ${payload.headings.slice(0, 10).join(' | ') || 'none'}
Domain: ${payload.domain}
AI Query Pack: ${payload.queryPack.length > 0 ? payload.queryPack.join(' | ') : 'not available'}
Top Opportunities: ${payload.topOpportunities.length > 0 ? payload.topOpportunities.join('; ') : 'none identified'}
Page Title: ${payload.extractionSummary.title || 'missing'}
Meta Description: ${payload.extractionSummary.metaDescription || 'missing'}
Word Count: ${payload.extractionSummary.wordCount}

Instructions:
- Do not provide generic SEO advice.
- Focus only on AI answer engine visibility.
- Prioritise high-leverage structural changes.
- Sequence actions logically across 3 phases.
- Avoid marketing language.
- Be precise and operational.
- Phase 1 (0-30 days) should focus on Entity Control: schema, identity, canonical.
- Phase 2 (30-60 days) should focus on Citation Surface Expansion: social verification, sameAs, authority signals.
- Phase 3 (60-90 days) should focus on Intent Query Domination: content depth, format, query-aligned pages.
- scoreProjection.projected90Day should reflect realistic improvement if all actions are completed.
- Return a single valid JSON object only. Do not truncate; include the full response. No markdown or text outside the JSON.`;
}

/** Extract JSON from LLM text (strip markdown, find first { to last }) and parse. Throws user-friendly error on invalid JSON. */
function parseRoadmapJson(raw: string): RoadmapResponse {
  const stripped = raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
  const first = stripped.indexOf('{');
  const last = stripped.lastIndexOf('}');
  if (first === -1 || last === -1 || last <= first) {
    throw new Error('Roadmap response was invalid or truncated. Please try again.');
  }
  const jsonStr = stripped.slice(first, last + 1);
  try {
    return JSON.parse(jsonStr) as RoadmapResponse;
  } catch (e) {
    const msg = e instanceof SyntaxError ? e.message : String(e);
    console.error('[roadmap] JSON parse error:', msg, 'length:', jsonStr.length);
    throw new Error('Roadmap response was invalid or truncated. Please try again.');
  }
}

const ROADMAP_SCHEMA = {
  type: 'object',
  required: ['phase1', 'phase2', 'phase3', 'scoreProjection'],
  properties: {
    phase1: {
      type: 'object',
      required: ['objective', 'actions'],
      properties: {
        objective: { type: 'string' },
        actions: {
          type: 'array',
          items: {
            type: 'object',
            required: ['title', 'why', 'expectedImpact', 'difficulty'],
            properties: {
              title: { type: 'string' },
              why: { type: 'string' },
              expectedImpact: { type: 'string' },
              difficulty: { type: 'string', enum: ['Low', 'Medium', 'High'] },
            },
          },
        },
      },
    },
    phase2: {
      type: 'object',
      required: ['objective', 'actions'],
      properties: {
        objective: { type: 'string' },
        actions: {
          type: 'array',
          items: {
            type: 'object',
            required: ['title', 'why', 'expectedImpact', 'difficulty'],
            properties: {
              title: { type: 'string' },
              why: { type: 'string' },
              expectedImpact: { type: 'string' },
              difficulty: { type: 'string', enum: ['Low', 'Medium', 'High'] },
            },
          },
        },
      },
    },
    phase3: {
      type: 'object',
      required: ['objective', 'actions'],
      properties: {
        objective: { type: 'string' },
        actions: {
          type: 'array',
          items: {
            type: 'object',
            required: ['title', 'why', 'expectedImpact', 'difficulty'],
            properties: {
              title: { type: 'string' },
              why: { type: 'string' },
              expectedImpact: { type: 'string' },
              difficulty: { type: 'string', enum: ['Low', 'Medium', 'High'] },
            },
          },
        },
      },
    },
    scoreProjection: {
      type: 'object',
      required: ['current', 'projected90Day', 'confidence'],
      properties: {
        current: { type: 'number' },
        projected90Day: { type: 'number' },
        confidence: { type: 'string', enum: ['Low', 'Medium', 'High'] },
      },
    },
  },
};

async function callClaude(prompt: string, apiKey: string): Promise<RoadmapResponse> {
  const Anthropic = (await import('@anthropic-ai/sdk')).default;
  const client = new Anthropic({ apiKey });

  const message = await client.messages.create({
    model: 'claude-sonnet-4-5',
    max_tokens: 8192,
    temperature: 0.35,
    messages: [{ role: 'user', content: prompt }],
  });

  const textBlock = message.content.find((b: { type: string }) => b.type === 'text') as { type: 'text'; text: string } | undefined;
  if (!textBlock) throw new Error('No text in Claude response');

  return parseRoadmapJson(textBlock.text);
}

async function callOpenAI(prompt: string, apiKey: string): Promise<RoadmapResponse> {
  const OpenAI = (await import('openai')).default;
  const client = new OpenAI({ apiKey });

  const response = await client.chat.completions.create({
    model: 'gpt-4.1',
    temperature: 0.35,
    response_format: { type: 'json_object' },
    messages: [
      { role: 'system', content: 'You are an AI Visibility Strategy Engine. Return valid JSON only.' },
      { role: 'user', content: prompt },
    ],
  });

  const text = response.choices[0]?.message?.content ?? '';
  return parseRoadmapJson(text);
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const payload = req.body as RoadmapPayload;
  if (!payload || typeof payload.overallScore !== 'number') {
    return res.status(400).json({ error: 'Valid RoadmapPayload required' });
  }

  const prompt = buildPrompt(payload);

  const anthropicKey = process.env.ANTHROPIC_API_KEY;
  const openaiKey = process.env.OPENAI_API_KEY;

  const isParseFailure = (msg: string) =>
    msg.includes('invalid or truncated') || msg.includes('Unterminated string') || (msg.includes('position') && msg.includes('JSON'));

  try {
    let roadmap: RoadmapResponse;

    if (anthropicKey) {
      try {
        roadmap = await callClaude(prompt, anthropicKey);
      } catch (firstErr: unknown) {
        const firstMsg = (firstErr as Error)?.message ?? '';
        if (isParseFailure(firstMsg)) {
          console.error('[roadmap] First attempt parse failed, retrying once:', firstMsg);
          roadmap = await callClaude(prompt, anthropicKey);
        } else {
          throw firstErr;
        }
      }
    } else if (openaiKey) {
      roadmap = await callOpenAI(prompt, openaiKey);
    } else {
      return res.status(503).json({
        error: 'No LLM API key configured',
        details: 'Set ANTHROPIC_API_KEY (Claude) or OPENAI_API_KEY (GPT-4) in environment variables.',
      });
    }

    return res.status(200).json(roadmap);
  } catch (err: unknown) {
    const e = err as Error;
    console.error('[roadmap] LLM error:', e?.message);

    if (anthropicKey && openaiKey && e?.message?.toLowerCase().includes('claude')) {
      try {
        const roadmap = await callOpenAI(prompt, openaiKey);
        return res.status(200).json(roadmap);
      } catch (fallbackErr: unknown) {
        console.error('[roadmap] GPT-4 fallback also failed:', (fallbackErr as Error)?.message);
      }
    }

    const details = isParseFailure(e?.message ?? '')
      ? 'Roadmap response was invalid or truncated. Please try again.'
      : (e?.message ?? 'Roadmap generation failed');
    return res.status(500).json({ error: 'Roadmap generation failed', details });
  }
}
