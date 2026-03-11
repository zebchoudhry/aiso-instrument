import React from 'react';
import type { FixLibraryResponse, TreatmentPlan } from '../types';
import { SurfaceCard } from './VisualSystem';

interface TopActionsSummaryProps {
  fixLibrary: FixLibraryResponse | null;
  treatmentPlan: TreatmentPlan | null;
}

export default function TopActionsSummary({ fixLibrary, treatmentPlan }: TopActionsSummaryProps) {
  const actions: { title: string; outcome: string }[] = [];

  const fixes = Array.isArray(fixLibrary?.fixes) ? fixLibrary.fixes : [];
  fixes.slice(0, 3).forEach((f: { findingLabel?: string; fix?: string }, i: number) => {
    actions.push({
      title: f.findingLabel ?? `Fix ${i + 1}`,
      outcome: (f.fix ?? '').slice(0, 100) + (f.fix && f.fix.length > 100 ? '…' : ''),
    });
  });

  if (actions.length < 3 && treatmentPlan?.prescriptions?.length) {
    treatmentPlan.prescriptions.slice(0, 3 - actions.length).forEach((p) => {
      if (!actions.some(a => a.title === p.prescription.label)) {
        actions.push({
          title: p.prescription.label,
          outcome: p.prescription.rationale,
        });
      }
    });
  }

  if (actions.length === 0) return null;

  return (
    <SurfaceCard tone="soft" className="p-6">
      <h3 className="text-sm font-black uppercase tracking-tight text-indigo-900 mb-4">Your top actions</h3>
      <ol className="space-y-4">
        {actions.slice(0, 5).map((a, i) => (
          <li key={i} className="flex gap-4">
            <span className="flex-shrink-0 w-8 h-8 rounded-full bg-indigo-600 text-white flex items-center justify-center text-sm font-bold">
              {i + 1}
            </span>
            <div>
              <p className="font-bold text-slate-900">{a.title}</p>
              <p className="text-sm text-slate-600">{a.outcome}</p>
            </div>
          </li>
        ))}
      </ol>
    </SurfaceCard>
  );
}
