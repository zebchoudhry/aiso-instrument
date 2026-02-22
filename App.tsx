import React, { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import AuditForm from './components/AuditForm';
import AuditHistory from './components/AuditHistory';
import ResultDashboard from './components/ResultDashboard';
import TreatmentPlanDisplay from './components/TreatmentPlanDisplay';
import ReportOverlay from './components/ReportOverlay';
import RemediationOverlay from './components/RemediationOverlay';
import CompetitiveAnalysisOverlay from './components/CompetitiveAnalysisOverlay';
import DeploymentChecklistOverlay from './components/DeploymentChecklistOverlay';
import DeltaAnalysisOverlay from './components/DeltaAnalysisOverlay';
import ExecutionCardDisplay from './components/ExecutionCardDisplay';
import QueryPackDisplay from './components/QueryPackDisplay';
import FixLibraryDisplay from './components/FixLibraryDisplay';
import ClientBriefingDisplay from './components/ClientBriefingDisplay';
import SignalCoverageDisplay from './components/SignalCoverageDisplay';
import CitationHealthDisplay from './components/CitationHealthDisplay';
import SchemaExportCard from './components/SchemaExportCard';
import BridgeNarrativeDisplay from './components/BridgeNarrativeDisplay';
import PlainLanguageVerdict from './components/PlainLanguageVerdict';
import TopActionsSummary from './components/TopActionsSummary';
import WhatLLMsSeeDisplay from './components/WhatLLMsSeeDisplay';
import HeresWhyDisplay from './components/HeresWhyDisplay';
import LandingHero from './components/LandingHero';
import WhatWeMeasuredDisplay from './components/WhatWeMeasuredDisplay';
import WhyThisMattersDisplay from './components/WhyThisMattersDisplay';
import WhatWillChangeDisplay from './components/WhatWillChangeDisplay';
import ProofItWorkedDisplay from './components/ProofItWorkedDisplay';

import {
  AuditResponse,
  UserRole,
  ExtractionData,
  DiagnosticReport,
  TreatmentPlan,
  PrescriptionExecutionCard,
  TechnicalHandoverArtifacts,
  DeploymentChecklist,
  AuditDelta,
  ExecutiveReport,
  QueryPackResponse,
  FixLibraryResponse,
  ClientTranslationResponse,
  DeepSynthesis
} from './types';

import {
  performQuickAudit,
  generateHandoverArtifacts,
  generateDeploymentChecklist
} from './services/geminiClient';
import { generateAuditDelta, generateExecutiveBrief } from './services/auditHelpers';

import { TreatmentGenerator } from './services/treatmentService';
import { BaselineStore } from './services/storageService';
import { SchemaGenerator } from './services/schemaGenerator';
import { ReportService } from './services/reportService';

function getDomain(url: string): string {
  try {
    return new URL(url).origin;
  } catch {
    return url;
  }
}

function getHostname(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return url.replace(/^https?:\/\//, '').replace(/^www\./, '').split('/')[0] || '';
  }
}

const App: React.FC = () => {
  const navigate = useNavigate();
  const [observedAudit, setObservedAudit] = useState<AuditResponse | null>(null);
  const [deepSynthesis, setDeepSynthesis] = useState<DeepSynthesis | null>(null);
  const [queryPack, setQueryPack] = useState<QueryPackResponse | null>(null);
  const [fixLibrary, setFixLibrary] = useState<FixLibraryResponse | null>(null);
  const [clientBriefing, setClientBriefing] = useState<ClientTranslationResponse | null>(null);

  const [isLoading, setIsLoading] = useState(false);
  const [loadingStage, setLoadingStage] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isQueryLoading, setIsQueryLoading] = useState(false);
  const [isFixLoading, setIsFixLoading] = useState(false);
  const [isBriefLoading, setIsBriefLoading] = useState(false);
  const [isDeltaLoading, setIsDeltaLoading] = useState(false);

  const [userRole, setUserRole] = useState<UserRole>('CLIENT');

  const [treatmentPlan, setTreatmentPlan] = useState<TreatmentPlan | null>(null);
  const [activeExecutionCard, setActiveExecutionCard] =
    useState<PrescriptionExecutionCard | null>(null);

  const [handoverArtifacts, setHandoverArtifacts] =
    useState<TechnicalHandoverArtifacts | null>(null);
  const [factualAnchors, setFactualAnchors] = useState<import('./types').FactualAnchoringAsset | null>(null);
  const [isHandoverLoading, setIsHandoverLoading] = useState(false);
  const [generatedSchema, setGeneratedSchema] = useState<import('./services/schemaGenerator').GeneratedSchema | null>(null);

  const [deploymentChecklist, setDeploymentChecklist] =
    useState<DeploymentChecklist | null>(null);

  const [auditDelta, setAuditDelta] = useState<AuditDelta | null>(null);
  const [executiveBrief, setExecutiveBrief] = useState<ExecutiveReport | null>(null);
  const [competitiveAnalysis, setCompetitiveAnalysis] = useState<Parameters<typeof CompetitiveAnalysisOverlay>[0]['analysis']>(null);
  const [isCompetitiveLoading, setIsCompetitiveLoading] = useState(false);
  const [competitorUrl, setCompetitorUrl] = useState('');
  const [usePasteFallback, setUsePasteFallback] = useState(false);
  const [lastExtractionData, setLastExtractionData] = useState<ExtractionData | null>(null);
  const [whiteLabelConfig, setWhiteLabelConfig] = useState<{ companyName: string; logoUrl: string; primaryColor: string } | null>(null);
  const [lastAuditId, setLastAuditId] = useState<string | null>(null);
  const [queryPackVerifications, setQueryPackVerifications] = useState<Array<{ query: string; result: string | null; pastedResponse?: string }>>([]);

  useEffect(() => {
    fetch('/api/config')
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error('Failed to load config'))))
      .then((cfg) => setWhiteLabelConfig(cfg))
      .catch(() => {});
  }, []);

  /** ----------------------------------------
   *  CORE AUDIT PIPELINE (SAFE)
   *  --------------------------------------*/
  const handleAudit = async (url: string, name: string, email: string) => {
    setIsLoading(true);
    setErrorMessage(null);
    setObservedAudit(null);

    try {
      setLoadingStage('Harvesting live website signals…');

      const t0 = Date.now();
      const extractRes = await fetch('/api/extract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url })
      });
      const t1 = Date.now();
      if (!extractRes.ok) {
        const errBody = await extractRes.text();
        let message = 'Source website unreachable or blocked.';
        if (extractRes.status === 429) {
          message = 'Rate limit exceeded. Max 10 requests per minute. Please try again later.';
        } else if (extractRes.status >= 500) {
          message = 'Extraction service error. Please try again later.';
        } else {
          try {
            const errJson = JSON.parse(errBody);
            if (typeof errJson?.error === 'string') message = errJson.error;
            if (typeof errJson?.details === 'string') message += ` ${errJson.details}`;
          } catch (_) {
            if (errBody && errBody.length < 200) message = errBody;
          }
        }
        setUsePasteFallback(true);
        throw new Error(message.trim());
      }

      let extractionData: ExtractionData;
      try {
        extractionData = await extractRes.json();
      } catch (parseErr) {
        console.error('[handleAudit] Failed to parse extract response as JSON:', parseErr);
        throw new Error(
          'Invalid response from extraction service (expected JSON). The API may not be available. For local dev, run `vercel dev` or ensure the API is proxied correctly.'
        );
      }
      console.log('[handleAudit] extractionData received successfully');
      setLastExtractionData(extractionData);

      setLoadingStage('Computing baseline AI readiness…');

      const t2 = Date.now();
      const baseAudit = await performQuickAudit(url, name, extractionData);

      const fullAudit: AuditResponse = {
        ...baseAudit,
        keyFindings: [],
        epistemicGrounding: {
          verifiedFacts: [],
          potentialHallucinationRisks: []
        },
        remediationBlueprint: {
          immediateFixes: [],
          structuralChanges: []
        }
      };

      setObservedAudit(fullAudit);
      setIsLoading(false);

      const saveRes = await fetch('/api/audits', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url,
          name,
          extractionData,
          auditResult: fullAudit,
          findings: null,
          fixLibrary: null,
          clientBriefing: null,
        }),
      });
      const saveData = await saveRes.json().catch(() => ({}));
      const savedAuditId = saveData?.id ?? null;
      if (savedAuditId) setLastAuditId(savedAuditId);

      const domain = getDomain(url);
      BaselineStore.saveBaseline({
        domain,
        timestamp: baseAudit.summary.timestamp,
        scores: baseAudit.summary.scores,
        aiVisibilityLabel: baseAudit.summary.aiVisibilityLabel,
        heuristicVersion: baseAudit.summary.heuristicVersion,
        inputSignalHash: baseAudit.summary.inputSignalHash,
        isFrozen: false
      });

      /** ---------- OPTIONAL AI ENRICHMENT (via API) ---------- */
      setIsQueryLoading(true);
      setIsFixLoading(true);
      setIsBriefLoading(true);
      fetch('/api/audit-enrich', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url,
          name,
          extractionData,
          audit: fullAudit
        })
      })
        .then((r) => (r.ok ? r.json() : Promise.reject(new Error(r.statusText))))
        .then(({ findings, queryPack, fixLibrary: fl, clientTranslation }) => {
          setObservedAudit((prev) =>
            prev ? { ...prev, keyFindings: findings ?? [] } : prev
          );
          setFixLibrary(fl ?? null);
          setClientBriefing(clientTranslation ?? null);
          setQueryPack(queryPack ?? null);
          if (savedAuditId && (findings?.length || fl || clientTranslation || queryPack)) {
            fetch('/api/audits', {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ id: savedAuditId, findings, fixLibrary: fl, clientBriefing: clientTranslation, queryPack }),
            }).catch(() => {});
          }
        })
        .catch(() => {})
        .finally(() => {
          setIsQueryLoading(false);
          setIsFixLoading(false);
          setIsBriefLoading(false);
        });

      const plan = TreatmentGenerator.generatePlan(
        {
          domain: url,
          timestamp: Date.now(),
          heuristicVersion: baseAudit.summary.heuristicVersion,
          scores: baseAudit.summary.scores,
          aiVisibilityLabel: baseAudit.summary.aiVisibilityLabel,
          inputSignalHash: baseAudit.summary.inputSignalHash
        },
        [],
        userRole
      );

      setTreatmentPlan(plan);
    } catch (err) {
      setIsLoading(false);
      console.error('[handleAudit] Audit failed:', err instanceof Error ? err.message : err);
      if (err instanceof Error && err.stack) console.error('[handleAudit] Stack:', err.stack);
      const msg = err instanceof Error ? err.message : 'Diagnostic failed due to an unexpected error.';
      setErrorMessage(msg);
      if (msg.includes('unreachable') || msg.includes('blocked') || msg.includes('Extraction service')) {
        setUsePasteFallback(true);
      }
    }
  };

  const handleAuditFromHtml = async (html: string, url: string, name: string, email: string) => {
    setIsLoading(true);
    setErrorMessage(null);
    setObservedAudit(null);
    setUsePasteFallback(false);

    try {
      setLoadingStage('Processing pasted HTML…');

      const extractRes = await fetch('/api/extract-from-html', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ html, url: url || 'https://example.com' }),
      });

      if (!extractRes.ok) {
        const errBody = await extractRes.text();
        let message = 'HTML processing failed.';
        try {
          const errJson = JSON.parse(errBody);
          if (typeof errJson?.error === 'string') message = errJson.error;
        } catch (_) {}
        throw new Error(message);
      }

      const extractionData: ExtractionData = await extractRes.json();
      setLastExtractionData(extractionData);
      setLoadingStage('Computing baseline AI readiness…');

      const effectiveUrl = url || 'https://example.com';
      const baseAudit = await performQuickAudit(effectiveUrl, name, extractionData);

      const fullAudit: AuditResponse = {
        ...baseAudit,
        keyFindings: [],
        epistemicGrounding: { verifiedFacts: [], potentialHallucinationRisks: [] },
        remediationBlueprint: { immediateFixes: [], structuralChanges: [] },
      };

      setObservedAudit(fullAudit);
      setIsLoading(false);

      const saveRes = await fetch('/api/audits', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: effectiveUrl,
          name,
          extractionData,
          auditResult: fullAudit,
          findings: null,
          fixLibrary: null,
          clientBriefing: null,
        }),
      });
      const saveData = await saveRes.json().catch(() => ({}));
      const savedAuditId = saveData?.id ?? null;
      if (savedAuditId) setLastAuditId(savedAuditId);

      const domain = getDomain(effectiveUrl);
      BaselineStore.saveBaseline({
        domain,
        timestamp: baseAudit.summary.timestamp,
        scores: baseAudit.summary.scores,
        aiVisibilityLabel: baseAudit.summary.aiVisibilityLabel,
        heuristicVersion: baseAudit.summary.heuristicVersion,
        inputSignalHash: baseAudit.summary.inputSignalHash,
        isFrozen: false,
      });

      setIsQueryLoading(true);
      setIsFixLoading(true);
      setIsBriefLoading(true);
      fetch('/api/audit-enrich', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: effectiveUrl,
          name,
          extractionData,
          audit: fullAudit,
        }),
      })
        .then((r) => (r.ok ? r.json() : Promise.reject(new Error(r.statusText))))
        .then(({ findings, queryPack, fixLibrary: fl, clientTranslation }) => {
          setObservedAudit((prev) =>
            prev ? { ...prev, keyFindings: findings ?? [] } : prev
          );
          setFixLibrary(fl ?? null);
          setClientBriefing(clientTranslation ?? null);
          setQueryPack(queryPack ?? null);
          if (savedAuditId && (findings?.length || fl || clientTranslation || queryPack)) {
            fetch('/api/audits', {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ id: savedAuditId, findings, fixLibrary: fl, clientBriefing: clientTranslation, queryPack }),
            }).catch(() => {});
          }
        })
        .catch(() => {})
        .finally(() => {
          setIsQueryLoading(false);
          setIsFixLoading(false);
          setIsBriefLoading(false);
        });

      const plan = TreatmentGenerator.generatePlan(
        {
          domain: effectiveUrl,
          timestamp: Date.now(),
          heuristicVersion: baseAudit.summary.heuristicVersion,
          scores: baseAudit.summary.scores,
          aiVisibilityLabel: baseAudit.summary.aiVisibilityLabel,
          inputSignalHash: baseAudit.summary.inputSignalHash,
        },
        [],
        userRole
      );

      setTreatmentPlan(plan);
    } catch (err) {
      setIsLoading(false);
      setErrorMessage(
        err instanceof Error ? err.message : 'HTML processing failed.'
      );
    }
  };

  const handleReset = () => {
    setObservedAudit(null);
    setLastAuditId(null);
    setQueryPackVerifications([]);
    setLastExtractionData(null);
    setDeepSynthesis(null);
    setQueryPack(null);
    setFixLibrary(null);
    setClientBriefing(null);
    setTreatmentPlan(null);
    setActiveExecutionCard(null);
    setHandoverArtifacts(null);
    setFactualAnchors(null);
    setGeneratedSchema(null);
    setDeploymentChecklist(null);
    setAuditDelta(null);
    setExecutiveBrief(null);
    setCompetitiveAnalysis(null);
    setCompetitorUrl('');
    setErrorMessage(null);
    setUsePasteFallback(false);
  };

  const handleCompetitiveCompare = async () => {
    if (!observedAudit || !competitorUrl.trim()) return;
    setIsCompetitiveLoading(true);
    setCompetitiveAnalysis(null);
    try {
      const res = await fetch('/api/competitive', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          yourUrl: observedAudit.summary.url,
          competitorUrl: competitorUrl.trim()
        })
      });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      setCompetitiveAnalysis(data);
    } catch (e) {
      setErrorMessage(e instanceof Error ? e.message : 'Competitive analysis failed.');
    } finally {
      setIsCompetitiveLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <nav className="border-b border-slate-200 bg-white/80 backdrop-blur">
        <div className="max-w-7xl mx-auto px-6 py-3 flex justify-between items-center">
          <Link to="/" className="text-[10px] font-black uppercase tracking-widest text-slate-900">
            AISO Instrument
          </Link>
          <div className="flex gap-6">
            <Link to="/methodology" className="text-[10px] font-bold uppercase tracking-widest text-slate-500 hover:text-indigo-600">
              Methodology
            </Link>
            <Link to="/admin" className="text-[10px] font-bold uppercase tracking-widest text-slate-500 hover:text-indigo-600">
              Admin
            </Link>
            <Link to="/terms" className="text-[10px] font-bold uppercase tracking-widest text-slate-500 hover:text-indigo-600">
              Terms
            </Link>
            <Link to="/privacy" className="text-[10px] font-bold uppercase tracking-widest text-slate-500 hover:text-indigo-600">
              Privacy
            </Link>
          </div>
        </div>
      </nav>
      <main className="max-w-7xl mx-auto p-6">
        {!observedAudit ? (
          <>
            <LandingHero />
            {errorMessage && (
              <div className="mb-6 bg-red-50 border-2 border-red-200 p-5 rounded-xl text-sm text-red-800">
                <p className="font-bold">{errorMessage}</p>
                {usePasteFallback && (
                  <div className="mt-4 p-4 bg-white rounded-lg border border-red-100">
                    <p className="text-sm font-bold text-slate-800 mb-2">This site is blocking our server. Use Paste HTML to analyze it:</p>
                    <ol className="text-xs text-slate-700 list-decimal list-inside space-y-1 mb-3">
                      <li>Click <strong>Paste HTML</strong> in the tabs below</li>
                      <li>Visit the site in your browser → Right-click → View Page Source</li>
                      <li>Copy all the HTML and paste it in</li>
                    </ol>
                    <p className="text-xs text-slate-600">The form has been switched to Paste HTML for you.</p>
                  </div>
                )}
              </div>
            )}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2">
                <AuditForm
                  onAudit={handleAudit}
                  onAuditFromHtml={handleAuditFromHtml}
                  isLoading={isLoading}
                  showPasteFallback={usePasteFallback}
                />
              </div>
              <div>
                <AuditHistory />
              </div>
            </div>
          </>
        ) : (
          <ResultDashboard
            observed={observedAudit}
            auditId={lastAuditId}
            onViewRoadmap={() => {
              if (!observedAudit || !lastExtractionData) return;
              navigate('/roadmap', {
                state: {
                  auditResult: observedAudit,
                  extractionData: lastExtractionData,
                  queryPackQueries: queryPack?.queries ?? [],
                  url: observedAudit.summary.url ?? '',
                  name: observedAudit.summary.subjectName ?? '',
                  fixLibrary: fixLibrary ?? null,
                },
              });
            }}
            onReset={handleReset}
            onReAudit={async () => {
              if (!observedAudit) return;
              setIsDeltaLoading(true);
              setAuditDelta(null);
              setExecutiveBrief(null);
              try {
                const url = observedAudit.summary.url;
                const subjectName = observedAudit.summary.subjectName ?? new URL(url).hostname;
                const domain = getDomain(url);
                const baseline = BaselineStore.getActiveBaseline(domain);
                const extractRes = await fetch('/api/extract', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ url })
                });
                if (!extractRes.ok) throw new Error('Re-extraction failed.');
                const extractionData: ExtractionData = await extractRes.json();
                setLastExtractionData(extractionData);
                const newAudit = await performQuickAudit(url, subjectName, extractionData);
                const baselineAsAudit = baseline
                  ? { summary: { scores: baseline.scores } }
                  : { summary: { scores: observedAudit.summary.scores } };
                const delta = generateAuditDelta(baselineAsAudit, newAudit);
                const brief = generateExecutiveBrief(subjectName, delta);
                setAuditDelta(delta);
                setExecutiveBrief(brief);
                setObservedAudit(newAudit);
                setTreatmentPlan(TreatmentGenerator.generatePlan(
                  { domain, timestamp: Date.now(), scores: newAudit.summary.scores, aiVisibilityLabel: newAudit.summary.aiVisibilityLabel ?? '', heuristicVersion: newAudit.summary.heuristicVersion ?? '', inputSignalHash: newAudit.summary.inputSignalHash ?? '' },
                  [],
                  userRole
                ));
              } catch (e) {
                setErrorMessage(e instanceof Error ? e.message : 'Delta analysis failed.');
              } finally {
                setIsDeltaLoading(false);
              }
            }}
            isReAuditing={isDeltaLoading}
            onDownloadReport={() => {
              if (!observedAudit) return;
              const blob = ReportService.generatePdf(observedAudit, fixLibrary, clientBriefing, whiteLabelConfig, queryPackVerifications);
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = `aiso-report-${(observedAudit.summary?.subjectName ?? 'audit').replace(/\s+/g, '-')}-${Date.now()}.pdf`;
              a.click();
              URL.revokeObjectURL(url);
            }}
            deepSynthesis={deepSynthesis}
            isSynthesizing={false}
            isQueryLoading={isQueryLoading}
            isFixLoading={isFixLoading}
            isBriefLoading={isBriefLoading}
          >
            {errorMessage && (
              <div className="bg-red-50 border border-red-200 p-4 rounded-xl text-sm text-red-700">
                {errorMessage}
              </div>
            )}

            <PlainLanguageVerdict audit={observedAudit} />
            <div className="space-y-4">
              <WhatWeMeasuredDisplay extractionData={lastExtractionData} audit={observedAudit} />
              <WhyThisMattersDisplay audit={observedAudit} />
              <TopActionsSummary fixLibrary={fixLibrary} treatmentPlan={treatmentPlan} />
              <WhatWillChangeDisplay audit={observedAudit} hasActions={!!(fixLibrary?.fixes?.length || treatmentPlan?.prescriptions?.length)} />
              <ProofItWorkedDisplay />
            </div>
            <SignalCoverageDisplay extractionData={lastExtractionData} />
            <BridgeNarrativeDisplay extractionData={lastExtractionData} audit={observedAudit} />
            <CitationHealthDisplay extractionData={lastExtractionData} />
            <WhatLLMsSeeDisplay extractionData={lastExtractionData} />
            <HeresWhyDisplay extractionData={lastExtractionData} audit={observedAudit} />
            <SchemaExportCard
              extractionData={lastExtractionData}
              subjectName={observedAudit?.summary?.subjectName}
              url={observedAudit?.summary?.url}
            />
            <ClientBriefingDisplay data={clientBriefing} isLoading={isBriefLoading} />
            <FixLibraryDisplay data={fixLibrary} isLoading={isFixLoading} />
            <QueryPackDisplay
              data={queryPack}
              isLoading={isQueryLoading}
              auditId={lastAuditId}
              onVerificationChange={(verifications) => {
                setQueryPackVerifications(verifications);
                if (lastAuditId && verifications.some((v) => v.result || v.pastedResponse)) {
                  fetch('/api/audits', {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ id: lastAuditId, verifications }),
                  }).catch(() => {});
                }
              }}
            />

            <div className="bg-white border border-slate-200 rounded-[2.5rem] p-8 space-y-4">
              <h4 className="text-[11px] font-black text-slate-900 uppercase tracking-[0.3em]">Compare with Competitor</h4>
              <div className="flex gap-4 flex-wrap">
                <input
                  type="url"
                  placeholder="Competitor URL (e.g. https://example.com)"
                  value={competitorUrl}
                  onChange={(e) => setCompetitorUrl(e.target.value)}
                  className="flex-1 min-w-[200px] px-4 py-3 rounded-xl border border-slate-200 text-sm font-medium text-slate-900 placeholder:text-slate-400 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
                <button
                  onClick={handleCompetitiveCompare}
                  disabled={isCompetitiveLoading || !competitorUrl.trim()}
                  className="px-6 py-3 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-300 text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all"
                >
                  {isCompetitiveLoading ? 'Analyzing...' : 'Compare'}
                </button>
              </div>
            </div>

            {treatmentPlan && (
              <TreatmentPlanDisplay
                plan={treatmentPlan}
                onPlanOverride={(newPrescriptions) =>
                  setTreatmentPlan((prev) =>
                    prev ? { ...prev, prescriptions: newPrescriptions } : null
                  )
                }
                onSelectTranche={(p) => {
                  const card = TreatmentGenerator.generateExecutionCard(
                    p,
                    treatmentPlan.primaryChronicMetric,
                    null,
                    { domain: observedAudit.summary.url }
                  );
                  setActiveExecutionCard(card);
                }}
              />
            )}

            {activeExecutionCard && (
              <ExecutionCardDisplay
                card={activeExecutionCard}
                isVerified={false}
                hasArtifacts={!!handoverArtifacts}
                onGenerateHandover={async (c) => {
                  setIsHandoverLoading(true);
                  setFactualAnchors(null);
                  setGeneratedSchema(null);
                  try {
                    const subjectName = observedAudit.summary.subjectName ?? new URL(observedAudit.summary.url).hostname;
                    const url = observedAudit.summary.url;
                    const [artifacts] = await Promise.all([
                      generateHandoverArtifacts(c, subjectName),
                      c.prescriptionId === 'TX_EXP_FAIL'
                        ? fetch('/api/factual-anchors', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                              brandData: { name: subjectName, domain: url, category: '', location: '' },
                              findings: observedAudit.keyFindings?.map((f) => f.diagnosticTrace) ?? []
                            })
                          }).then((r) => (r.ok ? r.json() : null)).then(setFactualAnchors).catch(() => null)
                        : Promise.resolve()
                    ]);
                    setHandoverArtifacts(artifacts);
                    const schema = SchemaGenerator.generateOrganizationSchema(subjectName, url);
                    setGeneratedSchema(schema);
                  } finally {
                    setIsHandoverLoading(false);
                  }
                }}
                onGenerateChecklist={async (c) =>
                  setDeploymentChecklist(
                    await generateDeploymentChecklist(
                      c,
                      observedAudit.summary.subjectName ?? ''
                    )
                  )
                }
                onAnalyzeDelta={async () => {
                  if (!observedAudit) return;
                  setIsDeltaLoading(true);
                  setAuditDelta(null);
                  setExecutiveBrief(null);
                  try {
                    const url = observedAudit.summary.url;
                    const subjectName = observedAudit.summary.subjectName ?? new URL(url).hostname;
                    const domain = getDomain(url);
                    const baseline = BaselineStore.getActiveBaseline(domain);
                    const extractRes = await fetch('/api/extract', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ url })
                    });
                    if (!extractRes.ok) throw new Error('Re-extraction failed.');
                    const extractionData: ExtractionData = await extractRes.json();
                    const newAudit = await performQuickAudit(url, subjectName, extractionData);
                    const baselineAsAudit = baseline
                      ? { summary: { scores: baseline.scores } }
                      : { summary: { scores: observedAudit.summary.scores } };
                    const delta = generateAuditDelta(baselineAsAudit, newAudit);
                    const brief = generateExecutiveBrief(subjectName, delta);
                    setAuditDelta(delta);
                    setExecutiveBrief(brief);
                  } catch (e) {
                    setErrorMessage(e instanceof Error ? e.message : 'Delta analysis failed.');
                  } finally {
                    setIsDeltaLoading(false);
                  }
                }}
              />
            )}
          </ResultDashboard>
        )}
      </main>

      <ReportOverlay report={null} onClose={() => null} />
      <RemediationOverlay
        artifacts={handoverArtifacts}
        factualAnchors={factualAnchors}
        isLoading={isHandoverLoading}
        epistemicGrounding={observedAudit?.epistemicGrounding}
        generatedSchema={generatedSchema}
        onClose={() => {
          setHandoverArtifacts(null);
          setFactualAnchors(null);
          setGeneratedSchema(null);
        }}
      />
      <DeploymentChecklistOverlay
        checklist={deploymentChecklist}
        onClose={() => setDeploymentChecklist(null)}
        onConfirmDeployment={() => setDeploymentChecklist(null)}
      />
      <CompetitiveAnalysisOverlay
        analysis={competitiveAnalysis}
        isLoading={isCompetitiveLoading}
        onClose={() => setCompetitiveAnalysis(null)}
      />
      <DeltaAnalysisOverlay
        delta={auditDelta}
        executiveBrief={executiveBrief}
        isLoading={isDeltaLoading}
        onClose={() => {
          setAuditDelta(null);
          setExecutiveBrief(null);
        }}
      />
    </div>
  );
};

export default App;
