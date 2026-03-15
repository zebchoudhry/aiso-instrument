import React from 'react';
import CitationIQLogo from './CitationIQLogo';

export default function LandingHero() {
  return (
    <section className="relative overflow-hidden rounded-[2.75rem] border border-slate-800 bg-[radial-gradient(circle_at_top,rgba(99,102,241,0.34),transparent_30%),linear-gradient(180deg,#07102a_0%,#0a1433_50%,#0f172a_100%)] px-8 py-16 shadow-[0_30px_80px_rgba(15,23,42,0.35)] md:px-14 md:py-24 lg:py-28">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_18%,rgba(56,189,248,0.12),transparent_18%),radial-gradient(circle_at_80%_0%,rgba(129,140,248,0.22),transparent_24%),linear-gradient(90deg,transparent,rgba(255,255,255,0.03),transparent)]" />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/30 to-transparent" />
      <div className="relative mx-auto max-w-5xl text-center">
        <p className="mb-7 text-[11px] font-black uppercase tracking-[0.5em] text-indigo-200/85">
          AI Visibility Intelligence
        </p>
        <CitationIQLogo theme="light" size="xl" className="justify-center" />
        <h1 className="mx-auto mt-10 max-w-4xl text-4xl font-black uppercase tracking-[-0.05em] text-white md:text-6xl lg:text-[4.6rem] lg:leading-[0.95]">
          Find What Is Stopping AI From Recommending Your Brand
        </h1>
        <p className="mx-auto mt-7 max-w-3xl text-lg leading-8 text-slate-200 md:text-xl">
          Visus shows why AI systems overlook you, where competitors have the edge, and which fixes are most likely to improve visibility fastest.
        </p>
        <div className="mt-10 flex flex-wrap items-center justify-center gap-3 text-sm font-semibold text-slate-100 md:gap-4">
          <span className="rounded-full border border-white/10 bg-white/5 px-5 py-2.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] backdrop-blur-sm">
            Plain-language verdict
          </span>
          <span className="rounded-full border border-white/10 bg-white/5 px-5 py-2.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] backdrop-blur-sm">
            Competitor gap analysis
          </span>
          <span className="rounded-full border border-white/10 bg-white/5 px-5 py-2.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] backdrop-blur-sm">
            Action plan with proof
          </span>
        </div>
      </div>
    </section>
  );
}
