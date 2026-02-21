import React from 'react';

export default function LandingHero() {
  return (
    <div className="mb-10 p-8 md:p-12 bg-white rounded-[2rem] border border-slate-200 shadow-sm">
      <h1 className="text-3xl md:text-4xl font-black uppercase tracking-tight text-slate-900 mb-4">
        Are you invisible to AI search?
      </h1>
      <p className="text-lg text-slate-600 max-w-2xl mb-6">
        See how AI systems view your site — and get a clear plan to fix it.
      </p>
      <ul className="flex flex-wrap gap-4 text-sm font-bold text-slate-700">
        <li className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-indigo-500" />
          Plain-language verdict
        </li>
        <li className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-indigo-500" />
          Action plan
        </li>
        <li className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-indigo-500" />
          Proof it worked
        </li>
      </ul>
    </div>
  );
}
