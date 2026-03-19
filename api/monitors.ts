import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

type Json = Record<string, unknown> | null;

function normalizeMonitorDomainInput(raw: string): string {
  const trimmed = raw.trim().toLowerCase();
  if (!trimmed) return '';
  try {
    const href = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
    return new URL(href).hostname;
  } catch {
    return trimmed.replace(/^https?:\/\//, '').split('/')[0] || '';
  }
}

function getSupabase(): SupabaseClient | null {
  const url = process.env.SUPABASE_URL ?? '';
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_ANON_KEY ?? '';
  if (!url || !key) return null;
  return createClient(url, key);
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(204).end();

  if (process.env.ENABLE_MONITORING === 'false') {
    if (req.method === 'GET') {
      const domain = typeof req.query.domain === 'string' ? req.query.domain.trim() : null;
      if (domain) {
        return res.status(200).json({
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
            headline: 'Monitoring disabled',
            biggestImprovement: '',
            biggestRegression: '',
            topRecommendedAction: '',
          },
        });
      }
      return res.status(200).json({ monitors: [] });
    }
    return res.status(503).json({ error: 'Monitoring is temporarily disabled' });
  }

  const supabase = getSupabase();
  if (!supabase || !(process.env.SUPABASE_URL && (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY))) {
    // Graceful fallback when database is not configured
    if (req.method === 'GET') {
      const domain = typeof req.query.domain === 'string' ? req.query.domain.trim() : null;
      if (domain) {
        return res.status(200).json({
          monitor: null,
          runs: [],
          alerts: [],
          recentRun: null,
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
            headline: 'Monitoring not configured',
            biggestImprovement: '',
            biggestRegression: '',
            topRecommendedAction: '',
          },
        });
      }
      return res.status(200).json({ monitors: [] });
    }
    if (req.method === 'POST') {
      return res.status(200).json({ success: false, error: 'Monitoring storage not configured' });
    }
  }

  if (req.method === 'GET') {
    const domain = typeof req.query.domain === 'string' ? req.query.domain.trim() : null;

    // Detail view for a single domain (used on main dashboard)
    if (domain) {
      try {
        const { data: monitorRow, error: monitorError } = await supabase!
          .from('monitors')
          .select('*')
          .ilike('domain', domain)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (monitorError) {
          console.error('[monitors] GET detail monitor error:', monitorError.message);
        }

        const monitor = monitorRow
          ? {
              id: String(monitorRow.id),
              domain: monitorRow.domain ?? '',
              url: monitorRow.url ?? '',
              displayName: monitorRow.display_name ?? monitorRow.domain ?? '',
              ownerEmail: monitorRow.owner_email ?? undefined,
              cadence: (monitorRow.cadence as 'manual' | 'monthly' | 'weekly') ?? 'monthly',
              status: (monitorRow.status as 'active' | 'paused') ?? 'active',
              baselineRunId: monitorRow.baseline_run_id ?? null,
              latestRunId: monitorRow.latest_run_id ?? null,
              createdAt: monitorRow.created_at ?? new Date().toISOString(),
              updatedAt: monitorRow.updated_at ?? monitorRow.created_at ?? new Date().toISOString(),
            }
          : null;

        const monitorId = monitorRow?.id ?? null;

        let runs: Array<Record<string, unknown>> = [];
        if (monitorId) {
          const { data: runRows, error: runsError } = await supabase!
            .from('monitor_runs')
            .select('*')
            .eq('monitor_id', monitorId)
            .order('created_at', { ascending: false })
            .limit(50);

          if (runsError) {
            console.error('[monitors] GET runs error:', runsError.message);
          }

          runs =
            runRows?.map((r) => ({
              id: String(r.id),
              auditId: r.audit_id ?? null,
              createdAt: r.created_at ?? new Date().toISOString(),
              url: r.url ?? '',
              name: r.display_name ?? '',
              overallScore: r.overall_score ?? 0,
              aiVisibility: r.ai_visibility ?? 0,
              citationLikelihood: r.citation_likelihood ?? 0,
              answerEngineReadiness: r.answer_engine_readiness ?? 0,
              entityClarity: r.entity_clarity ?? null,
              structuralSignals: r.structural_signals ?? null,
              answerReuse: r.answer_reuse ?? null,
              trustSignals: r.trust_signals ?? null,
              mentionRate: r.mention_rate ?? null,
              citationRate: r.citation_rate ?? null,
              findingCount: r.finding_count ?? 0,
              topFinding: r.top_finding ?? null,
              triggerType: (r.trigger_type as string | undefined) ?? 'scheduled_check',
              status: (r.status as string | undefined) ?? 'succeeded',
            })) ?? [];
        }

        const latest = runs[0] ?? null;
        const previous = runs[1] ?? null;
        const baselineRun = runs.find((r) => String(r.id) === monitor?.baselineRunId) ?? runs[runs.length - 1] ?? null;

        const latestScore = (latest?.overallScore as number | undefined) ?? null;
        const previousScore = (previous?.overallScore as number | undefined) ?? null;
        const baselineScore = (baselineRun?.overallScore as number | undefined) ?? null;

        const summary = {
          latestScore,
          previousScore,
          baselineScore,
          changeVsPrevious:
            latestScore !== null && previousScore !== null ? latestScore - previousScore : null,
          changeVsBaseline:
            latestScore !== null && baselineScore !== null ? latestScore - baselineScore : null,
          latestMentionRate: (latest?.mentionRate as number | null) ?? null,
          latestCitationRate: (latest?.citationRate as number | null) ?? null,
          runCount: runs.length,
          lastCheckedAt: (latest?.createdAt as string | null) ?? null,
        };

        const monthlySummary = {
          headline: latestScore !== null ? 'Monitoring active' : 'Monitoring enrolled, awaiting first run',
          biggestImprovement: '',
          biggestRegression: '',
          topRecommendedAction: '',
        };

        return res.status(200).json({
          monitor,
          runs,
          alerts: [],
          recentRun: latest,
          summary,
          monthlySummary,
        });
      } catch (err) {
        console.error('[monitors] GET detail unexpected error:', err);
        return res.status(500).json({ error: 'Failed to load monitor' });
      }
    }

    // List view for admin
    try {
      const { data: monitorRows, error } = await supabase!
        .from('monitors')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(200);

      if (error) {
        console.error('[monitors] GET list error:', error.message);
        return res.status(500).json({ error: 'Failed to list monitors' });
      }

      const monitors =
        monitorRows?.map((m) => ({
          monitor: {
            id: String(m.id),
            domain: m.domain ?? '',
            url: m.url ?? '',
            displayName: m.display_name ?? m.domain ?? '',
            ownerEmail: m.owner_email ?? undefined,
            cadence: (m.cadence as 'manual' | 'monthly' | 'weekly') ?? 'monthly',
            status: (m.status as 'active' | 'paused') ?? 'active',
            baselineRunId: m.baseline_run_id ?? null,
            latestRunId: m.latest_run_id ?? null,
            createdAt: m.created_at ?? new Date().toISOString(),
            updatedAt: m.updated_at ?? m.created_at ?? new Date().toISOString(),
          },
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
            headline: 'Monitoring enrolled',
            biggestImprovement: '',
            biggestRegression: '',
            topRecommendedAction: '',
          },
        })) ?? [];

      return res.status(200).json({ monitors });
    } catch (err) {
      console.error('[monitors] GET list unexpected error:', err);
      return res.status(500).json({ error: 'Failed to list monitors' });
    }
  }

  if (req.method === 'POST') {
    if (!supabase) {
      return res.status(500).json({ error: 'Monitoring storage not configured' });
    }

    const body = (req.body ?? {}) as {
      action?: string;
      domain?: string;
      url?: string;
      name?: string;
      ownerEmail?: string;
      cadence?: string;
      auditId?: string;
    };
    const action = body.action ?? 'enroll';

    if (action === 'enroll') {
      const domain = normalizeMonitorDomainInput(body.domain ?? body.url ?? '');
      const url = (body.url ?? '').trim();
      const name = (body.name ?? '').trim();
      const ownerEmail = (body.ownerEmail ?? '').trim() || null;
      const cadence = (body.cadence as 'manual' | 'monthly' | 'weekly') ?? 'monthly';

      if (!domain && !url) {
        return res.status(400).json({ error: 'domain or url is required' });
      }

      try {
        const upsertPayload: Record<string, Json | string | null> = {
          domain,
          url: url || domain,
          display_name: name || domain,
          owner_email: ownerEmail,
          cadence,
          status: 'active',
        };

        const { data, error } = await supabase
          .from('monitors')
          .upsert(upsertPayload, { onConflict: 'domain' })
          .select('*')
          .single();

        if (error) {
          console.error('[monitors] enroll upsert error:', error.message);
          return res.status(500).json({ error: 'Failed to enroll monitor' });
        }

        const monitor = {
          id: String(data.id),
          domain: data.domain ?? '',
          url: data.url ?? '',
          displayName: data.display_name ?? data.domain ?? '',
          ownerEmail: data.owner_email ?? undefined,
          cadence,
          status: (data.status as 'active' | 'paused') ?? 'active',
          baselineRunId: data.baseline_run_id ?? null,
          latestRunId: data.latest_run_id ?? null,
          createdAt: data.created_at ?? new Date().toISOString(),
          updatedAt: data.updated_at ?? data.created_at ?? new Date().toISOString(),
        };

        return res.status(200).json({
          monitor,
          runs: [],
          alerts: [],
          recentRun: null,
        });
      } catch (err) {
        console.error('[monitors] enroll unexpected error:', err);
        return res.status(500).json({ error: 'Failed to enroll monitor' });
      }
    }

    if (action === 'run') {
      const domain = (body.domain ?? '').trim();
      if (!domain) {
        return res.status(400).json({ error: 'domain is required' });
      }

      try {
        const { data: monitorRow, error: monitorError } = await supabase
          .from('monitors')
          .select('*')
          .ilike('domain', domain)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (monitorError) {
          console.error('[monitors] run monitor lookup error:', monitorError.message);
        }

        if (!monitorRow) {
          return res.status(404).json({ error: 'Monitor not found' });
        }

        const now = new Date().toISOString();

        // Look up the previous run to use as a baseline for scores and alerting.
        const { data: previousRuns, error: prevError } = await supabase
          .from('monitor_runs')
          .select('*')
          .eq('monitor_id', monitorRow.id)
          .order('created_at', { ascending: false })
          .limit(1);

        if (prevError) {
          console.error('[monitors] run previous run query error:', prevError.message);
        }

        const previous = previousRuns?.[0] ?? null;
        const baselineScore = previous?.overall_score ?? null;

        const { data: runRow, error: runError } = await supabase
          .from('monitor_runs')
          .insert({
            monitor_id: monitorRow.id,
            domain: monitorRow.domain,
            display_name: monitorRow.display_name ?? monitorRow.domain,
            trigger_type: 'manual_check',
            status: 'succeeded',
            overall_score: baselineScore ?? 0,
            created_at: now,
          })
          .select('*')
          .single();

        if (runError) {
          console.error('[monitors] run insert error:', runError.message);
          return res.status(500).json({ error: 'Failed to create monitor run' });
        }

        await supabase
          .from('monitors')
          .update({ latest_run_id: runRow.id, updated_at: now })
          .eq('id', monitorRow.id);

        // Simple alerting: if score drops more than 10 points vs previous, create an alert.
        if (baselineScore !== null && typeof runRow.overall_score === 'number') {
          const drop = baselineScore - runRow.overall_score;
          if (drop > 10) {
            await supabase.from('alerts').insert({
              monitor_id: monitorRow.id,
              run_id: runRow.id,
              severity: 'warning',
              rule_type: 'score_drop',
              message: `Overall score dropped by ${drop} points compared to previous run.`,
              created_at: now,
              resolved: false,
            });
          }
        }

        return res.status(200).json({ success: true });
      } catch (err) {
        console.error('[monitors] run unexpected error:', err);
        return res.status(500).json({ error: 'Failed to run monitor' });
      }
    }

    return res.status(400).json({ error: 'Unknown action' });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
