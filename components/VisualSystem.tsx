import React from 'react';

interface SurfaceCardProps {
  children: React.ReactNode;
  className?: string;
  tone?: 'light' | 'soft' | 'dark';
}

interface SectionIntroProps {
  label: string;
  title: string;
  description?: string;
  align?: 'left' | 'center';
  invert?: boolean;
  className?: string;
}

const TONE_STYLES = {
  light:
    'border border-slate-200 bg-white shadow-[0_16px_50px_rgba(15,23,42,0.06)]',
  soft:
    'border border-indigo-100 bg-[linear-gradient(180deg,#ffffff_0%,#eef2ff_100%)] shadow-[0_18px_55px_rgba(99,102,241,0.08)]',
  dark:
    'border border-slate-800 bg-[radial-gradient(circle_at_top,rgba(99,102,241,0.22),transparent_32%),linear-gradient(180deg,#08112e_0%,#0b1537_60%,#0f172a_100%)] text-white shadow-[0_30px_80px_rgba(15,23,42,0.28)]',
} as const;

export function SurfaceCard({
  children,
  className = '',
  tone = 'light',
}: SurfaceCardProps) {
  return (
    <div className={`rounded-[2.5rem] ${TONE_STYLES[tone]} ${className}`}>
      {children}
    </div>
  );
}

export function SectionIntro({
  label,
  title,
  description,
  align = 'left',
  invert = false,
  className = '',
}: SectionIntroProps) {
  const alignment = align === 'center' ? 'text-center items-center mx-auto' : '';
  const labelColor = invert ? 'text-indigo-200/85' : 'text-indigo-600';
  const titleColor = invert ? 'text-white' : 'text-slate-900';
  const descriptionColor = invert ? 'text-slate-300' : 'text-slate-500';

  return (
    <div className={`max-w-3xl space-y-2 ${alignment} ${className}`}>
      <p className={`text-[10px] font-black uppercase tracking-[0.32em] ${labelColor}`}>
        {label}
      </p>
      <h3 className={`text-2xl font-black uppercase tracking-[-0.04em] ${titleColor}`}>
        {title}
      </h3>
      {description && (
        <p className={`text-sm leading-6 ${descriptionColor}`}>
          {description}
        </p>
      )}
    </div>
  );
}
