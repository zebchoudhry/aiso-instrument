
import React from 'react';
import { SurfaceCard } from './VisualSystem';

interface ScoreCardProps {
  label: string;
  score: number;
  labelValue?: string; // e.g. "READY", "SUB_OPTIMAL"
  colorClass: string;
  description: string;
}

const ScoreCard: React.FC<ScoreCardProps> = ({ label, score, labelValue, colorClass, description }) => {
  return (
    <SurfaceCard className="group relative overflow-hidden p-8 text-center transition-all hover:-translate-y-0.5 hover:border-indigo-200">
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
      
      <div className="absolute inset-x-8 bottom-0 h-px overflow-hidden bg-slate-100">
        <div className="h-full w-1/3 bg-indigo-500/30 animate-progress"></div>
      </div>
    </SurfaceCard>
  );
};

export default ScoreCard;
