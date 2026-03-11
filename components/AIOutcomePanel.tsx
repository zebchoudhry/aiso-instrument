import React from 'react';
import type { AIAnswerTestResult, AIAnswerTestSummary } from '../types';
import { SectionIntro, SurfaceCard } from './VisualSystem';

interface AIOutcomePanelProps {
  results: AIAnswerTestResult[] | null;
  summary: AIAnswerTestSummary | null;
  isLoading?: boolean;
}

const AIOutcomePanel: React.FC<AIOutcomePanelProps> = ({ results, summary, isLoading }) => {
  if (isLoading) {
    return (
      <section className="space-y-6 pt-12 border-t border-slate-200">
        <SectionIntro
          label="AI Outcome Validation"
          title="Measure recommendation outcomes"
          description="CitationIQ is running the AI outcome test across your saved query set."
        />
        <SurfaceCard className="flex flex-col items-center justify-center space-y-6 p-10 py-20">
          <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.4em] animate-pulse">
            Running AI Outcome Test...
          </p>
        </SurfaceCard>
      </section>
    );
  }

  if (!results?.length && !summary) return null;

  return (
    <section className="space-y-6 pt-12 border-t border-slate-200">
      <SectionIntro
        label="AI Outcome Validation"
        title="Measure recommendation outcomes"
        description="Track whether AI systems now mention and cite your brand more often for the queries that matter."
      />

      {summary && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <SurfaceCard className="flex flex-col items-center p-8 text-center">
            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">AI Recommendation Visibility</span>
            <div className="text-4xl font-mono font-black tracking-tighter text-slate-900">
              {(summary.brandMentionRate * 100).toFixed(1)}%
            </div>
            <p className="mt-2 text-[10px] text-slate-500 uppercase font-medium tracking-tight">
              Brand mentioned in {summary.queriesTested} tested queries
            </p>
          </SurfaceCard>
          <SurfaceCard className="flex flex-col items-center p-8 text-center">
            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">Brand Citation Rate</span>
            <div className="text-4xl font-mono font-black tracking-tighter text-slate-900">
              {(summary.brandCitationRate * 100).toFixed(1)}%
            </div>
            <p className="mt-2 text-[10px] text-slate-500 uppercase font-medium tracking-tight">
              Brand cited/linked in AI responses
            </p>
          </SurfaceCard>
        </div>
      )}

      {results && results.length > 0 && (
        <SurfaceCard className="overflow-hidden p-10">
          <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6">Per-Query Results</h4>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-slate-100">
                  <th className="pb-3 pr-4 text-[9px] font-black text-slate-500 uppercase tracking-wider">Query</th>
                  <th className="pb-3 px-2 text-[9px] font-black text-slate-500 uppercase tracking-wider text-center">Mentioned</th>
                  <th className="pb-3 px-2 text-[9px] font-black text-slate-500 uppercase tracking-wider text-center">Cited</th>
                  <th className="pb-3 pl-4 text-[9px] font-black text-slate-500 uppercase tracking-wider">Competitors</th>
                </tr>
              </thead>
              <tbody>
                {results.map((r, i) => (
                  <tr key={i} className="border-b border-slate-50 last:border-0">
                    <td className="py-3 pr-4 text-sm font-medium text-slate-800 max-w-xs truncate" title={r.query}>
                      {r.query}
                    </td>
                    <td className="py-3 px-2 text-center">
                      <span className={`px-2 py-1 rounded-lg text-[9px] font-bold uppercase ${r.brandMentioned ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                        {r.brandMentioned ? 'Yes' : 'No'}
                      </span>
                    </td>
                    <td className="py-3 px-2 text-center">
                      <span className={`px-2 py-1 rounded-lg text-[9px] font-bold uppercase ${r.brandCited ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-100 text-slate-500'}`}>
                        {r.brandCited ? 'Yes' : 'No'}
                      </span>
                    </td>
                    <td className="py-3 pl-4 text-[10px] font-bold text-slate-600">
                      {r.competitors?.length ? r.competitors.join(', ') : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </SurfaceCard>
      )}
    </section>
  );
};

export default AIOutcomePanel;
