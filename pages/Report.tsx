import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';

export default function Report() {
  const { id } = useParams();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!id) {
      setLoading(false);
      setError('Invalid report ID');
      return;
    }
    fetch(`/api/audits?id=${id}`)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error('Not found'))))
      .then(setData)
      .catch(() => setError('Report not found'))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <div className="min-h-screen bg-slate-50 p-8 text-center">Loading...</div>;
  if (error) return <div className="min-h-screen bg-slate-50 p-8 text-center text-red-600">{error}</div>;
  if (!data?.auditResult && !data?.id) return <div className="min-h-screen bg-slate-50 p-8 text-center text-slate-500">Report not found.</div>;

  const audit = data.auditResult ?? data;
  const summary = audit?.summary ?? {};
  const scores = summary.scores ?? {};

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="max-w-3xl mx-auto">
        <Link to="/" className="text-[10px] font-bold uppercase tracking-widest text-indigo-600 mb-6 inline-block">
          Back to Audit
        </Link>

        <div className="bg-white rounded-2xl border border-slate-200 p-8 shadow-sm">
          <h1 className="text-xl font-black uppercase text-slate-900 mb-2">
            AI Readiness Report
          </h1>
          <p className="text-sm text-slate-500 mb-6">
            {summary.subjectName ?? data.name} • {summary.url ?? data.url}
          </p>

          <div className="grid grid-cols-3 gap-4 mb-8">
            <div className="bg-slate-50 rounded-xl p-4 text-center">
              <div className="text-2xl font-black text-indigo-600">{scores.overallMaturityIndex ?? '-'}</div>
              <div className="text-[10px] font-bold uppercase text-slate-500">Overall</div>
            </div>
            <div className="bg-slate-50 rounded-xl p-4 text-center">
              <div className="text-2xl font-black text-slate-900">{scores.aiVisibility ?? '-'}</div>
              <div className="text-[10px] font-bold uppercase text-slate-500">AI Visibility</div>
            </div>
            <div className="bg-slate-50 rounded-xl p-4 text-center">
              <div className="text-2xl font-black text-slate-900">{scores.citationLikelihood ?? '-'}</div>
              <div className="text-[10px] font-bold uppercase text-slate-500">Citation</div>
            </div>
          </div>

          <h2 className="text-sm font-black uppercase text-slate-900 mb-2">Verdict</h2>
          <p className="text-slate-700 mb-6">{summary.tier1Verdict ?? '-'} — {summary.verdictMeaning ?? ''}</p>

          {data.clientBriefing?.summary && (
            <>
              <h2 className="text-sm font-black uppercase text-slate-900 mb-2">Executive Summary</h2>
              <p className="text-slate-700 mb-6">{data.clientBriefing.summary}</p>
            </>
          )}

          {((data.findings?.length) ? data.findings : audit.keyFindings)?.length > 0 && (
            <>
              <h2 className="text-sm font-black uppercase text-slate-900 mb-2">Key Findings</h2>
              <ul className="list-disc pl-5 space-y-2 text-slate-700 mb-6">
                {(data.findings ?? audit.keyFindings ?? []).map((f: any, i: number) => (
                  <li key={i}>{f.label} ({f.confidence}%)</li>
                ))}
              </ul>
            </>
          )}

          {data.verifications?.length > 0 && (
            <>
              <h2 className="text-sm font-black uppercase text-slate-900 mb-2">Query Verification</h2>
              <p className="text-xs text-slate-600 mb-3">Test results from ChatGPT/Perplexity:</p>
              <ul className="space-y-3 mb-6">
                {data.verifications.map((v: { query: string; result?: string; pastedResponse?: string }, i: number) => (
                  <li key={i} className="bg-slate-50 rounded-lg p-3 text-sm">
                    <p className="font-bold text-slate-900">"{v.query}"</p>
                    <p className="text-xs mt-1">
                      Result: <span className={v.result === 'cited' ? 'text-emerald-600' : v.result === 'mentioned' ? 'text-amber-600' : 'text-slate-600'}>{v.result ?? '—'}</span>
                    </p>
                    {v.pastedResponse && (
                      <p className="text-xs text-slate-500 mt-2 line-clamp-2">{v.pastedResponse}</p>
                    )}
                  </li>
                ))}
              </ul>
            </>
          )}

          <p className="text-[9px] text-slate-400 mt-8">
            AISO Instrument • Generated {data.createdAt ? new Date(data.createdAt).toLocaleString() : ''}
          </p>
        </div>
      </div>
    </div>
  );
}
