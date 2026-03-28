import React from 'react';

interface VisusLogoProps {
  showWordmark?: boolean;
  theme?: 'light' | 'dark';
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

const WORDMARK_SIZES = {
  sm: 'text-[18px]',
  md: 'text-[24px]',
  lg: 'text-[48px]',
  xl: 'text-[56px]',
} as const;

const showTagline = (size: 'sm' | 'md' | 'lg' | 'xl') => size === 'lg' || size === 'xl';

export default function VisusLogo({
  showWordmark = true,
  theme = 'dark',
  size = 'md',
  className = '',
}: VisusLogoProps) {
  const textColor = theme === 'light' ? 'text-white' : 'text-slate-900';
  const underlineColor =
    theme === 'light' ? 'rgba(255,255,255,0.12)' : 'rgba(15,23,42,0.12)';

  return (
    <>
      <style>{`
        @keyframes visusCylonBeam {
          0% {
            left: 100%;
            transform: translateX(-100%);
            opacity: 0;
          }
          5% {
            opacity: 1;
          }
          95% {
            opacity: 1;
          }
          100% {
            left: 0%;
            transform: translateX(-100%);
            opacity: 0;
          }
        }
      `}</style>
      <div
        className={`relative overflow-hidden inline-block ${textColor} ${className}`}
      >
        {showWordmark && (
          <div className="inline-block">
            <div
              className={`font-medium tracking-[0.25em] uppercase ${WORDMARK_SIZES[size]}`}
            >
              VISUS
            </div>
            {showTagline(size) && (
              <div className="mt-1 text-[10px] font-medium uppercase tracking-[0.2em] opacity-60">
                AI VISIBILITY PLATFORM
              </div>
            )}
          </div>
        )}
        <div
          className="w-full h-px mt-1"
          style={{ backgroundColor: underlineColor }}
        />
        <div
          className="absolute rounded-sm"
          style={{
            width: '60px',
            height: '2px',
            bottom: '1px',
            background:
              'linear-gradient(90deg, transparent 0%, #E24B4A 30%, #ff2a2a 50%, #E24B4A 70%, transparent 100%)',
            boxShadow: '0 0 8px 2px rgba(226,75,74,0.7)',
            animation: 'visusCylonBeam 5s ease-in-out infinite',
          }}
        />
      </div>
    </>
  );
}
