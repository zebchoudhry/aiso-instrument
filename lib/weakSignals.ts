import type { ExtractionData } from '../types.js';

export function getWeakSignals(data: ExtractionData): string[] {
  const weak: string[] = [];

  if ((data.title || '').trim().length < 3) weak.push('Missing or weak page title');
  if ((data.metaDescription || '').trim().length < 20) weak.push('Missing or insufficient meta description');
  if (!(data.openGraph?.title || data.openGraph?.description)) weak.push('Missing Open Graph metadata');
  if (!(data.canonicalUrl && data.canonicalUrl.length > 5)) weak.push('Missing canonical URL');
  if ((data.schemaCount || 0) === 0) weak.push('No Schema.org structured data');
  if ((data.headings?.length ?? 0) === 0) weak.push('No heading structure (H1–H3)');
  if (!data.hasBreadcrumbList) weak.push('Missing BreadcrumbList schema');
  if ((data.wordCount ?? 0) < 500) weak.push(`Low word count (${data.wordCount ?? 0} words; target 500+)`);
  if (!(data.contentFormats ?? []).some((f) => ['how-to', 'list', 'q-and-a', 'tutorial'].includes(f))) {
    weak.push('Content lacks AI-citation formats (how-to, list, Q&A, tutorial)');
  }
  if ((data.propositionalDensity ?? 50) < 60) {
    weak.push(`Low propositional density (${data.propositionalDensity ?? 50}%); too much marketing language`);
  }
  if ((data.citationAnchors ?? []).length < 3) weak.push('Fewer than 3 citation/social anchors on page');
  if ((data.sameAsUrls ?? []).length < 3) weak.push('Missing sameAs array in Organization schema');
  if (!(data.datePublished || data.dateModified)) weak.push('No publication or modification date in schema');
  if (!data.author) weak.push('No author signal in schema');
  if (data.isCrawlable === false) weak.push('Page has noindex robots directive — invisible to AI crawlers');

  return weak;
}
