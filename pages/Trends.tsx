import React, { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid
} from 'recharts';
import VisusLogo from '../components/VisusLogo';
import { SectionIntro, SurfaceCard } from '../components/VisualSystem';
import type { MonitorDetailResponse } from '../types';

function formatDate(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: '2-digit' });
  } catch {
    return iso;
  }
}

export default function Trends() {
  const [searchParams] = useSearchParams();
  const domainParam = searchParams.get('domain') ?? '';

  const [domain, setDomain] = useState(domainParam || '');
  const [detail, setDetail] = useState<MonitorDetailResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (domainParam) setDomain(domainParam);
  }, [domainParam]);

  useEffect(() => {
    if (!domain.trim()) {
      setDetail(null);
      return;
    }
    setLoading(true);
    setError(null);
    fetch(`/api/monitors?domain=${encodeURIComponent(domain.trim())}`)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error('Failed to load monitor detail'))))
      .then((d) => setDetail(d))
      .catch((e) => {
        setError(e instanceof Error ? e.message : 'Failed to load audits');
        setDetail(null);
      })
      .finally(() => setLoading(false));
  }, [domain]);

  const chartData = useMemo(
    () =>
      (detail?.runs ?? []).map((run) => ({
        date: formatDate(run.createdAt),
        fullDate: run.createdAt,
        score: run.overallScore,
        aiVisibility: run.aiVisibility,
        citationLikelihood: run.citationLikelihood,
        mentionRate: run.mentionRate !== null ? Math.round(run.mentionRate * 100) : null,
        citationRate: run.citationRate !== null ? Math.round(run.citationRate * 100) : null,
      })),
    [detail]
  );

  const latestRun = detail?.runs[detail.runs.length - 1] ?? null;

  const handleRunMonitor = async () => {
    if (!detail?.monitor?.domain) return;
    setRunning(true);
    setError(null);
    try {
      const response = await fetch('/api/monitors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'run', domain: detail.monitor.domain }),
      });
      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body?.details ?? body?.error ?? 'Monitoring run failed');
      }
      const refreshed: MonitorDetailResponse = await response.json();
      setDetail(refreshed);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Monitoring run failed');
    } finally {
      setRunning(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 p-6 md:p-12">
      <div className="mx-auto max-w-6xl space-y-8">
        <div className="flex flex-col gap-4 rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm md:flex-row md:items-center md:justify-between">
          <div className="space-y-4">
            <VisusLogo size="sm" />
            <SectionIntro
              label="Monitoring Detail"
              title="Latest vs previous vs baseline"
              description="Use this page to run the monthly check, review trend lines, and turn monitoring changes into the next recommended action."
            />
          </div>
          <Link to="/admin" className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-600 hover:text-indigo-500">
            Back to Admin
          </Link>
        </div>

        <SurfaceCard tone="light" className="rounded-[2rem] p-6">
          <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">
            Monitored domain
          </label>
          <input
            type="text"
            value={domain}
            onChange={(e) => setDomain(e.target.value)}
            placeholder="avios.com"
            className="w-full px-4 py-3 border border-slate-200 rounded-2xl text-slate-900 placeholder-slate-400 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          />
        </SurfaceCard>

        {loading && (
          <SurfaceCard tone="light" className="rounded-[2rem] p-12 text-center text-slate-500">
            Loading monitoring detail...
          </SurfaceCard>
        )}

        {error && (
          <SurfaceCard tone="light" className="rounded-[2rem] border-rose-200 bg-rose-50 p-6 text-rose-700">
            {error}
          </SurfaceCard>
        )}

        {!loading && !error && domain.trim() && !detail?.monitor && (
          <SurfaceCard tone="light" className="rounded-[2rem] p-12 text-center text-slate-500">
            This domain is not enrolled in monitoring yet. Run an audit, then enable monthly monitoring from the results dashboard.
          </SurfaceCard>
        )}

        {!loading && !error && detail?.monitor && (
          <>
            <div className="grid gap-4 md:grid-cols-5">
              <SurfaceCard tone="light" className="rounded-[1.75rem] p-5">
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Latest</span>
                <p className="mt-3 text-3xl font-black text-slate-900">{detail.summary.latestScore ?? '-'}</p>
              </SurfaceCard>
              <SurfaceCard tone="light" className="rounded-[1.75rem] p-5">
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Previous</span>
                <p className="mt-3 text-3xl font-black text-slate-900">{detail.summary.previousScore ?? '-'}</p>
              </SurfaceCard>
              <SurfaceCard tone="light" className="rounded-[1.75rem] p-5">
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Baseline</span>
                <p className="mt-3 text-3xl font-black text-slate-900">{detail.summary.baselineScore ?? '-'}</p>
              </SurfaceCard>
              <SurfaceCard tone="light" className="rounded-[1.75rem] p-5">
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Vs previous</span>
                <p className={`mt-3 text-3xl font-black ${detail.summary.changeVsPrevious !== null && detail.summary.changeVsPrevious > 0 ? 'text-emerald-600' : detail.summary.changeVsPrevious !== null && detail.summary.changeVsPrevious < 0 ? 'text-rose-600' : 'text-slate-900'}`}>
                  {detail.summary.changeVsPrevious === null
                    ? 'New'
                    : detail.summary.changeVsPrevious > 0
                      ? `+${detail.summary.changeVsPrevious}`
                      : detail.summary.changeVsPrevious}
                </p>
              </SurfaceCard>
              <SurfaceCard tone="light" className="rounded-[1.75rem] p-5">
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Runs</span>
                <p className="mt-3 text-3xl font-black text-slate-900">{detail.summary.runCount}</p>
              </SurfaceCard>
            </div>

            <div className="grid gap-6 lg:grid-cols-[minmax(0,1.3fr)_minmax(320px,0.7fr)]">
              <SurfaceCard tone="light" className="rounded-[2rem] p-6">
                <div className="mb-5 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                  <div>
                    <h2 className="text-sm font-black uppercase tracking-[0.2em] text-slate-500">
                      Visibility score trend
                    </h2>
                    <p className="mt-2 text-sm text-slate-600">
                      Follow overall score, AI visibility, and citation likelihood over time.
                    </p>
                  </div>
                  <button
                    onClick={handleRunMonitor}
                    disabled={running}
                    className="rounded-2xl bg-indigo-600 px-5 py-3 text-[10px] font-black uppercase tracking-[0.2em] text-white hover:bg-indigo-500 disabled:bg-slate-300"
                  >
                    {running ? 'Running Monthly Check...' : 'Run Monthly Check'}
                  </button>
                </div>
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                      <XAxis dataKey="date" tick={{ fontSize: 11 }} stroke="#94a3b8" />
                      <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} stroke="#94a3b8" />
                      <Tooltip
                        contentStyle={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '12px' }}
                        labelFormatter={(_, payload) =>
                          payload[0]?.payload?.fullDate ? formatDate(payload[0].payload.fullDate) : ''
                        }
                      />
                      <Line type="monotone" dataKey="score" stroke="#4f46e5" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                      <Line type="monotone" dataKey="aiVisibility" stroke="#0f172a" strokeWidth={2} dot={{ r: 3 }} />
                      <Line type="monotone" dataKey="citationLikelihood" stroke="#14b8a6" strokeWidth={2} dot={{ r: 3 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </SurfaceCard>

              <div className="space-y-6">
                <SurfaceCard tone="soft" className="rounded-[2rem] p-6">
                  <h2 className="text-sm font-black uppercase tracking-[0.2em] text-slate-500">Monthly summary</h2>
                  <div className="mt-4 space-y-4 text-sm text-slate-700">
                    <p className="font-semibold text-slate-900">{detail.monthlySummary.headline}</p>
                    <p>{detail.monthlySummary.biggestImprovement}</p>
                    <p>{detail.monthlySummary.biggestRegression}</p>
                    <p className="rounded-2xl bg-white p-4 text-slate-900">
                      <span className="block text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
                        Top recommended action
                      </span>
                      <span className="mt-2 block">{detail.monthlySummary.topRecommendedAction}</span>
                      {detail.summary.changeVsPrevious !== null &&
                        detail.summary.changeVsPrevious < 0 &&
                        latestRun?.auditId && (
                          <Link
                            to={`/roadmap/${latestRun.auditId}`}
                            className="mt-4 inline-flex items-center rounded-xl bg-indigo-600 px-4 py-2 text-[10px] font-black uppercase tracking-[0.2em] text-white hover:bg-indigo-500"
                          >
                            View roadmap for next actions
                          </Link>
                        )}
                    </p>
                  </div>
                </SurfaceCard>

                <SurfaceCard tone="light" className="rounded-[2rem] p-6">
                  <h2 className="text-sm font-black uppercase tracking-[0.2em] text-slate-500">Latest snapshot</h2>
                  <div className="mt-4 space-y-3 text-sm text-slate-700">
                    <p>
                      <span className="font-semibold text-slate-900">Domain:</span> {detail.monitor.url}
                    </p>
                    <p>
                      <span className="font-semibold text-slate-900">Last checked:</span>{' '}
                      {detail.summary.lastCheckedAt ? new Date(detail.summary.lastCheckedAt).toLocaleString() : '—'}
                    </p>
                    <p>
                      <span className="font-semibold text-slate-900">Mention rate:</span>{' '}
                      {detail.summary.latestMentionRate !== null
                        ? `${Math.round(detail.summary.latestMentionRate * 100)}%`
                        : 'Not tested yet'}
                    </p>
                    <p>
                      <span className="font-semibold text-slate-900">Citation rate:</span>{' '}
                      {detail.summary.latestCitationRate !== null
                        ? `${Math.round(detail.summary.latestCitationRate * 100)}%`
                        : 'Not tested yet'}
                    </p>
                    <p>
                      <span className="font-semibold text-slate-900">Top blocker:</span> {latestRun?.topFinding ?? 'No key finding captured yet'}
                    </p>
                  </div>
                </SurfaceCard>
              </div>
            </div>

            <SurfaceCard tone="light" className="rounded-[2rem] p-6">
              <h2 className="text-sm font-black uppercase tracking-[0.2em] text-slate-500">Run archive</h2>
              <div className="mt-5 overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 text-left text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">
                      <th className="pb-3">Date</th>
                      <th className="pb-3">Overall</th>
                      <th className="pb-3">AI visibility</th>
                      <th className="pb-3">Citation</th>
                      <th className="pb-3">Top blocker</th>
                      <th className="pb-3">Report</th>
                    </tr>
                  </thead>
                  <tbody>
                    {detail.runs
                      .slice()
                      .reverse()
                      .map((run) => (
                        <tr key={run.id} className="border-b border-slate-100">
                          <td className="py-4 text-slate-600">{new Date(run.createdAt).toLocaleDateString()}</td>
                          <td className="py-4 font-semibold text-slate-900">{run.overallScore}</td>
                          <td className="py-4 text-slate-600">{run.aiVisibility}</td>
                          <td className="py-4 text-slate-600">{run.citationLikelihood}</td>
                          <td className="py-4 text-slate-600">{run.topFinding ?? '—'}</td>
                          <td className="py-4">
                            {run.auditId ? (
                              <Link
                                to={`/report/${run.auditId}`}
                                className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-600 hover:underline"
                              >
                                View report
                              </Link>
                            ) : (
                              <span className="text-slate-400">—</span>
                            )}
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </SurfaceCard>
          </>
        )}
      </div>
    </div>
  );
}
