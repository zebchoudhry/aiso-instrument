import type { ExtractionData } from '../types.js';
import type { AuditFinding } from '../types.js';

/**
 * Maps extraction data gaps and audit findings to plain-language reasons
 * why AI systems might not cite this site for a given query.
 */
export function inferCitationReasons(
  extractionData: ExtractionData | null,
  findings: AuditFinding[] | undefined
): string[] {
  const reasons: string[] = [];

  if (!extractionData && !findings?.length) return reasons;

  // From extraction gaps
  if (extractionData) {
    const schemaCount = extractionData.schemaCount ?? 0;
    if (schemaCount === 0) {
      reasons.push("AI can't clearly identify your entity (no Schema.org markup)");
    }

    const meta = extractionData.metaDescription ?? '';
    if (!meta || meta.length < 20) {
      reasons.push('Weak or missing meta description — retrieval ranking may be low');
    }

    const propositional = extractionData.propositionalDensity ?? 0;
    if (propositional < 0.15 && extractionData.wordCount > 200) {
      reasons.push('Low propositional density — content may not match answer patterns AI looks for');
    }

    const anchors = (extractionData.citationAnchors ?? []).length + (extractionData.sameAsUrls ?? []).length;
    if (anchors === 0) {
      reasons.push('No verification links — AI systems prefer sites with authoritative backlinks');
    }

    if (!extractionData.canonicalUrl) {
      reasons.push('Missing canonical URL — AI may treat duplicate content as lower authority');
    }

    const og = extractionData.openGraph;
    if (!og?.title || !og?.description) {
      reasons.push('Incomplete Open Graph tags — social and AI previews may be weak');
    }
  }

  // From audit findings
  if (Array.isArray(findings)) {
    for (const f of findings.slice(0, 5)) {
      const trace = (f.diagnosticTrace ?? '').toLowerCase();
      const label = (f.label ?? '').toLowerCase();
      if (
        trace.includes('schema') ||
        label.includes('schema') ||
        trace.includes('entity')
      ) {
        const r = "Entity clarity is weak — AI can't easily extract who you are";
        if (!reasons.some((x) => x.toLowerCase().includes('entity'))) reasons.push(r);
      }
      if (trace.includes('meta') || label.includes('meta')) {
        const r = 'Meta and structural signals are weak';
        if (!reasons.some((x) => x.toLowerCase().includes('meta'))) reasons.push(r);
      }
      if (trace.includes('compress') || label.includes('compress')) {
        const r = 'Content compressibility is low — harder for AI to summarize';
        if (!reasons.some((x) => x.toLowerCase().includes('compress'))) reasons.push(r);
      }
      if (trace.includes('corroborat') || label.includes('corroborat')) {
        const r = 'Few corroboration signals — AI prefers sites with external validation';
        if (!reasons.some((x) => x.toLowerCase().includes('corroborat'))) reasons.push(r);
      }
    }
  }

  return [...new Set(reasons)];
}
