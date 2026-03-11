import React from 'react';

interface CitationIQLogoProps {
  showWordmark?: boolean;
  theme?: 'light' | 'dark';
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

const SIZES = {
  sm: {
    icon: 'w-9 h-9',
    wordmark: 'text-lg',
    gap: 'gap-2.5',
  },
  md: {
    icon: 'w-14 h-14',
    wordmark: 'text-2xl',
    gap: 'gap-3',
  },
  lg: {
    icon: 'w-20 h-20',
    wordmark: 'text-4xl',
    gap: 'gap-4',
  },
  xl: {
    icon: 'w-24 h-24 md:w-28 md:h-28',
    wordmark: 'text-[2.5rem] md:text-[3.2rem]',
    gap: 'gap-5',
  },
} as const;

export default function CitationIQLogo({
  showWordmark = true,
  theme = 'dark',
  size = 'md',
  className = '',
}: CitationIQLogoProps) {
  const palette =
    theme === 'light'
      ? {
          primary: '#A5B4FC',
          secondary: '#818CF8',
          node: '#38BDF8',
          accent: '#FFFFFF',
          text: 'text-white',
          iq: 'text-indigo-300',
          glow: 'drop-shadow-[0_0_12px_rgba(129,140,248,0.65)]',
        }
      : {
          primary: '#4F46E5',
          secondary: '#6366F1',
          node: '#2563EB',
          accent: '#7C83FF',
          text: 'text-slate-900',
          iq: 'text-indigo-600',
          glow: 'drop-shadow-[0_0_8px_rgba(99,102,241,0.35)]',
        };

  return (
    <div className={`inline-flex items-center ${SIZES[size].gap} ${className}`}>
      <svg
        viewBox="0 0 100 100"
        className={`${SIZES[size].icon} ${palette.glow}`}
        fill="none"
        aria-hidden="true"
      >
        <circle
          cx="50"
          cy="50"
          r="34"
          stroke={palette.primary}
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray="138 96"
          transform="rotate(132 50 50)"
        />
        <circle
          cx="50"
          cy="50"
          r="22"
          stroke={palette.secondary}
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray="82 58"
          transform="rotate(135 50 50)"
        />
        <path
          d="M16 50H35"
          stroke={palette.secondary}
          strokeWidth="8"
          strokeLinecap="round"
        />
        <circle cx="33" cy="28" r="4.5" fill={palette.node} />
        <circle cx="30" cy="66" r="5.5" fill={palette.node} />
        <circle cx="79" cy="34" r="6.5" fill={palette.accent} />
      </svg>

      {showWordmark && (
        <div className={`font-black tracking-[-0.04em] ${palette.text} ${SIZES[size].wordmark}`}>
          <span>Citation</span>
          <span className={palette.iq}>IQ</span>
        </div>
      )}
    </div>
  );
}
