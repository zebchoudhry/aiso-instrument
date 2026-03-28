import React, { useState, useEffect } from 'react';
import { QueryPackResponse, AIAnswerTestResponse } from '../types';

export type VerificationStatus = 'cited' | 'mentioned' | 'not_found' | null;

export interface VerificationEntry {
  query: string;
  result: VerificationStatus;
  pastedResponse?: string;
}

interface QueryPackDisplayProps {
  data: QueryPackResponse | null;
  isLoading: boolean;
  auditId?: string | null;
  initialVerifications?: VerificationEntry[] | null;
  onVerificationChange?: (verifications: VerificationEntry[]) => void;
  brandName?: string;
  domain?: string;
  onOutcomeResults?: (response: AIAnswerTestResponse) => void;
  onOutcomeLoadingChange?: (loading: boolean) => void;
}

const QueryPackDisplay: React.FC<QueryPackDisplayProps> = ({
  data,
  isLoading,
  auditId,
  initialVerifications,
  onVerificationChange,
  brandName,
  domain,
  onOutcomeResults,
  onOutcomeLoadingChange,
}) => {
  const [verification, setVerification] = useState<Record<number, VerificationStatus>>({});
  const [pastedResponses, setPastedResponses] = useState<Record<number, string>>({});
  const [isOutcomeLoading, setIsOutcomeLoading] = useState(false);

  const queries = (data?.queries ?? data?.query_pack ?? []).map((item: string | { query?: string; intent?: string }) =>
    typeof item === 'string' ? item : item?.query ?? ''
  ).filter(Boolean);

  useEffect(() => {
    if (!initialVerifications?.length || !queries.length) return;
    const v: Record<number, VerificationStatus> = {};
    const p: Record<number, string> = {};
    initialVerifications.forEach((entry, idx) => {
      const i = queries.indexOf(entry.query);
      if (i >= 0) {
        v[i] = entry.result;
        if (entry.pastedResponse) p[i] = entry.pastedResponse;
      }
    });
    setVerification(v);
    setPastedResponses(p);
  }, [initialVerifications, queries.join('|')]);

  useEffect(() => {
    if (!onVerificationChange || !queries.length) return;
    const payload: VerificationEntry[] = queries.map((query, i) => ({
      query,
      result: verification[i] ?? null,
      pastedResponse: pastedResponses[i] || undefined,
    }));
    onVerificationChange(payload);
  }, [verification, pastedResponses, queries, onVerificationChange]);

  const setResult = (i: number, result: VerificationStatus) => {
    setVerification((v) => ({ ...v, [i]: result }));
  };

  const setPasted = (i: number, text: string) => {
    setPastedResponses((p) => ({ ...p, [i]: text }));
  };

  const citedCount = Object.values(verification).filter((v) => v === 'cited').length;
  const mentionedCount = Object.values(verification).filter((v) => v === 'mentioned').length;
  const notFoundCount = Object.values(verification).filter((v) => v === 'not_found').length;
  const testedCount = citedCount + mentionedCount + notFoundCount;

  const copyQuery = async (q: string) => {
    try {
      await navigator.clipboard.writeText(q);
    } catch (_) {}
  };

  const runOutcomeTest = async () => {
    if (!queries.length || !brandName || !domain || !onOutcomeResults) return;
    setIsOutcomeLoading(true);
    onOutcomeLoadingChange?.(true);
    try {
      const res = await fetch('/api/audit-enrich', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ queries, brandName, domain }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.details ?? err?.error ?? 'AI Outcome Test failed');
      }
      const response: AIAnswerTestResponse = await res.json();
      onOutcomeResults(response);
    } catch (e) {
      console.error('[QueryPackDisplay] Outcome test failed:', e);
    } finally {
      setIsOutcomeLoading(false);
      onOutcomeLoadingChange?.(false);
    }
  };

  if (!data && !isLoading) return null;

  return (
    <div className="bg-white p-10 rounded-[3rem] border border-slate-200 shadow-xl space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <header className="flex justify-between items-end border-b border-slate-100 pb-8">
        <div className="space-y-2">
          <div className="text-[10px] font-black text-indigo-500 uppercase tracking-[0.4em]">Verification Instrumentation</div>
          <h3 className="text-3xl font-black text-slate-900 uppercase tracking-tighter leading-none">LLM Retrieval Query Pack</h3>
          <p className="text-xs font-bold text-slate-400 italic">Ask these in ChatGPT / Perplexity — mark results to track AI visibility.</p>
        </div>
        <div className="flex flex-col items-end gap-2">
          {queries.length > 0 && brandName && domain && onOutcomeResults && (
            <button
              onClick={runOutcomeTest}
              disabled={isOutcomeLoading || !queries.length}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-300 text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all"
            >
              {isOutcomeLoading ? 'Running…' : 'Run AI Outcome Test'}
            </button>
          )}
          {queries.length > 0 && testedCount > 0 && (
            <div className="text-[10px] font-bold text-slate-600 mb-2">
              Cited {citedCount} · Mentioned {mentionedCount} · Not found {notFoundCount}
            </div>
          )}
          <span className="px-4 py-2 bg-slate-950 text-white rounded-xl text-[9px] font-black uppercase tracking-widest border-b-2 border-indigo-500 shadow-lg">
            v5.1 Clinical Package
          </span>
        </div>
      </header>

      {isLoading ? (
        <div className="space-y-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="rounded-2xl bg-slate-100 animate-pulse h-24" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {queries.map((query, i) => (
            <QueryPackItem
              key={i}
              query={query}
              index={i}
              result={verification[i]}
              pastedResponse={pastedResponses[i]}
              onCopy={copyQuery}
              onResult={setResult}
              onPastedChange={setPasted}
            />
          ))}
        </div>
      )}

      <footer className="pt-8 border-t border-slate-100 flex flex-wrap justify-between items-center gap-4 text-[9px] font-black text-slate-400 uppercase tracking-widest">
        <span>Copy each query → Ask in ChatGPT / Perplexity → Mark result to track before/after fixes</span>
        <span>Search_Behaviour_Model_v2.1</span>
      </footer>
    </div>
  );
};

interface QueryPackItemProps {
  query: string;
  index: number;
  result: VerificationStatus;
  pastedResponse: string;
  onCopy: (q: string) => void;
  onResult: (i: number, r: VerificationStatus) => void;
  onPastedChange: (i: number, text: string) => void;
}

function QueryPackItem({ query, index, result, pastedResponse, onCopy, onResult, onPastedChange }: QueryPackItemProps) {
  const [showPaste, setShowPaste] = useState(false);
  const [localPaste, setLocalPaste] = useState(pastedResponse);

  const handleBlur = () => {
    if (localPaste !== pastedResponse) onPastedChange(index, localPaste);
  };

  return (
    <div className="group relative bg-slate-50 border border-slate-100 p-8 rounded-[2rem] hover:bg-white hover:border-indigo-500/30 hover:shadow-lg transition-all duration-300">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex-1">
          <p className="text-lg font-black text-slate-900 italic tracking-tight leading-tight">"{query}"</p>
        </div>
        <div className="flex flex-wrap gap-2 items-center shrink-0">
          <button onClick={() => onCopy(query)} className="px-3 py-1.5 rounded-lg border border-slate-200 text-[10px] font-bold uppercase hover:bg-slate-100">
            Copy
          </button>
          <span className="text-[9px] text-slate-400">→ Test in AI →</span>
          <button
            onClick={() => onResult(index, 'cited')}
            className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase transition-colors ${result === 'cited' ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-emerald-100'}`}
          >
            Cited
          </button>
          <button
            onClick={() => onResult(index, 'mentioned')}
            className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase transition-colors ${result === 'mentioned' ? 'bg-amber-500 text-white' : 'bg-slate-100 text-slate-600 hover:bg-amber-100'}`}
          >
            Mentioned
          </button>
          <button
            onClick={() => onResult(index, 'not_found')}
            className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase transition-colors ${result === 'not_found' ? 'bg-slate-700 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
          >
            Not found
          </button>
          <button
            onClick={() => setShowPaste((s) => !s)}
            className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase transition-colors ${showPaste || pastedResponse ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-100 text-slate-600 hover:bg-indigo-50'}`}
          >
            {showPaste || pastedResponse ? 'Paste AI response ✓' : 'Paste AI response'}
          </button>
        </div>
      </div>
      {(showPaste || pastedResponse) && (
        <div className="mt-4 pt-4 border-t border-slate-100">
          <label className="text-[9px] font-black text-slate-500 uppercase tracking-wider block mb-2">Paste AI response (optional)</label>
          <textarea
            value={localPaste}
            onChange={(e) => setLocalPaste(e.target.value)}
            onBlur={handleBlur}
            placeholder="Paste the AI answer here as evidence…"
            rows={4}
            className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm font-medium text-slate-800 placeholder:text-slate-400 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 resize-y"
          />
        </div>
      )}
      <div className="h-0.5 w-0 bg-indigo-500 group-hover:w-full transition-all duration-700 mt-4" />
    </div>
  );
}

export default QueryPackDisplay;
