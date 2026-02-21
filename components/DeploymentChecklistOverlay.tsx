
import React, { useState } from 'react';
import { DeploymentChecklist } from '../types';

interface DeploymentChecklistOverlayProps {
  checklist: DeploymentChecklist | null;
  isLoading: boolean;
  onClose: () => void;
  onConfirmDeployment: () => void;
}

const DeploymentChecklistOverlay: React.FC<DeploymentChecklistOverlayProps> = ({ checklist, isLoading, onClose, onConfirmDeployment }) => {
  const [checkedItems, setCheckedItems] = useState<Set<string>>(new Set());

  const toggleItem = (id: string) => {
    const next = new Set(checkedItems);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setCheckedItems(next);
  };

  if (!checklist && !isLoading) return null;

  const allChecked = checklist && checkedItems.size === checklist.deployment_checklist.length;

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-900/70 backdrop-blur-lg p-6 animate-in fade-in duration-300">
      <div className="bg-white w-full max-w-2xl rounded-[3rem] shadow-2xl overflow-hidden flex flex-col border border-slate-200 animate-in zoom-in-95 duration-500">
        
        {/* Header */}
        <div className="p-10 bg-emerald-600 text-white">
          <div className="flex justify-between items-start mb-6">
            <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
              </svg>
            </div>
            <button onClick={onClose} className="text-white/50 hover:text-white transition-colors">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M6 18L18 6M6 6l12 12"/></svg>
            </button>
          </div>
          <h3 className="text-2xl font-black uppercase tracking-tight mb-2">Human Deployment Verification</h3>
          <p className="text-emerald-100 text-[10px] font-bold uppercase tracking-[0.3em]">Guardrail: Assets Generated → Deployed</p>
        </div>

        <div className="flex-1 overflow-y-auto p-10 space-y-10">
          {isLoading ? (
            <div className="py-20 flex flex-col items-center justify-center space-y-6">
              <div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
              <p className="text-[10px] font-black text-emerald-600 uppercase tracking-[0.4em] animate-pulse">Building Verification Protocol...</p>
            </div>
          ) : checklist && (
            <>
              <div className="space-y-6">
                {checklist.deployment_checklist.map((item) => (
                  <div 
                    key={item.step_id} 
                    onClick={() => toggleItem(item.step_id)}
                    className={`p-6 rounded-2xl border transition-all cursor-pointer flex gap-6 ${checkedItems.has(item.step_id) ? 'bg-emerald-50 border-emerald-200' : 'bg-slate-50 border-slate-100 hover:border-slate-200'}`}
                  >
                    <div className={`mt-1 w-6 h-6 rounded-lg border-2 flex items-center justify-center shrink-0 transition-colors ${checkedItems.has(item.step_id) ? 'bg-emerald-600 border-emerald-600 text-white' : 'border-slate-300'}`}>
                      {checkedItems.has(item.step_id) && <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="4" d="M5 13l4 4L19 7"/></svg>}
                    </div>
                    <div className="space-y-2">
                      <p className="text-xs font-bold text-slate-900 leading-relaxed">{item.description}</p>
                      <div className="flex items-center space-x-2">
                        <span className="text-[9px] font-black text-emerald-600 uppercase tracking-widest">Evidence Required:</span>
                        <span className="text-[10px] font-medium text-slate-500 italic">{item.evidence_required}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="bg-slate-950 p-6 rounded-2xl space-y-4">
                <h4 className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Auditor Guidance</h4>
                <ul className="space-y-2">
                  {checklist.deployment_notes_guidance.map((note, i) => (
                    <li key={i} className="text-[10px] text-slate-400 font-medium flex items-start">
                      <span className="mr-2 text-indigo-500 opacity-50">#</span> {note}
                    </li>
                  ))}
                </ul>
              </div>
            </>
          )}
        </div>

        <div className="p-8 border-t border-slate-100 bg-slate-50 flex flex-col items-center space-y-4">
          <button 
            disabled={!allChecked}
            onClick={onConfirmDeployment}
            className={`w-full py-5 rounded-2xl font-black text-xs uppercase tracking-[0.3em] shadow-xl transition-all active:scale-[0.98] ${allChecked ? 'bg-emerald-600 text-white hover:bg-emerald-700' : 'bg-slate-300 text-slate-500 cursor-not-allowed'}`}
          >
            {allChecked ? 'Confirm Real-World Deployment' : 'Complete Verification Checklist'}
          </button>
          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Requires 100% Confirmation for State Transition</p>
        </div>
      </div>
    </div>
  );
};

export default DeploymentChecklistOverlay;
