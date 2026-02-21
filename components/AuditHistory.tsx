import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

interface AuditRow {
  id: string;
  url: string;
  name: string;
  scores: { overallMaturityIndex?: number } | null;
  created_at: string;
}

export default function AuditHistory() {
  const [audits, setAudits] = useState<AuditRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/audits?limit=10')
      .then((r) => r.json())
      .then((d) => setAudits(d.audits ?? []))
      .catch(() => setAudits([]))
      .finally(() => setLoading(false));
  }, []);

  if (loading || audits.length === 0) return null;

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-6">
      <h3 className="text-[11px] font-black uppercase tracking-widest text-slate-500 mb-4">
        Recent Audits
      </h3>
      <ul className="space-y-2">
        {audits.slice(0, 5).map((a) => (
          <li key={a.id} className="flex justify-between items-center text-sm">
            <Link
              to={`/report/${a.id}`}
              className="text-indigo-600 hover:underline truncate flex-1 mr-2"
            >
              {a.name || a.url}
            </Link>
            <span className="text-slate-400 font-mono text-xs">
              {a.scores?.overallMaturityIndex ?? '-'}/100
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
