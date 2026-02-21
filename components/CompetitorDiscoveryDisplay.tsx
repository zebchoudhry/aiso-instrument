import React, { useState } from 'react';
import type { QueryPackResponse } from '../types';

interface Competitor {
  name: string;
  domain?: string;
  context?: string;
}

interface CompetitorDiscoveryDisplayProps {
  queryPack: QueryPackResponse | null;
  domain: string;
  name: string;
  auditId?: string | null;
}

export default function CompetitorDiscoveryDisplay({
  queryPack,
  domain,
  name,
}: CompetitorDiscoveryDisplayProps) {
  const [competitors, setCompetitors] = useState<Competitor[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const queries = (queryPack?.queries ?? queryPack?.query_pack ?? [])
    .map((item: string | { query?: string }) => (typeof item === 'string' ? item : item?.query ?? ''))
    .filter(Boolean) as string[];

  const handleDiscover = async () => {
    if (!queries.length) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/competitor-discovery', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ queries, domain, name }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.details || data.error || res.statusText);
      }
      const data = await res.json();
      setCompetitors(data.competitors ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Discovery failed');
      setCompetitors(null);
    } finally {
      setLoading(false);
    }
  };

  if (!queryPack || queries.length === 0) return null;

  return (
    <div className="bg-white p-10 rounded-[3rem] border border-slate-200 shadow-xl space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <header className="border-b border-slate-100 pb-6">
        <div className="text-[10px] font-black text-indigo-500 uppercase tracking-[0.4em]">Competitive Intelligence</div>
        <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tighter mt-2">
          Competitor Discovery
        </h3>
        <p className="text-xs font-bold text-slate-400 mt-1">
          Discover brands AI assistants typically mention when answering your Query Pack questions.
        </p>
      </header>

      <div>
        <button
          onClick={handleDiscover}
          disabled={loading}
          className="px-6 py-3 bg-indigo-600 text-white rounded-xl font-bold text-sm uppercase tracking-wider hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {loading ? 'Discovering...' : 'Discover Competitors'}
        </button>
      </div>

      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-sm">
          {error}
        </div>
      )}

      {competitors !== null && competitors.length > 0 && (
        <ul className="space-y-3">
          {competitors.map((c, i) => (
            <li
              key={i}
              className="flex items-center justify-between gap-4 p-4 bg-slate-50 border border-slate-100 rounded-xl"
            >
              <div>
                <span className="font-bold text-slate-900">{c.name}</span>
                {c.domain && (
                  <a
                    href={c.domain.startsWith('http') ? c.domain : `https://${c.domain}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="ml-2 text-indigo-600 hover:underline text-sm"
                  >
                    {c.domain}
                  </a>
                )}
                {c.context && (
                  <p className="text-xs text-slate-500 mt-1">{c.context}</p>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}

      {competitors !== null && competitors.length === 0 && !loading && !error && (
        <p className="text-slate-500 text-sm">No competitors identified for these queries.</p>
      )}
    </div>
  );
}
