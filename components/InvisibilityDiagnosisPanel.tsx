import React from 'react';
import type { DiagnosisResult } from '../types';
import { SectionIntro, SurfaceCard } from './VisualSystem';

interface InvisibilityDiagnosisPanelProps {
  diagnosis: DiagnosisResult;
  title?: string;
}

export default function InvisibilityDiagnosisPanel({
  diagnosis,
  title = 'Why AI systems may struggle to cite this page',
}: InvisibilityDiagnosisPanelProps) {
  const priorityStyles = {
    Now: 'bg-rose-100 text-rose-700',
    Next: 'bg-amber-100 text-amber-700',
    Later: 'bg-indigo-100 text-indigo-700',
  } as const;

  return (
    <SurfaceCard className="p-8 space-y-6">
      <SectionIntro
        label="Visus Diagnosis"
        title={title}
        description={diagnosis.summary}
      />

      {diagnosis.items.length > 0 && (
        <div className="grid gap-4">
          {diagnosis.items.map((item) => (
            <div key={item.key} className="rounded-[1.75rem] border border-slate-200 bg-[linear-gradient(180deg,#ffffff_0%,#f8fafc_100%)] p-5 space-y-4 shadow-sm">
              <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                <div className="space-y-1">
                  <h3 className="text-sm font-black uppercase tracking-tight text-slate-900">
                    {item.title}
                  </h3>
                  <p className="text-sm text-slate-600">{item.cause}</p>
                </div>
                <span
                  className={`inline-flex w-fit items-center rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-widest ${priorityStyles[item.priority]}`}
                >
                  {item.priority}
                </span>
              </div>

              <div className="grid gap-3 md:grid-cols-3">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
                    Why it hurts
                  </p>
                  <p className="mt-2 text-sm text-slate-700">{item.customerImpact}</p>
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
                    Best next move
                  </p>
                  <p className="mt-2 text-sm text-slate-700">{item.nextAction}</p>
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
                    Expected gain
                  </p>
                  <p className="mt-2 text-sm text-slate-700">{item.expectedBenefit}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {diagnosis.causes.length > 0 && (
        <ul className="space-y-2 text-sm text-slate-700 list-disc list-inside rounded-[1.75rem] border border-slate-200 bg-slate-50 p-5">
          {diagnosis.causes.map((cause) => (
            <li key={cause}>{cause}</li>
          ))}
        </ul>
      )}
    </SurfaceCard>
  );
}
