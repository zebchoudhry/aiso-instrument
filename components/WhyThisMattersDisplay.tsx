import React from 'react';
import type { AuditResponse } from '../types';

interface WhyThisMattersDisplayProps {
  audit: AuditResponse | null;
}

export default function WhyThisMattersDisplay({ audit }: WhyThisMattersDisplayProps) {
  if (!audit?.summary) return null;

  const score = audit.summary.scores?.overallMaturityIndex ?? audit.summary.readinessScore?.internal_ai_readiness_score ?? 0;
  const isLow = score < 40;
  const isPartial = score >= 40 && score < 60;

  const text = isLow
    ? 'When people ask ChatGPT or Perplexity about your space, they get short answers with 2–3 cited links. If you\'re not in that list, you\'re invisible for that search.'
    : isPartial
      ? 'AI answers often cite 2–3 sources. If you\'re partially visible, you may appear sometimes but won\'t be a primary reference.'
      : 'You\'re on the right track. Keeping these signals strong will help maintain and grow your visibility in AI answers.';

  return (
    <div className="bg-indigo-50/80 border border-indigo-100 rounded-xl p-4">
      <p className="text-[10px] font-black uppercase tracking-widest text-indigo-700 mb-2">Why this matters</p>
      <p className="text-sm text-slate-800">{text}</p>
    </div>
  );
}
