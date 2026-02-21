import React from 'react';

export default function ProofItWorkedDisplay() {
  return (
    <div className="bg-slate-100 border border-slate-200 rounded-xl p-4 text-sm text-slate-700">
      <p className="font-bold text-slate-900 mb-2">Proof it worked</p>
      <p>
        After implementing fixes: (1) Click <strong>Re-audit (Before/After)</strong> to see score change. (2) Re-test the same queries in ChatGPT or Perplexity and mark results in the Query Pack. Compare before vs after.
      </p>
    </div>
  );
}
