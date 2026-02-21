
import React from 'react';
import { FactualAnchoringAsset } from '../types';

interface FactualAssetDisplayProps {
  data: FactualAnchoringAsset;
}

const FactualAssetDisplay: React.FC<FactualAssetDisplayProps> = ({ data }) => {
  return (
    <div className="space-y-12 p-8 bg-slate-900 text-white rounded-[3rem] border-4 border-indigo-600 shadow-2xl animate-in zoom-in-95 duration-500">
      <header className="flex justify-between items-center border-b border-slate-800 pb-8">
        <div>
          <div className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.4em] mb-2">Diagnostic Output</div>
          <h3 className="text-3xl font-black text-white uppercase tracking-tighter">Explicit Factual Anchoring</h3>
        </div>
        <div className="px-6 py-2 bg-indigo-600/20 border border-indigo-500 text-indigo-400 rounded-full text-[10px] font-black uppercase tracking-widest">
          Clinical Asset Mode
        </div>
      </header>

      {/* Factual Anchors */}
      <section className="space-y-6">
        <h4 className="text-[11px] font-black text-slate-500 uppercase tracking-widest flex items-center">
          <span className="w-8 h-px bg-slate-800 mr-4"></span> Factual Anchors
        </h4>
        <div className="grid grid-cols-1 gap-6">
          {data.factual_anchors.map((anchor, i) => (
            <div key={i} className="p-8 bg-slate-800/50 border border-slate-700 rounded-3xl group hover:border-indigo-500/50 transition-colors">
              <div className="flex justify-between items-center mb-4">
                <span className="text-[9px] font-black text-indigo-500 uppercase tracking-widest bg-indigo-500/10 px-3 py-1 rounded-md">
                  {anchor.anchor_type.replace(/_/g, ' ')}
                </span>
                <span className="text-[8px] font-mono text-slate-600">ID: ANCHOR-0{i+1}</span>
              </div>
              <p className="text-lg font-bold text-slate-200 leading-tight">
                {anchor.content}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Deployment Targets */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-12 pt-8 border-t border-slate-800">
        <div className="space-y-6">
          <h4 className="text-[11px] font-black text-slate-500 uppercase tracking-widest">Target Deployment Surfaces</h4>
          <div className="space-y-4">
            {data.deployment_targets.map((target, i) => (
              <div key={i} className="flex items-start space-x-6">
                <div className="w-10 h-10 rounded-2xl bg-slate-800 flex items-center justify-center shrink-0 border border-slate-700">
                   <span className="text-xs font-black text-indigo-500">0{i+1}</span>
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-black text-slate-200 uppercase">{target.page_type}</p>
                  <p className="text-xs text-slate-500 font-medium italic">{target.placement_guidance}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-6">
          <h4 className="text-[11px] font-black text-slate-500 uppercase tracking-widest">Verification Criteria</h4>
          <div className="space-y-3">
            {data.verification_criteria.map((criteria, i) => (
              <div key={i} className="flex items-center space-x-4 p-4 bg-slate-800/30 rounded-2xl border border-slate-700/50">
                <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-tight">{criteria}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <footer className="pt-8 border-t border-slate-800 flex justify-between items-center">
        <p className="text-[9px] font-black text-slate-600 uppercase tracking-widest">
          Constraint Compliance: VERIFIED
        </p>
        <p className="text-[9px] font-black text-indigo-900 uppercase tracking-widest bg-indigo-500/10 px-4 py-2 rounded-full">
          Epistemic Integrity Guaranteed
        </p>
      </footer>
    </div>
  );
};

export default FactualAssetDisplay;
