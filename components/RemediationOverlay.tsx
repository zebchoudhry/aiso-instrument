import React, { useEffect, useState } from 'react';
import { TechnicalHandoverArtifacts, FactualAnchoringAsset } from '../types';

interface GeneratedSchema {
  type: string;
  code: string;
  description: string;
  impact: string;
}

interface RemediationOverlayProps {
  artifacts: TechnicalHandoverArtifacts | null;
  factualAnchors: FactualAnchoringAsset | null;
  isLoading?: boolean;
  epistemicGrounding?: {
    verifiedFacts: string[];
    potentialHallucinationRisks: string[];
  };
  generatedSchema?: GeneratedSchema | null;
  onClose: () => void;
}

const RemediationOverlay: React.FC<RemediationOverlayProps> = ({ artifacts, factualAnchors, isLoading = false, epistemicGrounding, generatedSchema, onClose }) => {
  const [terminalLogs, setTerminalLogs] = useState<string[]>([]);
  const [isContextLocked, setIsContextLocked] = useState(false);

  useEffect(() => {
    if (isLoading) {
      setTerminalLogs([
        "CONNECTING TO HANDOVER_AGENT_V3.0...",
        "AUTHENTICATING CLINICAL_BOUNDARIES...",
        "EXTRACTING EPISTEMIC_SIGNALS...",
        "LOCKING CONTEXT_FACTS..."
      ]);
      const timer = setInterval(() => {
        setTerminalLogs(prev => [...prev, "CALIBRATING_GROUNDING_COEFFICIENT..."]);
      }, 2000);
      return () => clearInterval(timer);
    } else {
      setTerminalLogs(prev => [...prev, "SYNTHESIS_COMPLETE. ASSETS_READY."]);
    }
  }, [isLoading]);

  if (!artifacts && !factualAnchors && !isLoading) return null;

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center bg-slate-900/60 backdrop-blur-md p-6 animate-in fade-in duration-300">
      <div className="bg-slate-950 w-full max-w-5xl h-[85vh] rounded-[3rem] shadow-2xl overflow-hidden flex flex-col border border-slate-800 animate-in zoom-in-95 duration-500">
        
        <div className="p-8 border-b border-slate-800 flex justify-between items-center bg-slate-900">
          <div className="flex items-center space-x-4">
            <div className="flex space-x-1.5">
              <div className="w-3 h-3 rounded-full bg-rose-500/20 border border-rose-500/50"></div>
              <div className="w-3 h-3 rounded-full bg-amber-500/20 border border-amber-500/50"></div>
              <div className="w-3 h-3 rounded-full bg-emerald-500/20 border border-emerald-500/50"></div>
            </div>
            <div className="h-4 w-px bg-slate-800 mx-2"></div>
            <div>
              <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.3em]">Technical Handover Terminal</h3>
              <p className="text-[9px] font-mono text-indigo-400/70 uppercase">
                {isLoading ? 'HANDOVER_AGENT: RUNNING' : 'HANDOVER_AGENT: STABLE'}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-500 hover:text-white transition-colors">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M6 18L18 6M6 6l12 12"/></svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-12 space-y-16 bg-[#050505]">
          {isLoading ? (
            <div className="h-full flex flex-col items-center justify-center space-y-12">
              <div className="w-16 h-16 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
              <div className="w-full max-w-md bg-slate-900/50 p-6 rounded-2xl border border-slate-800 font-mono text-[10px] space-y-2">
                {terminalLogs.map((log, i) => (
                  <div key={i} className="text-indigo-400">
                    <span className="text-slate-600 mr-2">[{new Date().toLocaleTimeString()}]</span> {log}
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <>
              <section className="bg-indigo-950/20 border border-indigo-500/30 rounded-[2.5rem] p-10 space-y-8 animate-in slide-in-from-bottom-4 duration-500">
                 <div className="flex justify-between items-center">
                    <div>
                      <h4 className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.4em] mb-2">Verified Context Lock</h4>
                      <p className="text-xs text-indigo-100/60 max-w-md italic">The agent has been grounded in these specific facts found during audit. Verify these to unlock artifact export.</p>
                    </div>
                    <button 
                      onClick={() => setIsContextLocked(!isContextLocked)}
                      className={`px-6 py-2 rounded-full text-[9px] font-black uppercase tracking-widest border transition-all ${isContextLocked ? 'bg-emerald-600 border-emerald-500 text-white shadow-[0_0_15px_rgba(16,185,129,0.3)]' : 'bg-transparent border-indigo-500/50 text-indigo-400'}`}
                    >
                      {isContextLocked ? 'CONTEXT_VERIFIED' : 'VERIFY_FACTS'}
                    </button>
                 </div>

                 <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-4">
                       <span className="text-[8px] font-black text-emerald-500 uppercase tracking-widest">Grounding Anchor Source</span>
                       <div className="flex flex-wrap gap-2">
                          {epistemicGrounding?.verifiedFacts?.map((fact, i) => (
                            <span key={i} className="px-3 py-1 bg-indigo-500/10 border border-indigo-500/20 rounded-md text-[10px] font-mono text-indigo-300">
                              {fact}
                            </span>
                          ))}
                          {(!epistemicGrounding?.verifiedFacts || epistemicGrounding.verifiedFacts.length === 0) && <span className="text-[10px] text-slate-600 italic">No facts extracted</span>}
                       </div>
                    </div>
                    <div className="space-y-4">
                       <span className="text-[8px] font-black text-rose-500 uppercase tracking-widest">Hallucination Mitigation Areas</span>
                       <div className="flex flex-wrap gap-2">
                          {epistemicGrounding?.potentialHallucinationRisks?.map((risk, i) => (
                            <span key={i} className="px-3 py-1 bg-rose-500/10 border border-rose-500/20 rounded-md text-[10px] font-mono text-rose-300">
                              {risk}
                            </span>
                          ))}
                          {(!epistemicGrounding?.potentialHallucinationRisks || epistemicGrounding.potentialHallucinationRisks.length === 0) && <span className="text-[10px] text-slate-600 italic">None identified</span>}
                       </div>
                    </div>
                 </div>
              </section>

              {isContextLocked && (
                <div className="animate-in slide-in-from-bottom-8 duration-700 space-y-16">
                  {artifacts && (
                    <>
                      <section className="space-y-8">
                        <div className="flex items-center space-x-4">
                          <span className="text-[10px] font-black text-indigo-500 uppercase tracking-widest bg-indigo-500/10 px-3 py-1 rounded-md">01. Structural Blueprint</span>
                          <div className="flex-1 h-px bg-slate-800"></div>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                          <div className="space-y-8">
                            <div className="p-6 bg-slate-900/50 border border-slate-800 rounded-3xl space-y-4">
                              <h4 className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Target Architecture</h4>
                              <p className="text-xs text-indigo-100 font-medium leading-relaxed italic border-l-2 border-indigo-500 pl-4">
                                {artifacts.structural_blueprint?.target_architecture || "No architecture data available."}
                              </p>
                            </div>
                            <div className="space-y-4">
                              <h4 className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Entity Declaration Anchors</h4>
                              <div className="space-y-2">
                                {artifacts.structural_blueprint?.entity_declaration_anchors?.map((anchor, i) => (
                                  <div key={i} className="p-4 bg-slate-900 border border-slate-800 rounded-xl text-[11px] font-mono text-slate-300">
                                    <span className="text-indigo-500 mr-2">{" > "}</span> {anchor}
                                  </div>
                                ))}
                                {(!artifacts.structural_blueprint?.entity_declaration_anchors || artifacts.structural_blueprint.entity_declaration_anchors.length === 0) && (
                                  <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl text-[11px] font-mono text-slate-500">None defined</div>
                                )}
                              </div>
                            </div>
                          </div>
                          <div className="space-y-6">
                            <div className="p-6 bg-slate-900 border border-slate-800 rounded-2xl space-y-4">
                              <h4 className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Required Schema Modifications</h4>
                              <ul className="space-y-3">
                                {artifacts.structural_blueprint?.required_schema_modifications?.map((mod, i) => (
                                  <li key={i} className="text-[10px] text-slate-400 font-bold flex items-start">
                                    <span className="mr-3 text-indigo-800 font-black">#</span> {mod}
                                  </li>
                                ))}
                                {(!artifacts.structural_blueprint?.required_schema_modifications || artifacts.structural_blueprint.required_schema_modifications.length === 0) && (
                                  <li className="text-[10px] text-slate-600">No modifications required</li>
                                )}
                              </ul>
                            </div>
                          </div>
                        </div>
                      </section>

                      <section className="space-y-8">
                        <div className="flex items-center space-x-4">
                          <span className="text-[10px] font-black text-emerald-500 uppercase tracking-widest bg-emerald-500/10 px-3 py-1 rounded-md">02. Signal Alignment Matrix</span>
                          <div className="flex-1 h-px bg-slate-800"></div>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                          <div className="bg-slate-900 border border-slate-800 rounded-[2rem] p-8 flex flex-col justify-center">
                              <div className="flex justify-between items-center mb-8">
                                <div className="space-y-1">
                                  <span className="text-[9px] font-black text-slate-600 uppercase">Observed Signal</span>
                                  <div className="text-xs font-mono text-slate-500">{artifacts.alignment_matrix?.observed_signal || "N/A"}</div>
                                </div>
                                <div className="text-emerald-500">
                                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M17 8l4 4m0 0l-4 4m4-4H3" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/></svg>
                                </div>
                                <div className="space-y-1 text-right">
                                  <span className="text-[9px] font-black text-emerald-500 uppercase">Prescribed Signal</span>
                                  <div className="text-xs font-mono text-emerald-100">{artifacts.alignment_matrix?.prescribed_signal || "N/A"}</div>
                                </div>
                              </div>
                          </div>
                        </div>
                      </section>

                      {factualAnchors && (
                        <section className="space-y-8">
                          <div className="flex items-center space-x-4">
                            <span className="text-[10px] font-black text-indigo-400 uppercase tracking-widest bg-indigo-500/10 px-3 py-1 rounded-md">03. Factual Anchoring Assets</span>
                            <div className="flex-1 h-px bg-slate-800"></div>
                          </div>
                          <div className="space-y-4">
                            {factualAnchors.factual_anchors?.map((anchor, i) => (
                              <div key={i} className="p-6 bg-slate-900 border border-slate-800 rounded-2xl">
                                <span className="text-[9px] font-black text-indigo-500 uppercase tracking-widest block mb-2">{anchor.anchor_type}</span>
                                <p className="text-xs text-indigo-100 font-medium">{anchor.content}</p>
                              </div>
                            ))}
                          </div>
                        </section>
                      )}

                      {generatedSchema && (
                        <section className="space-y-8">
                          <div className="flex items-center space-x-4">
                            <span className="text-[10px] font-black text-emerald-500 uppercase tracking-widest bg-emerald-500/10 px-3 py-1 rounded-md">Schema: {generatedSchema.type}</span>
                            <div className="flex-1 h-px bg-slate-800"></div>
                          </div>
                          <div className="p-6 bg-slate-900 border border-slate-800 rounded-2xl space-y-4">
                            <p className="text-[10px] text-slate-400">{generatedSchema.description}</p>
                            <pre className="text-[10px] font-mono text-indigo-200 overflow-x-auto p-4 bg-slate-950 rounded-xl border border-slate-800">{generatedSchema.code}</pre>
                          </div>
                        </section>
                      )}
                    </>
                  )}
                </div>
              )}
            </>
          )}
        </div>

        <div className="p-8 border-t border-slate-800 bg-slate-900 flex justify-between items-center">
          <div className="text-[9px] font-black text-slate-600 uppercase tracking-widest">Boundary_Protocol: Clinical_Handover_Only</div>
          <button 
            onClick={onClose}
            className="px-8 py-3 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all"
          >
            Close Terminal
          </button>
        </div>
      </div>
    </div>
  );
};

export default RemediationOverlay;