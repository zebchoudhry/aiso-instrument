import React from 'react';
import type { AuditResponse } from '../types';
import { SurfaceCard } from './VisualSystem';

interface PlainLanguageVerdictProps {
  audit: AuditResponse | null;
}

export default function PlainLanguageVerdict({ audit }: PlainLanguageVerdictProps) {
  if (!audit?.summary) return null;

  const verdict = audit.summary.tier1Verdict ?? '';
  const score = audit.summary.scores?.overallMaturityIndex ?? 0;
  const subject = audit.summary.subjectName ?? audit.summary.url ?? 'Your site';

  const isInvisible = verdict.includes('LOW') || score < 40;
  const isPartial = verdict.includes('DEVELOPING') || (score >= 40 && score < 60);

  let label: string;
  let sentence: string;

  if (isInvisible) {
    label = 'invisible';
    sentence = 'When people ask ChatGPT, Perplexity, or similar tools about your space, your business is rarely mentioned or cited.';
  } else if (isPartial) {
    label = 'partially visible';
    sentence = "AI may mention you in some answers but often won't cite you as a primary source.";
  } else {
    label = 'visible';
    sentence = 'Key signals are in place. Follow the plan below to strengthen and maintain visibility.';
  }

  return (
    <SurfaceCard tone="soft" className="p-6 text-slate-800">
      <h3 className="text-[10px] font-black uppercase tracking-widest text-indigo-600 mb-2">Plain-language verdict</h3>
      <p className="text-lg font-bold leading-relaxed">
        {subject} is{' '}
        <span className="text-indigo-600">{label}</span>
        {' '}to AI search.
      </p>
      <p className="text-sm text-slate-600 mt-2">{sentence}</p>
    </SurfaceCard>
  );
}
