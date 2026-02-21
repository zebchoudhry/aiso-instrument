import React, { useEffect, useState } from 'react';
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

interface AuditRow {
  id: string;
  url: string;
  name: string;
  scores: { overallMaturityIndex?: number; aiVisibility?: number; citationLikelihood?: number } | null;
  created_at: string;
}

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
  const [audits, setAudits] = useState<AuditRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (domainParam) setDomain(domainParam);
  }, [domainParam]);

  useEffect(() => {
    if (!domain.trim()) {
      setAudits([]);
      return;
    }
    setLoading(true);
    setError(null);
    fetch(`/api/audits?domain=${encodeURIComponent(domain.trim())}&limit=50&order=asc`)
      .then((r) => r.json())
      .then((d) => setAudits(d.audits ?? []))
      .catch((e) => {
        setError(e instanceof Error ? e.message : 'Failed to load audits');
        setAudits([]);
      })
      .finally(() => setLoading(false));
  }, [domain]);

  const chartData = audits.map((a) => ({
    date: formatDate(a.created_at),
    fullDate: a.created_at,
    score: a.scores?.overallMaturityIndex ?? 0,
    aiVisibility: a.scores?.aiVisibility ?? a.scores?.overallMaturityIndex ?? 0,
    citationLikelihood: a.scores?.citationLikelihood ?? a.scores?.overallMaturityIndex ?? 0
  }));

  const firstScore = chartData[0]?.score ?? null;
  const latestScore = chartData.length > 0 ? chartData[chartData.length - 1]?.score ?? null : null;
  const change = firstScore !== null && latestScore !== null ? latestScore - firstScore : null;

  return (
    <div className="min-h-screen bg-slate-50 p-6 md:p-12">
      <div className="max-w-4xl mx-auto space-y-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <Link to="/" className="text-indigo-600 hover:underline text-sm font-bold uppercase tracking-widest">
              ← Back to Audit
            </Link>
            <h1 className="text-2xl font-black uppercase tracking-tight text-slate-900 mt-2">
              Visibility Trends
            </h1>
            <p className="text-slate-500 text-sm mt-1">
              Track AI readiness scores over time for a domain
            </p>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-6">
          <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">
            Domain (e.g. avios.com or fozias.co.uk)
          </label>
          <input
            type="text"
            value={domain}
            onChange={(e) => setDomain(e.target.value)}
            placeholder="avios.com"
            className="w-full px-4 py-3 border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          />
        </div>

        {loading && (
          <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center text-slate-500">
            Loading audits...
          </div>
        )}

        {error && (
          <div className="bg-rose-50 border border-rose-200 rounded-2xl p-6 text-rose-700">
            {error}
          </div>
        )}

        {!loading && !error && domain.trim() && audits.length === 0 && (
          <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center text-slate-500">
            No audits found for this domain. Run an audit first to see trends.
          </div>
        )}

        {!loading && !error && chartData.length > 0 && (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="bg-white border border-slate-200 rounded-xl p-4">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">First</span>
                <p className="text-2xl font-black text-slate-900">{firstScore ?? '-'}/100</p>
              </div>
              <div className="bg-white border border-slate-200 rounded-xl p-4">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Latest</span>
                <p className="text-2xl font-black text-slate-900">{latestScore ?? '-'}/100</p>
              </div>
              <div className="bg-white border border-slate-200 rounded-xl p-4">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Change</span>
                <p className={`text-2xl font-black ${change !== null && change > 0 ? 'text-emerald-600' : change !== null && change < 0 ? 'text-rose-600' : 'text-slate-900'}`}>
                  {change !== null ? (change >= 0 ? `+${change}` : change) : '-'}
                </p>
              </div>
              <div className="bg-white border border-slate-200 rounded-xl p-4">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Data Points</span>
                <p className="text-2xl font-black text-slate-900">{chartData.length}</p>
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl p-6">
              <h2 className="text-sm font-bold text-slate-700 uppercase tracking-widest mb-4">
                AI Readiness Score Over Time
              </h2>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="date" tick={{ fontSize: 11 }} stroke="#94a3b8" />
                    <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} stroke="#94a3b8" />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '12px' }}
                      labelFormatter={(_, payload) => payload[0]?.payload?.fullDate && formatDate(payload[0].payload.fullDate)}
                      formatter={(value: number) => [`${value}/100`, 'Score']}
                    />
                    <Line
                      type="monotone"
                      dataKey="score"
                      stroke="#4f46e5"
                      strokeWidth={2}
                      dot={{ r: 4 }}
                      activeDot={{ r: 6 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
