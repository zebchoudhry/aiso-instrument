import type { DiagnosisResult, ExtractionData } from '../types.js';
import { getWeakSignals } from './weakSignals.js';

interface DiagnosisScores {
  signalCoverageScore: number;
  citationHealthScore: number;
  contentDepthScore: number;
  authoritySignalsScore: number;
}

const ENTITY_CAUSE = 'Entity definition signals are incomplete or inconsistent.';
const CITATION_CAUSE = 'The page provides limited corroborating references that AI systems use to verify sources.';
const COMPRESSIBILITY_CAUSE = 'Content structure reduces answer reuse.';
const TRUST_CAUSE = 'The page lacks trust signals such as authorship, freshness indicators, or structured authority references.';

interface DiagnosisCategory {
  key: 'entity' | 'citation' | 'compressibility' | 'trust';
  title: string;
  cause: string;
  triggered: boolean;
  weight: number;
  customerImpact: string;
  nextAction: string;
  expectedBenefit: string;
  priority: 'Now' | 'Next' | 'Later';
}

function hasWeakSignal(weakSignals: string[], signal: string): boolean {
  return weakSignals.includes(signal);
}

export function generateInvisibilityDiagnosis(
  extractionData: ExtractionData,
  scores: DiagnosisScores
): DiagnosisResult {
  const weakSignals = getWeakSignals(extractionData);

  const categories: DiagnosisCategory[] = [
    {
      key: 'entity',
      title: 'AI cannot clearly identify your brand',
      cause: ENTITY_CAUSE,
      triggered:
        hasWeakSignal(weakSignals, 'No Schema.org structured data') ||
        hasWeakSignal(weakSignals, 'Missing canonical URL') ||
        hasWeakSignal(weakSignals, 'Missing Open Graph metadata') ||
        hasWeakSignal(weakSignals, 'No heading structure (H1–H3)') ||
        scores.signalCoverageScore < 50,
      weight: 0,
      customerImpact:
        'AI systems have a weaker understanding of who you are and what this page is about, which lowers your chances of being recommended with confidence.',
      nextAction:
        'Tighten your identity signals first by improving schema, canonical tags, Open Graph data, and page structure.',
      expectedBenefit:
        'Clearer identity signals make it easier for AI systems to connect your brand to the right topics and cite you more reliably.',
      priority: 'Now',
    },
    {
      key: 'citation',
      title: 'AI has limited proof to cite you',
      cause: CITATION_CAUSE,
      triggered:
        hasWeakSignal(weakSignals, 'Fewer than 3 citation/social anchors on page') ||
        hasWeakSignal(weakSignals, 'Missing sameAs array in Organization schema') ||
        scores.citationHealthScore < 50,
      weight: 0,
      customerImpact:
        'When AI cannot find enough corroborating references, it is more likely to mention competitors or answer without naming your brand at all.',
      nextAction:
        'Add stronger corroboration through sameAs links, source references, and visible trust anchors tied to your brand.',
      expectedBenefit:
        'More proof signals improve citation confidence and raise the odds that your brand appears in competitive answers.',
      priority: 'Now',
    },
    {
      key: 'compressibility',
      title: 'Your content is hard for AI to reuse',
      cause: COMPRESSIBILITY_CAUSE,
      triggered:
        weakSignals.some((signal) => signal.startsWith('Low word count')) ||
        weakSignals.some((signal) => signal.startsWith('Low propositional density')) ||
        hasWeakSignal(weakSignals, 'Content lacks AI-citation formats (how-to, list, Q&A, tutorial)') ||
        scores.contentDepthScore < 50,
      weight: 0,
      customerImpact:
        'Even if the page is crawlable, AI may skip over it because the content is difficult to turn into short, direct, citable answers.',
      nextAction:
        'Reshape key pages into clearer answer formats such as FAQs, step-by-step sections, lists, and concise factual blocks.',
      expectedBenefit:
        'More reusable content improves your chances of being quoted, summarized, and surfaced in answer engines.',
      priority: 'Next',
    },
    {
      key: 'trust',
      title: 'Your authority signals are underpowered',
      cause: TRUST_CAUSE,
      triggered:
        hasWeakSignal(weakSignals, 'No author signal in schema') ||
        hasWeakSignal(weakSignals, 'No publication or modification date in schema') ||
        scores.authoritySignalsScore < 50,
      weight: 0,
      customerImpact:
        'Weak freshness and authorship signals can make your page look less dependable, especially when AI is choosing between you and a competitor.',
      nextAction:
        'Add or improve author, publisher, and freshness signals so the page looks maintained and attributable.',
      expectedBenefit:
        'Stronger trust signals help AI treat your page as a safer source to quote and recommend.',
      priority: 'Later',
    },
  ];

  categories.forEach((category) => {
    if (!category.triggered) return;

    switch (category.key) {
      case 'entity':
        category.weight =
          (scores.signalCoverageScore < 50 ? 2 : 0) +
          (hasWeakSignal(weakSignals, 'No Schema.org structured data') ? 1 : 0) +
          (hasWeakSignal(weakSignals, 'Missing canonical URL') ? 1 : 0) +
          (hasWeakSignal(weakSignals, 'Missing Open Graph metadata') ? 1 : 0) +
          (hasWeakSignal(weakSignals, 'No heading structure (H1–H3)') ? 1 : 0);
        break;
      case 'citation':
        category.weight =
          (scores.citationHealthScore < 50 ? 2 : 0) +
          (hasWeakSignal(weakSignals, 'Fewer than 3 citation/social anchors on page') ? 1 : 0) +
          (hasWeakSignal(weakSignals, 'Missing sameAs array in Organization schema') ? 1 : 0);
        break;
      case 'compressibility':
        category.weight =
          (scores.contentDepthScore < 50 ? 2 : 0) +
          (weakSignals.some((signal) => signal.startsWith('Low word count')) ? 1 : 0) +
          (weakSignals.some((signal) => signal.startsWith('Low propositional density')) ? 1 : 0) +
          (hasWeakSignal(weakSignals, 'Content lacks AI-citation formats (how-to, list, Q&A, tutorial)') ? 1 : 0);
        break;
      case 'trust':
        category.weight =
          (scores.authoritySignalsScore < 50 ? 2 : 0) +
          (hasWeakSignal(weakSignals, 'No author signal in schema') ? 1 : 0) +
          (hasWeakSignal(weakSignals, 'No publication or modification date in schema') ? 1 : 0);
        break;
    }
  });

  const causes = categories
    .filter((category) => category.triggered)
    .sort((a, b) => b.weight - a.weight)
    .slice(0, 3)
    .map((category) => category.cause);

  const items = categories
    .filter((category) => category.triggered)
    .sort((a, b) => b.weight - a.weight)
    .slice(0, 3)
    .map((category) => ({
      key: category.key,
      title: category.title,
      cause: category.cause,
      customerImpact: category.customerImpact,
      nextAction: category.nextAction,
      expectedBenefit: category.expectedBenefit,
      priority: category.priority,
    }));

  if (causes.length === 0) {
    return {
      summary: 'This page exposes enough identity, citation, and content structure signals for AI systems to understand and cite it more reliably.',
      causes: [],
      items: [],
    };
  }

  let summary = 'AI systems may struggle to cite this page due to weak identity and citation signals.';
  if (causes.length === 1) {
    summary = 'AI systems may struggle to cite this page because one core visibility signal group is underdeveloped.';
  } else if (
    causes.includes(COMPRESSIBILITY_CAUSE) &&
    !causes.includes(ENTITY_CAUSE) &&
    !causes.includes(CITATION_CAUSE)
  ) {
    summary = 'AI systems may struggle to reuse this page in answers because the content is difficult to compress into clear, citable responses.';
  }

  return { summary, causes, items };
}
