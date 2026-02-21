import { GoogleGenAI, Type } from '@google/genai';
import type {
  ExtractionData,
  AuditResponse,
  AuditFinding,
  ScoreSnapshot,
  ReadinessScore,
  AuditDelta,
  ExecutiveReport,
  TechnicalHandoverArtifacts,
  DeploymentChecklist,
  PrescriptionExecutionCard,
  QueryPackResponse,
  FixLibraryResponse,
  ClientTranslationResponse,
  DeepSynthesis
} from '../../types';

const HEURISTIC_VERSION = '5.1';
const GEMINI_MODEL = 'gemini-2.0-flash';

function getGeminiClient(apiKey?: string) {
  const key = apiKey ?? (typeof process !== 'undefined' && process.env?.GEMINI_API_KEY);
  if (!key) throw new Error('GEMINI_API_KEY is required for AI enrichment');
  return new GoogleGenAI({ apiKey: key });
}

/** Deterministic string hash for inputSignalHash (same content => same hash) */
function simpleHash(str: string): string {
  let h = 0;
  const s = str.slice(0, 50000);
  for (let i = 0; i < s.length; i++) {
    const c = s.charCodeAt(i);
    h = (h << 5) - h + c;
    h |= 0;
  }
  return Math.abs(h).toString(16) + '-' + s.length;
}

const HIGH_VALUE_SCHEMA_TYPES = ['Organization', 'LocalBusiness', 'FAQPage', 'Article', 'Product', 'Service'];

/** Rule-based scores from extraction only (deterministic) */
function scoreFromExtraction(data: ExtractionData): {
  scores: ScoreSnapshot;
  readinessScore: ReadinessScore;
  tier1Verdict: string;
  verdictMeaning: string;
} {
  const hasTitle = (data.title || '').trim().length >= 3;
  const hasMeta = (data.metaDescription || '').trim().length >= 20;
  const hasSchema = (data.schemaCount || 0) > 0;
  const wordCount = data.wordCount || 0;
  const headingCount = (data.headings || []).length;
  const schemaCount = data.schemaCount || 0;
  const mainLen = (data.mainContent || '').length;
  const propositionalDensity = data.propositionalDensity ?? 50;
  const citationAnchorCount = (data.citationAnchors ?? []).length;
  const schemaTypes = data.schemaTypes ?? [];
  const sameAsCount = (data.sameAsUrls ?? []).length;
  const hasOpenGraph = !!(data.openGraph?.title || data.openGraph?.description);
  const hasCanonical = !!(data.canonicalUrl && data.canonicalUrl.length > 5);
  const hasBreadcrumb = data.hasBreadcrumbList === true;
  const isCrawlable = data.isCrawlable !== false;
  const freshnessMonths = data.freshnessMonths ?? null;
  const contentFormats = data.contentFormats ?? [];
  const hasAICitationFormat = contentFormats.some(f => ['how-to', 'list', 'q-and-a', 'tutorial'].includes(f));
  const firstPersonBonus = Math.min(5, Math.floor((data.firstPersonScore ?? 0) / 20));

  const highValueSchemaBonus = schemaTypes.filter((t) =>
    HIGH_VALUE_SCHEMA_TYPES.some((h) => (typeof t === 'string' ? t : '').includes(h))
  ).length * 5;

  const recencyBonus = (freshnessMonths !== null && freshnessMonths < 6) ? 10 : (freshnessMonths !== null && freshnessMonths < 12) ? 5 : 0;
  const sameAsBonus = Math.min(15, sameAsCount * 5);
  const crawlPenalty = isCrawlable ? 0 : 30;

  // Entity clarity: title + meta + schema + OG + canonical (0-100)
  const entityClarityRaw = (hasTitle ? 25 : 0) + (hasMeta ? 25 : 0) + (hasSchema ? 30 : 0) + Math.min(20, schemaCount * 5) + Math.min(10, highValueSchemaBonus)
    + (hasOpenGraph ? 5 : 0) + (hasCanonical ? 3 : 0);
  const entityClarity = Math.min(100, Math.max(0, entityClarityRaw - crawlPenalty));

  // Structural signals: headings + schema + breadcrumb
  const structuralSignals = Math.min(100, Math.max(0, headingCount * 4 + schemaCount * 15 + Math.min(10, highValueSchemaBonus) + (hasBreadcrumb ? 5 : 0) - (crawlPenalty / 2)));

  // Compressibility: word count, content length, propositional density, AI citation formats
  const compressibilityBase = Math.floor((wordCount / 30) + (mainLen > 500 ? 20 : mainLen > 200 ? 10 : 0));
  const compressibility = Math.min(100, Math.round(compressibilityBase * 0.7 + (propositionalDensity / 100) * 30) + (hasAICitationFormat ? 5 : 0) + firstPersonBonus);

  // Corroboration: schema, coverage, citation anchors, sameAs, recency
  const corroborationBase = (data.extractionCoverage || 50) + (hasSchema ? 20 : 0);
  const citationBonus = Math.min(15, citationAnchorCount * 5);
  const corroboration = Math.min(100, Math.max(0, corroborationBase + citationBonus + sameAsBonus + recencyBonus - crawlPenalty));

  // Map to the three metrics (align with ScoreSnapshot)
  const aiVisibility = Math.round((entityClarity * 0.5 + structuralSignals * 0.5));
  const citationLikelihood = Math.round((corroboration * 0.6 + entityClarity * 0.4));
  const answerEngineReadiness = Math.round((compressibility * 0.4 + structuralSignals * 0.3 + entityClarity * 0.3));

  const scores: ScoreSnapshot = {
    aiVisibility: Math.min(100, aiVisibility),
    citationLikelihood: Math.min(100, citationLikelihood),
    answerEngineReadiness: Math.min(100, answerEngineReadiness),
    confidenceInterval: 5,
    overallMaturityIndex: Math.round((aiVisibility + citationLikelihood + answerEngineReadiness) / 3)
  };

  const readinessScore: ReadinessScore = {
    internal_ai_readiness_score: scores.overallMaturityIndex ?? Math.round((aiVisibility + citationLikelihood + answerEngineReadiness) / 3),
    breakdown: {
      entity_clarity: { score: entityClarity, explanation: hasTitle && hasMeta ? 'Entity and description present.' : 'Add title and meta description for clarity.' },
      structural_signals: { score: structuralSignals, explanation: schemaCount > 0 ? 'Structured data detected.' : 'Add Schema.org markup.' },
      compressibility: { score: compressibility, explanation: wordCount > 100 ? 'Content length supports extraction.' : 'Increase substantive content.' },
      corroboration: { score: corroboration, explanation: hasSchema ? 'Signals can be corroborated.' : 'Add structured data for verification.' }
    }
  };

  const overall = scores.overallMaturityIndex ?? 0;
  const tier1Verdict = overall >= 60 ? 'AI-READY' : overall >= 40 ? 'DEVELOPING' : 'LOW VISIBILITY';
  const verdictMeaning = overall >= 60
    ? 'Signals are sufficient for AI discovery and citation.'
    : overall >= 40
      ? 'Partial readiness; structural improvements recommended.'
      : 'Significant gaps; treatment plan will target primary disorder.';

  return { scores, readinessScore, tier1Verdict, verdictMeaning };
}

export async function performQuickAudit(
  url: string,
  name: string,
  extractionData: ExtractionData
): Promise<AuditResponse> {
  const payload = (extractionData.title || '') + '|' +
    (extractionData.metaDescription || '') + '|' +
    (extractionData.mainContent || '').slice(0, 15000) + '|' +
    (extractionData.schemaMarkup || '') + '|' +
    (extractionData.headings || []).join('|');
  const inputSignalHash = simpleHash(payload);

  const { scores, readinessScore, tier1Verdict, verdictMeaning } = scoreFromExtraction(extractionData);

  const summary = {
    url,
    scores,
    aiVisibilityLabel: scores.aiVisibility >= 60 ? 'Strong' : scores.aiVisibility >= 40 ? 'Moderate' : 'Weak',
    confidenceNote: 'Deterministic baseline from extraction.',
    timestamp: Date.now(),
    heuristicVersion: HEURISTIC_VERSION,
    inputSignalHash,
    mode: 'OBSERVED' as const,
    subjectName: name || new URL(url).hostname.replace(/^www\./, ''),
    tier1Verdict,
    verdictMeaning,
    readinessScore
  };

  return {
    summary,
    keyFindings: [],
    whyThisMattersForAI: ['AI systems rely on clear entity and structural signals.'],
    clientReadyExplanation: verdictMeaning,
    howToImprove: ['Implement the prescribed treatment tranche.'],
    epistemicGrounding: { verifiedFacts: [], potentialHallucinationRisks: [] }
  };
}

/** Minimal audit shape for delta (before/after) */
export interface MinimalAuditLike {
  summary: {
    scores: ScoreSnapshot;
    readinessScore?: ReadinessScore;
  };
}

export function generateAuditDelta(
  baselineAudit: MinimalAuditLike,
  newAudit: MinimalAuditLike
): AuditDelta {
  const before = baselineAudit.summary.scores;
  const after = newAudit.summary.scores;

  const aiVisBefore = before.aiVisibility;
  const aiVisAfter = after.aiVisibility;
  const citBefore = before.citationLikelihood;
  const citAfter = after.citationLikelihood;

  const dir = (b: number, a: number) =>
    a > b ? 'increase' : a < b ? 'decrease' : 'unchanged';

  const observed_changes: string[] = [];
  if (aiVisAfter !== aiVisBefore) observed_changes.push(`AI Visibility: ${aiVisBefore} → ${aiVisAfter}`);
  if (citAfter !== citBefore) observed_changes.push(`Citation Likelihood: ${citBefore} → ${citAfter}`);

  const unchanged_elements: string[] = [];
  if (aiVisAfter === aiVisBefore) unchanged_elements.push('AI Visibility');
  if (citAfter === citBefore) unchanged_elements.push('Citation Likelihood');

  return {
    delta_summary: {
      ai_visibility: {
        before: aiVisBefore,
        after: aiVisAfter,
        direction: dir(aiVisBefore, aiVisAfter)
      },
      citation_likelihood: {
        before: citBefore,
        after: citAfter,
        direction: dir(citBefore, citAfter)
      }
    },
    observed_changes,
    unchanged_elements,
    next_verification_guidance: ['Re-run audit after further changes to confirm trend.'],
    confidence_note: 'Delta computed from deterministic score comparison.'
  };
}

export function generateExecutiveBrief(
  subjectName: string,
  delta: AuditDelta
): ExecutiveReport {
  const a = delta.delta_summary?.ai_visibility;
  const c = delta.delta_summary?.citation_likelihood;
  const lines: string[] = [
    `Re-audit summary for ${subjectName}.`,
    a ? `AI Visibility: ${a.before} → ${a.after} (${a.direction}).` : '',
    c ? `Citation Likelihood: ${c.before} → ${c.after} (${c.direction}).` : '',
    delta.observed_changes?.length ? `Observed changes: ${delta.observed_changes.join('; ')}.` : ''
  ].filter(Boolean);
  return { executive_summary: lines.join(' ') };
}

const DEEP_DIAGNOSTIC_SYSTEM = `You are an AI SEO audit specialist. Analyze webpage content and detect failure classes that harm AI visibility and citation likelihood.

FAILURE CLASSES TO DETECT:
- CATEGORY_AMBIGUITY: Entity role unclear; multiple or conflicting categories
- EXPLAINABILITY_FAILURE: Implied claims without explicit factual anchoring
- DEFENSIVE_LANGUAGE_ABSENCE: Unqualified superlatives or absolute promises; no hedging
- CONSTRAINT_OMISSION: Missing price, time, eligibility, or usage boundaries
- EXCLUSION_BOUNDARY_MISSING: Universal suitability claims; no clarity on who should NOT use
- ADJECTIVE_COMPRESSION_FAILURE: Subjective marketing language instead of measurable facts

Return ONLY valid findings. Use confidence 0-100. diagnosticTrace must cite specific content.`;

export async function performDeepDiagnostic(
  url: string,
  name: string,
  extractionData: ExtractionData,
  apiKey?: string
): Promise<AuditFinding[]> {
  try {
    const ai = getGeminiClient(apiKey);
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

Detect up to 6 failure class instances. Return empty array if no significant issues.`;

    const response = await ai.models.generateContent({
      model: GEMINI_MODEL,
      contents: prompt,
      config: {
        systemInstruction: DEEP_DIAGNOSTIC_SYSTEM,
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          required: ['findings'],
          properties: {
            findings: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                required: ['label', 'confidence', 'diagnosticTrace', 'failureClass'],
                properties: {
                  label: { type: Type.STRING },
                  confidence: { type: Type.NUMBER },
                  diagnosticTrace: { type: Type.STRING },
                  failureClass: { type: Type.STRING }
                }
              }
            }
          }
        }
      }
    });

    const text = (response as { text?: string }).text ?? '';
    const parsed = JSON.parse(text || '{"findings":[]}');
    return Array.isArray(parsed.findings) ? parsed.findings : [];
  } catch (err) {
    console.error('performDeepDiagnostic error:', err);
    return [];
  }
}

export async function generateHandoverArtifacts(
  _card: PrescriptionExecutionCard,
  _subjectName: string
): Promise<TechnicalHandoverArtifacts> {
  return {
    structural_blueprint: {
      target_architecture: 'Schema-aligned content',
      entity_declaration_anchors: [],
      required_schema_modifications: []
    },
    alignment_matrix: { observed_signal: '', prescribed_signal: '' },
    verification_protocol: {}
  };
}

export async function generateDeploymentChecklist(
  _card: PrescriptionExecutionCard,
  _subjectName: string
): Promise<DeploymentChecklist> {
  return {
    deployment_checklist: [],
    deployment_notes_guidance: []
  };
}

export async function generateQueryPack(
  url: string,
  name: string,
  extractionData: ExtractionData,
  apiKey?: string
): Promise<QueryPackResponse | null> {
  try {
    const ai = getGeminiClient(apiKey);
    const content = (extractionData.mainContent || '').slice(0, 6000);
    const prompt = `Based on this webpage, generate 5-10 likely AI user queries this page could answer.

URL: ${url}
Subject: ${name || new URL(url).hostname}
Title: ${extractionData.title || ''}
Meta: ${(extractionData.metaDescription || '').slice(0, 200)}

Content excerpt:
${content || '(empty)'}

Return natural-language questions users might ask AI assistants (e.g. "What is X?", "How does Y work?").`;

    const response = await ai.models.generateContent({
      model: GEMINI_MODEL,
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          required: ['queries'],
          properties: {
            queries: {
              type: Type.ARRAY,
              items: { type: Type.STRING }
            }
          }
        }
      }
    });

    const text = (response as { text?: string }).text ?? '';
    const parsed = JSON.parse(text || '{"queries":[]}');
    return { queries: Array.isArray(parsed.queries) ? parsed.queries : [] };
  } catch (err) {
    console.error('generateQueryPack error:', err);
    return null;
  }
}

export async function generateFixLibrary(
  findings: AuditFinding[],
  apiKey?: string
): Promise<FixLibraryResponse | null> {
  if (!findings?.length) return { fixes: [] };
  try {
    const ai = getGeminiClient(apiKey);
    const prompt = `For each audit finding below, provide a specific actionable fix.

Findings:
${findings.map((f, i) => `${i + 1}. [${f.failureClass}] ${f.label}\n   Trace: ${f.diagnosticTrace}`).join('\n\n')}

Return fixes in priority order. Each fix must be concrete and implementable.`;

    const response = await ai.models.generateContent({
      model: GEMINI_MODEL,
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          required: ['fixes'],
          properties: {
            fixes: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                required: ['findingLabel', 'fix', 'priority'],
                properties: {
                  findingLabel: { type: Type.STRING },
                  fix: { type: Type.STRING },
                  priority: { type: Type.NUMBER }
                }
              }
            }
          }
        }
      }
    });

    const text = (response as { text?: string }).text ?? '';
    const parsed = JSON.parse(text || '{"fixes":[]}');
    return { fixes: Array.isArray(parsed.fixes) ? parsed.fixes : [] };
  } catch (err) {
    console.error('generateFixLibrary error:', err);
    return null;
  }
}

export async function generateClientTranslation(
  audit: AuditResponse,
  apiKey?: string
): Promise<ClientTranslationResponse | null> {
  try {
    const ai = getGeminiClient(apiKey);
    const scores = audit.summary?.scores;
    const verdict = audit.summary?.tier1Verdict ?? audit.summary?.aiVisibilityLabel ?? 'Unknown';
    const prompt = `Translate this AI SEO audit into a plain-language executive summary for a non-technical client.

Verdict: ${verdict}
Scores: AI Visibility ${scores?.aiVisibility ?? 'N/A'}, Citation Likelihood ${scores?.citationLikelihood ?? 'N/A'}, Answer Engine Readiness ${scores?.answerEngineReadiness ?? 'N/A'}
Client explanation: ${audit.clientReadyExplanation || ''}
How to improve: ${(audit.howToImprove || []).join('; ')}

Write 2-3 sentences for summary, 3-5 bullet takeaways, and 2-4 next steps.`;

    const response = await ai.models.generateContent({
      model: GEMINI_MODEL,
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          required: ['summary', 'keyTakeaways', 'nextSteps'],
          properties: {
            summary: { type: Type.STRING },
            keyTakeaways: {
              type: Type.ARRAY,
              items: { type: Type.STRING }
            },
            nextSteps: {
              type: Type.ARRAY,
              items: { type: Type.STRING }
            }
          }
        }
      }
    });

    const text = (response as { text?: string }).text ?? '';
    const parsed = JSON.parse(text || '{}');
    return {
      summary: parsed.summary ?? audit.clientReadyExplanation ?? '',
      keyTakeaways: Array.isArray(parsed.keyTakeaways) ? parsed.keyTakeaways : [],
      nextSteps: Array.isArray(parsed.nextSteps) ? parsed.nextSteps : []
    };
  } catch (err) {
    console.error('generateClientTranslation error:', err);
    return null;
  }
}

export async function generateDeepSynthesis(): Promise<DeepSynthesis | null> {
  return null;
}

export async function runGeminiAudit({
  url,
  apiKey,
}: {
  url: string;
  apiKey: string;
}) {
  // Stub: full implementation would use Gemini with apiKey
  return null;
}
