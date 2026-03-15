import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { AuditFinding, AuditResponse, QueryPackResponse, FixLibraryResponse, ClientTranslationResponse } from '../../types.js';
import {
  buildMonitorDeltaSummary,
  buildMonitorMonthlySummary,
  normalizeDomain,
  toMonitorRunSummaryFromRunRow,
  type MonitorRunRow,
  type MonitorAuditRow,
} from '../monitoring.js';
import { processHtml } from './extract.js';
import {
  performQuickAudit,
  performDeepDiagnostic,
  generateQueryPack,
  generateFixLibrary,
  generateClientTranslation,
  performAIOutcomeTest,
} from '../geminiService.js';

function getSupabase() {
  const url = process.env.SUPABASE_URL ?? '';
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_ANON_KEY ?? '';
  if (!url || !key) return null;
  return createClient(url, key);
}

function createEmptyDetail() {
  return {
    monitor: null,
    runs: [],
    summary: {
      latestScore: null,
      previousScore: null,
      baselineScore: null,
      changeVsPrevious: null,
      changeVsBaseline: null,
      latestMentionRate: null,
      latestCitationRate: null,
      runCount: 0,
      lastCheckedAt: null,
    },
    monthlySummary: {
      headline: 'No monitoring runs yet.',
      biggestImprovement: 'Run the first monitoring check to establish a baseline.',
      biggestRegression: 'No regressions to report yet.',
      topRecommendedAction: 'Enroll the domain in monitoring and run the first monthly check.',
    },
  };
}

interface MonitorDbRow {
  id: string;
  domain: string;
  url: string;
  display_name: string;
  owner_email: string | null;
  cadence: string;
  status: string;
  baseline_run_id: string | null;
  latest_run_id: string | null;
  next_run_at?: string | null;
  last_run_at?: string | null;
  created_at: string;
  updated_at: string;
}

/** Compute next_run_at from cadence (used after a run completes) */
function computeNextRunAt(cadence: string, from: Date = new Date()): Date {
  const d = new Date(from);
  if (cadence === 'weekly') d.setDate(d.getDate() + 7);
  else if (cadence === 'monthly') d.setMonth(d.getMonth() + 1);
  else return d; // manual - no next
  return d;
}

function mapMonitor(row: MonitorDbRow) {
  return {
    id: row.id,
    domain: row.domain,
    url: row.url,
    displayName: row.display_name,
    ownerEmail: row.owner_email ?? undefined,
    cadence: (row.cadence === 'weekly' || row.cadence === 'monthly' ? row.cadence : 'manual') as 'manual' | 'monthly' | 'weekly',
    status: (row.status === 'paused' ? 'paused' : 'active') as 'active' | 'paused',
    baselineRunId: row.baseline_run_id,
    latestRunId: row.latest_run_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

async function fetchMonitorByDomain(supabase: SupabaseClient, domain: string) {
  const { data, error } = await supabase
    .from('monitors')
    .select('*')
    .eq('domain', domain)
    .maybeSingle();
  if (error) throw error;
  return data as MonitorDbRow | null;
}

async function fetchAllMonitors(supabase: SupabaseClient) {
  const { data, error } = await supabase
    .from('monitors')
    .select('*')
    .order('updated_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as MonitorDbRow[];
}

async function fetchRunsForMonitor(supabase: SupabaseClient, monitorId: string) {
  const { data, error } = await supabase
    .from('monitor_runs')
    .select(`
      id, monitor_id, audit_id, trigger_type, status,
      started_at, completed_at, error_message,
      overall_score, ai_visibility, citation_likelihood, answer_engine_readiness,
      mention_rate, citation_rate, entity_clarity, structural_signals,
      compressibility, corroboration, top_finding_label, created_at
    `)
    .eq('monitor_id', monitorId)
    .order('created_at', { ascending: true })
    .limit(50);
  if (error) throw error;
  const runs = (data ?? []) as MonitorRunRow[];

  // Hydrate with audit data for runs that have audit_id
  const auditIds = runs.filter((r) => r.audit_id).map((r) => r.audit_id!);
  if (auditIds.length > 0) {
    const { data: audits } = await supabase
      .from('audits')
      .select('id, url, name, created_at, scores, audit_result, findings, fix_library, query_pack, verifications, ai_outcome_results')
      .in('id', auditIds);
    const auditMap = new Map((audits ?? []).map((a: MonitorAuditRow) => [a.id, a]));
    for (const run of runs) {
      if (run.audit_id) run.audit = auditMap.get(run.audit_id) ?? null;
      else run.audit = null;
    }
  }
  return runs;
}

async function fetchAuditById(supabase: SupabaseClient, id: string) {
  const { data, error } = await supabase
    .from('audits')
    .select('id, url, name, created_at, scores, audit_result, findings, fix_library, query_pack, verifications, ai_outcome_results')
    .eq('id', id)
    .maybeSingle();
  if (error) throw error;
  return (data as MonitorAuditRow | null) ?? null;
}

async function hydrateMonitorDetail(supabase: SupabaseClient, domain: string) {
  const monitorRow = await fetchMonitorByDomain(supabase, domain);
  if (!monitorRow) return createEmptyDetail();

  const monitor = mapMonitor(monitorRow);
  const runRows = await fetchRunsForMonitor(supabase, monitor.id);
  const runs = runRows.map(toMonitorRunSummaryFromRunRow);
  const summary = buildMonitorDeltaSummary(runs, monitor.baselineRunId);

  // Latest audit for monthly summary (fix_library etc.)
  const latestRun = runRows[runRows.length - 1] ?? null;
  const latestAudit = latestRun?.audit ?? null;
  const monthlySummary = buildMonitorMonthlySummary(runs, latestAudit);

  return {
    monitor,
    runs,
    summary,
    monthlySummary,
  };
}

function buildFullAudit(baseAudit: AuditResponse, findings: AuditFinding[]): AuditResponse {
  return {
    ...baseAudit,
    keyFindings: findings,
    epistemicGrounding: {
      verifiedFacts: [],
      potentialHallucinationRisks: [],
    },
    remediationBlueprint: {
      immediateFixes: [],
      structuralChanges: [],
    },
  };
}

function extractScores(auditResult: AuditResponse) {
  const scores = auditResult?.summary?.scores ?? null;
  const breakdown = auditResult?.summary?.readinessScore?.breakdown ?? null;
  return {
    overall: scores?.overallMaturityIndex ?? 0,
    aiVisibility: scores?.aiVisibility ?? 0,
    citationLikelihood: scores?.citationLikelihood ?? 0,
    answerEngineReadiness: scores?.answerEngineReadiness ?? 0,
    entityClarity: breakdown?.entity_clarity?.score ?? null,
    structuralSignals: breakdown?.structural_signals?.score ?? null,
    compressibility: breakdown?.compressibility?.score ?? null,
    corroboration: breakdown?.corroboration?.score ?? null,
  };
}

async function runMonitorAudit(monitor: ReturnType<typeof mapMonitor>) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12000);
  const userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
  const response = await fetch(monitor.url, {
    signal: controller.signal,
    headers: {
      'User-Agent': userAgent,
      Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
    },
  });
  clearTimeout(timeout);

  if (!response.ok) {
    throw new Error(`Source site returned ${response.status}: ${response.statusText}`);
  }

  const html = await response.text();
  const extractionData = processHtml(html, monitor.url);
  const baseAudit = await performQuickAudit(monitor.url, monitor.displayName, extractionData);

  let findings: AuditFinding[] = [];
  let queryPack: QueryPackResponse | null = null;
  let fixLibrary: FixLibraryResponse | null = null;
  let clientBriefing: ClientTranslationResponse | null = null;

  try {
    [findings, queryPack, clientBriefing] = await Promise.all([
      performDeepDiagnostic(monitor.url, monitor.displayName, extractionData),
      generateQueryPack(monitor.url, monitor.displayName, extractionData),
      generateClientTranslation(baseAudit),
    ]);
    fixLibrary = await generateFixLibrary(findings);
  } catch (error) {
    console.warn('[monitors] enrichment failed during monitor run:', error);
  }

  return {
    extractionData,
    auditResult: buildFullAudit(baseAudit, findings),
    findings,
    queryPack,
    fixLibrary,
    clientBriefing,
  };
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const supabase = getSupabase();
  if (
    !supabase ||
    !(process.env.SUPABASE_URL && (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY))
  ) {
    if (req.method === 'GET') {
      return res.status(200).json({ monitors: [], ...createEmptyDetail() });
    }
    return res.status(503).json({ error: 'Database not configured' });
  }

  try {
    if (req.method === 'GET') {
      const domain = typeof req.query.domain === 'string' ? normalizeDomain(req.query.domain) : '';
      if (domain) {
        const detail = await hydrateMonitorDetail(supabase, domain);
        return res.status(200).json(detail);
      }

      const rows = await fetchAllMonitors(supabase);
      const monitors = await Promise.all(
        rows.map(async (row) => {
          const monitor = mapMonitor(row);
          const detail = await hydrateMonitorDetail(supabase, monitor.domain);
          return {
            monitor: detail.monitor,
            summary: detail.summary,
            monthlySummary: detail.monthlySummary,
          };
        })
      );
      return res.status(200).json({ monitors });
    }

    const body = (req.body ?? {}) as Record<string, unknown>;
    const action = typeof body.action === 'string' ? body.action : 'enroll';

    if (action === 'enroll') {
      const auditId = typeof body.auditId === 'string' ? body.auditId : '';
      let url = typeof body.url === 'string' ? body.url : '';
      let name = typeof body.name === 'string' ? body.name : '';
      const ownerEmail = typeof body.ownerEmail === 'string' ? body.ownerEmail : undefined;
      const cadence =
        body.cadence === 'weekly' || body.cadence === 'monthly' ? body.cadence : 'manual';

      if (auditId) {
        const auditRow = await fetchAuditById(supabase, auditId);
        if (auditRow) {
          url = auditRow.url;
          name = auditRow.name || name;
        }
      }

      const domain = normalizeDomain(url || (typeof body.domain === 'string' ? body.domain : ''));
      if (!domain || !url) {
        return res.status(400).json({ error: 'auditId or url required to enroll monitor' });
      }

      const existing = await fetchMonitorByDomain(supabase, domain);
      const now = new Date().toISOString();

      if (existing) {
        const updatePayload: Record<string, unknown> = {
          url,
          display_name: name || existing.display_name,
          owner_email: ownerEmail ?? existing.owner_email,
          cadence,
          updated_at: now,
        };
        if (cadence !== 'manual') updatePayload.next_run_at = computeNextRunAt(cadence).toISOString();
        else updatePayload.next_run_at = null;
        const { error } = await supabase.from('monitors').update(updatePayload).eq('id', existing.id);
        if (error) {
          return res.status(500).json({ error: 'Failed to update monitor', details: error.message });
        }
        if (auditId) {
          const auditRow = await fetchAuditById(supabase, auditId);
          if (auditRow) {
            const sc = auditRow.scores ?? auditRow.audit_result?.summary?.scores;
            const breakdown = auditRow.audit_result?.summary?.readinessScore?.breakdown;
            const outcome = auditRow.ai_outcome_results?.summary;
            const findings = Array.isArray(auditRow.findings) ? auditRow.findings : auditRow.audit_result?.keyFindings ?? [];
            const { data: runData } = await supabase
              .from('monitor_runs')
              .insert({
                monitor_id: existing.id,
                audit_id: auditId,
                trigger_type: 'initial_audit',
                status: 'succeeded',
                completed_at: now,
                overall_score: sc?.overallMaturityIndex ?? 0,
                ai_visibility: sc?.aiVisibility ?? 0,
                citation_likelihood: sc?.citationLikelihood ?? 0,
                answer_engine_readiness: sc?.answerEngineReadiness ?? 0,
                mention_rate: typeof outcome?.brandMentionRate === 'number' ? outcome.brandMentionRate : null,
                citation_rate: typeof outcome?.brandCitationRate === 'number' ? outcome.brandCitationRate : null,
                entity_clarity: breakdown?.entity_clarity?.score ?? null,
                structural_signals: breakdown?.structural_signals?.score ?? null,
                compressibility: breakdown?.compressibility?.score ?? null,
                corroboration: breakdown?.corroboration?.score ?? null,
                top_finding_label: findings[0]?.label ?? null,
              })
              .select('id')
              .single();
            if (runData) {
              await supabase
                .from('monitors')
                .update({
                  latest_run_id: runData.id,
                  baseline_run_id: existing.baseline_run_id ?? runData.id,
                  updated_at: now,
                })
                .eq('id', existing.id);
            }
          }
        }
      } else {
        const insertPayload: Record<string, unknown> = {
          domain,
          url: url || `https://${domain}`,
          display_name: name || domain,
          owner_email: ownerEmail ?? null,
          cadence,
          status: 'active',
        };
        if (cadence !== 'manual') insertPayload.next_run_at = computeNextRunAt(cadence).toISOString();
        const { data: insertData, error } = await supabase
          .from('monitors')
          .insert(insertPayload)
          .select('id, domain, url, display_name, owner_email, cadence, status, baseline_run_id, latest_run_id, created_at, updated_at')
          .single();
        if (error) {
          return res.status(500).json({ error: 'Failed to create monitor', details: error.message });
        }
        // If enrolling with an audit, create an initial monitor_run to establish baseline
        if (auditId && insertData) {
          const auditRow = await fetchAuditById(supabase, auditId);
          if (auditRow) {
            const sc = auditRow.scores ?? auditRow.audit_result?.summary?.scores;
            const breakdown = auditRow.audit_result?.summary?.readinessScore?.breakdown;
            const outcome = auditRow.ai_outcome_results?.summary;
            const findings = Array.isArray(auditRow.findings) ? auditRow.findings : auditRow.audit_result?.keyFindings ?? [];
            const { data: runData } = await supabase
              .from('monitor_runs')
              .insert({
                monitor_id: insertData.id,
                audit_id: auditId,
                trigger_type: 'initial_audit',
                status: 'succeeded',
                completed_at: now,
                overall_score: sc?.overallMaturityIndex ?? 0,
                ai_visibility: sc?.aiVisibility ?? 0,
                citation_likelihood: sc?.citationLikelihood ?? 0,
                answer_engine_readiness: sc?.answerEngineReadiness ?? 0,
                mention_rate: typeof outcome?.brandMentionRate === 'number' ? outcome.brandMentionRate : null,
                citation_rate: typeof outcome?.brandCitationRate === 'number' ? outcome.brandCitationRate : null,
                entity_clarity: breakdown?.entity_clarity?.score ?? null,
                structural_signals: breakdown?.structural_signals?.score ?? null,
                compressibility: breakdown?.compressibility?.score ?? null,
                corroboration: breakdown?.corroboration?.score ?? null,
                top_finding_label: findings[0]?.label ?? null,
              })
              .select('id')
              .single();
            if (runData) {
              const runUpdate: Record<string, unknown> = {
                baseline_run_id: runData.id,
                latest_run_id: runData.id,
                last_run_at: now,
                updated_at: now,
              };
              if (cadence !== 'manual') runUpdate.next_run_at = computeNextRunAt(cadence).toISOString();
              await supabase.from('monitors').update(runUpdate).eq('id', insertData.id);
            }
          }
        }
      }

      const detail = await hydrateMonitorDetail(supabase, domain);
      return res.status(200).json(detail);
    }

    if (action === 'run') {
      const domain = normalizeDomain(
        typeof body.domain === 'string' ? body.domain : typeof body.id === 'string' ? body.id : ''
      );
      if (!domain) {
        return res.status(400).json({ error: 'domain required' });
      }

      const triggerType =
        body.triggerType === 'scheduled_check' ? 'scheduled_check' : body.triggerType === 'initial_audit' ? 'initial_audit' : 'manual_check';

      const monitorRow = await fetchMonitorByDomain(supabase, domain);
      if (!monitorRow) {
        return res.status(404).json({ error: 'Monitor not found' });
      }

      // Execution lock: no overlapping runs
      const { data: runningRuns } = await supabase
        .from('monitor_runs')
        .select('id')
        .eq('monitor_id', monitorRow.id)
        .in('status', ['running', 'queued'])
        .limit(1);
      if (runningRuns && runningRuns.length > 0) {
        return res.status(409).json({ error: 'A run is already in progress for this monitor', runId: runningRuns[0].id });
      }

      const monitor = mapMonitor(monitorRow);

      // Create run record with status 'running'
      const { data: runInsert, error: runInsertError } = await supabase
        .from('monitor_runs')
        .insert({
          monitor_id: monitor.id,
          trigger_type: triggerType,
          status: 'running',
        })
        .select('id')
        .single();

      if (runInsertError || !runInsert) {
        return res.status(500).json({ error: 'Failed to create run record', details: runInsertError?.message });
      }

      let auditId: string | null = null;
      try {
        const runResult = await runMonitorAudit(monitor);
        const scores = runResult.auditResult.summary.scores ?? null;
        const { data: auditData, error } = await supabase
          .from('audits')
          .insert({
            url: monitor.url,
            name: monitor.displayName,
            extraction_data: runResult.extractionData,
            audit_result: runResult.auditResult,
            scores,
            findings: runResult.findings ?? null,
            fix_library: runResult.fixLibrary ?? null,
            client_briefing: runResult.clientBriefing ?? null,
            query_pack: runResult.queryPack ?? null,
            user_id: null,
          })
          .select('id, created_at')
          .single();

        if (error || !auditData) {
          throw new Error(error?.message ?? 'Failed to save audit');
        }
        auditId = auditData.id;

        let mentionRate: number | null = null;
        let citationRate: number | null = null;
        const queries = runResult.queryPack?.queries ?? [];
        if (queries.length > 0 && monitor.displayName) {
          try {
            const outcomeResult = await performAIOutcomeTest(
              queries.slice(0, 10),
              monitor.displayName,
              monitor.domain
            );
            if (outcomeResult?.summary) {
              mentionRate = outcomeResult.summary.brandMentionRate;
              citationRate = outcomeResult.summary.brandCitationRate;
              await supabase
                .from('audits')
                .update({ ai_outcome_results: outcomeResult })
                .eq('id', auditId);
            }
          } catch (outcomeErr) {
            console.warn('[monitors] AI outcome test failed during run:', outcomeErr);
          }
        }

        const sc = extractScores(runResult.auditResult);
        const findings = runResult.findings ?? [];
        const topFinding = findings[0]?.label ?? null;

        await supabase
          .from('monitor_runs')
          .update({
            audit_id: auditId,
            status: 'succeeded',
            completed_at: new Date().toISOString(),
            overall_score: sc.overall,
            ai_visibility: sc.aiVisibility,
            citation_likelihood: sc.citationLikelihood,
            answer_engine_readiness: sc.answerEngineReadiness,
            mention_rate: mentionRate,
            citation_rate: citationRate,
            entity_clarity: sc.entityClarity,
            structural_signals: sc.structuralSignals,
            compressibility: sc.compressibility,
            corroboration: sc.corroboration,
            top_finding_label: topFinding,
          })
          .eq('id', runInsert.id);

        const now = new Date().toISOString();
        const nextRunAt = computeNextRunAt(monitor.cadence).toISOString();
        const updatePayload: Record<string, unknown> = {
          latest_run_id: runInsert.id,
          baseline_run_id: monitor.baselineRunId ?? runInsert.id,
          last_run_at: now,
          updated_at: now,
        };
        if (monitor.cadence !== 'manual') updatePayload.next_run_at = nextRunAt;
        await supabase.from('monitors').update(updatePayload).eq('id', monitor.id);

        try {
          const detail = await hydrateMonitorDetail(supabase, domain);
          if (detail.monthlySummary) {
            await supabase.from('monitor_summaries').insert({
              monitor_id: monitor.id,
              run_id: runInsert.id,
              headline: detail.monthlySummary.headline,
              biggest_improvement: detail.monthlySummary.biggestImprovement,
              biggest_regression: detail.monthlySummary.biggestRegression,
              top_recommended_action: detail.monthlySummary.topRecommendedAction,
            });
          }
          const changeVsPrevious = detail.summary.changeVsPrevious;
          if (changeVsPrevious !== null && changeVsPrevious < 0) {
            await supabase.from('alerts').insert({
              monitor_id: monitor.id,
              run_id: runInsert.id,
              rule_type: 'score_drop',
              message: `Score dropped by ${Math.abs(changeVsPrevious)} points vs previous run.`,
              severity: Math.abs(changeVsPrevious) >= 10 ? 'high' : 'medium',
            });
          }
        } catch (_) {
          /* Phase 4 tables may not exist yet */
        }
      } catch (err) {
        const now2 = new Date().toISOString();
        await supabase
          .from('monitor_runs')
          .update({
            status: 'failed',
            error_message: err instanceof Error ? err.message : String(err),
            completed_at: now2,
          })
          .eq('id', runInsert.id);
        if (monitor.cadence !== 'manual') {
          const nextRunAt = computeNextRunAt(monitor.cadence).toISOString();
          await supabase
            .from('monitors')
            .update({ last_run_at: now2, next_run_at: nextRunAt, updated_at: now2 })
            .eq('id', monitor.id);
        }
        try {
          await supabase.from('alerts').insert({
            monitor_id: monitor.id,
            run_id: runInsert.id,
            rule_type: 'run_failed',
            message: err instanceof Error ? err.message : 'Monitoring run failed.',
            severity: 'high',
          });
        } catch (_) {
          /* alerts table may not exist */
        }
        throw err;
      }

      const detail = await hydrateMonitorDetail(supabase, domain);
      const runRows = await fetchRunsForMonitor(supabase, monitor.id);
      const latestRun = runRows[runRows.length - 1];
      return res.status(200).json({
        auditId,
        createdAt: latestRun?.created_at ?? new Date().toISOString(),
        ...detail,
      });
    }

    return res.status(400).json({ error: 'Unsupported action' });
  } catch (err) {
    console.error('[monitors] Error:', err);
    return res.status(500).json({
      error: 'Monitoring request failed',
      details: err instanceof Error ? err.message : String(err),
    });
  }
}
