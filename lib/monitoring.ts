import type {
  AIAnswerTestSummary,
  AuditFinding,
  AuditResponse,
  FixLibraryResponse,
  MonitorDeltaSummary,
  MonitorMonthlySummary,
  MonitorRecord,
  MonitorRunSummary,
  ReadinessScore,
} from '../types.js';

export interface MonitorAuditRow {
  id: string;
  url: string;
  name: string;
  created_at: string;
  scores: {
    overallMaturityIndex?: number;
    aiVisibility?: number;
    citationLikelihood?: number;
    answerEngineReadiness?: number;
  } | null;
  audit_result?: AuditResponse | null;
  findings?: AuditFinding[] | null;
  fix_library?: FixLibraryResponse | null;
  query_pack?: { queries?: string[] } | null;
  verifications?: Array<{ query: string; result: string | null; pastedResponse?: string }> | null;
  ai_outcome_results?: { summary?: AIAnswerTestSummary | null } | null;
}

export function normalizeDomain(input: string): string {
  if (!input) return '';

  try {
    const url = /^https?:\/\//i.test(input) ? new URL(input) : new URL(`https://${input}`);
    return url.hostname.replace(/^www\./i, '').toLowerCase();
  } catch {
    return input.replace(/^https?:\/\//i, '').replace(/^www\./i, '').split('/')[0].toLowerCase();
  }
}

export function getMonitorKey(domain: string): string {
  return `monitor:${normalizeDomain(domain)}`;
}

function getReadinessBreakdown(auditResult?: AuditResponse | null): ReadinessScore['breakdown'] | null {
  return auditResult?.summary?.readinessScore?.breakdown ?? null;
}

/** Build MonitorRunSummary from an audit row (legacy) */
export function toMonitorRunSummary(row: MonitorAuditRow): MonitorRunSummary {
  const overallScore = row.scores?.overallMaturityIndex ?? row.audit_result?.summary?.scores?.overallMaturityIndex ?? 0;
  const aiVisibility = row.scores?.aiVisibility ?? row.audit_result?.summary?.scores?.aiVisibility ?? overallScore;
  const citationLikelihood =
    row.scores?.citationLikelihood ?? row.audit_result?.summary?.scores?.citationLikelihood ?? overallScore;
  const answerEngineReadiness =
    row.scores?.answerEngineReadiness ?? row.audit_result?.summary?.scores?.answerEngineReadiness ?? overallScore;
  const breakdown = getReadinessBreakdown(row.audit_result);
  const outcomeSummary = row.ai_outcome_results?.summary ?? null;
  const findings = Array.isArray(row.findings) ? row.findings : row.audit_result?.keyFindings ?? [];

  return {
    id: row.id,
    auditId: row.id,
    createdAt: row.created_at,
    url: row.url,
    name: row.name,
    overallScore,
    aiVisibility,
    citationLikelihood,
    answerEngineReadiness,
    entityClarity: breakdown?.entity_clarity?.score ?? null,
    structuralSignals: breakdown?.structural_signals?.score ?? null,
    answerReuse: breakdown?.compressibility?.score ?? null,
    trustSignals: breakdown?.corroboration?.score ?? null,
    mentionRate: typeof outcomeSummary?.brandMentionRate === 'number' ? outcomeSummary.brandMentionRate : null,
    citationRate: typeof outcomeSummary?.brandCitationRate === 'number' ? outcomeSummary.brandCitationRate : null,
    findingCount: findings.length,
    topFinding: findings[0]?.label ?? null,
  };
}

/** Shape of a monitor_runs row joined with optional audit */
export interface MonitorRunRow {
  id: string;
  monitor_id: string;
  audit_id: string | null;
  trigger_type: string;
  status: string;
  started_at: string;
  completed_at: string | null;
  error_message: string | null;
  overall_score: number;
  ai_visibility: number;
  citation_likelihood: number;
  answer_engine_readiness: number;
  mention_rate: number | null;
  citation_rate: number | null;
  entity_clarity: number | null;
  structural_signals: number | null;
  compressibility: number | null;
  corroboration: number | null;
  top_finding_label: string | null;
  created_at: string;
  audit?: MonitorAuditRow | null;
}

/** Build MonitorRunSummary from a monitor_runs row (optionally joined with audit) */
export function toMonitorRunSummaryFromRunRow(row: MonitorRunRow): MonitorRunSummary {
  const audit = row.audit;
  const entityClarity = row.entity_clarity ?? audit ? getReadinessBreakdown(audit.audit_result)?.entity_clarity?.score ?? null : null;
  const structuralSignals = row.structural_signals ?? audit ? getReadinessBreakdown(audit.audit_result)?.structural_signals?.score ?? null : null;
  const answerReuse = row.compressibility ?? audit ? getReadinessBreakdown(audit.audit_result)?.compressibility?.score ?? null : null;
  const trustSignals = row.corroboration ?? audit ? getReadinessBreakdown(audit.audit_result)?.corroboration?.score ?? null : null;
  const outcomeSummary = audit?.ai_outcome_results?.summary ?? null;
  const mentionRate = row.mention_rate ?? (typeof outcomeSummary?.brandMentionRate === 'number' ? outcomeSummary.brandMentionRate : null);
  const citationRate = row.citation_rate ?? (typeof outcomeSummary?.brandCitationRate === 'number' ? outcomeSummary.brandCitationRate : null);
  const findings = audit ? (Array.isArray(audit.findings) ? audit.findings : audit.audit_result?.keyFindings ?? []) : [];
  const topFinding = row.top_finding_label ?? findings[0]?.label ?? null;

  return {
    id: row.id,
    auditId: row.audit_id,
    createdAt: row.created_at,
    url: audit?.url ?? '',
    name: audit?.name ?? '',
    overallScore: row.overall_score,
    aiVisibility: row.ai_visibility,
    citationLikelihood: row.citation_likelihood,
    answerEngineReadiness: row.answer_engine_readiness,
    entityClarity,
    structuralSignals,
    answerReuse,
    trustSignals,
    mentionRate,
    citationRate,
    findingCount: findings.length,
    topFinding,
    triggerType: row.trigger_type as 'initial_audit' | 'manual_check' | 'scheduled_check',
    status: row.status as 'queued' | 'running' | 'succeeded' | 'failed',
  };
}

function formatDeltaLabel(label: string, before: number | null, after: number | null): string {
  if (before === null || after === null) return `${label} data not available yet.`;
  const delta = after - before;
  if (delta === 0) return `${label} held steady at ${after}/100.`;
  const direction = delta > 0 ? 'improved' : 'declined';
  const absolute = Math.abs(delta);
  return `${label} ${direction} by ${absolute} point${absolute === 1 ? '' : 's'} (${before} -> ${after}).`;
}

export function buildMonitorDeltaSummary(
  runs: MonitorRunSummary[],
  baselineRunId?: string | null
): MonitorDeltaSummary {
  const orderedRuns = [...runs].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  const latest = orderedRuns[orderedRuns.length - 1] ?? null;
  const previous = orderedRuns.length > 1 ? orderedRuns[orderedRuns.length - 2] : null;
  const baseline = baselineRunId
    ? orderedRuns.find((run) => run.id === baselineRunId) ?? orderedRuns[0] ?? null
    : orderedRuns[0] ?? null;

  return {
    latestScore: latest?.overallScore ?? null,
    previousScore: previous?.overallScore ?? null,
    baselineScore: baseline?.overallScore ?? null,
    changeVsPrevious:
      latest && previous ? latest.overallScore - previous.overallScore : null,
    changeVsBaseline:
      latest && baseline ? latest.overallScore - baseline.overallScore : null,
    latestMentionRate: latest?.mentionRate ?? null,
    latestCitationRate: latest?.citationRate ?? null,
    runCount: orderedRuns.length,
    lastCheckedAt: latest?.createdAt ?? null,
  };
}

export function buildMonitorMonthlySummary(
  runs: MonitorRunSummary[],
  latestAudit?: MonitorAuditRow | null
): MonitorMonthlySummary {
  const orderedRuns = [...runs].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  const latest = orderedRuns[orderedRuns.length - 1] ?? null;
  const previous = orderedRuns.length > 1 ? orderedRuns[orderedRuns.length - 2] : null;

  if (!latest) {
    return {
      headline: 'No monitoring runs yet.',
      biggestImprovement: 'Run the first monitoring check to establish a baseline.',
      biggestRegression: 'No regressions to report yet.',
      topRecommendedAction: 'Enroll the domain in monitoring and run the first monthly check.',
    };
  }

  const comparisons = [
    {
      label: 'Overall visibility',
      before: previous?.overallScore ?? null,
      after: latest.overallScore,
      delta: previous ? latest.overallScore - previous.overallScore : 0,
    },
    {
      label: 'Entity clarity',
      before: previous?.entityClarity ?? null,
      after: latest.entityClarity,
      delta:
        previous?.entityClarity !== null && latest.entityClarity !== null
          ? latest.entityClarity - previous.entityClarity
          : 0,
    },
    {
      label: 'Structural signals',
      before: previous?.structuralSignals ?? null,
      after: latest.structuralSignals,
      delta:
        previous?.structuralSignals !== null && latest.structuralSignals !== null
          ? latest.structuralSignals - previous.structuralSignals
          : 0,
    },
    {
      label: 'Answer reuse',
      before: previous?.answerReuse ?? null,
      after: latest.answerReuse,
      delta:
        previous?.answerReuse !== null && latest.answerReuse !== null
          ? latest.answerReuse - previous.answerReuse
          : 0,
    },
    {
      label: 'Trust signals',
      before: previous?.trustSignals ?? null,
      after: latest.trustSignals,
      delta:
        previous?.trustSignals !== null && latest.trustSignals !== null
          ? latest.trustSignals - previous.trustSignals
          : 0,
    },
  ];

  const biggestImprovementMetric = [...comparisons].sort((a, b) => b.delta - a.delta)[0];
  const biggestRegressionMetric = [...comparisons].sort((a, b) => a.delta - b.delta)[0];

  const fixes = Array.isArray(latestAudit?.fix_library?.fixes)
    ? latestAudit?.fix_library?.fixes
    : [];
  const topFix = fixes[0] as { findingLabel?: string; fix?: string } | undefined;

  return {
    headline:
      previous && latest.overallScore >= previous.overallScore
        ? 'Monitoring shows the domain is stable or improving.'
        : previous
          ? 'Monitoring shows new visibility risk that needs attention.'
          : 'First monitoring snapshot captured successfully.',
    biggestImprovement: formatDeltaLabel(
      biggestImprovementMetric?.label ?? 'Visibility',
      biggestImprovementMetric?.before ?? null,
      biggestImprovementMetric?.after ?? null
    ),
    biggestRegression:
      biggestRegressionMetric && biggestRegressionMetric.delta < 0
        ? formatDeltaLabel(
            biggestRegressionMetric.label,
            biggestRegressionMetric.before ?? null,
            biggestRegressionMetric.after ?? null
          )
        : 'No material regressions detected in the latest comparison.',
    topRecommendedAction:
      topFix?.fix ??
      latest.topFinding ??
      latestAudit?.audit_result?.howToImprove?.[0] ??
      'Review the latest roadmap and prioritize the weakest signal first.',
  };
}

export function sortRunsAscending<T extends { createdAt: string }>(runs: T[]): T[] {
  return [...runs].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
}
