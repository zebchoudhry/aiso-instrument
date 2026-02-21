
import React, { useState } from 'react';
import { TreatmentPlan, ScoreMetric, Prescription, ChronicityScore } from '../types';

interface TreatmentPlanDisplayProps {
  plan: TreatmentPlan;
  onPlanOverride: (newPrescriptions: any[]) => void;
  onSelectTranche: (tranche: any) => void;
}

const TreatmentPlanDisplay: React.FC<TreatmentPlanDisplayProps> = ({ plan, onPlanOverride, onSelectTranche }) => {
  const [justifications, setJustifications] = useState<Record<string, string>>({});

  const handleReorder = (idx: number, direction: 'UP' | 'DOWN') => {
    if (plan.roleContext !== 'CONSULTANT') return;
    
    const newPrescriptions = [...plan.prescriptions];
    const target = direction === 'UP' ? idx - 1 : idx + 1;
    if (target < 0 || target >= newPrescriptions.length) return;

    [newPrescriptions[idx], newPrescriptions[target]] = [newPrescriptions[target], newPrescriptions[idx]];
    
    // Mark as overridden
    newPrescriptions.forEach((p, i) => {
      p.priority = i + 1;
      p.isOverridden = true;
    });

    onPlanOverride(newPrescriptions);
  };

  const formatMetric = (m: string) => m.replace(/_/g, ' ');

  return (
    <div className="bg-slate-900 text-white rounded-[2rem] overflow-hidden shadow-2xl border border-slate-800 animate-in fade-in slide-in-from-bottom-8 duration-700">
      <div className="p-10 border-b border-slate-800">
        <div className="flex justify-between items-start mb-10">
          <div>
            <span className="text-[10px] font-black bg-indigo-500 px-3 py-1 rounded-full uppercase tracking-widest mb-4 inline-block">Treatment Plan Generator</span>
            <h2 className="text-3xl font-black tracking-tight mb-2">Primary Chronic Disorder: <span className="text-indigo-400">{formatMetric(plan.primaryChronicMetric)}</span></h2>
            <p className="text-slate-400 text-xs font-medium max-w-md">Chronicity index calculated via severity, cross-lift potential, and extraction lock-in.</p>
          </div>
          <div className="text-right">
            <div className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-1">Role Authority</div>
            <div className={`text-[10px] font-black uppercase px-3 py-1 rounded border ${plan.roleContext === 'CONSULTANT' ? 'border-amber-500 text-amber-500' : 'border-slate-700 text-slate-400'}`}>
              {plan.roleContext}
            </div>
          </div>
        </div>

        {plan.prescriptions.length > 0 && (
          <div className="mt-6 p-4 rounded-xl bg-indigo-500/10 border border-indigo-500/30">
            <p className="text-sm font-bold text-indigo-200">
              Expected lift: Implementing these fixes typically adds 10–20 points. Use Re-audit after changes to verify.
            </p>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
          {(Object.values(plan.chronicityScores) as ChronicityScore[]).map(score => (
            <div key={score.metric} className={`p-5 rounded-2xl border transition-all ${score.metric === plan.primaryChronicMetric ? 'bg-indigo-500/10 border-indigo-500/50' : 'bg-slate-800/50 border-slate-700'}`}>
              <div className="text-[9px] font-black text-slate-500 uppercase mb-3 tracking-widest">{formatMetric(score.metric)}</div>
              <div className="flex items-baseline space-x-2 mb-4">
                <div className="text-2xl font-mono font-black">{score.totalIndex.toFixed(1)}</div>
                <div className="text-[10px] text-slate-500 font-bold uppercase">Index</div>
              </div>
              <div className="space-y-1">
                <div className="flex justify-between text-[9px] uppercase font-bold text-slate-500"><span>Severity</span><span>{score.severity}</span></div>
                <div className="flex justify-between text-[9px] uppercase font-bold text-slate-500"><span>Cross-Lift</span><span>+{score.crossLift.toFixed(1)}</span></div>
                <div className="flex justify-between text-[9px] uppercase font-bold text-slate-500"><span>Unlock</span><span>{score.unlockPotential}</span></div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="p-10 bg-slate-900/50">
        <h3 className="text-xs font-black text-slate-500 uppercase tracking-[0.3em] mb-8">First Treatment Tranche (Leverage Ranked)</h3>
        
        <div className="space-y-4">
          {plan.prescriptions.map((p, idx) => (
            <div 
              key={p.prescription.id} 
              onClick={() => onSelectTranche(p)}
              className={`group relative p-6 rounded-2xl border cursor-pointer ${p.isOverridden ? 'border-amber-500/30 bg-amber-500/5' : 'border-slate-800 bg-slate-800/30'} hover:border-indigo-500/50 hover:bg-indigo-500/5 transition-all`}
            >
              <div className="flex items-start gap-6">
                <div className="flex flex-col items-center" onClick={(e) => e.stopPropagation()}>
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-black text-xs ${p.isOverridden ? 'bg-amber-500' : 'bg-slate-700'}`}>
                    {p.priority}
                  </div>
                  {plan.roleContext === 'CONSULTANT' && (
                    <div className="mt-4 flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => handleReorder(idx, 'UP')} className="p-1 hover:text-indigo-400 transition-colors"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M5 15l7-7 7 7" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/></svg></button>
                      <button onClick={() => handleReorder(idx, 'DOWN')} className="p-1 hover:text-indigo-400 transition-colors"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M19 9l-7 7-7-7" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/></svg></button>
                    </div>
                  )}
                </div>

                <div className="flex-1">
                  <div className="flex justify-between items-start mb-2">
                    <h4 className="font-black text-sm tracking-tight">{p.prescription.label}</h4>
                    <div className="flex items-center space-x-3">
                      {p.remediationState === 'assets_generated' && (
                        <span className="text-[7px] font-black text-emerald-400 uppercase tracking-[0.2em] bg-emerald-400/10 border border-emerald-400/20 px-2 py-0.5 rounded shadow-[0_0_8px_rgba(52,211,153,0.1)]">
                          Clinical Assets Ready
                        </span>
                      )}
                      <div className="text-[10px] font-mono font-bold text-indigo-400 uppercase">Leverage: {p.leverage.toFixed(2)}</div>
                    </div>
                  </div>
                  <p className="text-[11px] text-slate-400 leading-relaxed mb-4 italic">"{p.prescription.rationale}"</p>
                  
                  <div className="flex flex-wrap gap-4">
                    <div className="flex items-center space-x-1.5">
                      <div className="text-[8px] font-black text-slate-600 uppercase">Effort</div>
                      <div className="flex space-x-0.5">
                        {[...Array(10)].map((_, i) => (
                          <div key={i} className={`w-1 h-2 rounded-full ${i < p.prescription.effort ? 'bg-indigo-500' : 'bg-slate-800'}`}></div>
                        ))}
                      </div>
                    </div>
                    <div className="text-[9px] font-bold text-slate-500 uppercase">Impact: <span className="text-emerald-500">+{p.prescription.expectedImpact}pts</span></div>
                  </div>

                  {p.isOverridden && plan.roleContext === 'CONSULTANT' && (
                    <div className="mt-4 pt-4 border-t border-amber-500/20" onClick={(e) => e.stopPropagation()}>
                      <input 
                        placeholder="Justify priority override..."
                        className="w-full bg-transparent text-[10px] border-none outline-none text-amber-400 placeholder-amber-400/30 font-bold italic"
                        value={justifications[p.prescription.id] || ''}
                        onChange={(e) => setJustifications({...justifications, [p.prescription.id]: e.target.value})}
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-12 pt-10 border-t border-slate-800 grid grid-cols-1 md:grid-cols-2 gap-10">
          <div>
            <h5 className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-4">Verification Protocol</h5>
            <ul className="space-y-2">
              {plan.verificationProtocol.requirements.map((r, i) => (
                <li key={i} className="flex items-center text-[10px] font-bold text-slate-400">
                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 mr-3"></span> {r}
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h5 className="text-[9px] font-black text-rose-500/50 uppercase tracking-widest mb-4">Stop Conditions</h5>
            <ul className="space-y-2">
              {plan.verificationProtocol.stopConditions.map((s, i) => (
                <li key={i} className="flex items-center text-[10px] font-bold text-slate-500 italic text-rose-400/70">
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-500/50 mr-3"></span> {s}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      <div className="bg-indigo-600 p-8 text-center">
        <p className="text-xs font-black uppercase tracking-widest mb-1">Expected Outcome Projection</p>
        <p className="text-[11px] text-indigo-100 font-medium opacity-80">{plan.expectedOutcomeSummary}</p>
      </div>
    </div>
  );
};

export default TreatmentPlanDisplay;
