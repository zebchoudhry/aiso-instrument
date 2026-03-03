/**
 * Claude-based implementations used as fallback when Gemini API quota is exceeded.
 * Uses ANTHROPIC_API_KEY from environment.
 */
import Anthropic from '@anthropic-ai/sdk';
import type {
  ExtractionData,
  AuditResponse,
  AuditFinding,
  QueryPackResponse,
  FixLibraryResponse,
  ClientTranslationResponse,
  FactualAnchoringAsset,
} from '../types.js';

const CLAUDE_MODEL = 'claude-sonnet-4-20250514';

function getClaudeClient(): Anthropic {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) throw new Error('ANTHROPIC_API_KEY is required for Claude fallback');
  return new Anthropic({ apiKey: key });
}

function isGeminiQuotaError(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err);
  const str = msg.toLowerCase();
  return (
    str.includes('429') ||
    str.includes('quota') ||
    str.includes('resource_exhausted') ||
    str.includes('exceeded your current quota')
  );
}

/** Extract JSON from Claude response (may be wrapped in markdown) */
function parseJsonResponse<T>(raw: string, defaultValue: T): T {
  const stripped = raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
  const first = stripped.indexOf('{');
  const last = stripped.lastIndexOf('}');
  const arrFirst = stripped.indexOf('[');
  const arrLast = stripped.lastIndexOf(']');
  let jsonStr: string;
  if (first >= 0 && last > first) {
    jsonStr = stripped.slice(first, last + 1);
  } else if (arrFirst >= 0 && arrLast > arrFirst) {
    jsonStr = stripped.slice(arrFirst, arrLast + 1);
  } else {
    try {
      return JSON.parse(stripped) as T;
    } catch {
      return defaultValue;
    }
  }
  try {
    return JSON.parse(jsonStr) as T;
  } catch {
    return defaultValue;
  }
}

const DEEP_DIAGNOSTIC_SYSTEM = `You are an AI SEO audit specialist. Analyze webpage content and detect failure classes that harm AI visibility and citation likelihood.

FAILURE CLASSES TO DETECT:
- CATEGORY_AMBIGUITY: Entity role unclear; multiple or conflicting categories
- EXPLAINABILITY_FAILURE: Implied claims without explicit factual anchoring
- DEFENSIVE_LANGUAGE_ABSENCE: Unqualified superlatives or absolute promises; no hedging
- CONSTRAINT_OMISSION: Missing price, time, eligibility, or usage boundaries
- EXCLUSION_BOUNDARY_MISSING: Universal suitability claims; no clarity on who should NOT use
- ADJECTIVE_COMPRESSION_FAILURE: Subjective marketing language instead of measurable facts

Return ONLY valid JSON with a "findings" array. Each finding: { "label": string, "confidence": number, "diagnosticTrace": string, "failureClass": string }`;

export async function performDeepDiagnosticClaude(
  url: string,
  name: string,
  extractionData: ExtractionData
): Promise<AuditFinding[]> {
  const client = getClaudeClient();
  const content = (extractionData.mainContent || '').slice(0, 8000);
  const prompt = `Analyze this webpage for AI readiness failures.

URL: ${url}
Subject: ${name || new URL(url).hostname}

TITLE: ${extractionData.title || '(missing)'}
META DESCRIPTION: ${(extractionData.metaDescription || '').slice(0, 300)}
HEADINGS: ${(extractionData.headings || []).join(' | ') || '(none)'}
SCHEMA TYPES: ${(extractionData.schemaTypes || []).join(', ') || '(none)'}

MAIN CONTENT (excerpt):
${content || '(empty)'}

Return JSON: { "findings": [ { "label", "confidence", "diagnosticTrace", "failureClass" }, ... ] }`;

  const message = await client.messages.create({
    model: CLAUDE_MODEL,
    max_tokens: 4096,
    system: DEEP_DIAGNOSTIC_SYSTEM,
    messages: [{ role: 'user', content: prompt }],
  });

  const textBlock = message.content.find((b: { type: string }) => b.type === 'text') as { text: string } | undefined;
  const text = textBlock?.text ?? '';
  const parsed = parseJsonResponse<{ findings?: AuditFinding[] }>(text, { findings: [] });
  return Array.isArray(parsed.findings) ? parsed.findings : [];
}

export async function generateQueryPackClaude(
  url: string,
  name: string,
  extractionData: ExtractionData
): Promise<QueryPackResponse> {
  const client = getClaudeClient();
  const content = (extractionData.mainContent || '').slice(0, 6000);
  const prompt = `Based on this webpage, generate 5-10 likely AI user queries this page could answer.

URL: ${url}
Subject: ${name || new URL(url).hostname}
Title: ${extractionData.title || ''}
Meta: ${(extractionData.metaDescription || '').slice(0, 200)}

Content excerpt:
${content || '(empty)'}

Return JSON: { "queries": ["query1", "query2", ...] }`;

  const message = await client.messages.create({
    model: CLAUDE_MODEL,
    max_tokens: 2048,
    messages: [{ role: 'user', content: prompt }],
  });

  const textBlock = message.content.find((b: { type: string }) => b.type === 'text') as { text: string } | undefined;
  const text = textBlock?.text ?? '';
  const parsed = parseJsonResponse<{ queries?: string[] }>(text, { queries: [] });
  return { queries: Array.isArray(parsed.queries) ? parsed.queries : [] };
}

export async function generateFixLibraryClaude(findings: AuditFinding[]): Promise<FixLibraryResponse> {
  if (!findings?.length) return { fixes: [] };
  const client = getClaudeClient();
  const prompt = `For each audit finding below, provide a specific actionable fix.

Findings:
${findings.map((f, i) => `${i + 1}. [${f.failureClass}] ${f.label}\n   Trace: ${f.diagnosticTrace}`).join('\n\n')}

Return JSON: { "fixes": [ { "findingLabel": string, "fix": string, "priority": number }, ... ] }`;

  const message = await client.messages.create({
    model: CLAUDE_MODEL,
    max_tokens: 2048,
    messages: [{ role: 'user', content: prompt }],
  });

  const textBlock = message.content.find((b: { type: string }) => b.type === 'text') as { text: string } | undefined;
  const text = textBlock?.text ?? '';
  const parsed = parseJsonResponse<{ fixes?: unknown[] }>(text, { fixes: [] });
  return { fixes: Array.isArray(parsed.fixes) ? parsed.fixes : [] };
}

export async function generateClientTranslationClaude(audit: AuditResponse): Promise<ClientTranslationResponse> {
  const client = getClaudeClient();
  const scores = audit.summary?.scores;
  const verdict = audit.summary?.tier1Verdict ?? audit.summary?.aiVisibilityLabel ?? 'Unknown';
  const prompt = `Translate this AI SEO audit into a plain-language executive summary for a non-technical client.

Verdict: ${verdict}
Scores: AI Visibility ${scores?.aiVisibility ?? 'N/A'}, Citation Likelihood ${scores?.citationLikelihood ?? 'N/A'}, Answer Engine Readiness ${scores?.answerEngineReadiness ?? 'N/A'}
Client explanation: ${audit.clientReadyExplanation || ''}
How to improve: ${(audit.howToImprove || []).join('; ')}

Return JSON: { "summary": string, "keyTakeaways": string[], "nextSteps": string[] }`;

  const message = await client.messages.create({
    model: CLAUDE_MODEL,
    max_tokens: 1024,
    messages: [{ role: 'user', content: prompt }],
  });

  const textBlock = message.content.find((b: { type: string }) => b.type === 'text') as { text: string } | undefined;
  const text = textBlock?.text ?? '';
  const parsed = parseJsonResponse<{ summary?: string; keyTakeaways?: string[]; nextSteps?: string[] }>(text, {});
  return {
    summary: parsed.summary ?? audit.clientReadyExplanation ?? '',
    keyTakeaways: Array.isArray(parsed.keyTakeaways) ? parsed.keyTakeaways : [],
    nextSteps: Array.isArray(parsed.nextSteps) ? parsed.nextSteps : [],
  };
}

const FACTUAL_ANCHORS_SYSTEM = `You are an AI Remediation Asset Generator operating in CLINICAL MODE.

Your task is to generate deployable remediation assets for the treatment: "Explicit Factual Anchoring".

STRICT RULES:
1. MANDATORY SOURCE: Use the provided AUDIT FINDINGS as the absolute source of truth for facts (e.g., locations, sub-brands, services).
2. NO HALLUCINATION: Do NOT guess locations. If findings mention "Liverpool", you MUST use "Liverpool".
3. NO MARKETING: Do NOT write marketing copy or persuasive language.
4. NO SUPERLATIVES: Do NOT claim superiority, rankings, or popularity.
5. NEUTRAL TONE: Output MUST be neutral, explanatory, and verifiable.

Return valid JSON only.`;

export async function generateFactualAnchorsClaude(
  brandData: { name: string; domain: string; category: string; location: string },
  findings: string[] = []
): Promise<FactualAnchoringAsset> {
  const client = getClaudeClient();
  const prompt = `
INPUT CONTEXT:
{
  "brand_meta": ${JSON.stringify(brandData)},
  "verified_audit_findings": ${JSON.stringify(findings)},
  "treatment_objective": "Convert implied local authority into explicit factual anchors for answer engine ingestion."
}

Return JSON with: factual_anchors (array of { anchor_type: "entity_definition"|"operational_fact"|"contextual_explainer", content: string }), deployment_targets (array of { page_type, placement_guidance }), verification_criteria (array of strings).`;

  const message = await client.messages.create({
    model: CLAUDE_MODEL,
    max_tokens: 4096,
    system: FACTUAL_ANCHORS_SYSTEM,
    messages: [{ role: 'user', content: prompt }],
  });

  const textBlock = message.content.find((b: { type: string }) => b.type === 'text') as { text: string } | undefined;
  const text = textBlock?.text ?? '';
  const parsed = parseJsonResponse<FactualAnchoringAsset>(text, {
    factual_anchors: [],
    deployment_targets: [],
    verification_criteria: [],
  });
  return parsed;
}

export { isGeminiQuotaError };
