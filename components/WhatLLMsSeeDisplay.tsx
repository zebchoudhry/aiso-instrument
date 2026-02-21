import React from 'react';
import type { ExtractionData } from '../types';

interface WhatLLMsSeeDisplayProps {
  extractionData: ExtractionData | null;
}

export default function WhatLLMsSeeDisplay({ extractionData }: WhatLLMsSeeDisplayProps) {
  if (!extractionData) return null;

  const hasSchema = (extractionData.schemaCount ?? 0) > 0;
  const hasMeta = (extractionData.metaDescription ?? '').length >= 20;
  const citationCount = (extractionData.citationAnchors ?? []).length + (extractionData.sameAsUrls ?? []).length;

  return (
    <div className="bg-slate-900 text-white rounded-2xl p-8">
      <h3 className="text-sm font-black uppercase tracking-tight text-indigo-400 mb-2">
        What AI systems extract
      </h3>
      <p className="text-slate-400 text-sm mb-6">
        When AI systems fetch your URL, they receive structured data like this. Gaps here explain weak or missing citations.
      </p>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
        <div className="p-4 rounded-xl bg-slate-800/50">
          <span className="text-slate-500 text-xs uppercase">Title</span>
          <p className="font-medium truncate">{extractionData.title || '(missing)'}</p>
        </div>
        <div className="p-4 rounded-xl bg-slate-800/50">
          <span className="text-slate-500 text-xs uppercase">Meta description</span>
          <p className="font-medium line-clamp-2">{extractionData.metaDescription || '(missing)'}</p>
        </div>
        <div className="p-4 rounded-xl bg-slate-800/50">
          <span className="text-slate-500 text-xs uppercase">Schema.org</span>
          <p className="font-medium">{hasSchema ? `${extractionData.schemaCount} type(s)` : 'None'}</p>
        </div>
        <div className="p-4 rounded-xl bg-slate-800/50">
          <span className="text-slate-500 text-xs uppercase">Verification links</span>
          <p className="font-medium">{citationCount} found</p>
        </div>
        <div className="p-4 rounded-xl bg-slate-800/50 md:col-span-2">
          <span className="text-slate-500 text-xs uppercase">Main content</span>
          <p className="font-medium text-slate-300 line-clamp-2">
            {((extractionData.mainContent ?? '').slice(0, 150) || '(none extracted)')}
            {(extractionData.mainContent ?? '').length > 150 && '…'}
          </p>
        </div>
      </div>
    </div>
  );
}
