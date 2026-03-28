
import React from 'react';
import { ClientTranslationResponse } from '../types';

interface ClientBriefingDisplayProps {
  data: ClientTranslationResponse | null;
  isLoading: boolean;
}

const ClientBriefingDisplay: React.FC<ClientBriefingDisplayProps> = ({ data, isLoading }) => {
  if (!data && !isLoading) return null;

  return (
    <div className="bg-[#fdfcfb] border border-[#e8e3df] rounded-[3rem] p-10 lg:p-16 space-y-16 shadow-xl animate-in fade-in slide-in-from-bottom-4 duration-700">
      <header className="space-y-4 border-b border-[#e8e3df] pb-10">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 rounded-full bg-slate-900 flex items-center justify-center">
            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"/>
            </svg>
          </div>
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.4em]">Business Strategy Briefing</span>
        </div>
        <h3 className="text-4xl font-black text-slate-900 tracking-tighter leading-tight max-w-2xl">
          What AI Systems Infer About Your Business
        </h3>
        <p className="text-lg font-medium text-slate-600 leading-relaxed italic max-w-3xl">
          {isLoading ? "Preparing plain-English briefing..." : (data?.summary ?? data?.client_summary)}
        </p>
      </header>

      {isLoading ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16">
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="rounded-2xl bg-slate-100 animate-pulse h-16" />
            ))}
          </div>
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="rounded-2xl bg-slate-100 animate-pulse h-16" />
            ))}
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16">
          {(data?.keyTakeaways ?? data?.key_issues ?? []).length > 0 && (
            <section className="space-y-10">
              <h4 className="text-[11px] font-black text-slate-900 uppercase tracking-[0.3em] flex items-center">
                <span className="w-8 h-px bg-slate-200 mr-4"></span> Key Takeaways
              </h4>
              <div className="space-y-8">
                {(data?.keyTakeaways ?? data?.key_issues?.map((item: { issue?: string }) => item.issue) ?? []).map((item: string, i: number) => (
                  <div key={i} className="space-y-3">
                    <p className="text-base font-black text-slate-900 leading-tight">{item}</p>
                  </div>
                ))}
              </div>
            </section>
          )}

          {(data?.nextSteps ?? data?.recommended_actions ?? []).length > 0 && (
            <section className="space-y-10">
              <h4 className="text-[11px] font-black text-slate-900 uppercase tracking-[0.3em] flex items-center">
                <span className="w-8 h-px bg-slate-200 mr-4"></span> Next Steps
              </h4>
              <div className="space-y-6">
                {(data?.nextSteps ?? data?.recommended_actions?.map((item: { action?: string }) => item.action) ?? []).map((item: string, i: number) => (
                  <div key={i} className="bg-white p-8 rounded-2xl border border-[#e8e3df] shadow-sm hover:shadow-md transition-shadow">
                    <div className="flex gap-4">
                      <div className="w-6 h-6 rounded-full bg-indigo-50 flex items-center justify-center shrink-0">
                        <span className="text-[10px] font-black text-indigo-600">{i+1}</span>
                      </div>
                      <p className="text-sm font-black text-slate-900">{item}</p>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>
      )}

      {!isLoading && (
        <div className="bg-slate-900 p-12 rounded-[2.5rem] text-white space-y-6 relative overflow-hidden">
          <div className="absolute top-0 right-0 p-8 opacity-10">
            <svg className="w-24 h-24" fill="currentColor" viewBox="0 0 24 24"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg>
          </div>
          <h4 className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.4em]">Inference Correction Path</h4>
          <p className="text-xl font-black tracking-tight leading-tight max-w-2xl">
            {data?.what_improves_after_fix ?? (data?.nextSteps ?? []).slice(0, 2).join(' ') ?? data?.summary}
          </p>
          <p className="text-xs text-slate-500 font-bold uppercase tracking-widest pt-4 italic">
            * This summary describes machine-readable signals affecting external AI agents.
          </p>
        </div>
      )}
    </div>
  );
};

export default ClientBriefingDisplay;
