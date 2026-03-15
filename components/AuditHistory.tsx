import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

interface AuditRow {
  id: string;
  url: string;
  name: string;
  scores: { overallMaturityIndex?: number } | null;
  created_at: string;
}

export default function AuditHistory() {
  const auth = useAuth();
  const [audits, setAudits] = useState<AuditRow[]>([]);
  const [loading, setLoading] = useState(true);

  if (!auth?.user) return null;

  useEffect(() => {
    if (!auth?.user) return;
    setLoading(true);
    fetch('/api/audits?limit=10')
      .then((r) => r.json())
      .then((d) => setAudits(d.audits ?? []))
      .catch(() => setAudits([]))
      .finally(() => setLoading(false));
  }, [auth?.user]);

  if (loading || audits.length === 0) return null;

  return (
    <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
      <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">
        Recent Reports
      </p>
      <h3 className="mt-2 text-lg font-black uppercase tracking-tight text-slate-900">
        Your latest audit history
      </h3>
      <p className="mt-2 text-sm text-slate-500">
        Reopen recent reports to compare progress, revisit scores, or continue from a previous review.
      </p>
      <ul className="space-y-2">
        {audits.slice(0, 5).map((a) => (
          <li key={a.id} className="mt-4 flex items-center justify-between rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3 text-sm">
            <Link
              to={`/report/${a.id}`}
              className="mr-2 flex-1 truncate font-semibold text-indigo-600 hover:underline"
            >
              {a.name || a.url}
            </Link>
            <span className="font-mono text-xs text-slate-500">
              {a.scores?.overallMaturityIndex ?? '-'}/100
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
