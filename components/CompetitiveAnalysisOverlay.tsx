import React from 'react';
import VisusLogo from './VisusLogo';
import { SectionIntro, SurfaceCard } from './VisualSystem';

export interface CompetitiveGap {
  category: string;
  yourScore: number;
  competitorScore: number;
  gap: number;
  impact: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  recommendation: string;
}

export interface CompetitiveAnalysis {
  yourDomain: string;
  competitorDomain: string;
  overallScoreYou: number;
  overallScoreCompetitor: number;
  winner: string;
  gaps: CompetitiveGap[];
  schemaComparison: {
    yourSchemas: string[];
    theirSchemas: string[];
    youHave: string[];
    theyHave: string[];
    youMissing: string[];
  };
  contentComparison: {
    yourWordCount: number;
    theirWordCount: number;
    yourPropositionalDensity: number;
    theirPropositionalDensity: number;
    winner: string;
  };
  citationComparison: {
    yourCitations: number;
    theirCitations: number;
    winner: string;
  };
}

interface CompetitiveAnalysisOverlayProps {
  analysis: CompetitiveAnalysis | null;
  isLoading: boolean;
  onClose: () => void;
}

const CompetitiveAnalysisOverlay: React.FC<CompetitiveAnalysisOverlayProps> = ({
  analysis,
  isLoading,
  onClose
}) => {
  if (!analysis && !isLoading) return null;

  return (
    <div className="fixed inset-0 z-[130] flex items-center justify-center bg-slate-900/80 backdrop-blur-xl p-6 animate-in fade-in duration-300">
      <div className="bg-slate-50 w-full max-w-4xl max-h-[90vh] rounded-[3rem] shadow-2xl overflow-hidden flex flex-col border border-slate-200 animate-in zoom-in-95 duration-500">
        <div className="p-10 bg-[radial-gradient(circle_at_top,rgba(99,102,241,0.22),transparent_32%),linear-gradient(180deg,#08112e_0%,#0b1537_60%,#0f172a_100%)] text-white border-b border-white/10">
          <div className="flex justify-between items-center">
            <div>
              <VisusLogo theme="light" size="sm" />
              <div className="mt-6">
                <SectionIntro
                  label="Competitive Intelligence"
                  title="Side-by-side analysis"
                  description="Compare your visibility signals against a chosen competitor and focus on the highest-value gaps."
                  invert
                />
              </div>
            </div>
            <button onClick={onClose} className="text-slate-500 hover:text-white transition-colors">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M6 18L18 6M6 6l12 12"/></svg>
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-12 space-y-12">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-20 space-y-8">
              <div className="w-16 h-16 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
              <p className="text-[11px] font-black text-slate-500 uppercase tracking-[0.5em] animate-pulse">Comparing websites...</p>
            </div>
          ) : analysis ? (
            <>
              <section className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <SurfaceCard className="p-8">
                  <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Your Score</h4>
                  <div className="text-4xl font-mono font-black text-slate-900">{analysis.overallScoreYou}/100</div>
                  <p className="text-xs text-slate-500 mt-2 truncate">{analysis.yourDomain}</p>
                </SurfaceCard>
                <SurfaceCard className="p-8">
                  <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Competitor Score</h4>
                  <div className="text-4xl font-mono font-black text-slate-900">{analysis.overallScoreCompetitor}/100</div>
                  <p className="text-xs text-slate-500 mt-2 truncate">{analysis.competitorDomain}</p>
                </SurfaceCard>
              </section>

              <section className="space-y-6">
                <h4 className="text-[11px] font-black text-slate-900 uppercase tracking-[0.3em]">Critical Gaps</h4>
                <div className="space-y-4">
                  {analysis.gaps.map((gap, i) => (
                    <div key={i} className="rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-sm">
                      <div className="flex justify-between items-start mb-2">
                        <span className="text-sm font-black text-slate-900">{gap.category}</span>
                        <span className={`text-[10px] font-black uppercase px-2 py-1 rounded ${
                          gap.impact === 'CRITICAL' ? 'bg-rose-50 text-rose-600' :
                          gap.impact === 'HIGH' ? 'bg-amber-50 text-amber-600' :
                          gap.impact === 'MEDIUM' ? 'bg-slate-100 text-slate-600' : 'bg-slate-50 text-slate-500'
                        }`}>{gap.impact}</span>
                      </div>
                      <p className="text-xs text-slate-600 mb-2">You: {gap.yourScore} | Competitor: {gap.competitorScore} | Gap: {gap.gap}</p>
                      <p className="text-xs font-medium text-slate-700">{gap.recommendation}</p>
                    </div>
                  ))}
                </div>
              </section>

              <section className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <SurfaceCard className="p-8">
                  <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Schema Comparison</h4>
                  <p className="text-xs text-slate-600 mb-2">You have: {analysis.schemaComparison.yourSchemas.join(', ') || 'None'}</p>
                  <p className="text-xs text-slate-600 mb-2">They have: {analysis.schemaComparison.theirSchemas.join(', ') || 'None'}</p>
                  {analysis.schemaComparison.youMissing.length > 0 && (
                    <p className="text-xs font-bold text-rose-600 mt-4">You're missing: {analysis.schemaComparison.youMissing.join(', ')}</p>
                  )}
                </SurfaceCard>
                <SurfaceCard className="p-8">
                  <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Content Comparison</h4>
                  <p className="text-xs text-slate-600">Word count: You {analysis.contentComparison.yourWordCount} vs Them {analysis.contentComparison.theirWordCount}</p>
                  <p className="text-xs text-slate-600 mt-1">Propositional density: You {analysis.contentComparison.yourPropositionalDensity}% vs Them {analysis.contentComparison.theirPropositionalDensity}%</p>
                </SurfaceCard>
              </section>
            </>
          ) : null}
        </div>

        <div className="p-8 border-t border-slate-200 bg-white flex justify-end">
          <button
            onClick={onClose}
            className="px-12 py-4 bg-slate-950 text-white rounded-2xl text-[11px] font-black uppercase tracking-widest hover:bg-black transition-all"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default CompetitiveAnalysisOverlay;
