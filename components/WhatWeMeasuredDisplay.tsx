import React from 'react';
import type { ExtractionData, AuditResponse } from '../types';

interface WhatWeMeasuredDisplayProps {
  extractionData: ExtractionData | null;
  audit: AuditResponse | null;
}

export default function WhatWeMeasuredDisplay({ extractionData, audit }: WhatWeMeasuredDisplayProps) {
  const checked: string[] = ['Entity identity (title, meta, Schema.org)', 'Content structure (headings, formats)', 'Verification signals (links, sameAs)', 'Crawlability and freshness'];
  const found: string[] = [];

  if (extractionData) {
    const schema = (extractionData.schemaCount ?? 0) > 0;
    const meta = ((extractionData.metaDescription ?? '').length ?? 0) >= 20;
    const anchors = ((extractionData.citationAnchors ?? []).length + (extractionData.sameAsUrls ?? []).length) > 0;
    if (schema) found.push('Schema.org markup present');
    else found.push('No Schema.org markup');
    if (meta) found.push('Strong meta description');
    else found.push('Weak or missing meta');
    if (anchors) found.push('Verification links present');
    else found.push('Few verification signals');
  }
  if (audit?.keyFindings?.length) {
    found.push(`${audit.keyFindings.length} diagnostic finding(s)`);
  }

  if (found.length === 0) return null;

  return (
    <div className="text-sm text-slate-600 space-y-2">
      <p className="font-bold text-slate-800">What we measured</p>
      <p>We checked: {checked.join(', ')}.</p>
      <p>Found: {found.join('; ')}.</p>
    </div>
  );
}
