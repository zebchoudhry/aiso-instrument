import React from 'react';
import { Link } from 'react-router-dom';

export default function Terms() {
  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="max-w-3xl mx-auto">
        <Link to="/" className="text-[10px] font-bold uppercase tracking-widest text-indigo-600 mb-8 inline-block">
          Back
        </Link>
        <h1 className="text-2xl font-black uppercase tracking-tight text-slate-900 mb-6">
          Terms of Service
        </h1>
        <div className="prose prose-slate text-sm text-slate-700 space-y-4">
          <p>
            By using the AISO Instrument, you agree to these terms. The tool provides AI readiness
            audits based on heuristic scoring. Results are not guaranteed to predict actual AI
            system behavior.
          </p>
          <p>
            You are responsible for ensuring you have the right to analyze any URL you submit.
            We do not store or share your data except as needed to provide the service.
          </p>
        </div>
      </div>
    </div>
  );
}
