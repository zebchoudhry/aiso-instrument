import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import CitationIQLogo from '../components/CitationIQLogo';
import { SectionIntro, SurfaceCard } from '../components/VisualSystem';
import type { MonitorDeltaSummary, MonitorMonthlySummary, MonitorRecord } from '../types';

interface AuditRow {
  id: string;
  url: string;
  name: string;
  scores: { overallMaturityIndex?: number } | null;
  created_at: string;
}

interface MonitorListItem {
  monitor: MonitorRecord | null;
  summary: MonitorDeltaSummary;
  monthlySummary: MonitorMonthlySummary;
}

function formatDelta(value: number | null) {
  if (value === null) return 'New baseline';
  return value > 0 ? `+${value}` : `${value}`;
}

function deltaTone(value: number | null) {
  if (value === null) return 'text-slate-500';
  if (value > 0) return 'text-emerald-600';
  if (value < 0) return 'text-rose-600';
  return 'text-slate-900';
}

export default function Admin() {
  const [audits, setAudits] = useState<AuditRow[]>([]);
  const [monitors, setMonitors] = useState<MonitorListItem[]>([]);
  const [config, setConfig] = useState({ companyName: '', logoUrl: '', primaryColor: '' });
  const [tab, setTab] = useState<'monitoring' | 'runs' | 'audits' | 'alerts' | 'config'>('monitoring');
  const [alerts, setAlerts] = useState<Array<{ id: string; monitor_id: string; message: string; severity: string; rule_type: string; created_at: string }>>([]);
  const [runs, setRuns] = useState<Array<{ id: string; monitor_id: string; domain: string; displayName: string; trigger_type: string; status: string; overall_score: number; created_at: string; error_message?: string }>>([]);
  const [loadingRuns, setLoadingRuns] = useState(false);
  const [loadingAudits, setLoadingAudits] = useState(true);
  const [loadingMonitors, setLoadingMonitors] = useState(true);
  const [loadingAlerts, setLoadingAlerts] = useState(false);
  const [runningDomain, setRunningDomain] = useState<string | null>(null);
  const [enrollAuditId, setEnrollAuditId] = useState('');
  const [enrollUrl, setEnrollUrl] = useState('');
  const [enrollName, setEnrollName] = useState('');
  const [enrollCadence, setEnrollCadence] = useState<'manual' | 'monthly' | 'weekly'>('monthly');
  const [enrolling, setEnrolling] = useState(false);
  const [enrollError, setEnrollError] = useState<string | null>(null);

  const loadAudits = () => {
    setLoadingAudits(true);
    fetch('/api/admin/audits')
      .then((r) => r.json())
      .then((d) => setAudits(d.audits ?? []))
      .catch(() => setAudits([]))
      .finally(() => setLoadingAudits(false));
  };

  const loadMonitors = () => {
    setLoadingMonitors(true);
    fetch('/api/monitors')
      .then((r) => r.json())
      .then((d) => setMonitors(d.monitors ?? []))
      .catch(() => setMonitors([]))
      .finally(() => setLoadingMonitors(false));
  };

  const loadRuns = () => {
    setLoadingRuns(true);
    fetch('/api/monitor-runs?limit=30')
      .then((r) => r.json())
      .then((d) => setRuns(d.runs ?? []))
      .catch(() => setRuns([]))
      .finally(() => setLoadingRuns(false));
  };

  const loadAlerts = () => {
    setLoadingAlerts(true);
    fetch('/api/alerts?resolved=false')
      .then((r) => r.json())
      .then((d) => setAlerts(d.alerts ?? []))
      .catch(() => setAlerts([]))
      .finally(() => setLoadingAlerts(false));
  };

  useEffect(() => {
    loadAudits();
    loadMonitors();
    loadAlerts();
    loadRuns();
  }, []);

  useEffect(() => {
    fetch('/api/config')
      .then((r) => r.json())
      .then(setConfig)
      .catch(() => {});
  }, []);

  const handleConfigSave = () => {
    fetch('/api/config', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(config),
    })
      .then((r) => r.json())
      .then(setConfig)
      .catch(() => {});
  };

  const handleRunMonitor = async (domain: string) => {
    setRunningDomain(domain);
    try {
      const response = await fetch('/api/monitors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'run', domain }),
      });
      if (!response.ok) {
        throw new Error('Monitoring run failed');
      }
      await Promise.all([loadMonitors(), loadAudits(), loadAlerts()]);
    } catch (error) {
      console.error(error);
    } finally {
      setRunningDomain(null);
    }
  };

  const handleEnroll = async () => {
    setEnrollError(null);
    const auditId = enrollAuditId.trim() || undefined;
    const url = enrollUrl.trim() || undefined;
    const name = enrollName.trim() || undefined;
    if (!auditId && !url) {
      setEnrollError('Select an audit or enter a URL to enroll.');
      return;
    }
    setEnrolling(true);
    try {
      const body: Record<string, unknown> = { action: 'enroll', cadence: enrollCadence };
      if (auditId) body.auditId = auditId;
      if (url) body.url = url;
      if (name) body.name = name;
      const response = await fetch('/api/monitors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error((data as { error?: string }).error ?? response.statusText);
      }
      setEnrollAuditId('');
      setEnrollUrl('');
      setEnrollName('');
      await Promise.all([loadMonitors(), loadAudits(), loadRuns()]);
    } catch (err) {
      setEnrollError(err instanceof Error ? err.message : 'Enroll failed');
    } finally {
      setEnrolling(false);
    }
  };

  const [monitorFilter, setMonitorFilter] = useState<'all' | 'regressing' | 'healthy' | 'at_risk'>('all');
  const [monitorSort, setMonitorSort] = useState<'domain' | 'score' | 'change'>('domain');

  const portfolioSummary = useMemo(() => {
    const activeMonitors = monitors.filter((item) => item.monitor?.status === 'active').length;
    const scoredMonitors = monitors.filter((item) => item.summary.latestScore !== null);
    const averageLatestScore =
      scoredMonitors.length > 0
        ? Math.round(
            scoredMonitors.reduce((sum, item) => sum + (item.summary.latestScore ?? 0), 0) / scoredMonitors.length
          )
        : null;
    const regressions = monitors.filter((item) => (item.summary.changeVsPrevious ?? 0) < 0).length;

    return { activeMonitors, averageLatestScore, regressions };
  }, [monitors]);

  const filteredAndSortedMonitors = useMemo(() => {
    let list = monitors;
    if (monitorFilter === 'regressing') list = list.filter((item) => (item.summary.changeVsPrevious ?? 0) < 0);
    else if (monitorFilter === 'healthy') list = list.filter((item) => (item.summary.changeVsPrevious ?? 0) >= 0 && (item.summary.latestScore ?? 0) >= 60);
    else if (monitorFilter === 'at_risk') list = list.filter((item) => (item.summary.latestScore ?? 0) < 60 || (item.summary.changeVsPrevious ?? 0) < 0);
    if (monitorSort === 'score') list = [...list].sort((a, b) => (b.summary.latestScore ?? 0) - (a.summary.latestScore ?? 0));
    else if (monitorSort === 'change') list = [...list].sort((a, b) => (a.summary.changeVsPrevious ?? 0) - (b.summary.changeVsPrevious ?? 0));
    else list = [...list].sort((a, b) => (a.monitor?.domain ?? '').localeCompare(b.monitor?.domain ?? ''));
    return list;
  }, [monitors, monitorFilter, monitorSort]);

  return (
    <div className="min-h-screen bg-slate-50 p-6 md:p-8">
      <div className="mx-auto max-w-7xl space-y-8">
        <div className="flex flex-col gap-4 rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm md:flex-row md:items-center md:justify-between">
          <div className="space-y-4">
            <CitationIQLogo size="sm" />
            <SectionIntro
              label="Admin"
              title="Monitoring dashboard"
              description="Track monitored domains, run monthly checks manually, and review the latest regressions before clients ask."
            />
          </div>
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-2xl border border-slate-200 px-5 py-3 text-[10px] font-black uppercase tracking-[0.2em] text-indigo-600 hover:border-indigo-200 hover:bg-indigo-50"
          >
            Back to Audit
          </Link>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <SurfaceCard tone="light" className="rounded-[2rem] p-6">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Active monitors</p>
            <p className="mt-3 text-3xl font-black tracking-tight text-slate-900">{portfolioSummary.activeMonitors}</p>
          </SurfaceCard>
          <SurfaceCard tone="light" className="rounded-[2rem] p-6">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Average latest score</p>
            <p className="mt-3 text-3xl font-black tracking-tight text-slate-900">
              {portfolioSummary.averageLatestScore ?? '-'}
            </p>
          </SurfaceCard>
          <SurfaceCard tone="light" className="rounded-[2rem] p-6">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Domains regressing</p>
            <p className="mt-3 text-3xl font-black tracking-tight text-slate-900">{portfolioSummary.regressions}</p>
          </SurfaceCard>
        </div>

        <div className="flex gap-6 border-b border-slate-200">
          {[
            ['monitoring', 'Monitoring'],
            ['runs', 'Run logs'],
            ['audits', 'Audits'],
            ['alerts', `Alerts (${alerts.length})`],
            ['config', 'Config'],
          ].map(([id, label]) => (
            <button
              key={id}
              onClick={() => setTab(id as 'monitoring' | 'runs' | 'audits' | 'alerts' | 'config')}
              className={`pb-3 text-[10px] font-black uppercase tracking-[0.2em] ${
                tab === id ? 'border-b-2 border-indigo-600 text-indigo-600' : 'text-slate-400'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {tab === 'monitoring' && (
          <SurfaceCard tone="light" className="rounded-[2rem] p-6 md:p-8">
            {loadingMonitors ? (
              <div className="py-16 text-center text-slate-500">Loading monitoring portfolio...</div>
            ) : (
              <div className="space-y-6">
                <div className="rounded-[1.5rem] border border-slate-200 bg-slate-50/50 p-5">
                  <p className="mb-3 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Enroll a domain</p>
                  <div className="flex flex-wrap items-end gap-4">
                    <div className="min-w-[200px]">
                      <label className="mb-1 block text-xs font-medium text-slate-600">From existing audit</label>
                      <select
                        value={enrollAuditId}
                        onChange={(e) => setEnrollAuditId(e.target.value)}
                        className="w-full rounded-xl border border-slate-200 px-4 py-2 text-sm text-slate-700"
                      >
                        <option value="">— or enter URL below —</option>
                        {audits.map((a) => (
                          <option key={a.id} value={a.id}>
                            {a.name || a.url}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="min-w-[220px]">
                      <label className="mb-1 block text-xs font-medium text-slate-600">URL (if no audit)</label>
                      <input
                        type="url"
                        value={enrollUrl}
                        onChange={(e) => setEnrollUrl(e.target.value)}
                        placeholder="https://example.com"
                        className="w-full rounded-xl border border-slate-200 px-4 py-2 text-sm text-slate-700"
                      />
                    </div>
                    <div className="min-w-[140px]">
                      <label className="mb-1 block text-xs font-medium text-slate-600">Display name</label>
                      <input
                        type="text"
                        value={enrollName}
                        onChange={(e) => setEnrollName(e.target.value)}
                        placeholder="Optional"
                        className="w-full rounded-xl border border-slate-200 px-4 py-2 text-sm text-slate-700"
                      />
                    </div>
                    <div className="min-w-[120px]">
                      <label className="mb-1 block text-xs font-medium text-slate-600">Cadence</label>
                      <select
                        value={enrollCadence}
                        onChange={(e) => setEnrollCadence(e.target.value as 'manual' | 'monthly' | 'weekly')}
                        className="w-full rounded-xl border border-slate-200 px-4 py-2 text-sm text-slate-700"
                      >
                        <option value="manual">Manual</option>
                        <option value="monthly">Monthly</option>
                        <option value="weekly">Weekly</option>
                      </select>
                    </div>
                    <button
                      onClick={handleEnroll}
                      disabled={enrolling || (!enrollAuditId.trim() && !enrollUrl.trim())}
                      className="rounded-xl bg-indigo-600 px-5 py-2.5 text-[10px] font-black uppercase tracking-[0.2em] text-white hover:bg-indigo-500 disabled:bg-slate-300"
                    >
                      {enrolling ? 'Enrolling...' : 'Enable Monthly Monitoring'}
                    </button>
                  </div>
                  {enrollError && <p className="mt-3 text-sm text-rose-600">{enrollError}</p>}
                </div>

                {monitors.length === 0 ? (
                  <div className="py-12 text-center text-slate-500">
                    No domains enrolled yet. Run an audit, then use the form above to enroll, or enter a URL and click Enable Monthly Monitoring.
                  </div>
                ) : (
                  <div className="space-y-4">
                <div className="flex flex-wrap gap-4 pb-4">
                  <select
                    value={monitorFilter}
                    onChange={(e) => setMonitorFilter(e.target.value as typeof monitorFilter)}
                    className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700"
                  >
                    <option value="all">All monitors</option>
                    <option value="regressing">Regressing</option>
                    <option value="at_risk">At risk</option>
                    <option value="healthy">Healthy</option>
                  </select>
                  <select
                    value={monitorSort}
                    onChange={(e) => setMonitorSort(e.target.value as typeof monitorSort)}
                    className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700"
                  >
                    <option value="domain">Sort by domain</option>
                    <option value="score">Sort by score</option>
                    <option value="change">Sort by change</option>
                  </select>
                </div>
                {filteredAndSortedMonitors.map((item) => {
                  const monitor = item.monitor;
                  if (!monitor) return null;

                  return (
                    <div
                      key={monitor.domain}
                      className="grid gap-4 rounded-[1.75rem] border border-slate-200 bg-slate-50 p-5 lg:grid-cols-[minmax(0,1.4fr)_repeat(4,minmax(0,0.75fr))]"
                    >
                      <div className="space-y-3">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-lg font-black tracking-tight text-slate-900">{monitor.displayName}</p>
                          <span className="rounded-full bg-white px-3 py-1 text-[9px] font-black uppercase tracking-[0.2em] text-slate-500">
                            {monitor.cadence}
                          </span>
                          <span className="rounded-full bg-emerald-50 px-3 py-1 text-[9px] font-black uppercase tracking-[0.2em] text-emerald-700">
                            {monitor.status}
                          </span>
                        </div>
                        <p className="text-sm text-slate-600">{monitor.url}</p>
                        <p className="text-sm text-slate-500">{item.monthlySummary.headline}</p>
                      </div>
                      <div>
                        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Latest</p>
                        <p className="mt-2 text-2xl font-black text-slate-900">{item.summary.latestScore ?? '-'}</p>
                      </div>
                      <div>
                        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Vs previous</p>
                        <p className={`mt-2 text-2xl font-black ${deltaTone(item.summary.changeVsPrevious)}`}>
                          {formatDelta(item.summary.changeVsPrevious)}
                        </p>
                      </div>
                      <div>
                        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Vs baseline</p>
                        <p className={`mt-2 text-2xl font-black ${deltaTone(item.summary.changeVsBaseline)}`}>
                          {formatDelta(item.summary.changeVsBaseline)}
                        </p>
                      </div>
                      <div className="space-y-3">
                        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Actions</p>
                        <div className="flex flex-wrap gap-2">
                          <button
                            onClick={() => handleRunMonitor(monitor.domain)}
                            disabled={runningDomain === monitor.domain}
                            className="rounded-xl bg-indigo-600 px-4 py-2 text-[10px] font-black uppercase tracking-[0.2em] text-white hover:bg-indigo-500 disabled:bg-slate-300"
                          >
                            {runningDomain === monitor.domain ? 'Running...' : 'Run Monthly Check'}
                          </button>
                          <Link
                            to={`/trends?domain=${encodeURIComponent(monitor.domain)}`}
                            className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-[10px] font-black uppercase tracking-[0.2em] text-slate-700 hover:border-indigo-200 hover:text-indigo-600"
                          >
                            View Detail
                          </Link>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
                )}
              </div>
            )}
          </SurfaceCard>
        )}

        {tab === 'runs' && (
          <SurfaceCard tone="light" className="overflow-hidden rounded-[2rem] p-0">
            {loadingRuns ? (
              <div className="p-10 text-center text-slate-500">Loading run logs...</div>
            ) : runs.length === 0 ? (
              <div className="p-10 text-center text-slate-500">No monitor runs yet.</div>
            ) : (
              <table className="w-full text-sm">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="p-4 text-left text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Date</th>
                    <th className="p-4 text-left text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Domain</th>
                    <th className="p-4 text-left text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Trigger</th>
                    <th className="p-4 text-left text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Status</th>
                    <th className="p-4 text-left text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Score</th>
                    <th className="p-4 text-left text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {runs.map((r) => (
                    <tr key={r.id} className="border-t border-slate-100">
                      <td className="p-4 text-slate-600">{new Date(r.created_at).toLocaleString()}</td>
                      <td className="p-4 font-medium text-slate-900">{r.displayName ?? r.domain ?? '—'}</td>
                      <td className="p-4 text-slate-600">{r.trigger_type}</td>
                      <td className="p-4">
                        <span
                          className={`rounded px-2 py-0.5 text-[9px] font-black uppercase ${
                            r.status === 'succeeded' ? 'bg-emerald-100 text-emerald-700' : r.status === 'failed' ? 'bg-rose-100 text-rose-700' : 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          {r.status}
                        </span>
                        {r.error_message && <span className="ml-2 text-xs text-rose-600" title={r.error_message}>!</span>}
                      </td>
                      <td className="p-4 text-slate-900">{r.overall_score ?? '—'}</td>
                      <td className="p-4">
                        {r.domain && (
                          <Link to={`/trends?domain=${encodeURIComponent(r.domain)}`} className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-600 hover:underline">
                            View
                          </Link>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </SurfaceCard>
        )}

        {tab === 'audits' && (
          <SurfaceCard tone="light" className="overflow-hidden rounded-[2rem] p-0">
            {loadingAudits ? (
              <div className="p-10 text-center text-slate-500">Loading audits...</div>
            ) : audits.length === 0 ? (
              <div className="p-10 text-center text-slate-500">No audits yet.</div>
            ) : (
              <table className="w-full text-sm">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="p-4 text-left text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Date</th>
                    <th className="p-4 text-left text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Name</th>
                    <th className="p-4 text-left text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">URL</th>
                    <th className="p-4 text-left text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Score</th>
                    <th className="p-4 text-left text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {audits.map((audit) => (
                    <tr key={audit.id} className="border-t border-slate-100">
                      <td className="p-4 text-slate-600">{new Date(audit.created_at).toLocaleDateString()}</td>
                      <td className="p-4 font-medium text-slate-900">{audit.name}</td>
                      <td className="max-w-[260px] truncate p-4 text-slate-600">{audit.url}</td>
                      <td className="p-4 text-slate-900">{audit.scores?.overallMaturityIndex ?? '-'}</td>
                      <td className="p-4">
                        <Link to={`/report/${audit.id}`} className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-600 hover:underline">
                          View report
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </SurfaceCard>
        )}

        {tab === 'alerts' && (
          <SurfaceCard tone="light" className="overflow-hidden rounded-[2rem] p-0">
            {loadingAlerts ? (
              <div className="p-10 text-center text-slate-500">Loading alerts...</div>
            ) : alerts.length === 0 ? (
              <div className="p-10 text-center text-slate-500">No unresolved alerts.</div>
            ) : (
              <div className="divide-y divide-slate-100">
                {alerts.map((a) => (
                  <div key={a.id} className="flex items-start justify-between gap-4 p-5">
                    <div>
                      <span
                        className={`rounded px-2 py-0.5 text-[9px] font-black uppercase ${
                          a.severity === 'high' ? 'bg-rose-100 text-rose-700' : a.severity === 'medium' ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {a.rule_type}
                      </span>
                      <p className="mt-2 text-sm font-medium text-slate-900">{a.message}</p>
                      <p className="mt-1 text-xs text-slate-500">{new Date(a.created_at).toLocaleString()}</p>
                    </div>
                    <Link
                      to={`/trends?domain=${encodeURIComponent(monitors.find((m) => m.monitor?.id === a.monitor_id)?.monitor?.domain ?? '')}`}
                      className="shrink-0 text-[10px] font-black uppercase tracking-[0.2em] text-indigo-600 hover:underline"
                    >
                      View domain
                    </Link>
                  </div>
                ))}
              </div>
            )}
          </SurfaceCard>
        )}

        {tab === 'config' && (
          <SurfaceCard tone="light" className="rounded-[2rem] p-6 md:p-8">
            <div className="space-y-5">
              <div>
                <label className="mb-2 block text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Company Name</label>
                <input
                  value={config.companyName}
                  onChange={(e) => setConfig((c) => ({ ...c, companyName: e.target.value }))}
                  className="w-full rounded-2xl border border-slate-200 px-4 py-3"
                />
              </div>
              <div>
                <label className="mb-2 block text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Logo URL</label>
                <input
                  value={config.logoUrl}
                  onChange={(e) => setConfig((c) => ({ ...c, logoUrl: e.target.value }))}
                  className="w-full rounded-2xl border border-slate-200 px-4 py-3"
                  placeholder="https://..."
                />
              </div>
              <div>
                <label className="mb-2 block text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Primary Color</label>
                <input
                  value={config.primaryColor}
                  onChange={(e) => setConfig((c) => ({ ...c, primaryColor: e.target.value }))}
                  className="w-full rounded-2xl border border-slate-200 px-4 py-3"
                  placeholder="#4F46E5"
                />
              </div>
              <button
                onClick={handleConfigSave}
                className="rounded-2xl bg-indigo-600 px-6 py-3 text-[10px] font-black uppercase tracking-[0.2em] text-white hover:bg-indigo-500"
              >
                Save Config
              </button>
            </div>
          </SurfaceCard>
        )}
      </div>
    </div>
  );
}
