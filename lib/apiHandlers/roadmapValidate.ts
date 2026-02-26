import type { VercelRequest, VercelResponse } from '@vercel/node';

interface AuditScores {
  overallScore: number;
  signalCoverageScore: number;
  citationHealthScore: number;
  contentDepthScore: number;
  authoritySignalsScore: number;
}

interface ValidationResult {
  validationScore: number;
  confidenceAdjustment: 'Low' | 'Medium' | 'High';
  issues: string[];
  recommendations: string[];
  scoreProjectionAssessment: 'Realistic' | 'Aggressive' | 'Unrealistic';
}

function buildValidationPrompt(roadmap: unknown, auditScores: AuditScores): string {
  return `You are an AI Visibility Validation Engine.

You are reviewing a structured 90-day AI Visibility roadmap.

Your job is to:

Check internal logical consistency.

Check that phases are sequenced correctly.

Check that actions align with stated objectives.

Evaluate whether projected score improvement is realistic based on audit scores.

Identify overlapping or redundant actions.

Flag missing critical structural elements.

IMPORTANT:

Be concise.

No narrative text.

No marketing language.

Return strictly valid JSON.

Keep output under 1,200 tokens.

Return format:

{
"validationScore": number (0–100),
"confidenceAdjustment": "Low" | "Medium" | "High",
"issues": [ string ],
"recommendations": [ string ],
"scoreProjectionAssessment": "Realistic" | "Aggressive" | "Unrealistic"
}

Here is the roadmap JSON:
${JSON.stringify(roadmap)}

Here are the audit scores:
${JSON.stringify(auditScores)}

Return one valid JSON object only.`;
}

function parseValidationJson(raw: string): ValidationResult {
  const stripped = raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
  const first = stripped.indexOf('{');
  const last = stripped.lastIndexOf('}');
  if (first === -1 || last === -1 || last <= first) {
    throw new SyntaxError('LLM returned malformed JSON');
  }
  const jsonStr = stripped.slice(first, last + 1);
  return JSON.parse(jsonStr) as ValidationResult;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Cache-Control', 'no-store');

  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  let body: unknown;
  try {
    body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
  } catch {
    return res.status(400).json({ success: false, error: 'Invalid JSON body' });
  }

  const obj = body && typeof body === 'object' ? (body as Record<string, unknown>) : {};
  const roadmap = obj.roadmap;
  const auditScores = obj.auditScores;

  if (!roadmap || typeof roadmap !== 'object') {
    return res.status(400).json({ success: false, error: 'roadmap is required' });
  }

  const roadmapObj = roadmap as Record<string, unknown>;
  if (!roadmapObj.scoreProjection || !roadmapObj.phase1 || !roadmapObj.phase2 || !roadmapObj.phase3) {
    return res.status(400).json({
      success: false,
      error: 'roadmap must include scoreProjection, phase1, phase2, phase3',
    });
  }

  if (!auditScores || typeof auditScores !== 'object') {
    return res.status(400).json({ success: false, error: 'auditScores is required' });
  }

  const scores = auditScores as Record<string, unknown>;
  const required = ['overallScore', 'signalCoverageScore', 'citationHealthScore', 'contentDepthScore', 'authoritySignalsScore'];
  for (const k of required) {
    if (typeof scores[k] !== 'number') {
      return res.status(400).json({ success: false, error: `auditScores.${k} must be a number` });
    }
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ success: false, error: 'ANTHROPIC_API_KEY not configured' });
  }

  const auditScoresTyped: AuditScores = {
    overallScore: scores.overallScore as number,
    signalCoverageScore: scores.signalCoverageScore as number,
    citationHealthScore: scores.citationHealthScore as number,
    contentDepthScore: scores.contentDepthScore as number,
    authoritySignalsScore: scores.authoritySignalsScore as number,
  };

  try {
    const Anthropic = (await import('@anthropic-ai/sdk')).default;
    const client = new Anthropic({ apiKey });

    const prompt = buildValidationPrompt(roadmap, auditScoresTyped);

    const response = await client.messages.create({
      model: 'claude-sonnet-4-5',
      max_tokens: 1800,
      temperature: 0.25,
      messages: [{ role: 'user', content: prompt }],
    });

    const textBlock = response.content.find((b: { type: string }) => b.type === 'text') as { type: 'text'; text: string } | undefined;
    const raw = textBlock?.text ?? '';

    let parsed: ValidationResult;
    try {
      parsed = parseValidationJson(raw);
    } catch (e) {
      console.error('[roadmap-validate] LLM returned malformed JSON, raw output:', raw);
      parsed = {
        validationScore: 0,
        confidenceAdjustment: 'Low',
        issues: ['LLM returned malformed JSON'],
        recommendations: [],
        scoreProjectionAssessment: 'Unrealistic',
      };
    }

    console.log('[roadmap-validate] validationScore:', parsed.validationScore);

    return res.status(200).json({
      success: true,
      validation: parsed,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Validation failed';
    console.error('[roadmap-validate] LLM error:', message);
    return res.status(500).json({ success: false, error: message });
  }
}
