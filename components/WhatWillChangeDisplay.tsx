import React from 'react';
import type { AuditResponse } from '../types';

interface WhatWillChangeDisplayProps {
  audit: AuditResponse | null;
  hasActions?: boolean;
}

export default function WhatWillChangeDisplay({ audit, hasActions }: WhatWillChangeDisplayProps) {
  if (!audit?.summary) return null;

  const score = audit.summary.scores?.overallMaturityIndex ?? audit.summary.readinessScore?.internal_ai_readiness_score ?? 0;
  const verdict = audit.summary.tier1Verdict ?? audit.summary.aiVisibilityLabel ?? '';
  const isLow = score < 40 || verdict.includes('LOW');
  const expectedAfter = isLow ? 'visible or partially visible' : 'stronger visibility and more consistent citations';

  return (
    <div className="text-sm text-slate-700 border-l-2 border-indigo-200 pl-4">
      <p className="font-bold text-slate-900 mb-1">What will change</p>
      <p>
        <strong>Before (now):</strong> {verdict || 'diagnostic'}. Score: {score}.{' '}
        <strong>After</strong> (if you complete the plan): {expectedAfter}.{' '}
        {hasActions && 'You can verify with Re-audit and query re-test.'}
      </p>
    </div>
  );
}
