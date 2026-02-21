import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

interface AuditRow {
  id: string;
  url: string;
  name: string;
  scores: { overallMaturityIndex?: number } | null;
  created_at: string;
}

export default function Admin() {
  const [audits, setAudits] = useState<AuditRow[]>([]);
  const [config, setConfig] = useState({ companyName: '', logoUrl: '', primaryColor: '' });
  const [tab, setTab] = useState<'audits' | 'config'>('audits');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/admin/audits')
      .then((r) => r.json())
      .then((d) => setAudits(d.audits ?? []))
      .catch(() => setAudits([]))
      .finally(() => setLoading(false));
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

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="max-w-5xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-xl font-black uppercase tracking-tight text-slate-900">Admin</h1>
          <Link to="/" className="text-[10px] font-bold uppercase tracking-widest text-indigo-600 hover:text-indigo-700">
            Back to Audit
          </Link>
        </div>

        <div className="flex gap-4 border-b border-slate-200 mb-6">
          <button
            onClick={() => setTab('audits')}
            className={'pb-2 text-[10px] font-black uppercase ' + (tab === 'audits' ? 'text-indigo-600 border-b-2 border-indigo-600' : 'text-slate-400')}
          >
            Audits
          </button>
          <button
            onClick={() => setTab('config')}
            className={'pb-2 text-[10px] font-black uppercase ' + (tab === 'config' ? 'text-indigo-600 border-b-2 border-indigo-600' : 'text-slate-400')}
          >
            Config
          </button>
        </div>

        {tab === 'audits' && (
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            {loading ? (
              <div className="p-8 text-center text-slate-500">Loading...</div>
            ) : audits.length === 0 ? (
              <div className="p-8 text-center text-slate-500">No audits yet.</div>
            ) : (
              <table className="w-full text-sm">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="text-left p-4 font-bold text-[10px] uppercase">Date</th>
                    <th className="text-left p-4 font-bold text-[10px] uppercase">Name</th>
                    <th className="text-left p-4 font-bold text-[10px] uppercase">URL</th>
                    <th className="text-left p-4 font-bold text-[10px] uppercase">Score</th>
                    <th className="text-left p-4 font-bold text-[10px] uppercase"></th>
                  </tr>
                </thead>
                <tbody>
                  {audits.map((a) => (
                    <tr key={a.id} className="border-t border-slate-100">
                      <td className="p-4 text-slate-600">{new Date(a.created_at).toLocaleDateString()}</td>
                      <td className="p-4">{a.name}</td>
                      <td className="p-4 text-slate-600 truncate max-w-[200px]">{a.url}</td>
                      <td className="p-4">{a.scores?.overallMaturityIndex ?? '-'}</td>
                      <td className="p-4">
                        <Link to={`/report/${a.id}`} className="text-[10px] font-bold text-indigo-600 hover:underline">
                          View
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {tab === 'config' && (
          <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-4">
            <div>
              <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">Company Name</label>
              <input
                value={config.companyName}
                onChange={(e) => setConfig((c) => ({ ...c, companyName: e.target.value }))}
                className="w-full px-4 py-3 rounded-xl border border-slate-200"
              />
            </div>
            <div>
              <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">Logo URL</label>
              <input
                value={config.logoUrl}
                onChange={(e) => setConfig((c) => ({ ...c, logoUrl: e.target.value }))}
                className="w-full px-4 py-3 rounded-xl border border-slate-200"
                placeholder="https://..."
              />
            </div>
            <div>
              <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">Primary Color</label>
              <input
                value={config.primaryColor}
                onChange={(e) => setConfig((c) => ({ ...c, primaryColor: e.target.value }))}
                className="w-full px-4 py-3 rounded-xl border border-slate-200"
                placeholder="#4F46E5"
              />
            </div>
            <button
              onClick={handleConfigSave}
              className="px-6 py-3 bg-indigo-600 text-white rounded-xl text-[10px] font-black uppercase"
            >
              Save Config
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
