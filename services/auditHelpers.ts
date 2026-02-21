import type { AuditDelta, ExecutiveReport, ScoreSnapshot, ReadinessScore } from '../types';

/** Minimal audit shape for delta (before/after) */
export interface MinimalAuditLike {
  summary: {
    scores: ScoreSnapshot;
    readinessScore?: ReadinessScore;
  };
}

export function generateAuditDelta(
  baselineAudit: MinimalAuditLike,
  newAudit: MinimalAuditLike
): AuditDelta {
  const before = baselineAudit.summary.scores;
  const after = newAudit.summary.scores;

  const aiVisBefore = before.aiVisibility;
  const aiVisAfter = after.aiVisibility;
  const citBefore = before.citationLikelihood;
  const citAfter = after.citationLikelihood;

  const dir = (b: number, a: number) =>
    a > b ? 'increase' : a < b ? 'decrease' : 'unchanged';

  const observed_changes: string[] = [];
  if (aiVisAfter !== aiVisBefore) observed_changes.push(`AI Visibility: ${aiVisBefore} -> ${aiVisAfter}`);
  if (citAfter !== citBefore) observed_changes.push(`Citation Likelihood: ${citBefore} -> ${citAfter}`);

  const unchanged_elements: string[] = [];
  if (aiVisAfter === aiVisBefore) unchanged_elements.push('AI Visibility');
  if (citAfter === citBefore) unchanged_elements.push('Citation Likelihood');

  return {
    delta_summary: {
      ai_visibility: {
        before: aiVisBefore,
        after: aiVisAfter,
        direction: dir(aiVisBefore, aiVisAfter)
      },
      citation_likelihood: {
        before: citBefore,
        after: citAfter,
        direction: dir(citBefore, citAfter)
      }
    },
    observed_changes,
    unchanged_elements,
    next_verification_guidance: ['Re-run audit after further changes to confirm trend.'],
    confidence_note: 'Delta computed from deterministic score comparison.'
  };
}

export function generateExecutiveBrief(
  subjectName: string,
  delta: AuditDelta
): ExecutiveReport {
  const a = delta.delta_summary?.ai_visibility;
  const c = delta.delta_summary?.citation_likelihood;
  const lines: string[] = [
    `Re-audit summary for ${subjectName}.`,
    a ? `AI Visibility: ${a.before} -> ${a.after} (${a.direction}).` : '',
    c ? `Citation Likelihood: ${c.before} -> ${c.after} (${c.direction}).` : '',
    delta.observed_changes?.length ? `Observed changes: ${delta.observed_changes.join('; ')}.` : ''
  ].filter(Boolean);
  return { executive_summary: lines.join(' ') };
}
