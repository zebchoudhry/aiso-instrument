import React, { useState } from 'react';
import type { QueryPackResponse } from '../types';

interface ResultItem {
  query: string;
  model: string;
  mentioned: boolean;
  mention_count: number;
  position: number | null;
  competitors: Array<{ name: string; count: number }>;
}

interface AnswerSimulationDisplayProps {
  queryPack: QueryPackResponse | null;
  domain: string;
  name: string;
  auditId: string | null;
}

export default function AnswerSimulationDisplay({
  queryPack,
  domain,
  name,
  auditId,
}: AnswerSimulationDisplayProps) {
  const [results, setResults] = useState<ResultItem[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const queries = (queryPack?.queries ?? queryPack?.query_pack ?? [])
    .map((item: string | { query?: string }) => (typeof item === 'string' ? item : item?.query ?? ''))
    .filter(Boolean) as string[];

  const handleRun = async () => {
    if (!queries.length || !domain) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/answer-test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          auditId: auditId || undefined,
          domain,
          name,
          queries,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.details || data.error || res.statusText);
      }
      const data = await res.json();
      setResults(data.results ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Simulation failed');
      setResults(null);
    } finally {
      setLoading(false);
    }
  };

  if (!queryPack || queries.length === 0) return null;

  return (
    <div className="bg-white p-10 rounded-[3rem] border border-slate-200 shadow-xl space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <header className="border-b border-slate-100 pb-6">
        <div className="text-[10px] font-black text-indigo-500 uppercase tracking-[0.4em]">
          Real Answer Measurement
        </div>
        <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tighter mt-2">
          Answer Simulation & Citation Capture
        </h3>
        <p className="text-xs font-bold text-slate-400 mt-1">
          Run queries through Gemini and see if your brand is mentioned. Tracks mention count, position, and competitors.
        </p>
      </header>

      <div>
        <button
          onClick={handleRun}
          disabled={loading}
          className="px-6 py-3 bg-indigo-600 text-white rounded-xl font-bold text-sm uppercase tracking-wider hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {loading ? 'Running simulation...' : 'Run Answer Simulation'}
        </button>
      </div>

      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-sm">
          {error}
        </div>
      )}

      {results !== null && results.length > 0 && (
        <div className="space-y-4">
          {results.map((r, i) => (
            <div
              key={i}
              className="p-6 bg-slate-50 border border-slate-100 rounded-xl space-y-3"
            >
              <p className="text-sm font-bold text-slate-900 italic">"{r.query}"</p>
              <div className="flex flex-wrap gap-4 text-sm">
                <span className="text-slate-500">Model: {r.model}</span>
                <span>
                  Brand Mentioned:{' '}
                  <span className={r.mentioned ? 'text-emerald-600 font-bold' : 'text-slate-600'}>
                    {r.mentioned ? 'Yes' : 'No'}
                  </span>
                </span>
                <span className="text-slate-600">Mention Count: {r.mention_count}</span>
                {r.position !== null && (
                  <span className="text-slate-600">First Position: {r.position}</span>
                )}
              </div>
              {r.competitors.length > 0 && (
                <div>
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                    Competitors Detected:
                  </span>
                  <ul className="mt-1 flex flex-wrap gap-2">
                    {r.competitors.map((c, j) => (
                      <li key={j} className="px-2 py-1 bg-white border border-slate-200 rounded text-xs">
                        {c.name} {c.count > 1 && `(${c.count})`}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
