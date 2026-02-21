import React, { useState } from 'react';
import { SchemaGenerator } from '../services/schemaGenerator';
import type { ExtractionData } from '../types';

const RICH_RESULTS_TEST = 'https://search.google.com/test/rich-results';

interface SchemaExportCardProps {
  extractionData: ExtractionData | null;
  subjectName?: string;
  url?: string;
}

export default function SchemaExportCard({ extractionData, subjectName, url }: SchemaExportCardProps) {
  const [copied, setCopied] = useState(false);

  if (!extractionData) return null;
  const name = subjectName || extractionData.title?.split(/[|-]/)[0]?.trim() || 'Organization';
  const siteUrl = url || 'https://example.com';
  const description = (extractionData.metaDescription || '').slice(0, 200) || undefined;
  const sameAs = extractionData.sameAsUrls?.length
    ? extractionData.sameAsUrls
    : (extractionData.citationAnchors ?? []).slice(0, 5);

  const schema = SchemaGenerator.generateOrganizationSchema(name, siteUrl, description, sameAs);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(schema.code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (_) {}
  };

  const handleDownload = () => {
    const blob = new Blob([schema.code], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `organization-schema-${name.replace(/\s+/g, '-').toLowerCase()}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  return (
    <div className="bg-white border border-slate-200 rounded-[2.5rem] p-8 space-y-4 animate-in fade-in slide-in-from-bottom-6 duration-500">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h3 className="text-xl font-black uppercase tracking-tight text-slate-900">One-Click Schema Export</h3>
          <p className="text-xs text-slate-500 mt-1">Copy or download JSON-LD for your &lt;head&gt;</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleCopy}
            className="px-4 py-2 rounded-xl border border-slate-200 text-sm font-bold uppercase tracking-wider text-slate-700 hover:bg-slate-50 transition-colors"
          >
            {copied ? 'Copied!' : 'Copy JSON-LD'}
          </button>
          <button
            onClick={handleDownload}
            className="px-4 py-2 rounded-xl bg-indigo-600 text-white text-sm font-bold uppercase tracking-wider hover:bg-indigo-500 transition-colors"
          >
            Download
          </button>
          <a
            href={RICH_RESULTS_TEST}
            target="_blank"
            rel="noopener noreferrer"
            className="px-4 py-2 rounded-xl border border-indigo-200 text-indigo-600 text-sm font-bold uppercase tracking-wider hover:bg-indigo-50 transition-colors inline-flex items-center"
          >
            Validate
          </a>
        </div>
      </div>
      <pre className="bg-slate-900 text-slate-100 p-4 rounded-xl text-xs overflow-x-auto max-h-48 overflow-y-auto font-mono">
        {schema.code}
      </pre>
      <p className="text-[10px] text-slate-500">
        Paste into &lt;head&gt; as: &lt;script type="application/ld+json"&gt;{'{...}'}&lt;/script&gt; • Validate with{' '}
        <a href={RICH_RESULTS_TEST} target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:underline">Google Rich Results Test</a>
      </p>
    </div>
  );
}
