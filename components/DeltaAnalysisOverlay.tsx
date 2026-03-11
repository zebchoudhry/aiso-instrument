
import React, { useState } from 'react';
import { AuditDelta, ExecutiveReport } from '../types';
import CitationIQLogo from './CitationIQLogo';
import { SectionIntro, SurfaceCard } from './VisualSystem';

interface DeltaAnalysisOverlayProps {
  delta: AuditDelta | null;
  executiveBrief: ExecutiveReport | null;
  isLoading: boolean;
  onClose: () => void;
}

const DeltaAnalysisOverlay: React.FC<DeltaAnalysisOverlayProps> = ({ delta, executiveBrief, isLoading, onClose }) => {
  const [viewMode, setViewMode] = useState<'TECHNICAL' | 'EXECUTIVE'>('TECHNICAL');

  if (!delta && !isLoading) return null;

  return (
    <div className="fixed inset-0 z-[130] flex items-center justify-center bg-slate-900/80 backdrop-blur-xl p-6 animate-in fade-in duration-300">
      <div className="bg-slate-50 w-full max-w-4xl h-[85vh] rounded-[3rem] shadow-2xl overflow-hidden flex flex-col border border-slate-200 animate-in zoom-in-95 duration-500">
        
        {/* Clinical Header */}
        <div className="p-10 bg-[radial-gradient(circle_at_top,rgba(99,102,241,0.22),transparent_32%),linear-gradient(180deg,#08112e_0%,#0b1537_60%,#0f172a_100%)] text-white border-b border-white/10">
          <div className="flex justify-between items-center mb-6">
            <div>
              <CitationIQLogo theme="light" size="sm" />
              <div className="mt-6">
                <SectionIntro
                  label="Re-Audit Instrumentation"
                  title="Observable delta analysis"
                  description="Compare before and after audit results to see what measurably changed."
                  invert
                />
              </div>
            </div>
            <button onClick={onClose} className="text-slate-500 hover:text-white transition-colors">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M6 18L18 6M6 6l12 12"/></svg>
            </button>
          </div>
          
          <div className="flex space-x-2">
            <button 
              onClick={() => setViewMode('TECHNICAL')}
              className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${viewMode === 'TECHNICAL' ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-400 hover:text-white'}`}
            >
              Technical Signal Analysis
            </button>
            <button 
              onClick={() => setViewMode('EXECUTIVE')}
              className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${viewMode === 'EXECUTIVE' ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-400 hover:text-white'}`}
            >
              Executive Summary Brief
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-12 space-y-16">
          {isLoading ? (
            <div className="h-full flex flex-col items-center justify-center space-y-8">
              <div className="w-16 h-16 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
              <div className="text-center space-y-2">
                <p className="text-[11px] font-black text-slate-900 uppercase tracking-[0.5em] animate-pulse">Running Comparative Re-Audit...</p>
                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">DESCRIBING OBSERVABLE DIFFERENCES</p>
              </div>
            </div>
          ) : !delta ? (
            <div className="h-full flex flex-col items-center justify-center space-y-6 text-center">
              <div className="w-16 h-16 bg-rose-50 rounded-3xl flex items-center justify-center border border-rose-100">
                <svg className="w-8 h-8 text-rose-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
              </div>
              <div className="space-y-2 max-w-sm">
                <p className="text-[12px] font-black text-slate-900 uppercase tracking-widest">Delta Non-Deterministic</p>
                <p className="text-xs text-slate-500 font-medium">Re-audit was successful but current signals show high variance. Technical stasis is likely. Please verify deployment manually.</p>
              </div>
              <button 
                onClick={onClose}
                className="mt-4 px-10 py-3 bg-slate-900 text-white rounded-xl text-[10px] font-black uppercase tracking-widest"
              >
                Acknowledge Protocol Stasis
              </button>
            </div>
          ) : (
            viewMode === 'TECHNICAL' ? (
              delta && (
                <>
                  {/* Score Delta Grid */}
                  <section className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {[
                      { label: 'AI Visibility', data: delta.delta_summary.ai_visibility },
                      { label: 'Citation Likelihood', data: delta.delta_summary.citation_likelihood }
                    ].map((item) => (
                      <SurfaceCard key={item.label} className="relative overflow-hidden p-8">
                        <div className="absolute top-0 right-0 p-4">
                          <span className={`text-[10px] font-black uppercase px-3 py-1 rounded-full ${item.data.direction.includes('increase') ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-slate-50 text-slate-400 border border-slate-100'}`}>
                            {item.data.direction}
                          </span>
                        </div>
                        <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6">{item.label}</h4>
                        <div className="flex items-center space-x-12">
                          <div className="space-y-1">
                            <div className="text-[9px] font-black text-slate-400 uppercase">Before</div>
                            <div className="text-3xl font-mono font-black text-slate-300">{item.data.before}</div>
                          </div>
                          <div className="text-indigo-200">
                            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M13 7l5 5m0 0l-5 5m5-5H6" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/></svg>
                          </div>
                          <div className="space-y-1">
                            <div className="text-[9px] font-black text-indigo-500 uppercase">After</div>
                            <div className="text-3xl font-mono font-black text-slate-900">{item.data.after}</div>
                          </div>
                        </div>
                      </SurfaceCard>
                    ))}
                  </section>

                  {/* Observed Changes Section */}
                  <section className="space-y-8">
                    <h4 className="text-[11px] font-black text-slate-900 uppercase tracking-[0.3em] flex items-center">
                      <span className="w-8 h-px bg-slate-300 mr-4"></span> Confirmed Signal Shifts
                    </h4>
                    <div className="grid grid-cols-1 gap-4">
                      {delta.observed_changes.map((change, i) => (
                        <div key={i} className="p-6 bg-white border border-slate-200 rounded-2xl flex items-start space-x-6">
                          <div className="w-2 h-2 rounded-full bg-emerald-500 mt-2 shrink-0"></div>
                          <p className="text-xs font-bold text-slate-700 leading-relaxed">{change}</p>
                        </div>
                      ))}
                      {delta.observed_changes.length === 0 && (
                        <div className="p-10 text-center border-2 border-dashed border-slate-200 rounded-3xl">
                          <p className="text-[10px] font-black text-slate-400 uppercase">No reliable signal changes detected in this re-audit.</p>
                        </div>
                      )}
                    </div>
                  </section>

                  {/* Static Elements */}
                    <SurfaceCard tone="dark" className="p-10">
                    <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-8">Unchanged Structural Barriers</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {delta.unchanged_elements.map((el, i) => (
                        <div key={i} className="text-[10px] font-bold text-slate-400 flex items-start bg-slate-800/50 p-4 rounded-xl">
                          <span className="mr-3 text-slate-600 font-black">STASIS:</span> {el}
                        </div>
                      ))}
                    </div>
                  </SurfaceCard>

                  {/* Guidance Block */}
                  <section className="space-y-6">
                    <SurfaceCard tone="soft" className="space-y-4 p-8">
                      <h5 className="text-[10px] font-black text-indigo-900 uppercase tracking-widest">Next Verification Steps</h5>
                      <ul className="space-y-3">
                        {delta.next_verification_guidance.map((g, i) => (
                          <li key={i} className="text-xs font-medium text-indigo-700 flex items-center">
                            <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 mr-3"></span> {g}
                          </li>
                        ))}
                      </ul>
                    </SurfaceCard>
                    <div className="text-center italic opacity-60">
                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Auditor Confidence: {delta.confidence_note}</p>
                    </div>
                  </section>
                </>
              )
            ) : (
              executiveBrief && (
                <div className="space-y-16 animate-in slide-in-from-right-4 duration-500">
                  <section className="space-y-6">
                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-l-4 border-indigo-500 pl-4">Executive Brief</h4>
                    <h2 className="text-4xl font-black text-slate-900 leading-tight uppercase tracking-tighter">
                      {executiveBrief.executive_summary.headline}
                    </h2>
                    <p className="text-lg font-medium text-slate-600 leading-relaxed border-b border-slate-200 pb-10">
                      {executiveBrief.executive_summary.overview}
                    </p>
                  </section>

                  <section className="grid grid-cols-1 md:grid-cols-2 gap-12">
                    <div className="space-y-6">
                      <h5 className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">Observable Variance</h5>
                      <ul className="space-y-4">
                        {executiveBrief.executive_summary.what_changed.map((change, i) => (
                          <li key={i} className="flex items-start text-sm font-bold text-slate-700">
                            <span className="mr-3 text-emerald-500">↑</span> {change}
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div className="space-y-6">
                      <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Areas of Stasis</h5>
                      <ul className="space-y-4">
                        {executiveBrief.executive_summary.what_remains_unchanged.map((item, i) => (
                          <li key={i} className="flex items-start text-sm font-bold text-slate-400">
                            <span className="mr-3 text-slate-300">•</span> {item}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </section>

                  <SurfaceCard className="flex flex-col items-center space-y-4 p-10 text-center">
                    <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Epistemic Constraint</h5>
                    <p className="text-xs font-bold text-slate-500 max-w-xl italic">
                      {executiveBrief.executive_summary.interpretation_boundary}
                    </p>
                    <div className="mt-4 px-6 py-2 bg-slate-900 text-white rounded-full text-[10px] font-black uppercase tracking-widest">
                      Next Review Window: {executiveBrief.executive_summary.recommended_next_review_window}
                    </div>
                  </SurfaceCard>
                </div>
              )
            )
          )}
        </div>

        <div className="p-8 border-t border-slate-200 bg-white flex justify-between items-center">
          <div className="text-[9px] font-black text-slate-300 uppercase tracking-widest">Delta_Instrument_Protocol_v3.2</div>
          <button 
            onClick={onClose}
            className="px-12 py-4 bg-slate-950 text-white rounded-2xl text-[11px] font-black uppercase tracking-widest hover:bg-black transition-all"
          >
            Acknowledge & Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default DeltaAnalysisOverlay;
