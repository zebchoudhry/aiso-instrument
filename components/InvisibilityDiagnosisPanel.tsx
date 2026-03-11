import React from 'react';
import type { DiagnosisResult } from '../types';

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
    <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-4">
      <div className="space-y-2">
        <p className="text-[10px] font-black text-indigo-600 uppercase tracking-widest">
          CitationIQ Diagnosis
        </p>
        <h2 className="text-xl font-black uppercase tracking-tight text-slate-900">
          {title}
        </h2>
        <p className="text-sm text-slate-600">{diagnosis.summary}</p>
      </div>

      {diagnosis.items.length > 0 && (
        <div className="grid gap-4">
          {diagnosis.items.map((item) => (
            <div key={item.key} className="rounded-2xl border border-slate-200 p-5 space-y-4 bg-slate-50">
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
        <ul className="space-y-2 text-sm text-slate-700 list-disc list-inside">
          {diagnosis.causes.map((cause) => (
            <li key={cause}>{cause}</li>
          ))}
        </ul>
      )}
    </div>
  );
}
