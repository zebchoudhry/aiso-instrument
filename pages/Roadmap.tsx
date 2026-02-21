import React, { useEffect, useState } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import type { RoadmapResponse, RoadmapAction, RoadmapPayload, AuditResponse, ExtractionData, FixLibraryResponse } from '../types';
import { buildRoadmapPayload } from '../lib/roadmapPayload';

interface LocationState {
  auditResult?: AuditResponse;
  extractionData?: ExtractionData;
  queryPackQueries?: string[];
  url?: string;
  name?: string;
  fixLibrary?: FixLibraryResponse | null;
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

function PhaseCard({
  phaseKey,
  label,
  subtitle,
  title,
  objective,
  actions,
}: {
  phaseKey: string;
  label: string;
  subtitle: string;
  title: string;
  objective: string;
  actions: RoadmapAction[];
}) {
  const [open, setOpen] = useState(true);

  return (
    <div className="bg-white border border-slate-200 rounded-[2rem] overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between px-8 py-6 hover:bg-slate-50 transition-colors text-left"
      >
        <div className="flex items-center gap-4">
          <div className="bg-indigo-600 text-white text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full">
            {label}
          </div>
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">{subtitle}</span>
            <span className="text-lg font-black uppercase tracking-tight text-slate-900">{title}</span>
          </div>
        </div>
        <svg
          className={`w-5 h-5 text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div className="px-8 pb-8 space-y-6">
          <p className="text-sm text-slate-600 border-l-4 border-indigo-200 pl-4 py-1">{objective}</p>

          <div className="space-y-4">
            {actions.map((action, i) => (
              <ActionCard key={i} action={action} index={i} phaseKey={phaseKey} />
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
}: {
  action: RoadmapAction;
  index: number;
  phaseKey: string;
}) {
  const [assetPending, setAssetPending] = useState(false);

  const handleGenerateAsset = () => {
    setAssetPending(true);
    setTimeout(() => setAssetPending(false), 1500);
  };

  return (
    <div className="bg-slate-50 rounded-2xl p-6 space-y-3">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="w-7 h-7 rounded-full bg-indigo-600 text-white text-xs font-black flex items-center justify-center flex-shrink-0">
            {index + 1}
          </span>
          <h4 className="font-black text-slate-900 text-sm uppercase tracking-tight">{action.title}</h4>
        </div>
        <span
          className={`text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded-full flex-shrink-0 ${DIFFICULTY_COLORS[action.difficulty] ?? DIFFICULTY_COLORS.Medium}`}
        >
          {action.difficulty}
        </span>
      </div>

      <div className="grid md:grid-cols-2 gap-4 text-xs text-slate-600 pl-10">
        <div>
          <span className="font-bold uppercase tracking-wider text-slate-400 block mb-1">Why</span>
          <p>{action.why}</p>
        </div>
        <div>
          <span className="font-bold uppercase tracking-wider text-slate-400 block mb-1">Expected Impact</span>
          <p>{action.expectedImpact}</p>
        </div>
      </div>

      <div className="pl-10">
        <button
          type="button"
          onClick={handleGenerateAsset}
          disabled={assetPending}
          className="text-[10px] font-black uppercase tracking-widest text-indigo-600 hover:text-indigo-800 border border-indigo-200 hover:border-indigo-400 px-4 py-2 rounded-lg transition-all disabled:opacity-50"
        >
          {assetPending ? 'Generating…' : 'Generate Deployable Assets'}
        </button>
      </div>
    </div>
  );
}

function ScoreProjection({ current, projected90Day, confidence }: { current: number; projected90Day: number; confidence: 'Low' | 'Medium' | 'High' }) {
  const gain = projected90Day - current;
  const barCurrent = Math.min(100, current);
  const barProjected = Math.min(100, projected90Day);

  return (
    <div className="bg-slate-900 text-white rounded-[2rem] p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xl font-black uppercase tracking-tight">Score Projection</h3>
          <p className="text-slate-400 text-xs mt-1">Estimated 90-day improvement if roadmap is completed</p>
        </div>
        <span className={`text-sm font-bold ${CONFIDENCE_COLORS[confidence] ?? ''}`}>
          {confidence} Confidence
        </span>
      </div>

      <div className="grid grid-cols-2 gap-6">
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

export default function Roadmap() {
  const location = useLocation();
  const { auditId } = useParams<{ auditId?: string }>();

  const state = (location.state ?? {}) as LocationState;

  const [roadmap, setRoadmap] = useState<RoadmapResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [domain, setDomain] = useState('');
  const [auditName, setAuditName] = useState('');

  useEffect(() => {
    async function run() {
      setIsLoading(true);
      setError(null);

      let auditResult: AuditResponse | null = state.auditResult ?? null;
      let extractionData: ExtractionData | null = state.extractionData ?? null;
      let queryPackQueries: string[] = state.queryPackQueries ?? [];
      let url = state.url ?? '';
      let name = state.name ?? '';
      let fixLibrary: FixLibraryResponse | null = state.fixLibrary ?? null;

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
        } catch (err) {
          setError('Could not load audit. Check the audit ID or run a new audit.');
          setIsLoading(false);
          return;
        }
      }

      if (!auditResult || !extractionData) {
        setError(null);
        setIsLoading(false);
        return;
      }

      try {
        setDomain(url ? new URL(url).hostname : name);
      } catch {
        setDomain(name);
      }
      setAuditName(name);

      const payload: RoadmapPayload = buildRoadmapPayload(auditResult, extractionData, queryPackQueries, url, fixLibrary);

      try {
        const res = await fetch('/api/roadmap', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body?.details ?? body?.error ?? 'Roadmap generation failed');
        }
        const data: RoadmapResponse = await res.json();
        setRoadmap(data);
      } catch (err: unknown) {
        setError((err as Error)?.message ?? 'Unexpected error generating roadmap');
      } finally {
        setIsLoading(false);
      }
    }

    run();
  }, []);

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
            90-Day AI Visibility Roadmap
          </h1>
          {auditName && (
            <p className="text-sm text-slate-500 mt-1">{auditName}</p>
          )}
        </div>

        {isLoading && (
          <div className="bg-white border border-slate-200 rounded-[2rem] p-16 flex flex-col items-center gap-4">
            <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
            <p className="text-sm font-bold text-slate-500 uppercase tracking-widest">Generating Roadmap…</p>
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
            <p className="text-sm text-slate-500">Run an audit first, then click "View Roadmap" to generate your execution plan.</p>
            <Link to="/" className="inline-block mt-2 bg-indigo-600 text-white text-xs font-black uppercase tracking-widest px-6 py-3 rounded-xl hover:bg-indigo-700 transition-colors">
              Run Audit
            </Link>
          </div>
        )}

        {roadmap && (
          <div className="space-y-6">
            <ScoreProjection
              current={roadmap.scoreProjection.current}
              projected90Day={roadmap.scoreProjection.projected90Day}
              confidence={roadmap.scoreProjection.confidence}
            />

            {PHASE_LABELS.map(({ key, label, subtitle, title }) => {
              const phase = roadmap[key as 'phase1' | 'phase2' | 'phase3'];
              return (
                <PhaseCard
                  key={key}
                  phaseKey={key}
                  label={label}
                  subtitle={subtitle}
                  title={title}
                  objective={phase.objective}
                  actions={phase.actions}
                />
              );
            })}

            <p className="text-[10px] text-slate-400 text-center pt-4">
              Generated by AI Visibility Engine · {new Date().toLocaleDateString()}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
