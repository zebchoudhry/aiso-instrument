import React from 'react';
import type { ExtractionData, AuditResponse } from '../types';

interface BridgeNarrativeDisplayProps {
  extractionData: ExtractionData | null;
  audit: AuditResponse | null;
}

export default function BridgeNarrativeDisplay({ extractionData, audit }: BridgeNarrativeDisplayProps) {
  if (!extractionData || !audit) return null;

  const hasTitle = (extractionData.title || '').trim().length >= 3;
  const hasMeta = (extractionData.metaDescription || '').trim().length >= 20;
  const hasSchema = (extractionData.schemaCount || 0) > 0;
  const hasContent = (extractionData.wordCount || 0) >= 200;

  const traditionalReady = [hasTitle, hasMeta, hasSchema, hasContent].filter(Boolean).length;
  const traditionalPct = Math.round((traditionalReady / 4) * 100);

  const aiSignals = [
    hasTitle && hasMeta,
    hasSchema,
    (extractionData.sameAsUrls?.length ?? 0) >= 1,
    (extractionData.openGraph?.title || extractionData.openGraph?.description) ? true : false,
    extractionData.isCrawlable !== false,
  ];
  const aiReady = aiSignals.filter(Boolean).length;
  const aiPct = Math.round((aiReady / 5) * 100);

  const overlap = Math.min(traditionalReady, aiReady);
  const migrationPct = traditionalPct > 0 ? Math.round((overlap / 4) * 100) : 0;

  return (
    <div className="bg-white border border-slate-200 rounded-[2.5rem] p-8 space-y-6 animate-in fade-in slide-in-from-bottom-6 duration-500">
      <div>
        <h3 className="text-xl font-black uppercase tracking-tight text-slate-900">Traditional SEO → AI SEO</h3>
        <p className="text-xs text-slate-500 mt-1">What carries over — what AI needs in addition</p>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        <div className="p-6 rounded-2xl bg-slate-50 border border-slate-100">
          <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3">Traditional SEO (what you have)</h4>
          <div className="text-3xl font-black text-slate-900 mb-2">{traditionalPct}%</div>
          <ul className="space-y-1 text-sm">
            <li className={hasTitle ? 'text-slate-700' : 'text-slate-400'}>{hasTitle ? '✓' : '○'} Title, meta</li>
            <li className={hasMeta ? 'text-slate-700' : 'text-slate-400'}>{hasMeta ? '✓' : '○'} Meta description</li>
            <li className={hasSchema ? 'text-slate-700' : 'text-slate-400'}>{hasSchema ? '✓' : '○'} Schema / structure</li>
            <li className={hasContent ? 'text-slate-700' : 'text-slate-400'}>{hasContent ? '✓' : '○'} Substantive content</li>
          </ul>
        </div>

        <div className="p-6 rounded-2xl bg-indigo-50 border border-indigo-100 flex flex-col justify-center items-center">
          <h4 className="text-[10px] font-black uppercase tracking-widest text-indigo-600 mb-2">Migration</h4>
          <div className="text-2xl font-black text-indigo-700">{migrationPct}% foundation ready</div>
          <p className="text-xs text-indigo-600 mt-2 text-center">Your SEO investment gives you a head start. Add AI-specific signals to complete the picture.</p>
        </div>

        <div className="p-6 rounded-2xl bg-slate-900 text-white border border-slate-800">
          <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3">AI-specific signals</h4>
          <div className="text-3xl font-black mb-2">{aiPct}%</div>
          <ul className="space-y-1 text-sm">
            <li className={aiSignals[0] ? 'text-slate-200' : 'text-slate-500'}>{aiSignals[0] ? '✓' : '○'} Entity clarity (title + meta)</li>
            <li className={aiSignals[1] ? 'text-slate-200' : 'text-slate-500'}>{aiSignals[1] ? '✓' : '○'} Schema markup</li>
            <li className={aiSignals[2] ? 'text-slate-200' : 'text-slate-500'}>{aiSignals[2] ? '✓' : '○'} sameAs / citation links</li>
            <li className={aiSignals[3] ? 'text-slate-200' : 'text-slate-500'}>{aiSignals[3] ? '✓' : '○'} Open Graph</li>
            <li className={aiSignals[4] ? 'text-slate-200' : 'text-slate-500'}>{aiSignals[4] ? '✓' : '○'} Crawlable (no noindex)</li>
          </ul>
        </div>
      </div>

      <div className="p-4 rounded-xl bg-amber-50 border border-amber-100">
        <p className="text-sm font-bold text-amber-900">
          AI assistants are reshaping search. Pages optimized for traditional SERPs may not surface in ChatGPT, Perplexity, or SGE. This audit shows your gap — and the path to close it.
        </p>
      </div>
    </div>
  );
}
