import type { VercelRequest, VercelResponse } from '@vercel/node';
import type { RoadmapPayload, RoadmapResponse, RoadmapPhase, RoadmapAction } from '../../types.js';

console.log('🔥 ROADMAP HANDLER EXECUTED');

function buildPrompt(payload: RoadmapPayload): string {
  return `You are an AI Visibility Strategy Engine.

Generate a structured 90-day AI Visibility Execution Roadmap.

IMPORTANT CONSTRAINTS:

Maximum 3 actions per phase.

Each field must be under 180 characters.

Keep explanations concise and operational.

No narrative text.

Return strictly valid JSON only.

No markdown.

No comments.

No truncation.

If unsure, simplify rather than expand.

Audit Data:
Overall Score: ${payload.overallScore}
Signal Coverage: ${payload.signalCoverageScore}
Citation Health: ${payload.citationHealthScore}
Content Depth: ${payload.contentDepthScore}
Authority Signals: ${payload.authoritySignalsScore}
Weak Signals: ${payload.identifiedWeakSignals.slice(0, 5).join(', ')}
Schema Types: ${payload.schemaTypes.slice(0, 5).join(', ') || 'none'}
Domain: ${payload.domain}
Top Opportunities: ${payload.topOpportunities.slice(0, 5).join('; ') || 'none'}

Structure Required:

{
"scoreProjection": {
"current": number,
"projected90Day": number,
"confidence": "Low" | "Medium" | "High"
},
"phase1": {
"objective": string,
"actions": [
{
"title": string,
"why": string,
"expectedImpact": string,
"difficulty": "Low" | "Medium" | "High"
}
]
},
"phase2": { ... },
"phase3": { ... }
}

Rules:

Focus only on AI answer engine visibility.

No generic SEO.

Phase 1 = Entity Control.

Phase 2 = Citation Surface Expansion.

Phase 3 = Intent Query Domination.

Score projection must be realistic.

Return exactly one valid JSON object.`;
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

function normalizeAction(raw: unknown): RoadmapAction {
  const a = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};
  const get = (keys: string[]) => {
    for (const k of keys) {
      const v = a[k];
      if (typeof v === 'string') return v;
    }
    return '';
  };
  const diff = get(['difficulty', 'Difficulty']).toLowerCase();
  const difficulty = ['low', 'medium', 'high'].includes(diff)
    ? (diff.charAt(0).toUpperCase() + diff.slice(1)) as 'Low' | 'Medium' | 'High'
    : 'Medium';
  return {
    title: get(['title', 'Title']) || 'Untitled action',
    why: get(['why', 'Why', 'rationale', 'Rationale']),
    expectedImpact: get(['expectedImpact', 'ExpectedImpact', 'expected_impact', 'Expected Impact']),
    difficulty,
  };
}

function getPhase(raw: unknown): RoadmapPhase {
  const p = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};
  const rawActions = Array.isArray(p.actions)
    ? p.actions
    : Array.isArray(p.tasks)
      ? p.tasks
      : Array.isArray(p.steps)
        ? p.steps
        : Array.isArray(p.items)
          ? p.items
          : Array.isArray(p.recommendations)
            ? p.recommendations
            : Array.isArray(p.actionItems)
              ? p.actionItems
              : Array.isArray(p.initiatives)
                ? p.initiatives
                : [];
  return {
    objective: typeof p.objective === 'string' ? p.objective : '',
    actions: rawActions.map((a: unknown) => normalizeAction(a)),
  };
}

/** Normalize LLM response to expected shape; coerce alternate keys (Phase1, phase_1) to phase1 etc. */
function normalizeRoadmapResponse(parsed: unknown): RoadmapResponse {
  const obj = parsed && typeof parsed === 'object' ? (parsed as Record<string, unknown>) : {};
  const phase1 = obj.phase1 ?? obj.Phase1 ?? obj.phase_1;
  const phase2 = obj.phase2 ?? obj.Phase2 ?? obj.phase_2;
  const phase3 = obj.phase3 ?? obj.Phase3 ?? obj.phase_3;
  const scoreProjectionRaw = obj.scoreProjection ?? obj.ScoreProjection ?? obj.score_projection;
  const sp = scoreProjectionRaw && typeof scoreProjectionRaw === 'object' ? (scoreProjectionRaw as Record<string, unknown>) : {};
  const currentNum = sp.current ?? sp.currentScore ?? sp.current_score ?? sp.currentVisibility;
  const projectedNum = sp.projected90Day ?? sp.projectedScore ?? sp.projected_90_day;
  return {
    phase1: getPhase(phase1),
    phase2: getPhase(phase2),
    phase3: getPhase(phase3),
    scoreProjection: {
      current: typeof currentNum === 'number' ? currentNum : 0,
      projected90Day: typeof projectedNum === 'number' ? projectedNum : 0,
      confidence: (typeof sp.confidence === 'string' && ['Low', 'Medium', 'High'].includes(sp.confidence) ? sp.confidence : 'Medium') as 'Low' | 'Medium' | 'High',
    },
  };
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
  res.setHeader('Cache-Control', 'no-store');

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

    roadmap = normalizeRoadmapResponse(roadmap);
    if (roadmap.scoreProjection.current === 0 && typeof payload.overallScore === 'number') {
      roadmap.scoreProjection.current = payload.overallScore;
    }
    const body = roadmap;
    console.log('[roadmap] response status 200, body keys:', Object.keys(body));
    console.log('🔥 RETURNING BODY:', body);
    return res.status(200).json(body);
  } catch (err: unknown) {
    const e = err as Error;
    console.error('[roadmap] LLM error:', e?.message);

    if (anthropicKey && openaiKey) {
      try {
        let fallbackRoadmap = await callOpenAI(prompt, openaiKey);
        fallbackRoadmap = normalizeRoadmapResponse(fallbackRoadmap);
        if (fallbackRoadmap.scoreProjection.current === 0 && typeof payload.overallScore === 'number') {
          fallbackRoadmap.scoreProjection.current = payload.overallScore;
        }
        console.log('[roadmap] response status 200 (fallback), body keys:', Object.keys(fallbackRoadmap));
        console.log('🔥 RETURNING BODY:', fallbackRoadmap);
        return res.status(200).json(fallbackRoadmap);
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
