import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuditFlow, getDomain, getHostname } from './hooks/useAuditFlow';
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
import LandingPage from './components/LandingPage';
import WhatWeMeasuredDisplay from './components/WhatWeMeasuredDisplay';
import WhyThisMattersDisplay from './components/WhyThisMattersDisplay';
import WhatWillChangeDisplay from './components/WhatWillChangeDisplay';
import ProofItWorkedDisplay from './components/ProofItWorkedDisplay';
import VisusLogo from './components/VisusLogo';
import { useAuth } from './context/AuthContext';

import type { AIAnswerTestResponse, MonitorDetailResponse } from './types';
import {
  AuditResponse,
  UserRole,
  ExtractionData,
  TreatmentPlan,
  PrescriptionExecutionCard,
  TechnicalHandoverArtifacts,
  DeploymentChecklist,
  AuditDelta,
  ExecutiveReport,
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
import { buildRoadmapPayload } from './lib/roadmapPayload';


const App: React.FC = () => {
  const navigate = useNavigate();
  const auth = useAuth();
  const [userRole, setUserRole] = useState<UserRole>('CLIENT');

  const {
    observedAudit,
    setObservedAudit,
    lastExtractionData,
    setLastExtractionData,
    isLoading,
    loadingStage,
    errorMessage,
    setErrorMessage,
    usePasteFallback,
    lastAuditId,
    lastAuditContactEmail,
    isQueryLoading,
    isFixLoading,
    isBriefLoading,
    queryPack,
    fixLibrary,
    clientBriefing,
    treatmentPlan,
    setTreatmentPlan,
    handleAudit,
    handleAuditFromHtml,
    handleReset: resetAuditFlow,
  } = useAuditFlow(userRole, navigate);

  const [deepSynthesis, setDeepSynthesis] = useState<DeepSynthesis | null>(null);
  const [isDeltaLoading, setIsDeltaLoading] = useState(false);
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
  const [whiteLabelConfig, setWhiteLabelConfig] = useState<{ companyName: string; logoUrl: string; primaryColor: string } | null>(null);
  const [queryPackVerifications, setQueryPackVerifications] = useState<Array<{ query: string; result: string | null; pastedResponse?: string }>>([]);
  const [aiOutcomeResults, setAiOutcomeResults] = useState<AIAnswerTestResponse | null>(null);
  const [aiOutcomeLoading, setAiOutcomeLoading] = useState(false);
  const [monitorDetail, setMonitorDetail] = useState<MonitorDetailResponse | null>(null);
  const [isMonitorLoading, setIsMonitorLoading] = useState(false);

  const handleReset = () => {
    resetAuditFlow();
    setQueryPackVerifications([]);
    setDeepSynthesis(null);
    setActiveExecutionCard(null);
    setHandoverArtifacts(null);
    setFactualAnchors(null);
    setGeneratedSchema(null);
    setDeploymentChecklist(null);
    setAuditDelta(null);
    setExecutiveBrief(null);
    setCompetitiveAnalysis(null);
    setCompetitorUrl('');
    setAiOutcomeResults(null);
    setMonitorDetail(null);
  };

  const auditDiagnosis = useMemo(() => {
    if (!observedAudit || !lastExtractionData) return null;

    return buildRoadmapPayload(
      observedAudit,
      lastExtractionData,
      queryPack?.queries ?? [],
      observedAudit.summary.url ?? '',
      fixLibrary ?? null
    ).diagnosis;
  }, [observedAudit, lastExtractionData, queryPack, fixLibrary]);
  // TODO: Replace monitor-existence check with subscription_status === 'active' when Stripe webhooks are live
  const hasHowToFixAccess = !!monitorDetail?.monitor;

  useEffect(() => {
    fetch('/api/config')
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error('Failed to load config'))))
      .then((cfg) => setWhiteLabelConfig(cfg))
      .catch(() => {});
  }, []);

  useEffect(() => {
    const url = observedAudit?.summary?.url;
    if (!url) {
      setMonitorDetail(null);
      return;
    }

    const domain = getHostname(url);
    fetch(`/api/monitors?domain=${encodeURIComponent(domain)}`)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error('Failed to load monitor'))))
      .then((data) => setMonitorDetail(data))
      .catch((err) => {
        console.warn('Monitor detail load failed:', err instanceof Error ? err.message : err);
        setMonitorDetail(null);
      });
  }, [observedAudit?.summary?.url]);


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

  const handleViewRoadmap = () => {
    if (!observedAudit) {
      setErrorMessage('Run an audit first to build your roadmap.');
      return;
    }

    const roadmapState = {
      auditResult: observedAudit,
      extractionData: lastExtractionData,
      queryPackQueries: queryPack?.queries ?? [],
      url: observedAudit.summary.url ?? '',
      name: observedAudit.summary.subjectName ?? '',
      fixLibrary: fixLibrary ?? null,
      findings: observedAudit.keyFindings ?? [],
    };

    if (lastExtractionData) {
      navigate(lastAuditId ? `/roadmap/${lastAuditId}` : '/roadmap', {
        state: roadmapState,
      });
      return;
    }

    if (lastAuditId) {
      navigate(`/roadmap/${lastAuditId}`, {
        state: roadmapState,
      });
      return;
    }

    setErrorMessage(
      'Your roadmap data is still preparing. Please wait a moment and try again.'
    );
  };

  const handleEnrollMonitoring = async () => {
    if (!auth?.user) { navigate('/login'); return; }
    if (!observedAudit) {
      setErrorMessage('Run an audit first before enabling monitoring.');
      return;
    }

    setIsMonitorLoading(true);
    setErrorMessage(null);
    try {
      const response = await fetch('/api/monitors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'enroll',
          auditId: lastAuditId,
          url: observedAudit.summary.url,
          name: observedAudit.summary.subjectName ?? '',
          ownerEmail: lastAuditContactEmail || undefined,
          cadence: 'monthly',
        }),
      });
      if (!response.ok) {
        const errorBody = await response.json().catch(() => ({}));
        throw new Error(errorBody?.details ?? errorBody?.error ?? 'Failed to enable monitoring');
      }
      const json = await response.json();
      const detail: MonitorDetailResponse = {
        monitor: json.monitor ?? null,
        runs: json.runs ?? [],
        alerts: json.alerts ?? [],
        recentRun: json.recentRun ?? null,
        summary: json.summary ?? {
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
        monthlySummary: json.monthlySummary ?? {
          headline: 'Monitoring enrolled, awaiting first run',
          biggestImprovement: '',
          biggestRegression: '',
          topRecommendedAction: '',
        },
      };
      setMonitorDetail(detail);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Failed to enable monitoring');
    } finally {
      setIsMonitorLoading(false);
    }
  };

  const handleViewMonitoring = () => {
    navigate('/admin');
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <nav className="sticky top-0 z-40 border-b border-slate-200/70 bg-white/85 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <Link to="/" className="flex items-center">
            <VisusLogo size="sm" />
          </Link>
          <div className="flex gap-6">
            <Link to="/methodology" className="text-[10px] font-bold uppercase tracking-widest text-slate-500 hover:text-indigo-600">
              Methodology
            </Link>
            <Link to="/login" className="text-[10px] font-bold uppercase tracking-widest text-slate-500 hover:text-indigo-600">
              Sign In
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
      <main className="mx-auto max-w-7xl p-6 md:p-8">
        {!observedAudit ? (
          <div className="space-y-8">
            <LandingPage
              onAudit={handleAudit}
              onAuditFromHtml={handleAuditFromHtml}
              isLoading={isLoading}
              errorMessage={errorMessage}
              usePasteFallback={usePasteFallback}
            />
            {auth?.user && (
              <div className="mx-auto max-w-6xl">
                <AuditHistory />
              </div>
            )}
          </div>
        ) : (
          <ResultDashboard
            observed={observedAudit}
            auditId={lastAuditId}
            onViewRoadmap={handleViewRoadmap}
            onEnrollMonitoring={handleEnrollMonitoring}
            onViewMonitoring={monitorDetail?.monitor ? handleViewMonitoring : undefined}
            isMonitoringEnrolling={isMonitorLoading}
            isMonitorEnabled={!!monitorDetail?.monitor}
            hasHowToFixAccess={hasHowToFixAccess}
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
              a.download = `visus-report-${(observedAudit.summary?.subjectName ?? 'audit').replace(/\s+/g, '-')}-${Date.now()}.pdf`;
              a.click();
              URL.revokeObjectURL(url);
            }}
            deepSynthesis={deepSynthesis}
            isSynthesizing={false}
            isQueryLoading={isQueryLoading}
            isFixLoading={isFixLoading}
            isBriefLoading={isBriefLoading}
            aiOutcomeResults={aiOutcomeResults}
            aiOutcomeLoading={aiOutcomeLoading}
            diagnosis={auditDiagnosis}
          >
            <>
            {errorMessage && (
              <div className="bg-red-50 border border-red-200 p-4 rounded-xl text-sm text-red-700">
                {errorMessage}
              </div>
            )}

            <section className="space-y-4">
              <div className="bg-white border border-slate-200 rounded-[2.5rem] p-8 space-y-2">
                <p className="text-[10px] font-black text-indigo-600 uppercase tracking-[0.3em]">
                  Start Here
                </p>
                <h3 className="text-2xl font-black uppercase tracking-tighter text-slate-900">
                  Your fastest path to better AI visibility
                </h3>
                <p className="text-sm text-slate-600 max-w-3xl">
                  Review what Visus found, why it matters commercially, and which actions to prioritize first.
                </p>
              </div>
              <PlainLanguageVerdict audit={observedAudit} />
              <div className="space-y-4">
                <WhatWeMeasuredDisplay extractionData={lastExtractionData} audit={observedAudit} />
                <WhyThisMattersDisplay audit={observedAudit} />
              </div>
            </section>
            </>
            {hasHowToFixAccess ? (
              <>
                <section className="space-y-4">
                  <div className="space-y-4">
                    <TopActionsSummary fixLibrary={fixLibrary} treatmentPlan={treatmentPlan} />
                    <WhatWillChangeDisplay audit={observedAudit} hasActions={!!(fixLibrary?.fixes?.length || treatmentPlan?.prescriptions?.length)} />
                    <ProofItWorkedDisplay />
                  </div>
                </section>

                <section className="space-y-4">
                  <div className="bg-white border border-slate-200 rounded-[2.5rem] p-8 space-y-2">
                    <p className="text-[10px] font-black text-indigo-600 uppercase tracking-[0.3em]">
                      Deeper Visibility Signals
                    </p>
                    <h3 className="text-2xl font-black uppercase tracking-tighter text-slate-900">
                      See what AI systems are reacting to
                    </h3>
                    <p className="text-sm text-slate-600 max-w-3xl">
                      Use these panels to understand which signals support trust, what content AI can reuse, and where your page still looks weak.
                    </p>
                  </div>
                  <SignalCoverageDisplay extractionData={lastExtractionData} />
                  <BridgeNarrativeDisplay extractionData={lastExtractionData} audit={observedAudit} />
                  <CitationHealthDisplay extractionData={lastExtractionData} />
                  <WhatLLMsSeeDisplay extractionData={lastExtractionData} />
                  <HeresWhyDisplay extractionData={lastExtractionData} audit={observedAudit} />
                </section>

                <section className="space-y-4">
                  <div className="bg-white border border-slate-200 rounded-[2.5rem] p-8 space-y-2">
                    <p className="text-[10px] font-black text-indigo-600 uppercase tracking-[0.3em]">
                      Implementation Assets
                    </p>
                    <h3 className="text-2xl font-black uppercase tracking-tighter text-slate-900">
                      Turn recommendations into live fixes
                    </h3>
                    <p className="text-sm text-slate-600 max-w-3xl">
                      Export assets, review fix guidance, and validate outcomes so improvements are easier to implement and measure.
                    </p>
                  </div>
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
                  brandName={observedAudit?.summary?.subjectName ?? undefined}
                  domain={observedAudit?.summary?.url ? getHostname(observedAudit.summary.url) : undefined}
                  onOutcomeResults={(response) => {
                    setAiOutcomeResults(response);
                    if (lastAuditId) {
                      fetch('/api/audits', {
                        method: 'PATCH',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ id: lastAuditId, aiOutcomeResults: response }),
                      }).catch((err) => {
                        setErrorMessage('AI outcome results save failed: ' + (err instanceof Error ? err.message : 'Unknown error'));
                      });
                    }
                  }}
                  onOutcomeLoadingChange={setAiOutcomeLoading}
                  onVerificationChange={(verifications) => {
                    setQueryPackVerifications(verifications);
                    if (lastAuditId && verifications.some((v) => v.result || v.pastedResponse)) {
                      fetch('/api/audits', {
                        method: 'PATCH',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ id: lastAuditId, verifications }),
                      }).catch((err) => {
                        setErrorMessage('Query pack verification save failed: ' + (err instanceof Error ? err.message : 'Unknown error'));
                      });
                    }
                  }}
                />
                </section>

                <div className="bg-white border border-slate-200 rounded-[2.5rem] p-8 space-y-4">
                  <div className="space-y-2">
                    <p className="text-[11px] font-black text-indigo-600 uppercase tracking-[0.3em]">Competitor Gap Analysis</p>
                    <h4 className="text-2xl font-black uppercase tracking-tighter text-slate-900">See where a competitor is outranking you in AI answers</h4>
                    <p className="text-sm text-slate-600 max-w-3xl">
                      Compare your domain with a competitor to uncover where they have stronger trust, citation, and visibility signals, and where you can win back share fastest.
                    </p>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                      <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">You will get</p>
                      <p className="mt-2 text-sm font-semibold text-slate-900">A clearer visibility gap</p>
                      <p className="mt-1 text-xs text-slate-600">See where the competitor looks more trustworthy or easier for AI to cite.</p>
                    </div>
                    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                      <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">You will get</p>
                      <p className="mt-2 text-sm font-semibold text-slate-900">A smarter displacement path</p>
                      <p className="mt-1 text-xs text-slate-600">Use the comparison to decide which fixes are most likely to beat competing pages.</p>
                    </div>
                    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                      <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">You will get</p>
                      <p className="mt-2 text-sm font-semibold text-slate-900">Better prioritization</p>
                      <p className="mt-1 text-xs text-slate-600">Focus effort where the competitive payoff is highest instead of fixing everything at once.</p>
                    </div>
                  </div>
                  <div className="flex gap-4 flex-wrap">
                    <input
                      type="url"
                      placeholder="Competitor URL to benchmark against (e.g. https://example.com)"
                      value={competitorUrl}
                      onChange={(e) => setCompetitorUrl(e.target.value)}
                      className="flex-1 min-w-[200px] px-4 py-3 rounded-xl border border-slate-200 text-sm font-medium text-slate-900 placeholder:text-slate-400 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    />
                    <button
                      onClick={handleCompetitiveCompare}
                      disabled={isCompetitiveLoading || !competitorUrl.trim()}
                      className="px-6 py-3 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-300 text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all"
                    >
                      {isCompetitiveLoading ? 'Finding the gap...' : 'Find the gap'}
                    </button>
                  </div>
                  <p className="text-xs text-slate-500">
                    Best for high-intent competitors your customer might choose instead of you.
                  </p>
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
              </>
            ) : (
              <div className="bg-white border border-slate-200 rounded-[2.5rem] p-8 space-y-4">
                <p className="text-[11px] font-black text-indigo-600 uppercase tracking-[0.3em]">Personalized Fix Library</p>
                <h4 className="text-2xl font-black uppercase tracking-tighter text-slate-900">Your personalized fix library is ready</h4>
                <p className="text-sm text-slate-600">
                  We have identified {fixLibrary?.fixes?.length ?? 7} prioritized fixes for this site. Your top opportunity could add meaningful visibility points once implemented.
                </p>
                {auth?.user ? (
                  <p className="text-sm text-slate-700 font-semibold">
                    Enable monthly monitoring to unlock your fix library, implementation guide, and monitoring.
                  </p>
                ) : (
                  <div className="space-y-3">
                    <p className="text-sm text-slate-600">Sign in first, then enable monthly monitoring to unlock your fix library, implementation guide, and monitoring.</p>
                    <Link to="/login" className="inline-flex items-center justify-center rounded-xl bg-indigo-600 px-6 py-3 text-[10px] font-black uppercase tracking-widest text-white hover:bg-indigo-500 transition-all">
                      Sign In
                    </Link>
                  </div>
                )}
              </div>
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
