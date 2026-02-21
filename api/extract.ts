import type { VercelRequest, VercelResponse } from "@vercel/node";
import * as cheerio from 'cheerio';
import { JSDOM } from 'jsdom';
import { Readability } from '@mozilla/readability';

// --- Inlined processHtml (from api/lib/processHtml) to avoid MODULE_NOT_FOUND on Vercel ---
const EXTENDED_CITATION_DOMAINS = [
  'linkedin.com', 'twitter.com', 'x.com', 'facebook.com', 'instagram.com',
  'youtube.com', 'youtu.be', 'github.com', 'medium.com', 'yelp.com',
  'trustpilot.com', 'g2.com', 'capterra.com', 'reddit.com', 'pinterest.com'
];

function parseDate(str: string | undefined): Date | null {
  if (!str || typeof str !== 'string') return null;
  const d = new Date(str);
  return isNaN(d.getTime()) ? null : d;
}

function monthsSince(date: Date | null): number | null {
  if (!date) return null;
  const now = new Date();
  return (now.getTime() - date.getTime()) / (30 * 24 * 60 * 60 * 1000);
}

function calculatePropositionalDensity(content: string): number {
  const factualMarkers = [
    /\d+/g,
    /since \d{4}/gi,
    /\$[\d,]+/g,
    /\d+%/g,
    /(monday|tuesday|wednesday|thursday|friday|saturday|sunday)/gi,
    /(january|february|march|april|may|june|july|august|september|october|november|december)/gi,
    /\b(is|are|has|have|provides|offers|located|based)\b/gi,
  ];
  const fluffMarkers = [
    /\b(leading|innovative|cutting-edge|world-class|best-in-class|revolutionary|groundbreaking)\b/gi,
    /\b(amazing|incredible|outstanding|exceptional|superior|premium|elite)\b/gi,
    /\b(passionate|dedicated|committed|driven|focused)\b/gi,
  ];
  let factualCount = 0;
  factualMarkers.forEach((regex) => {
    const matches = content.match(regex);
    if (matches) factualCount += matches.length;
  });
  let fluffCount = 0;
  fluffMarkers.forEach((regex) => {
    const matches = content.match(regex);
    if (matches) fluffCount += matches.length;
  });
  const total = factualCount + fluffCount;
  if (total === 0) return 50;
  return Math.round((factualCount / total) * 100);
}

function detectContentFormat(content: string, headings: string[]): string[] {
  const formats: string[] = [];
  const lower = content.toLowerCase();
  const headingText = headings.join(' ').toLowerCase();
  if (/\bhow\s+to\b|step\s*\d|instructions?\s*:/i.test(content) || /how\s+to/i.test(headingText))
    formats.push('how-to');
  if (/\b\d+\.\s|\*\s|\-\s|^\s*\d+\)/m.test(content) || /\d+\s*(ways|tips|reasons|steps)/i.test(headingText))
    formats.push('list');
  if (/\?\s*$|faq|q:\s|question:/im.test(content) || /faq|question|answer/i.test(headingText))
    formats.push('q-and-a');
  if (/\btutorial\b|walkthrough|guide\s+to\b/i.test(lower))
    formats.push('tutorial');
  return formats.length ? formats : ['standard'];
}

function detectFirstPersonPresence(content: string): number {
  const firstPerson = (content.match(/\b(we|our|i|my|us)\b/gi) || []).length;
  const totalWords = content.split(/\s+/).filter(Boolean).length;
  if (totalWords < 50) return 0;
  return Math.min(100, Math.round((firstPerson / totalWords) * 500));
}

function processHtml(html: string, baseUrl: string = 'https://example.com') {
  const $ = cheerio.load(html);

  const title = $('title').first().text().trim() || '';
  const metaDescription = $('meta[name="description"]').attr('content')?.trim() || '';

  const headings: string[] = [];
  $('h1, h2, h3').each((_, el) => {
    const text = $(el).text().trim();
    if (text && text.length > 2) headings.push(text);
  });

  const dom = new JSDOM(html, { url: baseUrl });
  const reader = new Readability(dom.window.document);
  const article = reader.parse();
  const mainContent = article?.textContent?.trim().slice(0, 15000) || '';
  const wordCount = mainContent.split(/\s+/).filter(Boolean).length;

  const schemaNodes: string[] = [];
  const schemaTypes: string[] = [];
  $('script[type="application/ld+json"]').each((_, el) => {
    const content = $(el).html();
    if (content) {
      schemaNodes.push(content);
      try {
        const parsed = JSON.parse(content);
        const type = parsed['@type'];
        if (typeof type === 'string' && !schemaTypes.includes(type))
          schemaTypes.push(type);
        else if (Array.isArray(type))
          type.forEach((t: string) => t && !schemaTypes.includes(t) && schemaTypes.push(t));
      } catch (_) {
        /* skip */
      }
    }
  });
  const schemaMarkup = schemaNodes.join('\n').slice(0, 8000);

  const citationAnchors: string[] = [];
  const citationSelector = EXTENDED_CITATION_DOMAINS.map(d => `a[href*="${d}"]`).join(', ');
  $(citationSelector).each((_, el) => {
    const href = $(el).attr('href');
    if (href && !citationAnchors.includes(href)) citationAnchors.push(href);
  });

  const openGraph = {
    title: $('meta[property="og:title"]').attr('content')?.trim(),
    description: $('meta[property="og:description"]').attr('content')?.trim(),
    image: $('meta[property="og:image"]').attr('content')?.trim(),
    type: $('meta[property="og:type"]').attr('content')?.trim(),
  };
  const hasOg = !!(openGraph.title || openGraph.description);

  const twitterCard = {
    card: $('meta[name="twitter:card"]').attr('content')?.trim(),
    title: $('meta[name="twitter:title"]').attr('content')?.trim(),
    description: $('meta[name="twitter:description"]').attr('content')?.trim(),
  };

  const canonicalUrl = $('link[rel="canonical"]').attr('href')?.trim() || undefined;

  const sameAsUrls: string[] = [];
  schemaNodes.forEach((node) => {
    try {
      const parsed = typeof node === 'string' ? JSON.parse(node) : node;
      const sameAs = parsed.sameAs || (parsed['@graph'] && [].concat(...(parsed['@graph'] || []).map((g: any) => g.sameAs || [])));
      const urls = Array.isArray(sameAs) ? sameAs : (sameAs ? [sameAs] : []);
      urls.forEach((u: string) => u && typeof u === 'string' && !sameAsUrls.includes(u) && sameAsUrls.push(u));
    } catch (_) { /* skip */ }
  });

  let datePublished: string | undefined;
  let dateModified: string | undefined;
  let author: string | undefined;
  let publisher: string | undefined;
  const dpMeta = $('meta[property="article:published_time"], meta[name="date"]').first().attr('content');
  const dmMeta = $('meta[property="article:modified_time"]').first().attr('content');
  if (dpMeta) datePublished = dpMeta;
  if (dmMeta) dateModified = dmMeta;
  schemaNodes.forEach((node) => {
    try {
      const parsed = typeof node === 'string' ? JSON.parse(node) : node;
      const graph = parsed['@graph'] || [parsed];
      for (const g of graph) {
        if (g.datePublished && !datePublished) datePublished = g.datePublished;
        if (g.dateModified && !dateModified) dateModified = g.dateModified;
        if (g.author) {
          const a = typeof g.author === 'string' ? g.author : (g.author?.name || g.author?.['@id']);
          if (a && !author) author = a;
        }
        if (g.publisher?.name && !publisher) publisher = g.publisher.name;
      }
    } catch (_) { /* skip */ }
  });

  const robotsMeta = $('meta[name="robots"]').attr('content') || undefined;
  const isCrawlable = !robotsMeta || !/noindex/i.test(robotsMeta);

  let hasBreadcrumbList = false;
  schemaNodes.forEach((node) => {
    try {
      const parsed = typeof node === 'string' ? JSON.parse(node) : node;
      const type = parsed['@type'];
      const t = Array.isArray(type) ? type : [type].filter(Boolean);
      if (t.some((x: string) => x && String(x).includes('BreadcrumbList'))) hasBreadcrumbList = true;
    } catch (_) { /* skip */ }
  });

  const contentFormats = detectContentFormat(mainContent, headings);
  const firstPersonScore = detectFirstPersonPresence(mainContent);

  const latestDate = parseDate(dateModified || datePublished);
  const freshnessMonths = latestDate !== null ? monthsSince(latestDate) : null;

  const propositionalDensity = calculatePropositionalDensity(mainContent);

  const errors: string[] = [];
  if (!title) errors.push('Missing <title> tag');
  if (!metaDescription) errors.push('Missing meta description');
  if (schemaNodes.length === 0) errors.push('No Schema.org markup found');
  if (headings.length === 0) errors.push('No headings found');
  if (wordCount < 100) errors.push('Insufficient content (< 100 words)');
  if (!isCrawlable) errors.push('Page may be blocked from indexing (robots noindex)');

  return {
    title,
    metaDescription,
    mainContent,
    schemaMarkup,
    headings: headings.slice(0, 20),
    wordCount,
    schemaCount: schemaNodes.length,
    extractionCoverage: wordCount > 200 ? 100 : 50,
    propositionalDensity,
    citationAnchors,
    schemaTypes,
    errors,
    openGraph: hasOg ? openGraph : undefined,
    twitterCard: (twitterCard.card || twitterCard.title) ? twitterCard : undefined,
    canonicalUrl,
    sameAsUrls,
    datePublished,
    dateModified,
    author,
    publisher,
    robotsMeta,
    hasBreadcrumbList,
    contentFormats,
    firstPersonScore,
    freshnessMonths,
    isCrawlable,
  };
}

export { processHtml };

// In-memory rate limiter (inlined for serverless; per-instance only)
const rateLimitStore = new Map<string, number[]>();
const RATE_WINDOW_MS = 60 * 1000;
const RATE_MAX_REQUESTS = 10;
function rateLimitPrune(ips: number[]): number[] {
  const cutoff = Date.now() - RATE_WINDOW_MS;
  return ips.filter((t) => t > cutoff);
}
function checkRateLimit(identifier: string): { allowed: boolean; remaining: number } {
  const now = Date.now();
  let ips = rateLimitStore.get(identifier) ?? [];
  ips = rateLimitPrune(ips);
  if (ips.length >= RATE_MAX_REQUESTS) return { allowed: false, remaining: 0 };
  ips.push(now);
  rateLimitStore.set(identifier, ips);
  return { allowed: true, remaining: RATE_MAX_REQUESTS - ips.length };
}
function getIdentifier(req: VercelRequest): string {
  const forwarded = req.headers?.['x-forwarded-for'];
  if (typeof forwarded === 'string') return forwarded.split(',')[0].trim();
  if (Array.isArray(forwarded)) return forwarded[0]?.split(',')[0].trim() ?? 'unknown';
  const realIp = req.headers?.['x-real-ip'];
  if (typeof realIp === 'string') return realIp;
  return (req as any).socket?.remoteAddress ?? 'unknown';
}

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { allowed, remaining } = checkRateLimit(getIdentifier(req));
  if (!allowed) {
    res.setHeader('Retry-After', '60');
    return res.status(429).json({ error: "Rate limit exceeded", details: "Max 10 requests per minute. Please try again later." });
  }
  res.setHeader('X-RateLimit-Remaining', String(remaining));

  const url = (req.body && typeof req.body === 'object' && 'url' in req.body) ? (req.body as any).url : undefined;
  // #region agent log
  fetch('http://127.0.0.1:7243/ingest/65f2ea79-8116-43c5-a03e-0378f916e883',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'extract.ts:entry',message:'extract handler entry',data:{bodyType:typeof req.body,url,hasUrl:!!url},timestamp:Date.now(),hypothesisId:'H2'})}).catch(()=>{});
  // #endregion

  if (!url) {
    console.log('[extract] Request rejected: URL required');
    return res.status(400).json({ error: "URL required" })
  }

  const extractT0 = Date.now();
  // #region agent log
  try {
    const fs = await import('fs');
    const path = await import('path');
    const logPath = path.join(process.cwd(), 'debug-server-e5c298.log');
    fs.appendFileSync(logPath, JSON.stringify({sessionId:'e5c298',location:'extract.ts:entry',message:'extract handler started',data:{url,cwd:process.cwd()},timestamp:Date.now(),hypothesisId:'H2'}) + '\n');
  } catch (e: any) {
    try {
      const fs = await import('fs');
      fs.appendFileSync(process.cwd() + '/debug-server-e5c298.log', JSON.stringify({err:String(e?.message),location:'extract-log-fail'}) + '\n');
    } catch (_) {}
  }
  fetch('http://127.0.0.1:7243/ingest/65f2ea79-8116-43c5-a03e-0378f916e883',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'e5c298'},body:JSON.stringify({sessionId:'e5c298',location:'extract.ts:entry',message:'extract handler started',data:{url},timestamp:Date.now(),hypothesisId:'H2'})}).catch(()=>{});
  // #endregion
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 12000); 

    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
      },
    });

    clearTimeout(timeout);

    if (!response.ok) {
        console.log('[extract] Source site returned non-OK:', response.status, response.statusText);
        return res.status(response.status).json({ error: `Source site returned ${response.status}: ${response.statusText}` });
    }

    const html = await response.text();
    const fetchMs = Date.now() - extractT0;
    // #region agent log
    fetch('http://127.0.0.1:7243/ingest/65f2ea79-8116-43c5-a03e-0378f916e883',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'e5c298'},body:JSON.stringify({sessionId:'e5c298',location:'extract.ts:html-received',message:'html received',data:{htmlLen:html?.length,fetchMs},timestamp:Date.now(),hypothesisId:'H2'})}).catch(()=>{});
    // #endregion
    const result = processHtml(html, url);
    // #region agent log
    fetch('http://127.0.0.1:7243/ingest/65f2ea79-8116-43c5-a03e-0378f916e883',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'e5c298'},body:JSON.stringify({sessionId:'e5c298',location:'extract.ts:success',message:'extract complete',data:{wordCount:result.wordCount,totalMs:Date.now()-extractT0},timestamp:Date.now(),hypothesisId:'H2'})}).catch(()=>{});
    // #endregion
    return res.status(200).json(result);
  } catch (err: any) {
    // #region agent log
    fetch('http://127.0.0.1:7243/ingest/65f2ea79-8116-43c5-a03e-0378f916e883',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'e5c298'},body:JSON.stringify({sessionId:'e5c298',location:'extract.ts:catch',message:'extract failed',data:{errName:err?.name,errMessage:err?.message},timestamp:Date.now(),hypothesisId:'H2'})}).catch(()=>{});
    // #endregion
    console.error("[extract] Extraction error:", err?.name ?? 'Unknown', err?.message ?? String(err));
    if (err?.stack) console.error("[extract] Stack:", err.stack);
    return res.status(500).json({
      error: "Extraction Protocol Failure",
      details: err.name === 'AbortError' ? 'Target site timed out (12s limit)' : String(err)
    });
  }
}
