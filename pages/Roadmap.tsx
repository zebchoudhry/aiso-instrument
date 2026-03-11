import React, { useEffect, useState } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import type { DiagnosisResult, RoadmapResponse, RoadmapAction, RoadmapPayload, AuditResponse, ExtractionData, FixLibraryResponse } from '../types';
import { buildRoadmapPayload } from '../lib/roadmapPayload';
import { SchemaGenerator } from '../services/schemaGenerator';
import InvisibilityDiagnosisPanel from '../components/InvisibilityDiagnosisPanel';

interface LocationState {
  auditResult?: AuditResponse;
  extractionData?: ExtractionData;
  queryPackQueries?: string[];
  url?: string;
  name?: string;
  fixLibrary?: FixLibraryResponse | null;
  findings?: Array<{ diagnosticTrace?: string; label?: string }>;
}

/** Context passed to action cards for generating assets */
export interface RoadmapAssetContext {
  extractionData: ExtractionData | null;
  url: string;
  name: string;
  findingsStrings: string[];
  fixLibrary: FixLibraryResponse | null;
}

const PHASE_LABELS = [
  { key: 'phase1', label: 'Phase 1', subtitle: '0–30 Days', title: 'Entity Control', color: 'indigo' },
  { key: 'phase2', label: 'Phase 2', subtitle: '30–60 Days', title: 'Citation Surface Expansion', color: 'violet' },
  { key: 'phase3', label: 'Phase 3', subtitle: '60–90 Days', title: 'Intent Query Domination', color: 'purple' },
] as const;

const DIFFICULTY_COLORS = {
  Low: 'bg-emerald-100 text-emerald-700',
  Medium: 'bg-amber-100 text-amber-700',
  High: 'bg-red-100 text-red-700',
};

const CONFIDENCE_COLORS = {
  Low: 'text-amber-600',
  Medium: 'text-indigo-600',
  High: 'text-emerald-600',
};

function inferOwner(action: RoadmapAction): 'Founder' | 'Marketer' | 'Developer' | 'SEO' {
  const haystack = `${action.title} ${action.why} ${action.expectedImpact}`.toLowerCase();

  if (haystack.includes('schema') || haystack.includes('technical') || haystack.includes('markup') || haystack.includes('canonical')) {
    return 'Developer';
  }
  if (haystack.includes('content') || haystack.includes('faq') || haystack.includes('page') || haystack.includes('copy')) {
    return 'Marketer';
  }
  if (haystack.includes('citation') || haystack.includes('search') || haystack.includes('query') || haystack.includes('visibility')) {
    return 'SEO';
  }

  return 'Founder';
}

function estimateTime(difficulty: RoadmapAction['difficulty']): string {
  switch (difficulty) {
    case 'Low':
      return '30-90 minutes';
    case 'Medium':
      return 'Half day';
    case 'High':
      return '1-3 days';
    default:
      return 'Half day';
  }
}

function inferProofOfDone(action: RoadmapAction): string {
  const haystack = `${action.title} ${action.why} ${action.expectedImpact}`.toLowerCase();

  if (haystack.includes('schema')) {
    return 'Structured data is live on the page and visible in the rendered source.';
  }
  if (haystack.includes('citation') || haystack.includes('sameas') || haystack.includes('authority')) {
    return 'The page now includes verifiable corroboration links and brand proof signals.';
  }
  if (haystack.includes('content') || haystack.includes('faq') || haystack.includes('answer')) {
    return 'The page includes clearer answer blocks, lists, FAQs, or reusable factual sections.';
  }

  return 'The change is live on the target page and can be confirmed in a re-audit.';
}

function getVerificationStep(phaseKey: string): string {
  switch (phaseKey) {
    case 'phase1':
      return 'Re-run the audit after launch and confirm entity and trust scores improve first.';
    case 'phase2':
      return 'Check whether citation and corroboration signals improved in the next audit.';
    case 'phase3':
      return 'Run AI outcome tests to confirm your brand appears in more answers and recommendations.';
    default:
      return 'Re-run the audit and compare before/after results.';
  }
}

interface RoadmapValidation {
  validationScore: number;
  confidenceAdjustment: 'Low' | 'Medium' | 'High';
  issues: string[];
  recommendations: string[];
  scoreProjectionAssessment: 'Realistic' | 'Aggressive' | 'Unrealistic';
}

function normalizeFindings(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((f: unknown) => (typeof f === 'string' ? f : (f as { diagnosticTrace?: string; label?: string })?.diagnosticTrace ?? (f as { diagnosticTrace?: string; label?: string })?.label ?? ''))
    .filter(Boolean);
}

function PhaseCard({
  phaseKey,
  label,
  subtitle,
  title,
  objective,
  actions,
  assetContext,
}: {
  phaseKey: string;
  label: string;
  subtitle: string;
  title: string;
  objective: string;
  actions: RoadmapAction[];
  assetContext: RoadmapAssetContext | null;
}) {
  const [open, setOpen] = useState(true);

  return (
    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-slate-50 transition-colors text-left"
      >
        <div className="flex items-center gap-2">
          <div className="bg-indigo-600 text-white text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full">
            {label}
          </div>
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">{subtitle}</span>
            <span className="text-base font-black uppercase tracking-tight text-slate-900">{title}</span>
          </div>
        </div>
        <svg
          className={`w-4 h-4 text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div className="px-4 pb-4 space-y-3">
          <p className="text-xs text-slate-600 border-l-4 border-indigo-200 pl-3 py-0.5">{objective}</p>

          <div className="space-y-3">
            {actions.map((action, i) => (
              <ActionCard key={i} action={action} index={i} phaseKey={phaseKey} assetContext={assetContext} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function ActionCard({
  action,
  index,
  phaseKey,
  assetContext,
}: {
  action: RoadmapAction;
  index: number;
  phaseKey: string;
  assetContext: RoadmapAssetContext | null;
}) {
  const [modalOpen, setModalOpen] = useState(false);
  const [assetType, setAssetType] = useState<'schema' | 'factual' | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ type: 'schema' | 'factual'; content: string; title?: string } | null>(null);
  const [copied, setCopied] = useState(false);
  const owner = inferOwner(action);
  const timeEstimate = estimateTime(action.difficulty);
  const proofOfDone = inferProofOfDone(action);
  const verificationStep = getVerificationStep(phaseKey);

  const handleOpenModal = () => {
    setModalOpen(true);
    setAssetType(null);
    setResult(null);
    setError(null);
  };

  const handleCloseModal = () => {
    setModalOpen(false);
    setAssetType(null);
    setResult(null);
    setError(null);
  };

  const handleGenerateSchema = () => {
    if (!assetContext?.extractionData) {
      setError('No extraction data available.');
      return;
    }
    setAssetType('schema');
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const name = assetContext.name || assetContext.extractionData.title?.split(/[|-]/)[0]?.trim() || 'Organization';
      const siteUrl = assetContext.url || 'https://example.com';
      const description = (assetContext.extractionData.metaDescription || '').slice(0, 200) || undefined;
      const sameAs = assetContext.extractionData.sameAsUrls?.length
        ? assetContext.extractionData.sameAsUrls
        : (assetContext.extractionData.citationAnchors ?? []).slice(0, 5);
      const schema = SchemaGenerator.generateOrganizationSchema(name, siteUrl, description, sameAs);
      setResult({ type: 'schema', content: schema.code, title: 'Organization schema' });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Schema generation failed');
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateFactualAnchors = async () => {
    if (!assetContext) {
      setError('No audit context available.');
      return;
    }
    setAssetType('factual');
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const domain = assetContext.url || '';
      const res = await fetch('/api/factual-anchors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          brandData: {
            name: assetContext.name || new URL(domain || 'https://example.com').hostname,
            domain: domain || 'https://example.com',
            category: '',
            location: '',
          },
          findings: assetContext.findingsStrings,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.details || data.error || res.statusText);
      }
      const data = await res.json();
      const content = typeof data === 'string' ? data : (data.content ?? data.markdown ?? JSON.stringify(data, null, 2));
      setResult({ type: 'factual', content, title: 'Factual anchoring asset' });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Factual anchors generation failed');
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = async () => {
    if (!result) return;
    try {
      await navigator.clipboard.writeText(result.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (_) {}
  };

  const handleDownload = () => {
    if (!result) return;
    const ext = result.type === 'schema' ? 'json' : 'txt';
    const blob = new Blob([result.content], { type: result.type === 'schema' ? 'application/json' : 'text/plain' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `roadmap-asset-${result.type}-${index + 1}.${ext}`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  return (
    <>
      <div className="bg-slate-50 rounded-xl p-4 space-y-2">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="w-5 h-5 rounded-full bg-indigo-600 text-white text-[10px] font-black flex items-center justify-center flex-shrink-0">
              {index + 1}
            </span>
            <h4 className="font-black text-slate-900 text-xs uppercase tracking-tight">{action.title}</h4>
          </div>
          <span
            className={`text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded-full flex-shrink-0 ${DIFFICULTY_COLORS[action.difficulty] ?? DIFFICULTY_COLORS.Medium}`}
          >
            {action.difficulty}
          </span>
        </div>

        <div className="grid md:grid-cols-2 gap-3 text-xs text-slate-600 pl-8">
          <div>
            <span className="font-bold uppercase tracking-wider text-slate-400 block mb-1">Why</span>
            <p>{action.why}</p>
          </div>
          <div>
            <span className="font-bold uppercase tracking-wider text-slate-400 block mb-1">Expected Impact</span>
            <p>{action.expectedImpact}</p>
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-3 text-xs pl-8">
          <div className="rounded-xl border border-slate-200 bg-white p-3">
            <span className="font-bold uppercase tracking-wider text-slate-400 block mb-1">Owner</span>
            <p className="text-slate-900 font-semibold">{owner}</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-3">
            <span className="font-bold uppercase tracking-wider text-slate-400 block mb-1">Estimated Time</span>
            <p className="text-slate-900 font-semibold">{timeEstimate}</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-3">
            <span className="font-bold uppercase tracking-wider text-slate-400 block mb-1">Verify With</span>
            <p className="text-slate-900 font-semibold">{phaseKey === 'phase3' ? 'AI outcome test' : 'Re-audit'}</p>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-3 text-xs text-slate-600 pl-8">
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3">
            <span className="font-bold uppercase tracking-wider text-emerald-700 block mb-1">Proof Of Done</span>
            <p className="text-slate-700">{proofOfDone}</p>
          </div>
          <div className="rounded-xl border border-indigo-200 bg-indigo-50 p-3">
            <span className="font-bold uppercase tracking-wider text-indigo-700 block mb-1">Next Verification Step</span>
            <p className="text-slate-700">{verificationStep}</p>
          </div>
        </div>

        <div className="pl-8">
          <button
            type="button"
            onClick={handleOpenModal}
            className="text-[9px] font-black uppercase tracking-widest text-indigo-600 hover:text-indigo-800 border border-indigo-200 hover:border-indigo-400 px-3 py-1.5 rounded-lg transition-all disabled:opacity-50"
          >
            Generate Deployable Assets
          </button>
        </div>
      </div>

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={handleCloseModal}>
          <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-hidden flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
              <h3 className="text-sm font-black uppercase tracking-tight text-slate-900">Generate deployable asset</h3>
              <button type="button" onClick={handleCloseModal} className="text-slate-400 hover:text-slate-600 p-1">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <div className="p-6 space-y-4 flex-1 overflow-y-auto">
              {!assetType && !result && (
                <div className="space-y-3">
                  <p className="text-xs text-slate-600">Choose what to generate for this action:</p>
                  <div className="flex flex-col gap-2">
                    <button
                      type="button"
                      onClick={handleGenerateSchema}
                      disabled={!assetContext?.extractionData}
                      className="text-left px-4 py-3 rounded-xl border border-slate-200 hover:border-indigo-300 hover:bg-indigo-50/50 text-sm font-bold text-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      Schema snippet (Organization JSON-LD)
                    </button>
                    <button
                      type="button"
                      onClick={() => handleGenerateFactualAnchors()}
                      disabled={!assetContext}
                      className="text-left px-4 py-3 rounded-xl border border-slate-200 hover:border-indigo-300 hover:bg-indigo-50/50 text-sm font-bold text-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      Factual anchoring asset
                    </button>
                  </div>
                </div>
              )}
              {loading && (
                <div className="flex items-center gap-3 text-slate-600">
                  <div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
                  <span className="text-sm font-medium">Generating…</span>
                </div>
              )}
              {error && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                  <p className="text-sm text-red-700 font-medium">{error}</p>
                </div>
              )}
              {result && !loading && (
                <div className="space-y-3">
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">{result.title}</p>
                  <pre className="bg-slate-900 text-slate-100 p-4 rounded-xl text-xs overflow-x-auto max-h-48 overflow-y-auto font-mono whitespace-pre-wrap break-words">
                    {result.content}
                  </pre>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={handleCopy}
                      className="px-4 py-2 rounded-lg border border-slate-200 text-xs font-bold uppercase tracking-wider text-slate-700 hover:bg-slate-50"
                    >
                      {copied ? 'Copied!' : 'Copy'}
                    </button>
                    <button
                      type="button"
                      onClick={handleDownload}
                      className="px-4 py-2 rounded-lg bg-indigo-600 text-white text-xs font-bold uppercase tracking-wider hover:bg-indigo-500"
                    >
                      Download
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function ScoreProjection({ current, projected90Day, confidence }: { current: number; projected90Day: number; confidence: 'Low' | 'Medium' | 'High' }) {
  const gain = projected90Day - current;
  const barCurrent = Math.min(100, current);
  const barProjected = Math.min(100, projected90Day);

  return (
    <div className="bg-slate-900 text-white rounded-xl p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-black uppercase tracking-tight">Score Projection</h3>
          <p className="text-slate-400 text-xs mt-1">Estimated 90-day improvement if roadmap is completed</p>
        </div>
        <span className={`text-sm font-bold ${CONFIDENCE_COLORS[confidence] ?? ''}`}>
          {confidence} Confidence
        </span>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 block mb-1">Current</span>
          <div className="text-5xl font-black">{current}</div>
          <div className="mt-2 h-2 bg-slate-700 rounded-full overflow-hidden">
            <div className="h-full bg-slate-500 rounded-full" style={{ width: `${barCurrent}%` }} />
          </div>
        </div>
        <div>
          <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 block mb-1">Projected (90 days)</span>
          <div className="text-5xl font-black text-indigo-400">{projected90Day}</div>
          <div className="mt-2 h-2 bg-slate-700 rounded-full overflow-hidden">
            <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${barProjected}%` }} />
          </div>
        </div>
      </div>

      {gain > 0 && (
        <p className="text-sm text-slate-300">
          Potential gain of <span className="text-indigo-400 font-black">+{gain} points</span> over 90 days.
        </p>
      )}
    </div>
  );
}

function VerificationPlan() {
  return (
    <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-4">
      <div>
        <h3 className="text-base font-black uppercase tracking-tight text-slate-900">Before/After Verification Plan</h3>
        <p className="text-xs text-slate-500 mt-1">
          Use this sequence to prove the roadmap created measurable visibility improvement.
        </p>
      </div>
      <div className="grid gap-3 md:grid-cols-4">
        {[
          'Implement the highest-priority actions first.',
          'Run a fresh audit after the updates go live.',
          'Compare the new score and diagnosis against today\'s baseline.',
          'Run AI outcome tests to confirm more brand mentions and citations.',
        ].map((step, index) => (
          <div key={step} className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-2">
            <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-slate-900 text-white text-[10px] font-black">
              {index + 1}
            </span>
            <p className="text-sm text-slate-700">{step}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function ValidationScore({ validation }: { validation: RoadmapValidation }) {
  const isWarning = validation.validationScore < 70;

  return (
    <div
      className={`rounded-xl p-4 space-y-3 ${
        isWarning ? 'bg-amber-50 border border-amber-200' : 'bg-white border border-slate-200'
      }`}
    >
      <div className="flex items-center justify-between">
        <h3 className="text-base font-black uppercase tracking-tight text-slate-900">Validation Score</h3>
        <span
          className={`text-sm font-bold px-2 py-0.5 rounded-full ${
            isWarning ? 'bg-amber-100 text-amber-700' : 'bg-indigo-100 text-indigo-700'
          }`}
        >
          {validation.validationScore}
        </span>
      </div>
      <div className="flex flex-wrap gap-2 text-xs">
        <span
          className={`font-bold uppercase tracking-wider px-2 py-1 rounded ${
            validation.confidenceAdjustment === 'Low'
              ? 'bg-amber-100 text-amber-700'
              : validation.confidenceAdjustment === 'High'
                ? 'bg-emerald-100 text-emerald-700'
                : 'bg-indigo-100 text-indigo-700'
          }`}
        >
          {validation.confidenceAdjustment} Confidence
        </span>
        <span
          className={`font-bold uppercase tracking-wider px-2 py-1 rounded ${
            validation.scoreProjectionAssessment === 'Realistic'
              ? 'bg-emerald-100 text-emerald-700'
              : validation.scoreProjectionAssessment === 'Aggressive'
                ? 'bg-amber-100 text-amber-700'
                : 'bg-red-100 text-red-700'
          }`}
        >
          {validation.scoreProjectionAssessment}
        </span>
      </div>
    </div>
  );
}

export default function Roadmap() {
  const location = useLocation();
  const { auditId } = useParams<{ auditId?: string }>();

  const state = (location.state ?? {}) as LocationState;

  const [roadmap, setRoadmap] = useState<RoadmapResponse | null>(null);
  const [validation, setValidation] = useState<RoadmapValidation | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [domain, setDomain] = useState('');
  const [auditName, setAuditName] = useState('');
  const [assetContext, setAssetContext] = useState<RoadmapAssetContext | null>(null);
  const [payload, setPayload] = useState<RoadmapPayload | null>(null);

  useEffect(() => {
    async function run() {
      setIsLoading(true);
      setError(null);
      setValidation(null);
      setAssetContext(null);
      setPayload(null);

      let auditResult: AuditResponse | null = state.auditResult ?? null;
      let extractionData: ExtractionData | null = state.extractionData ?? null;
      let queryPackQueries: string[] = state.queryPackQueries ?? [];
      let url = state.url ?? '';
      let name = state.name ?? '';
      let fixLibrary: FixLibraryResponse | null = state.fixLibrary ?? null;
      let findingsRaw: unknown = state.findings ?? auditResult?.keyFindings ?? null;

      if (!auditResult && auditId) {
        try {
          const res = await fetch(`/api/audits?id=${auditId}`);
          if (!res.ok) throw new Error('Audit not found');
          const data = await res.json();
          auditResult = data.auditResult ?? null;
          extractionData = data.extractionData ?? null;
          queryPackQueries = Array.isArray(data.queryPack?.queries) ? data.queryPack.queries : (Array.isArray(data.queryPack) ? data.queryPack : []);
          url = data.url ?? '';
          name = data.name ?? '';
          fixLibrary = data.fixLibrary ?? null;
          findingsRaw = data.findings ?? findingsRaw;
        } catch (err) {
          setError('Could not load audit. Check the audit ID or run a new audit.');
          setIsLoading(false);
          return;
        }
      }

      if (!auditResult || !extractionData) {
        if (auditId && auditResult && !extractionData) {
          setError('Audit data is incomplete — extraction data is missing. Run a new audit to generate the roadmap.');
        } else {
          setError(null);
        }
        setIsLoading(false);
        return;
      }

      try {
        setDomain(url ? new URL(url).hostname : name);
      } catch {
        setDomain(name);
      }
      setAuditName(name);

      setAssetContext({
        extractionData,
        url: url || 'https://example.com',
        name: name || '',
        findingsStrings: normalizeFindings(findingsRaw),
        fixLibrary,
      });

      const payload: RoadmapPayload = buildRoadmapPayload(auditResult, extractionData, queryPackQueries, url, fixLibrary);
      setPayload(payload);

      try {
        const url = '/api/roadmap';
        console.log('Calling roadmap endpoint:', url);
        const res = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
          cache: 'no-store',
        });
        console.log('[roadmap] fetch status:', res.status);
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body?.details ?? body?.error ?? 'Roadmap generation failed');
        }
        const data: RoadmapResponse = await res.json();
        console.log('[roadmap] parsed response:', data);
        setRoadmap(data);

        try {
          const validateRes = await fetch('/api/roadmap-validate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              roadmap: data,
              auditScores: {
                overallScore: payload.overallScore,
                signalCoverageScore: payload.signalCoverageScore,
                citationHealthScore: payload.citationHealthScore,
                contentDepthScore: payload.contentDepthScore,
                authoritySignalsScore: payload.authoritySignalsScore,
              },
            }),
            cache: 'no-store',
          });
          const validateData = await validateRes.json();
          if (validateData.success && validateData.validation) {
            setValidation(validateData.validation);
          }
        } catch {
          /* do not block roadmap; validation is optional */
        }
      } catch (err: unknown) {
        setError((err as Error)?.message ?? 'Unexpected error generating roadmap');
      } finally {
        setIsLoading(false);
      }
    }

    run();
  }, [auditId ?? '', state?.auditResult != null]);

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-4xl mx-auto px-4 py-10 space-y-8">
        <div className="flex items-center justify-between">
          <Link to="/" className="text-[10px] font-bold uppercase tracking-widest text-indigo-600 hover:text-indigo-800">
            Back to Audit
          </Link>
          {domain && (
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{domain}</span>
          )}
        </div>

        <div>
          <h1 className="text-3xl md:text-4xl font-black uppercase tracking-tight text-slate-900">
            90-Day Visibility Growth Plan
          </h1>
          {auditName && (
            <p className="text-sm text-slate-500 mt-1">{auditName}</p>
          )}
        </div>

        {isLoading && (
          <div className="bg-white border border-slate-200 rounded-[2rem] p-16 flex flex-col items-center gap-4">
            <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
            <p className="text-sm font-bold text-slate-500 uppercase tracking-widest">Building Your Plan…</p>
            <p className="text-xs text-slate-400">This takes 10–20 seconds</p>
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-2xl p-6">
            <p className="font-bold text-red-700 text-sm uppercase tracking-wide mb-1">Error</p>
            <p className="text-sm text-red-600">{error}</p>
            <Link to="/" className="mt-4 inline-block text-xs font-bold text-indigo-600 hover:underline">
              Run a new audit
            </Link>
          </div>
        )}

        {!isLoading && !error && !roadmap && !auditId && !state.auditResult && (
          <div className="bg-white border border-slate-200 rounded-[2rem] p-12 text-center space-y-4">
            <h2 className="text-xl font-black uppercase tracking-tight text-slate-900">No Audit Data</h2>
            <p className="text-sm text-slate-500">Run an audit first, then click "View Roadmap" to build your action plan.</p>
            <Link to="/" className="inline-block mt-2 bg-indigo-600 text-white text-xs font-black uppercase tracking-widest px-6 py-3 rounded-xl hover:bg-indigo-700 transition-colors">
              Run Audit
            </Link>
          </div>
        )}

        {roadmap && (
          <div className="space-y-6">
            {roadmap.scoreProjection && (
              <>
              <ScoreProjection
                current={roadmap.scoreProjection.current ?? 0}
                projected90Day={roadmap.scoreProjection.projected90Day ?? 0}
                confidence={(roadmap.scoreProjection.confidence as 'Low' | 'Medium' | 'High') ?? 'Medium'}
              />
              <VerificationPlan />
              {validation && <ValidationScore validation={validation} />}
              </>
            )}

            {payload?.diagnosis && <InvisibilityDiagnosisPanel diagnosis={payload.diagnosis} />}

            {PHASE_LABELS.map(({ key, label, subtitle, title }) => {
              const phase = roadmap[key as 'phase1' | 'phase2' | 'phase3'];
              if (!phase) return null;

              const actions = Array.isArray(phase.actions) ? phase.actions : [];

              return (
                <PhaseCard
                  key={key}
                  phaseKey={key}
                  label={label}
                  subtitle={subtitle}
                  title={title}
                  objective={phase.objective ?? ''}
                  actions={actions}
                  assetContext={assetContext}
                />
              );
            })}

            <p className="text-[10px] text-slate-400 text-center pt-4">
              Generated by CitationIQ · {new Date().toLocaleDateString()}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
