
import React from 'react';
import { PrescriptionExecutionCard } from '../types';

interface ExecutionCardDisplayProps {
  card: PrescriptionExecutionCard;
  isVerified?: boolean;
  hasArtifacts?: boolean;
  onVerify?: () => void;
  onGenerateHandover?: (card: PrescriptionExecutionCard) => void;
  onGenerateChecklist?: (card: PrescriptionExecutionCard) => void;
  onAnalyzeDelta?: (card: PrescriptionExecutionCard) => void;
  showVerificationControl?: boolean;
}

const ExecutionCardDisplay: React.FC<ExecutionCardDisplayProps> = ({
  card,
  isVerified = false,
  hasArtifacts = false,
  onVerify,
  onGenerateHandover,
  onGenerateChecklist,
  onAnalyzeDelta,
  showVerificationControl
}) => {
  return (
    <div className="bg-white rounded-[3rem] border border-slate-200 shadow-xl overflow-hidden animate-in zoom-in-95 duration-700">
      <div className="bg-slate-950 text-white p-8 lg:p-12 flex flex-col lg:flex-row justify-between lg:items-center gap-8 border-b-8 border-indigo-600">
        <div className="min-w-0 flex-1">
          <div className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.3em] mb-3">Protocol Execution Step</div>
          <h3 className="text-xl md:text-2xl lg:text-3xl font-black tracking-tight uppercase leading-tight break-all">
            {card.cardId}
          </h3>
        </div>
        <div className="flex flex-wrap items-center gap-3 shrink-0">
           {onGenerateHandover && !isVerified && (
            <button 
              onClick={() => onGenerateHandover(card)}
              className={`px-5 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${hasArtifacts ? 'bg-indigo-600 text-white border border-indigo-500' : 'bg-white/10 hover:bg-white/20 text-white border border-white/20'}`}
            >
              {hasArtifacts ? 'Handover Agent: Ready' : 'Invoke Handover Agent'}
            </button>
           )}
           {hasArtifacts && onGenerateChecklist && !isVerified && (
             <button 
               onClick={() => onGenerateChecklist(card)}
               className="px-5 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest bg-emerald-600 text-white border border-emerald-500 hover:bg-emerald-500 transition-all whitespace-nowrap"
             >
               Invoke Deployment Agent
             </button>
           )}
           {isVerified && onAnalyzeDelta && (
             <button 
               onClick={() => onAnalyzeDelta(card)}
               className="px-5 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest bg-indigo-600 text-white border border-indigo-500 hover:bg-indigo-500 transition-all shadow-[0_0_15px_rgba(99,102,241,0.4)] whitespace-nowrap"
             >
               Invoke Delta Analyst Agent
             </button>
           )}
          <div className={`px-5 py-3 rounded-full text-[10px] font-black uppercase tracking-widest border-2 transition-all whitespace-nowrap ${isVerified ? 'border-emerald-500 text-emerald-500 bg-emerald-500/10' : 'border-slate-800 text-slate-600'}`}>
            {isVerified ? '✓ IMPLEMENTED' : 'PENDING'}
          </div>
        </div>
      </div>

      <div className="p-8 lg:p-12 space-y-16">
        <section className="grid grid-cols-1 md:grid-cols-2 gap-12 lg:gap-16">
          <div className="space-y-8">
            <h4 className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] flex items-center">
              <span className="w-8 h-px bg-slate-200 mr-4"></span> Structural Action Required
            </h4>
            <div className="p-8 lg:p-10 bg-slate-50 rounded-[2.5rem] border border-slate-100 shadow-inner">
              <p className="text-lg lg:text-xl font-bold text-slate-900 leading-tight mb-8">
                {card.action.description}
              </p>
              <div className="space-y-4">
                <p className="text-[10px] font-black text-rose-500 uppercase tracking-widest">Constraint Integrity: Forbidden Actions</p>
                <ul className="space-y-2">
                  {card.action.forbiddenActions.map((f, i) => (
                    <li key={i} className="text-xs text-slate-500 font-bold flex items-start pl-4 border-l-2 border-rose-200">
                      {f}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>

          <div className="space-y-10">
            <div className="space-y-6">
              <h4 className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] flex items-center">
                <span className="w-8 h-px bg-slate-200 mr-4"></span> Syntactic Pattern Target
              </h4>
              <div className="bg-slate-950 rounded-3xl p-8 border border-slate-800 shadow-lg group">
                <div className="flex justify-between items-center mb-4">
                  <span className="text-[9px] font-black text-indigo-500 uppercase tracking-widest">Target Semantic State</span>
                  <div className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse"></div>
                </div>
                <p className="text-xs font-mono text-indigo-100 font-bold leading-relaxed break-words">
                  {card.example.after}
                </p>
              </div>
            </div>

            <div className="space-y-6">
              <h4 className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] flex items-center">
                <span className="w-8 h-px bg-slate-200 mr-4"></span> Deployment Context
              </h4>
              <div className="flex flex-wrap gap-2">
                {card.scope.applyTo.map((s, i) => (
                  <span key={i} className="px-4 py-1.5 bg-indigo-50 text-indigo-700 rounded-lg text-[10px] font-black border border-indigo-100 uppercase tracking-widest shadow-sm">
                    {s}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="pt-16 border-t border-slate-100">
           <h4 className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] mb-12 text-center">Structural Verification Checklist</h4>
           <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-10 max-w-4xl mx-auto">
             {card.checklist.map((item, i) => (
               <div key={i} className="flex flex-col items-center text-center p-6 bg-white rounded-3xl border border-slate-50 shadow-sm hover:shadow-md transition-shadow">
                 <div className="w-10 h-10 rounded-full bg-slate-950 flex items-center justify-center mb-4 text-white font-black text-sm">{i+1}</div>
                 <p className="text-[11px] font-black text-slate-700 leading-tight uppercase tracking-tight">{item}</p>
               </div>
             ))}
           </div>
        </section>

        {showVerificationControl && !isVerified && (
          <div className="pt-16 flex flex-col items-center border-t border-slate-100">
            <button 
              onClick={onVerify}
              className="px-12 lg:px-16 py-5 lg:py-6 bg-slate-950 text-white rounded-[2rem] font-black text-sm uppercase tracking-[0.4em] shadow-2xl hover:bg-black transition-all active:scale-[0.97] border-b-4 border-indigo-500"
            >
              Verify Implementation Complete
            </button>
            <p className="mt-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Clinical sign-off required for Re-Audit sequence.</p>
          </div>
        )}
      </div>

      <div className="bg-slate-50 px-8 lg:px-12 py-6 flex flex-col md:flex-row justify-between items-center gap-4 text-[10px] font-black text-slate-300 uppercase tracking-widest border-t border-slate-100 italic">
        <span>Clinical_Diagnostic_Protocol: Deterministic_Audit_v2.5</span>
        <span>Output_Boundary: Structural_Handover_Only</span>
      </div>
    </div>
  );
};

export default ExecutionCardDisplay;
