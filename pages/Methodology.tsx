import React from 'react';
import { Link } from 'react-router-dom';

export default function Methodology() {
  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="max-w-3xl mx-auto">
        <Link
          to="/"
          className="inline-block mb-8 text-[10px] font-bold uppercase tracking-widest text-indigo-600 hover:text-indigo-700"
        >
          Back to Audit
        </Link>

        <h1 className="text-2xl font-black uppercase tracking-tight text-slate-900 mb-6">
          Methodology
        </h1>

        <div className="prose prose-slate max-w-none space-y-6 text-sm text-slate-700">
          <section>
            <h2 className="text-lg font-bold text-slate-900">Overview</h2>
            <p>
              The AISO Instrument measures AI readiness of web pages using deterministic,
              rule-based scoring applied to extracted on-page signals. Scores are designed to
              indicate how well a page supports AI discovery and citation.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-slate-900">Metrics</h2>
            <ul className="list-disc pl-5 space-y-2">
              <li>
                <strong>AI Visibility (0–100):</strong> Entity clarity and structural signals
                (title, meta, Schema.org markup, headings).
              </li>
              <li>
                <strong>Citation Likelihood (0–100):</strong> Corroboration potential via
                schema, content coverage, and citation anchors (e.g. social links).
              </li>
              <li>
                <strong>Answer Engine Readiness (0–100):</strong> Content length,
                propositional density, and structural compressibility.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-bold text-slate-900">Data Sources</h2>
            <p>
              Extraction parses the page HTML for title, meta description, headings (H1–H3),
              main content (via Readability), Schema.org JSON-LD, and citation anchors.
              Propositional density is computed from factual vs. marketing language markers.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-slate-900">How We Know</h2>
            <p>
              Research indicates that pages with Schema.org markup are cited ~2.3× more in AI-generated answers;
              content under 6 months old performs ~3.2× better; and listicles and how-to formats account for
              ~72% of AI citations. Our signals are aligned with these findings.
            </p>
            <p className="mt-2 text-slate-600">
              Sources: <a href="https://www.hashmeta.com" className="text-indigo-600 hover:underline" target="_blank" rel="noreferrer">Hashmeta</a>,{' '}
              <a href="https://www.searchatlas.com" className="text-indigo-600 hover:underline" target="_blank" rel="noreferrer">Search Atlas</a>, and internal analysis.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-slate-900">Limitations</h2>
            <p>
              Scores are heuristic and have not been validated against actual AI system
              behavior (e.g. ChatGPT, Perplexity). They provide a consistent baseline for
              comparison and prioritization, not a guarantee of citation or visibility.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
