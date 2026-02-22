import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { AuditResponse, DeepSynthesis } from '../types';
import ScoreCard from './ScoreCard';
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

  return (
    <div className="space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      {/* Background Task Tracking HUD */}
      {isBackgroundActive && (
        <div className="bg-white border border-indigo-100 p-6 rounded-[2.5rem] shadow-sm flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex flex-col">
            <span className="text-[10px] font-black text-indigo-600 uppercase tracking-widest mb-1">Clinical Task Manager</span>
            <span className="text-[8px] font-bold text-slate-400 uppercase">Finalizing secondary inferences...</span>
          </div>
          <div className="flex flex-wrap gap-3">
             <TaskStatus label="Market Logic" active={isSynthesizing} complete={!!deepSynthesis} />
             <TaskStatus label="Briefing" active={isBriefLoading} complete={!isBriefLoading} />
             <TaskStatus label="Retrieval" active={isQueryLoading} complete={!isQueryLoading} />
             <TaskStatus label="Fixes" active={isFixLoading} complete={!isFixLoading} />
          </div>
        </div>
      )}

      {/* Tier-1 Verdict & High-Level Score */}
      <div className={`p-12 rounded-[3.5rem] border-b-8 shadow-2xl transition-all duration-700 ${isLowMaturity ? 'bg-slate-900 border-rose-600 text-white' : 'bg-white border-emerald-500 text-slate-900'}`}>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
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
          </div>

          <div className="flex flex-col items-center justify-center bg-slate-800/20 p-8 rounded-[2.5rem] border border-white/5">
             <span className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.4em] mb-4">Internal AI Readiness Score</span>
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

      {/* Numerical Breakdown */}
      {readiness?.breakdown && (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <ScoreCard label="Entity Clarity" score={readiness.breakdown.entity_clarity.score} colorClass="text-slate-900" description={readiness.breakdown.entity_clarity.explanation} />
        <ScoreCard label="Structural Signals" score={readiness.breakdown.structural_signals.score} colorClass="text-slate-900" description={readiness.breakdown.structural_signals.explanation} />
        <ScoreCard label="Compressibility" score={readiness.breakdown.compressibility.score} colorClass="text-slate-900" description={readiness.breakdown.compressibility.explanation} />
        <ScoreCard label="Corroboration" score={readiness.breakdown.corroboration.score} colorClass="text-slate-900" description={readiness.breakdown.corroboration.explanation} />
      </div>
      )}

      {/* Market Synthesis / Key Selection Logic */}
      {!deepSynthesis && !isSynthesizing && onUnlockSearch && (
        <section className="bg-slate-900 p-10 rounded-[3rem] border border-slate-800 text-center space-y-6">
           <h3 className="text-xl font-black text-white uppercase tracking-tighter">Unlock Market Intelligence</h3>
           <p className="text-slate-400 text-xs max-w-lg mx-auto leading-relaxed">Advanced competitor comparisons and entity gap analysis require Search Grounding via a paid API Key.</p>
           <button onClick={onUnlockSearch} className="px-8 py-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all shadow-lg shadow-indigo-500/20">
             Authorize Advanced Search Synthesis
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
                 <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-8">Unclaimed Semantic Nodes</h4>
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
                  Re-auditing...
                </>
              ) : (
                'Re-audit (Before/After)'
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
          Terminate Active Diagnostic Session
        </button>
      </div>
    </div>
  );
};

export default ResultDashboard;
