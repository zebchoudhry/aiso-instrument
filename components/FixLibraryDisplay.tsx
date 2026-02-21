
import React from 'react';
import { FixLibraryResponse } from '../types';

interface FixLibraryDisplayProps {
  data: FixLibraryResponse | null;
  isLoading: boolean;
}

const FixLibraryDisplay: React.FC<FixLibraryDisplayProps> = ({ data, isLoading }) => {
  if (!data && !isLoading) return null;

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-6 duration-700">
      <div className="flex items-center space-x-4">
        <h3 className="text-2xl font-black uppercase tracking-tighter text-slate-900">Deterministic Fix Library</h3>
        <div className="flex-1 h-px bg-slate-200"></div>
        <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest bg-white px-4 py-1 rounded-full border border-slate-100">Architect Mode</span>
      </div>

      {isLoading ? (
        <div className="bg-white border border-slate-200 rounded-[2.5rem] p-20 flex flex-col items-center justify-center space-y-6">
          <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.4em] animate-pulse">Drafting Remediation Blueprints...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {(Array.isArray(data?.fixes) ? data.fixes : []).map((fix: { findingLabel?: string; fix?: string; priority?: number }, i: number) => (
            <div key={i} className="bg-white border border-slate-200 rounded-[2.5rem] overflow-hidden shadow-sm hover:shadow-xl transition-all group">
              <div className="bg-slate-900 p-8 text-white flex justify-between items-start">
                <div>
                  <span className="text-[8px] font-black text-indigo-400 uppercase tracking-[0.3em] block mb-1">Fix Priority</span>
                  <h4 className="text-lg font-black tracking-tight">{fix.findingLabel ?? `Fix ${i + 1}`}</h4>
                </div>
                <div className="text-right">
                  <span className="text-[8px] font-black text-slate-500 uppercase tracking-[0.3em] block mb-1">Priority</span>
                  <span className="text-[10px] font-black uppercase text-indigo-100">{fix.priority ?? i + 1}</span>
                </div>
              </div>

              <div className="p-8 space-y-6">
                <div className="space-y-3">
                  <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Actionable Fix</span>
                  <p className="text-xs font-bold text-slate-700 leading-relaxed border-l-2 border-indigo-100 pl-4">{fix.fix ?? ''}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default FixLibraryDisplay;
