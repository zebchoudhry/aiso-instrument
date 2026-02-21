import React from 'react';
import { Link } from 'react-router-dom';

export default function Privacy() {
  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="max-w-3xl mx-auto">
        <Link to="/" className="text-[10px] font-bold uppercase tracking-widest text-indigo-600 mb-8 inline-block">
          Back
        </Link>
        <h1 className="text-2xl font-black uppercase tracking-tight text-slate-900 mb-6">
          Privacy Policy
        </h1>
        <div className="prose prose-slate text-sm text-slate-700 space-y-4">
          <p>
            We collect and process data necessary to run audits: URLs, page content, and email
            addresses you provide. Audit results may be stored for report retrieval.
          </p>
          <p>
            We do not sell your data. Data may be processed by third-party services (e.g. AI
            providers) to generate recommendations.
          </p>
        </div>
      </div>
    </div>
  );
}
