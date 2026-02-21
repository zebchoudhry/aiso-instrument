import React from 'react';
import type { ExtractionData, AuditResponse } from '../types';
import { inferCitationReasons } from '../lib/inferCitationReasons';

interface HeresWhyDisplayProps {
  extractionData: ExtractionData | null;
  audit: AuditResponse | null;
}

export default function HeresWhyDisplay({ extractionData, audit }: HeresWhyDisplayProps) {
  const reasons = inferCitationReasons(extractionData, audit?.keyFindings ?? []);

  if (reasons.length === 0) return null;

  return (
    <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6">
      <h3 className="text-sm font-black uppercase tracking-tight text-amber-900 mb-2">
        Here&apos;s why AI might not cite you
      </h3>
      <p className="text-xs text-amber-800 mb-4">
        Based on your extraction and audit findings:
      </p>
      <ul className="space-y-2">
        {reasons.map((r, i) => (
          <li key={i} className="flex items-start gap-3 text-sm">
            <span className="flex-shrink-0 w-1.5 h-1.5 rounded-full bg-amber-500 mt-1.5" />
            <span className="text-slate-800">{r}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
