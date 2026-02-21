import React from 'react';
import type { ExtractionData, SignalCoverageItem } from '../types';

function computeSignalCoverage(data: ExtractionData): SignalCoverageItem[] {
  const items: SignalCoverageItem[] = [];
  const hasTitle = (data.title || '').trim().length >= 3;
  const hasMeta = (data.metaDescription || '').trim().length >= 20;
  const hasSchema = (data.schemaCount || 0) > 0;
  const hasOg = !!(data.openGraph?.title || data.openGraph?.description);
  const hasCanonical = !!(data.canonicalUrl && data.canonicalUrl.length > 5);
  const sameAsCount = (data.sameAsUrls ?? []).length;
  const citationCount = (data.citationAnchors ?? []).length;
  const hasDates = !!(data.datePublished || data.dateModified);
  const hasAuthor = !!data.author;
  const hasBreadcrumb = data.hasBreadcrumbList === true;
  const isCrawlable = data.isCrawlable !== false;
  const freshnessMonths = data.freshnessMonths ?? null;
  const hasAICitationFormat = (data.contentFormats ?? []).some(f => ['how-to', 'list', 'q-and-a', 'tutorial'].includes(f));
  const firstPersonScore = data.firstPersonScore ?? 0;

  items.push({ category: 'Identity', signal: 'Title', status: hasTitle ? 'pass' : 'fail', value: data.title || '(missing)', recommendation: hasTitle ? undefined : 'Add a descriptive <title> tag' });
  items.push({ category: 'Identity', signal: 'Meta description', status: hasMeta ? 'pass' : 'fail', value: hasMeta ? `${(data.metaDescription || '').slice(0, 50)}...` : '(missing)', recommendation: hasMeta ? undefined : 'Add meta description (20+ chars)' });
  items.push({ category: 'Identity', signal: 'Open Graph', status: hasOg ? 'pass' : 'fail', value: hasOg ? 'Present' : 'Missing', recommendation: hasOg ? undefined : 'Add og:title, og:description for AI/social crawlers' });
  items.push({ category: 'Identity', signal: 'Canonical URL', status: hasCanonical ? 'pass' : 'partial', value: data.canonicalUrl || '(none)', recommendation: !hasCanonical ? 'Add <link rel="canonical" href="...">' : undefined });

  items.push({ category: 'Structure', signal: 'Schema.org', status: hasSchema ? 'pass' : 'fail', value: hasSchema ? `${data.schemaCount} types` : 'None', recommendation: hasSchema ? undefined : 'Add Schema.org JSON-LD markup' });
  items.push({ category: 'Structure', signal: 'Headings (H1–H3)', status: (data.headings?.length ?? 0) > 0 ? 'pass' : 'fail', value: (data.headings?.length ?? 0), recommendation: (data.headings?.length ?? 0) === 0 ? 'Add H1, H2, H3 for structure' : undefined });
  items.push({ category: 'Structure', signal: 'BreadcrumbList', status: hasBreadcrumb ? 'pass' : 'partial', value: hasBreadcrumb ? 'Present' : 'Missing', recommendation: !hasBreadcrumb ? 'Add BreadcrumbList schema' : undefined });

  items.push({ category: 'Content', signal: 'Word count', status: (data.wordCount ?? 0) >= 500 ? 'pass' : (data.wordCount ?? 0) >= 200 ? 'partial' : 'fail', value: data.wordCount ?? 0, recommendation: (data.wordCount ?? 0) < 500 ? 'Target 500+ words (1,500+ for best AI citation)' : undefined });
  items.push({ category: 'Content', signal: 'AI citation format', status: hasAICitationFormat ? 'pass' : 'partial', value: (data.contentFormats ?? ['standard']).join(', '), recommendation: !hasAICitationFormat ? 'Add how-to, list, or Q&A structure' : undefined });
  items.push({ category: 'Content', signal: 'Propositional density', status: (data.propositionalDensity ?? 50) >= 60 ? 'pass' : (data.propositionalDensity ?? 50) >= 40 ? 'partial' : 'fail', value: `${data.propositionalDensity ?? 50}%`, recommendation: (data.propositionalDensity ?? 50) < 60 ? 'Reduce marketing fluff; add factual claims' : undefined });

  items.push({ category: 'Verification', signal: 'Citation anchors', status: citationCount >= 3 ? 'pass' : citationCount >= 1 ? 'partial' : 'fail', value: citationCount, recommendation: citationCount < 3 ? 'Add social/directory links (LinkedIn, YouTube, etc.)' : undefined });
  items.push({ category: 'Verification', signal: 'Schema sameAs', status: sameAsCount >= 3 ? 'pass' : sameAsCount >= 1 ? 'partial' : 'fail', value: sameAsCount, recommendation: sameAsCount < 3 ? 'Add sameAs array to Organization schema' : undefined });
  items.push({ category: 'Verification', signal: 'Article metadata', status: hasDates && hasAuthor ? 'pass' : hasDates || hasAuthor ? 'partial' : 'fail', value: hasDates ? (data.datePublished || data.dateModified || '') : '(none)', recommendation: !hasDates ? 'Add datePublished, dateModified in Schema' : !hasAuthor ? 'Add author in Schema' : undefined });

  items.push({ category: 'Recency', signal: 'Content freshness', status: freshnessMonths !== null && freshnessMonths < 6 ? 'pass' : freshnessMonths !== null && freshnessMonths < 12 ? 'partial' : freshnessMonths !== null ? 'fail' : 'partial', value: freshnessMonths !== null ? `${Math.round(freshnessMonths)} months` : 'Unknown', recommendation: freshnessMonths !== null && freshnessMonths > 6 ? 'Update content; AI cites fresh content 3x more' : freshnessMonths === null ? 'Add dateModified to Schema' : undefined });

  items.push({ category: 'Crawlability', signal: 'Robots', status: isCrawlable ? 'pass' : 'fail', value: isCrawlable ? 'Indexable' : (data.robotsMeta || 'noindex'), recommendation: !isCrawlable ? 'Remove noindex to allow AI crawlers' : undefined });
  items.push({ category: 'Crawlability', signal: 'First-person signal', status: firstPersonScore >= 20 ? 'pass' : firstPersonScore >= 10 ? 'partial' : 'fail', value: firstPersonScore, recommendation: firstPersonScore < 10 ? 'Consider first-person experience content' : undefined });

  return items;
}

interface SignalCoverageDisplayProps {
  extractionData: ExtractionData | null;
}

export default function SignalCoverageDisplay({ extractionData }: SignalCoverageDisplayProps) {
  if (!extractionData) return null;

  const items = computeSignalCoverage(extractionData);
  const byCategory = items.reduce<Record<string, SignalCoverageItem[]>>((acc, item) => {
    if (!acc[item.category]) acc[item.category] = [];
    acc[item.category].push(item);
    return acc;
  }, {});

  const passCount = items.filter(i => i.status === 'pass').length;
  const total = items.length;
  const pct = total > 0 ? Math.round((passCount / total) * 100) : 0;

  return (
    <div className="bg-white border border-slate-200 rounded-[2.5rem] p-8 space-y-6 animate-in fade-in slide-in-from-bottom-6 duration-500">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h3 className="text-xl font-black uppercase tracking-tight text-slate-900">AI Signal Coverage</h3>
          <p className="text-xs text-slate-500 mt-1">Signals AI systems use for discovery and citation</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right">
            <div className="text-2xl font-black text-indigo-600">{pct}%</div>
            <div className="text-[9px] font-bold uppercase text-slate-500">Coverage</div>
          </div>
          <div className="w-24 h-2 bg-slate-100 rounded-full overflow-hidden">
            <div className="h-full bg-indigo-600 rounded-full" style={{ width: `${pct}%` }} />
          </div>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {Object.entries(byCategory).map(([category, signals]) => (
          <div key={category} className="border border-slate-100 rounded-xl p-4">
            <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3">{category}</h4>
            <ul className="space-y-2">
              {signals.map((s, i) => (
                <li key={i} className="flex items-start gap-3 text-sm">
                  <span className={s.status === 'pass' ? 'text-green-600' : s.status === 'partial' ? 'text-amber-500' : 'text-red-500'}>
                    {s.status === 'pass' ? '✓' : s.status === 'partial' ? '○' : '✗'}
                  </span>
                  <div className="flex-1 min-w-0">
                    <span className="font-semibold text-slate-900">{s.signal}</span>
                    {s.value !== undefined && (
                      <span className="text-slate-500 ml-1">— {String(s.value)}</span>
                    )}
                    {s.recommendation && (
                      <p className="text-xs text-slate-500 mt-0.5">{s.recommendation}</p>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}
