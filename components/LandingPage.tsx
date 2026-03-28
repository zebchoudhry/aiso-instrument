import React, { useEffect } from 'react';
import VisusLogo from './VisusLogo';
import AuditForm from './AuditForm';
import { SurfaceCard, SectionIntro } from './VisualSystem';

interface LandingPageProps {
  onAudit: (url: string, name: string, email: string) => void;
  onAuditFromHtml: (html: string, url: string, name: string, email: string) => void;
  isLoading: boolean;
  errorMessage?: string | null;
  usePasteFallback?: boolean;
}

const STATS = [
  { value: '1B+', label: "ChatGPT's daily searches — reached 5.5x faster than Google did (Visual Capitalist)" },
  { value: '~20%', label: 'U.S. Google searches per user fell almost 20% year-over-year in early 2026' },
  { value: '89%', label: "Google's global search market share dropped below 90% for the first time in a decade (late 2024–2025)" },
  { value: '58%+', label: 'U.S. Google searches now end without a click — users get direct answers from AI Overviews' },
  { value: '38%', label: 'Lift in organic clicks for brands that earn LLM citations' },
];

const FREE_AUDIT_BENEFITS = [
  { title: 'AI Visibility Score', desc: 'Your 0–100 score and plain-language verdict.' },
  { title: 'Signal Breakdown', desc: 'Entity clarity, structure, trust signals, answer reuse.' },
  { title: 'What\'s Wrong & Why', desc: 'Diagnosis of why AI may not cite your content.' },
  { title: 'Top Quick Wins', desc: 'Prioritized opportunities to improve visibility.' },
];

const HOW_IT_WORKS = [
  { step: 1, title: 'Run the free audit', desc: 'Enter your website. Get your score and diagnosis in under 60 seconds.' },
  { step: 2, title: 'See what\'s broken', desc: 'Understand exactly why ChatGPT and Perplexity don\'t cite you.' },
  { step: 3, title: 'Unlock fixes + monitoring', desc: 'Enable monthly monitoring to access the full fix library and ongoing visibility tracking.' },
];

const FAQ_ITEMS = [
  {
    q: 'Is this different from traditional SEO?',
    a: 'Yes. Traditional SEO ranks you on Google. AI visibility measures whether ChatGPT, Perplexity, and AI Overviews cite your brand when users ask questions. You can rank well on Google and still be invisible to AI answers.',
  },
  {
    q: 'How long does the free audit take?',
    a: 'Usually under 60 seconds. No credit card required.',
  },
  {
    q: 'What happens after I get my score?',
    a: 'You\'ll see your diagnosis and generic quick wins. To unlock your personalized fix library, implementation guide, and monitoring, enable monthly monitoring.',
  },
  {
    q: 'Why does my SEO budget need this?',
    a: 'Search is shifting to AI. If you only optimize for Google and ignore how AI systems discover and cite brands, part of your visibility investment is wasted. Audits ensure your signals work across both traditional and AI search.',
  },
];

const JSON_LD_WEB_APP = {
  '@context': 'https://schema.org',
  '@type': 'WebApplication',
  name: 'Visus - AI Visibility Audit',
  applicationCategory: 'BusinessApplication',
  description: 'Free AI search visibility audit. Find out why ChatGPT and Perplexity don\'t cite your brand. Get your score, diagnosis, and fix plan. No credit card required.',
  url: typeof window !== 'undefined' ? window.location.origin : 'https://visus.ai',
  offers: {
    '@type': 'Offer',
    price: '0',
    priceCurrency: 'USD',
    description: 'Free AI visibility audit',
  },
  featureList: [
    'AI Visibility Score (0-100)',
    'Plain-language verdict',
    'Entity clarity, structure, trust signals',
    'Prioritized fix library',
    'Competitor gap analysis',
    'Ongoing monitoring',
  ],
};

const JSON_LD_FAQ = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: FAQ_ITEMS.map(({ q, a }) => ({
    '@type': 'Question',
    name: q,
    acceptedAnswer: { '@type': 'Answer', text: a },
  })),
};

export default function LandingPage({
  onAudit,
  onAuditFromHtml,
  isLoading,
  errorMessage = null,
  usePasteFallback = false,
}: LandingPageProps) {
  useEffect(() => {
    document.title = 'Visus - Free AI Visibility Audit | Be Seen by ChatGPT & Perplexity';
    const metaDesc = document.querySelector('meta[name="description"]');
    if (metaDesc) {
      metaDesc.setAttribute(
        'content',
        'Your business may be invisible to AI search. Run a free audit to see your AI visibility score, why ChatGPT and Perplexity don\'t cite you, and what to fix. No credit card required.'
      );
    }
  }, []);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(JSON_LD_WEB_APP) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(JSON_LD_FAQ) }}
      />
      <article>
        {/* Hero */}
        <header className="relative overflow-hidden rounded-[2.75rem] border border-slate-800 bg-[radial-gradient(circle_at_top,rgba(99,102,241,0.34),transparent_30%),linear-gradient(180deg,#07102a_0%,#0a1433_50%,#0f172a_100%)] px-8 py-16 shadow-[0_30px_80px_rgba(15,23,42,0.35)] md:px-14 md:py-24 lg:py-28">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_18%,rgba(56,189,248,0.12),transparent_18%),radial-gradient(circle_at_80%_0%,rgba(129,140,248,0.22),transparent_24%),linear-gradient(90deg,transparent,rgba(255,255,255,0.03),transparent)]" />
          <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/30 to-transparent" />
          <div className="relative mx-auto max-w-5xl text-center">
            <p className="mb-7 text-[11px] font-black uppercase tracking-[0.5em] text-indigo-200/85">
              AI Visibility Intelligence
            </p>
            <VisusLogo theme="light" size="xl" className="justify-center" />
            <h1 className="mx-auto mt-10 max-w-4xl text-4xl font-black uppercase tracking-[-0.05em] text-white md:text-6xl lg:text-[4.6rem] lg:leading-[0.95]">
              Your Business Is Invisible to AI Search. Check in 60 Seconds.
            </h1>
            <p className="mx-auto mt-7 max-w-3xl text-lg leading-8 text-slate-200 md:text-xl">
              Google traffic is no longer the full picture. ChatGPT, Perplexity, and AI Overviews decide what people see and cite. Run a free audit to find your visibility score, what&apos;s broken, and what to fix next.
            </p>
            <div className="mt-10 flex flex-wrap items-center justify-center gap-3 text-sm font-semibold text-slate-100 md:gap-4">
              <span className="rounded-full border border-white/10 bg-white/5 px-5 py-2.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] backdrop-blur-sm">
                Free audit
              </span>
              <span className="rounded-full border border-white/10 bg-white/5 px-5 py-2.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] backdrop-blur-sm">
                No credit card
              </span>
              <span className="rounded-full border border-white/10 bg-white/5 px-5 py-2.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] backdrop-blur-sm">
                Results in under 60 seconds
              </span>
            </div>
          </div>
        </header>

        {/* Stats: The Shift */}
        <section className="mx-auto mt-12 max-w-6xl" aria-labelledby="stats-heading">
          <h2 id="stats-heading" className="sr-only">AI search is changing how people find brands</h2>
          <SurfaceCard tone="soft" className="p-8 md:p-10">
            <SectionIntro
              label="Evidence from Google"
              title="Search is shifting — your SEO budget can't ignore it"
              description="ChatGPT reached 1 billion daily searches 5.5x faster than Google did (Visual Capitalist). In 2025, Google executives acknowledged that losing search traffic to platforms like ChatGPT and Gemini is inevitable. If even Google expects this shift, your visibility strategy can't rely on traditional search alone."
              align="center"
            />
            <div className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-5">
              {STATS.map((stat, i) => (
                <div
                  key={i}
                  className="rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-sm"
                >
                  <p className="text-3xl font-black text-indigo-600 md:text-4xl">{stat.value}</p>
                  <p className="mt-2 text-sm font-medium text-slate-600">{stat.label}</p>
                </div>
              ))}
            </div>
            <div className="mt-8 rounded-2xl border-2 border-amber-200 bg-amber-50 p-6 md:p-8">
              <p className="text-[10px] font-black uppercase tracking-[0.3em] text-amber-700">
                The real risk
              </p>
              <p className="mt-2 text-base font-bold text-slate-900 md:text-lg">
                A competitor who isn&apos;t as good as you can still be recommended first — simply because their site is AI-ready. You lose leads before they ever reach you.
              </p>
            </div>
            <p className="mt-6 text-center text-[10px] font-medium uppercase tracking-wider text-slate-400">
              Sources: Visual Capitalist (ChatGPT daily search volume); Google data & executive statements (search volume decline, market share, zero-click rate). Executives acknowledge traffic loss to ChatGPT and Gemini as inevitable.
            </p>
          </SurfaceCard>
        </section>

        {/* Audit Form + Benefits */}
        <section id="audit-form-anchor" className="mx-auto mt-12 max-w-6xl scroll-mt-24" aria-labelledby="audit-heading">
          <div className="grid grid-cols-1 gap-8 xl:grid-cols-[minmax(0,1.55fr)_minmax(320px,0.85fr)]">
            <div className="rounded-[2.5rem] border border-slate-200 bg-white p-6 shadow-[0_20px_60px_rgba(15,23,42,0.08)] md:p-8">
              {errorMessage && (
                <div className="mb-6 rounded-2xl border-2 border-red-200 bg-red-50 p-5 text-sm text-red-800">
                  <p className="font-bold">{errorMessage}</p>
                  {usePasteFallback && (
                    <div className="mt-4 rounded-lg border border-red-100 bg-white p-4">
                      <p className="mb-2 text-sm font-bold text-slate-800">This site is blocking our server. Use Paste HTML:</p>
                      <ol className="mb-3 list-inside list-decimal space-y-1 text-xs text-slate-700">
                        <li>Click <strong>Paste HTML</strong> in the tabs below</li>
                        <li>Visit the site → Right-click → View Page Source</li>
                        <li>Copy all HTML and paste it in</li>
                      </ol>
                    </div>
                  )}
                </div>
              )}
              <AuditForm
                onAudit={onAudit}
                onAuditFromHtml={onAuditFromHtml}
                isLoading={isLoading}
                showPasteFallback={usePasteFallback}
              />
            </div>

            <aside className="space-y-6">
              <div className="rounded-[2rem] border border-slate-200 bg-[linear-gradient(180deg,#ffffff_0%,#eef2ff_100%)] p-6 shadow-sm">
                <h3 id="audit-heading" className="text-xl font-black uppercase tracking-tight text-slate-900">
                  What you get in the free audit
                </h3>
                <ul className="mt-4 space-y-3">
                  {FREE_AUDIT_BENEFITS.map((b, i) => (
                    <li key={i} className="flex gap-3">
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-indigo-600 text-xs font-bold text-white">
                        ✓
                      </span>
                      <div>
                        <p className="text-sm font-semibold text-slate-900">{b.title}</p>
                        <p className="text-xs text-slate-600">{b.desc}</p>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
                <p className="text-[10px] font-black uppercase tracking-[0.3em] text-indigo-600">
                  Why every business needs this
                </p>
                <p className="mt-3 text-sm leading-6 text-slate-600">
                  Your SEO work is at risk of underperforming in AI answers. You can rank on Google and still be absent when prospects ask ChatGPT or Perplexity. If you ignore AI visibility audits, part of your SEO budget is leaking value.
                </p>
              </div>
            </aside>
          </div>
        </section>

        {/* How It Works */}
        <section className="mx-auto mt-16 max-w-6xl" aria-labelledby="how-heading">
          <SectionIntro
            label="How It Works"
            title="Three steps from invisible to cited"
            description="Run the free audit, see what's wrong, then unlock your full fix plan and monitoring."
            align="center"
          />
          <div className="mt-10 grid grid-cols-1 gap-6 md:grid-cols-3">
            {HOW_IT_WORKS.map((item) => (
              <div
                key={item.step}
                className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm"
              >
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
                  Step {item.step}
                </p>
                <p className="mt-2 text-base font-black uppercase tracking-tight text-slate-900">
                  {item.title}
                </p>
                <p className="mt-2 text-sm text-slate-600">{item.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* FAQ */}
        <section className="mx-auto mt-16 max-w-3xl" aria-labelledby="faq-heading">
          <h2 id="faq-heading" className="text-2xl font-black uppercase tracking-tight text-slate-900">
            Frequently asked questions
          </h2>
          <ul className="mt-8 space-y-8">
            {FAQ_ITEMS.map((faq, i) => (
              <li key={i} className="border-b border-slate-200 pb-8 last:border-0 last:pb-0">
                <h3 className="text-sm font-black uppercase tracking-tight text-slate-900">
                  {faq.q}
                </h3>
                <p className="mt-2 text-sm leading-6 text-slate-600">{faq.a}</p>
              </li>
            ))}
          </ul>
        </section>

        {/* Final CTA */}
        <section className="mx-auto mt-16 max-w-3xl" aria-labelledby="cta-heading">
          <SurfaceCard tone="dark" className="p-10 text-center">
            <h2 id="cta-heading" className="text-2xl font-black uppercase tracking-tight text-white">
              Run your free AI visibility audit
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-slate-300">
              Enter your website above to get your score, diagnosis, and top opportunities. No credit card required.
            </p>
            <a
              href="#audit-form-anchor"
              className="mt-6 inline-block rounded-2xl bg-indigo-600 px-8 py-4 text-[10px] font-black uppercase tracking-widest text-white shadow-lg shadow-indigo-500/20 transition-all hover:bg-indigo-500"
            >
              Run Free Audit
            </a>
          </SurfaceCard>
        </section>
      </article>
    </>
  );
}
