import type { ExtractionData, AuditResponse, RoadmapPayload, FixLibraryResponse } from '../types.js';
import { generateInvisibilityDiagnosis } from './diagnosis.js';
import { getWeakSignals } from './weakSignals.js';

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
  const diagnosis = generateInvisibilityDiagnosis(extractionData, {
    signalCoverageScore,
    citationHealthScore,
    contentDepthScore,
    authoritySignalsScore,
  });

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
    diagnosis,
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
