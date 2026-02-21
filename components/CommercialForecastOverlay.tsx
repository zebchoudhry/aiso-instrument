
import React from 'react';
import { CommercialForecast } from '../types';

interface CommercialForecastOverlayProps {
  forecast: CommercialForecast | null;
  isLoading: boolean;
  onClose: () => void;
}

const CommercialForecastOverlay: React.FC<CommercialForecastOverlayProps> = ({ forecast, isLoading, onClose }) => {
  if (!forecast && !isLoading) return null;

  return (
    <div className="fixed inset-0 z-[140] flex items-center justify-center bg-slate-900/60 backdrop-blur-md p-6 animate-in fade-in duration-300">
      <div className="bg-[#0b0e14] w-full max-w-5xl h-[85vh] rounded-[3rem] shadow-2xl overflow-hidden flex flex-col border border-slate-800 animate-in zoom-in-95 duration-500">
        
        {/* Bloomberg-Style Financial Header */}
        <div className="p-8 border-b border-slate-800 bg-[#141820] flex justify-between items-center">
          <div className="flex items-center space-x-6">
            <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center text-white font-black shadow-lg">ROI</div>
            <div>
              <h3 className="text-xs font-black text-slate-500 uppercase tracking-[0.4em] mb-1">Commercial Impact Engine</h3>
              <p className="text-xl font-black text-white uppercase tracking-tighter">Factual Revenue Projection</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-500 hover:text-white transition-colors">
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M6 18L18 6M6 6l12 12"/></svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-12 space-y-16">
          {isLoading ? (
            <div className="h-full flex flex-col items-center justify-center space-y-8">
              <div className="w-16 h-16 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
              <div className="text-center space-y-2">
                <p className="text-[11px] font-black text-indigo-400 uppercase tracking-[0.5em] animate-pulse">Synthesizing Market Demand...</p>
                <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">CALCULATING OPPORTUNITY COST DELTA</p>
              </div>
            </div>
          ) : forecast && (
            <>
              {/* Top Financial HUD */}
              <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-[#1a202c] p-8 rounded-[2rem] border border-slate-800">
                  <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest block mb-4">Discovery Volume</span>
                  <div className="flex items-baseline space-x-2">
                    <span className="text-4xl font-mono font-black text-white">{forecast.monthly_discovery_volume.toLocaleString()}</span>
                    <span className="text-[10px] text-slate-500 font-bold uppercase">Ops/Mo</span>
                  </div>
                  <div className={`mt-4 text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded inline-block ${forecast.market_intent_density === 'HIGH' ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' : 'bg-indigo-500/10 text-indigo-500 border border-indigo-500/20'}`}>
                    Intent Density: {forecast.market_intent_density}
                  </div>
                </div>

                <div className="bg-[#1a202c] p-8 rounded-[2rem] border border-slate-800">
                  <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest block mb-4">Lead Value Delta</span>
                  <div className="flex items-baseline space-x-2">
                    <span className="text-4xl font-mono font-black text-indigo-400">£{forecast.estimated_lead_value.toLocaleString()}</span>
                    <span className="text-[10px] text-slate-500 font-bold uppercase">Avg/L</span>
                  </div>
                  <p className="mt-4 text-[9px] text-slate-500 font-bold uppercase italic">Grounding Source: High-Intent Industry Benchmarks</p>
                </div>

                <div className="bg-indigo-600 p-8 rounded-[2rem] border border-indigo-500 shadow-[0_0_30px_rgba(79,70,229,0.2)]">
                  <span className="text-[9px] font-black text-indigo-200 uppercase tracking-widest block mb-4">Annual Opportunity</span>
                  <div className="flex items-baseline space-x-2">
                    <span className="text-4xl font-mono font-black text-white">£{forecast.projections.year_one_total_opportunity.toLocaleString()}</span>
                  </div>
                </div>
              </section>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default CommercialForecastOverlay;
