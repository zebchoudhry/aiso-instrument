import type { ExtractionData, AuditResponse, RoadmapPayload, FixLibraryResponse } from '../types.js';

const COMMON_CITATION_DOMAINS = [
  'linkedin.com', 'twitter.com', 'x.com', 'facebook.com', 'instagram.com',
  'youtube.com', 'github.com', 'medium.com', 'yelp.com', 'trustpilot.com',
  'reddit.com', 'pinterest.com',
];

function domainFromUrl(url: string): string {
  try {
    return new URL(url).hostname.replace('www.', '').toLowerCase();
  } catch {
    return url.toLowerCase();
  }
}

function computeSignalCoverageScore(data: ExtractionData): number {
  let pass = 0;
  const total = 16;

  if ((data.title || '').trim().length >= 3) pass++;
  if ((data.metaDescription || '').trim().length >= 20) pass++;
  if (!!(data.openGraph?.title || data.openGraph?.description)) pass++;
  if (!!(data.canonicalUrl && data.canonicalUrl.length > 5)) pass++;
  if ((data.schemaCount || 0) > 0) pass++;
  if ((data.headings?.length ?? 0) > 0) pass++;
  if (data.hasBreadcrumbList) pass++;
  if ((data.wordCount ?? 0) >= 500) pass++;
  if ((data.contentFormats ?? []).some(f => ['how-to', 'list', 'q-and-a', 'tutorial'].includes(f))) pass++;
  if ((data.propositionalDensity ?? 50) >= 60) pass++;
  const citationCount = (data.citationAnchors ?? []).length;
  if (citationCount >= 3) pass++;
  const sameAsCount = (data.sameAsUrls ?? []).length;
  if (sameAsCount >= 3) pass++;
  if (!!(data.datePublished || data.dateModified) && !!data.author) pass++;
  const freshnessMonths = data.freshnessMonths ?? null;
  if (freshnessMonths !== null && freshnessMonths < 6) pass++;
  if (data.isCrawlable !== false) pass++;
  if ((data.firstPersonScore ?? 0) >= 20) pass++;

  return Math.round((pass / total) * 100);
}

function computeCitationHealthScore(data: ExtractionData): number {
  const allUrls = [...new Set([...(data.citationAnchors ?? []), ...(data.sameAsUrls ?? [])])];
  const found = COMMON_CITATION_DOMAINS.filter(domain =>
    allUrls.some(u => domainFromUrl(u).includes(domain) || domain.includes(domainFromUrl(u)))
  );
  return Math.round((found.length / COMMON_CITATION_DOMAINS.length) * 100);
}

function getWeakSignals(data: ExtractionData): string[] {
  const weak: string[] = [];

  if ((data.title || '').trim().length < 3) weak.push('Missing or weak page title');
  if ((data.metaDescription || '').trim().length < 20) weak.push('Missing or insufficient meta description');
  if (!(data.openGraph?.title || data.openGraph?.description)) weak.push('Missing Open Graph metadata');
  if (!(data.canonicalUrl && data.canonicalUrl.length > 5)) weak.push('Missing canonical URL');
  if ((data.schemaCount || 0) === 0) weak.push('No Schema.org structured data');
  if ((data.headings?.length ?? 0) === 0) weak.push('No heading structure (H1–H3)');
  if (!data.hasBreadcrumbList) weak.push('Missing BreadcrumbList schema');
  if ((data.wordCount ?? 0) < 500) weak.push(`Low word count (${data.wordCount ?? 0} words; target 500+)`);
  if (!(data.contentFormats ?? []).some(f => ['how-to', 'list', 'q-and-a', 'tutorial'].includes(f)))
    weak.push('Content lacks AI-citation formats (how-to, list, Q&A, tutorial)');
  if ((data.propositionalDensity ?? 50) < 60)
    weak.push(`Low propositional density (${data.propositionalDensity ?? 50}%); too much marketing language`);
  if ((data.citationAnchors ?? []).length < 3) weak.push('Fewer than 3 citation/social anchors on page');
  if ((data.sameAsUrls ?? []).length < 3) weak.push('Missing sameAs array in Organization schema');
  if (!(data.datePublished || data.dateModified)) weak.push('No publication or modification date in schema');
  if (!data.author) weak.push('No author signal in schema');
  if (data.isCrawlable === false) weak.push('Page has noindex robots directive — invisible to AI crawlers');

  return weak;
}

export function buildRoadmapPayload(
  auditResult: AuditResponse,
  extractionData: ExtractionData,
  queryPackQueries: string[],
  url: string,
  fixLibrary?: FixLibraryResponse | null
): RoadmapPayload {
  const readiness = auditResult.summary.readinessScore;
  const scores = auditResult.summary.scores;

  const overallScore = readiness?.internal_ai_readiness_score ?? scores.overallMaturityIndex ?? 0;
  const contentDepthScore = readiness?.breakdown?.compressibility?.score ?? scores.answerEngineReadiness ?? 0;
  const authoritySignalsScore = readiness?.breakdown?.corroboration?.score ?? scores.citationLikelihood ?? 0;
  const signalCoverageScore = computeSignalCoverageScore(extractionData);
  const citationHealthScore = computeCitationHealthScore(extractionData);

  const weakSignals = getWeakSignals(extractionData);

  const topOpportunities: string[] = [];
  if (Array.isArray(fixLibrary?.fixes)) {
    (fixLibrary.fixes as Array<{ title?: string; description?: string }>).slice(0, 5).forEach(f => {
      if (f?.title) topOpportunities.push(f.title + (f.description ? `: ${f.description}` : ''));
    });
  }
  if (topOpportunities.length === 0 && (auditResult.howToImprove ?? []).length > 0) {
    topOpportunities.push(...(auditResult.howToImprove ?? []).slice(0, 5));
  }

  let domain = '';
  try {
    domain = new URL(url).hostname;
  } catch {
    domain = url;
  }

  return {
    overallScore,
    signalCoverageScore,
    citationHealthScore,
    contentDepthScore,
    authoritySignalsScore,
    identifiedWeakSignals: weakSignals,
    topOpportunities,
    extractionSummary: {
      title: extractionData.title || '',
      metaDescription: extractionData.metaDescription || '',
      wordCount: extractionData.wordCount ?? 0,
      mainContentExcerpt: (extractionData.mainContent || '').slice(0, 400),
    },
    schemaTypes: extractionData.schemaTypes ?? [],
    headings: extractionData.headings ?? [],
    domain,
    queryPack: queryPackQueries,
  };
}
