
import React from 'react';

interface ScoreCardProps {
  label: string;
  score: number;
  labelValue?: string; // e.g. "READY", "SUB_OPTIMAL"
  colorClass: string;
  description: string;
}

const ScoreCard: React.FC<ScoreCardProps> = ({ label, score, labelValue, colorClass, description }) => {
  return (
    <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm flex flex-col items-center text-center relative overflow-hidden group hover:border-indigo-500/30 transition-all">
      <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-4">{label}</span>
      
      {labelValue ? (
        <div className={`text-xl font-black tracking-tight uppercase leading-none ${labelValue === 'READY' || labelValue === 'OPTIMIZED' ? 'text-emerald-500' : 'text-slate-900'}`}>
          {labelValue.replace('_', ' ')}
        </div>
      ) : (
        <div className="flex items-baseline space-x-1">
          <div className={`text-4xl font-mono font-black tracking-tighter ${colorClass}`}>
            {score}
          </div>
          <span className="text-xs font-bold text-slate-300">/100</span>
        </div>
      )}

      <p className="mt-4 text-[10px] text-slate-500 leading-tight uppercase font-medium tracking-tight opacity-75">{description}</p>
      
      <div className="absolute bottom-0 left-0 w-full h-0.5 bg-slate-50 overflow-hidden">
        <div className="h-full bg-indigo-500/20 w-1/3 animate-progress"></div>
      </div>
    </div>
  );
};

export default ScoreCard;
