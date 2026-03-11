import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { AuditResponse, DeepSynthesis, AIAnswerTestResponse, DiagnosisResult } from '../types';
import ScoreCard from './ScoreCard';
import AIOutcomePanel from './AIOutcomePanel';
import InvisibilityDiagnosisPanel from './InvisibilityDiagnosisPanel';
import { getPercentileLabel } from '../lib/benchmark';

interface ResultDashboardProps {
  observed: AuditResponse | null;
  auditId?: string | null;
  onViewRoadmap?: () => void;
  onReset: () => void;
  onDownloadReport?: () => void;
  onReAudit?: () => void;
  isReAuditing?: boolean;
  deepSynthesis?: DeepSynthesis | null;
  isSynthesizing?: boolean;
  isQueryLoading?: boolean;
  isFixLoading?: boolean;
  isBriefLoading?: boolean;
  onUnlockSearch?: () => void;
  aiOutcomeResults?: AIAnswerTestResponse | null;
  aiOutcomeLoading?: boolean;
  diagnosis?: DiagnosisResult | null;
  children?: React.ReactNode;
}

const TaskStatus: React.FC<{ label: string; active: boolean; complete: boolean }> = ({ label, active, complete }) => (
  <div className="flex items-center space-x-3 px-4 py-2 bg-slate-50 border border-slate-100 rounded-xl">
    <div className={`w-1.5 h-1.5 rounded-full ${complete ? 'bg-emerald-500' : active ? 'bg-indigo-500 animate-pulse' : 'bg-slate-300'}`}></div>
    <span className={`text-[9px] font-black uppercase tracking-widest ${complete ? 'text-slate-900' : active ? 'text-indigo-600' : 'text-slate-400'}`}>
      {label}
    </span>
  </div>
);

const ResultDashboard: React.FC<ResultDashboardProps> = ({
  observed,
  auditId,
  onViewRoadmap,
  onReset,
  onDownloadReport,
  onReAudit,
  isReAuditing = false,
  deepSynthesis = null,
  isSynthesizing = false,
  isQueryLoading = false,
  isFixLoading = false,
  isBriefLoading = false,
  onUnlockSearch,
  aiOutcomeResults = null,
  aiOutcomeLoading = false,
  diagnosis = null,
  children
}) => {
  if (!observed) return null;

  const [shareCopied, setShareCopied] = useState(false);
  const shareUrl = auditId ? `${window.location.origin}/report/${auditId}` : null;
  const handleShare = () => {
    if (shareUrl) {
      navigator.clipboard.writeText(shareUrl);
      setShareCopied(true);
      setTimeout(() => setShareCopied(false), 2000);
    }
  };

  const overallScore = observed.summary.scores?.overallMaturityIndex ?? observed.summary.readinessScore?.internal_ai_readiness_score ?? 0;
  const isLowMaturity = overallScore < 60;
  const isBackgroundActive = isSynthesizing || isQueryLoading || isFixLoading || isBriefLoading;
  const readiness = observed.summary.readinessScore;
  const scoreGap = Math.max(0, 100 - overallScore);
  const lowScoringAreas = readiness
    ? [
        { label: 'Entity clarity', score: readiness.breakdown.entity_clarity.score },
        { label: 'Structural signals', score: readiness.breakdown.structural_signals.score },
        { label: 'Answer reuse', score: readiness.breakdown.compressibility.score },
        { label: 'Trust signals', score: readiness.breakdown.corroboration.score },
      ]
        .sort((a, b) => a.score - b.score)
        .slice(0, 2)
    : [];
  const quickWins = [
    ...lowScoringAreas.map(
      (item) => `Improve ${item.label.toLowerCase()} to unlock faster AI understanding and citation confidence.`
    ),
    ...(diagnosis?.causes ?? []).map((cause) => cause.replace(/\.$/, '')),
  ].slice(0, 3);
  const prioritizedQuickWins =
    quickWins.length > 0
      ? quickWins
      : [
          'Strengthen the page with clearer brand facts, structured data, and proof signals so AI can trust and cite it more consistently.',
          'Turn important service or product pages into clearer, easier-to-quote answers.',
          'Re-run the audit after updates to prove which fixes improved visibility.',
        ];
  const outcomeSummary =
    overallScore >= 80
      ? 'You already show strong visibility signals. The next gains come from proving authority more consistently and defending your lead against competitors.'
      : overallScore >= 60
        ? `You are visible in parts, but AI systems still need clearer proof to recommend and cite you consistently. Closing the remaining ${scoreGap}-point gap should improve trust and recommendation quality.`
        : `You are leaving discovery on the table. AI systems do not yet have enough reliable signals to understand, trust, and reuse your content in answers.`;
  const primaryOutcome =
    lowScoringAreas.length > 0
      ? `Your biggest near-term upside is fixing ${lowScoringAreas.map((item) => item.label.toLowerCase()).join(' and ')}.`
      : 'Your biggest near-term upside is increasing proof signals and giving AI clearer facts to cite.';
  const impactLevel = overallScore >= 80 ? 'Defend and expand' : overallScore >= 60 ? 'Meaningful upside' : 'High upside';
  const commercialImpact =
    overallScore >= 80
      ? 'You are already in a stronger position, so the payoff is protecting market share and increasing citation consistency in competitive answers.'
      : overallScore >= 60
        ? 'You likely have recoverable visibility on the table. The right fixes should improve how often AI systems trust and surface your brand.'
        : 'You likely have substantial missed discovery right now because AI systems still lack enough confidence to recommend you consistently.';
  const payoffWindow = overallScore >= 80 ? '30-60 days' : overallScore >= 60 ? '30-90 days' : '30 days for first signals';
  const roiFocus =
    lowScoringAreas[0]?.label === 'Trust signals'
      ? 'Strengthen credibility first so AI treats your content as a safer source than competing pages.'
      : lowScoringAreas[0]?.label === 'Answer reuse'
        ? 'Improve answer formatting first so your pages are easier to quote, summarize, and recommend.'
        : 'Improve your weakest visibility signals first to raise recommendation confidence faster.';

  return (
    <div className="space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      {/* Background Task Tracking HUD */}
      {isBackgroundActive && (
        <div className="bg-white border border-indigo-100 p-6 rounded-[2.5rem] shadow-sm flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex flex-col">
            <span className="text-[10px] font-black text-indigo-600 uppercase tracking-widest mb-1">CitationIQ Analysis Progress</span>
            <span className="text-[8px] font-bold text-slate-400 uppercase">Turning raw signals into actions you can use...</span>
          </div>
          <div className="flex flex-wrap gap-3">
             <TaskStatus label="Competitive Insights" active={isSynthesizing} complete={!!deepSynthesis} />
             <TaskStatus label="Client Summary" active={isBriefLoading} complete={!isBriefLoading} />
             <TaskStatus label="Opportunity Scan" active={isQueryLoading} complete={!isQueryLoading} />
             <TaskStatus label="Action Plan" active={isFixLoading} complete={!isFixLoading} />
          </div>
        </div>
      )}

      {/* Tier-1 Verdict & High-Level Score */}
      <div className={`p-12 rounded-[3.5rem] border-b-8 shadow-2xl transition-all duration-700 ${isLowMaturity ? 'bg-slate-900 border-rose-600 text-white' : 'bg-white border-emerald-500 text-slate-900'}`}>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-start">
          <div className="space-y-6">
            <div className="flex flex-col space-y-2">
              <div className="flex items-center space-x-2 opacity-50">
                 <span className="text-[10px] font-black uppercase tracking-widest text-indigo-400">{observed.summary.subjectName ?? observed.summary.url}</span>
              </div>
              <h2 className="text-4xl font-black uppercase tracking-tighter leading-none">
                {observed.summary.tier1Verdict ?? 'DIAGNOSTIC'}
              </h2>
            </div>
            <p className="text-sm font-bold text-slate-400 leading-relaxed italic">
              {observed.summary.verdictMeaning ?? ''}
            </p>
            <div className={`rounded-[2rem] border p-6 space-y-4 ${isLowMaturity ? 'border-white/10 bg-white/5' : 'border-slate-200 bg-slate-50'}`}>
              <div className="space-y-2">
                <p className={`text-[10px] font-black uppercase tracking-[0.3em] ${isLowMaturity ? 'text-indigo-300' : 'text-indigo-600'}`}>
                  What This Means For You
                </p>
                <p className={`text-sm leading-relaxed ${isLowMaturity ? 'text-slate-200' : 'text-slate-700'}`}>
                  {outcomeSummary}
                </p>
              </div>
              <div className={`rounded-2xl p-4 ${isLowMaturity ? 'bg-slate-950/40 border border-white/10' : 'bg-white border border-slate-200'}`}>
                <p className={`text-[10px] font-black uppercase tracking-[0.3em] ${isLowMaturity ? 'text-slate-400' : 'text-slate-500'}`}>
                  Biggest Missed Opportunity
                </p>
                <p className={`mt-2 text-sm font-semibold leading-relaxed ${isLowMaturity ? 'text-white' : 'text-slate-900'}`}>
                  {primaryOutcome}
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-col items-center justify-center bg-slate-800/20 p-8 rounded-[2.5rem] border border-white/5">
             <span className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.4em] mb-4">CitationIQ Visibility Score</span>
             <div className="flex items-baseline space-x-2">
                <span className="text-8xl font-black tracking-tighter text-white drop-shadow-lg">{readiness?.internal_ai_readiness_score ?? overallScore}</span>
                <span className="text-2xl font-black text-slate-500">/100</span>
             </div>
             <span className="mt-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
               {getPercentileLabel(overallScore)}
             </span>
          </div>
        </div>
      </div>

      <section className="bg-white border border-slate-200 rounded-[2.5rem] p-8 space-y-5">
        <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-[10px] font-black text-indigo-600 uppercase tracking-[0.3em]">Top Quick Wins</p>
            <h3 className="text-2xl font-black uppercase tracking-tighter text-slate-900">What to do first</h3>
          </div>
          <p className="text-sm text-slate-500 max-w-2xl">
            Focus on the changes most likely to improve how AI systems understand, trust, and cite your brand.
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {prioritizedQuickWins.map((item, index) => (
            <div key={`${item}-${index}`} className="rounded-2xl border border-slate-200 bg-slate-50 p-5 space-y-3">
              <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-indigo-600 text-white text-xs font-black">
                {index + 1}
              </span>
              <p className="text-sm font-semibold leading-relaxed text-slate-900">{item}</p>
              <p className="text-xs text-slate-500">
                Prioritize this early to raise confidence in your content and improve your chances of being surfaced in answers.
              </p>
            </div>
          ))}
        </div>
      </section>

      <section className="bg-white border border-slate-200 rounded-[2.5rem] p-8 space-y-5">
        <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-[10px] font-black text-indigo-600 uppercase tracking-[0.3em]">Business Impact Snapshot</p>
            <h3 className="text-2xl font-black uppercase tracking-tighter text-slate-900">What this could mean commercially</h3>
          </div>
          <p className="text-sm text-slate-500 max-w-2xl">
            CitationIQ translates the visibility gap into what matters most: how much brand discovery, trust, and competitive share you may be missing.
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5 space-y-2">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Commercial upside</p>
            <p className="text-lg font-black text-slate-900">{impactLevel}</p>
            <p className="text-sm text-slate-600">{commercialImpact}</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5 space-y-2">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Likely payoff window</p>
            <p className="text-lg font-black text-slate-900">{payoffWindow}</p>
            <p className="text-sm text-slate-600">Use the before/after check and AI outcome tests to confirm progress as changes go live.</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5 space-y-2">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Highest-value focus</p>
            <p className="text-lg font-black text-slate-900">Prioritize the weakest signal</p>
            <p className="text-sm text-slate-600">{roiFocus}</p>
          </div>
        </div>
      </section>

      {/* Numerical Breakdown */}
      {readiness?.breakdown && (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <ScoreCard label="Entity Clarity" score={readiness.breakdown.entity_clarity.score} colorClass="text-slate-900" description={readiness.breakdown.entity_clarity.explanation} />
        <ScoreCard label="Structural Signals" score={readiness.breakdown.structural_signals.score} colorClass="text-slate-900" description={readiness.breakdown.structural_signals.explanation} />
        <ScoreCard label="Answer Reuse" score={readiness.breakdown.compressibility.score} colorClass="text-slate-900" description={readiness.breakdown.compressibility.explanation} />
        <ScoreCard label="Trust Signals" score={readiness.breakdown.corroboration.score} colorClass="text-slate-900" description={readiness.breakdown.corroboration.explanation} />
      </div>
      )}

      {diagnosis && <InvisibilityDiagnosisPanel diagnosis={diagnosis} />}

      {/* AI Outcome Validation */}
      {aiOutcomeResults || aiOutcomeLoading ? (
        <AIOutcomePanel
          results={aiOutcomeResults?.results ?? null}
          summary={aiOutcomeResults?.summary ?? null}
          isLoading={aiOutcomeLoading}
        />
      ) : (
        <section className="space-y-2 pt-12 border-t border-slate-200">
          <h3 className="text-2xl font-black uppercase tracking-tighter text-slate-900">AI Outcome Validation</h3>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
            Run AI Outcome Test from the Query Pack below to measure recommendation outcomes.
          </p>
        </section>
      )}

      {/* Market Synthesis / Key Selection Logic */}
      {!deepSynthesis && !isSynthesizing && onUnlockSearch && (
        <section className="bg-slate-900 p-10 rounded-[3rem] border border-slate-800 text-center space-y-6">
           <h3 className="text-xl font-black text-white uppercase tracking-tighter">Unlock Competitor Insights</h3>
           <p className="text-slate-400 text-xs max-w-lg mx-auto leading-relaxed">Advanced competitor comparisons and market-gap analysis require Search Grounding via a paid API key.</p>
           <button onClick={onUnlockSearch} className="px-8 py-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all shadow-lg shadow-indigo-500/20">
             Unlock Advanced Insights
           </button>
        </section>
      )}

      {deepSynthesis && (
        <section className="space-y-8 pt-12 border-t border-slate-200">
           <h3 className="text-2xl font-black uppercase tracking-tighter text-slate-900">Market Synthesis</h3>
           <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="bg-slate-900 p-10 rounded-[2.5rem] text-white">
                 <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-8">Category Authority Holders</h4>
                 <div className="p-6 bg-slate-800 rounded-2xl mb-8">
                    <span className="text-[8px] font-black text-indigo-400 uppercase block mb-1">Identified Market Leader</span>
                    <p className="text-lg font-black">{deepSynthesis.marketDelta?.consensus_winner}</p>
                 </div>
                 <ul className="space-y-2">
                    {deepSynthesis.marketDelta?.signal_gap_analysis?.map((gap, i) => (
                      <li key={i} className="text-[10px] text-slate-400 font-bold flex items-center">
                         <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full mr-3"></span> {gap}
                      </li>
                    ))}
                 </ul>
              </div>
              <div className="bg-white border border-slate-200 p-10 rounded-[2.5rem]">
                 <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-8">Open Visibility Opportunities</h4>
                 <div className="flex flex-wrap gap-2">
                    {deepSynthesis.entityMapping?.unclaimed_semantic_territory?.map((t, i) => (
                      <span key={i} className="px-4 py-2 bg-indigo-50 text-indigo-600 border border-indigo-100 rounded-xl text-[10px] font-black uppercase">
                        {t}
                      </span>
                    ))}
                 </div>
              </div>
           </div>
        </section>
      )}

      {children}

      <section className="bg-white border border-slate-200 rounded-[2.5rem] p-8 space-y-4">
        <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-[10px] font-black text-indigo-600 uppercase tracking-[0.3em]">Proof It Worked</p>
            <h3 className="text-2xl font-black uppercase tracking-tighter text-slate-900">Verify the before/after result</h3>
          </div>
          <p className="text-sm text-slate-500 max-w-2xl">
            After your changes go live, use CitationIQ to confirm score gains, reduced blockers, and stronger recommendation outcomes.
          </p>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">1. Launch the fixes</p>
            <p className="mt-2 text-sm text-slate-700">
              Publish the highest-priority content, citation, and structured-data updates first.
            </p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">2. Run the before/after check</p>
            <p className="mt-2 text-sm text-slate-700">
              Re-audit to compare the new visibility score, diagnosis, and weak-signal profile against your baseline.
            </p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">3. Validate outcomes</p>
            <p className="mt-2 text-sm text-slate-700">
              Run AI outcome tests from the query pack to confirm better mentions, citations, and recommendation quality.
            </p>
          </div>
        </div>
      </section>

      <div className="flex flex-wrap gap-4 justify-between items-center">
        <div className="flex flex-wrap gap-3">
          {onDownloadReport && (
            <button
              onClick={onDownloadReport}
              className="px-8 py-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all"
            >
              Download Report (PDF)
            </button>
          )}
          {shareUrl && (
            <button
              onClick={handleShare}
              className="px-8 py-4 bg-slate-100 hover:bg-slate-200 text-slate-900 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all"
            >
              {shareCopied ? 'Link copied!' : 'Share Report Link'}
            </button>
          )}
          {onReAudit && (
            <button
              onClick={onReAudit}
              disabled={isReAuditing}
              className="px-8 py-4 bg-slate-900 hover:bg-slate-800 disabled:bg-slate-400 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2"
            >
              {isReAuditing ? (
                <>
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Running before/after check...
                </>
              ) : (
                'Run Before/After Check'
              )}
            </button>
          )}
          {onViewRoadmap && (
            <button
              onClick={onViewRoadmap}
              className="px-8 py-4 bg-violet-600 hover:bg-violet-500 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all"
            >
              View Roadmap
            </button>
          )}
          {!onViewRoadmap && auditId && (
            <Link
              to={`/roadmap/${auditId}`}
              className="px-8 py-4 bg-violet-600 hover:bg-violet-500 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all"
            >
              View Roadmap
            </Link>
          )}
        </div>
        <button onClick={onReset} className="py-4 text-[11px] font-black text-slate-400 hover:text-slate-900 uppercase tracking-[0.4em] transition-all">
          Start New Audit
        </button>
      </div>
    </div>
  );
};

export default ResultDashboard;
