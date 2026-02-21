import React from 'react';
import type { ExtractionData } from '../types';

const COMMON_CITATION_SOURCES = [
  { id: 'linkedin', label: 'LinkedIn', domain: 'linkedin.com' },
  { id: 'twitter', label: 'Twitter/X', domain: 'twitter.com' },
  { id: 'x', label: 'X', domain: 'x.com' },
  { id: 'facebook', label: 'Facebook', domain: 'facebook.com' },
  { id: 'instagram', label: 'Instagram', domain: 'instagram.com' },
  { id: 'youtube', label: 'YouTube', domain: 'youtube.com' },
  { id: 'github', label: 'GitHub', domain: 'github.com' },
  { id: 'medium', label: 'Medium', domain: 'medium.com' },
  { id: 'yelp', label: 'Yelp', domain: 'yelp.com' },
  { id: 'trustpilot', label: 'Trustpilot', domain: 'trustpilot.com' },
  { id: 'reddit', label: 'Reddit', domain: 'reddit.com' },
  { id: 'pinterest', label: 'Pinterest', domain: 'pinterest.com' },
];

function domainFromUrl(url: string): string {
  try {
    const u = new URL(url);
    return u.hostname.replace('www.', '').toLowerCase();
  } catch {
    return url.toLowerCase();
  }
}

function hasSource(urls: string[], domain: string): boolean {
  return urls.some(u => domainFromUrl(u).includes(domain) || domain.includes(domainFromUrl(u)));
}

interface CitationHealthDisplayProps {
  extractionData: ExtractionData | null;
}

export default function CitationHealthDisplay({ extractionData }: CitationHealthDisplayProps) {
  if (!extractionData) return null;

  const pageAnchors = extractionData.citationAnchors ?? [];
  const schemaSameAs = extractionData.sameAsUrls ?? [];
  const allUrls = [...new Set([...pageAnchors, ...schemaSameAs])];

  const found = COMMON_CITATION_SOURCES.filter(s => hasSource(allUrls, s.domain));
  const missing = COMMON_CITATION_SOURCES.filter(s => !hasSource(allUrls, s.domain));

  return (
    <div className="bg-white border border-slate-200 rounded-[2.5rem] p-8 space-y-6 animate-in fade-in slide-in-from-bottom-6 duration-500">
      <div>
        <h3 className="text-xl font-black uppercase tracking-tight text-slate-900">Citation Health</h3>
        <p className="text-xs text-slate-500 mt-1">Social and verification links AI uses for corroboration</p>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <div>
          <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3">Found on page ({found.length}/{COMMON_CITATION_SOURCES.length})</h4>
          {found.length === 0 ? (
            <p className="text-sm text-slate-500 italic">No citation links detected.</p>
          ) : (
            <ul className="space-y-1">
              {found.map(s => {
                const url = allUrls.find(u => domainFromUrl(u).includes(s.domain));
                return (
                  <li key={s.id} className="flex items-center gap-2 text-sm">
                    <span className="text-green-600">✓</span>
                    <span className="font-medium text-slate-900">{s.label}</span>
                    {url && (
                      <a href={url} target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:underline text-xs truncate max-w-[200px]">
                        {url}
                      </a>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <div>
          <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3">Where to add</h4>
          {missing.length === 0 ? (
            <p className="text-sm text-slate-600">All common citation sources present.</p>
          ) : (
            <ul className="space-y-2">
              {missing.slice(0, 6).map(s => (
                <li key={s.id} className="flex items-center gap-2 text-sm">
                  <span className="text-slate-300">○</span>
                  <span className="text-slate-700">{s.label}</span>
                  <span className="text-xs text-slate-500">— Add link in footer and Schema sameAs</span>
                </li>
              ))}
              {missing.length > 6 && (
                <li className="text-xs text-slate-500">+{missing.length - 6} more</li>
              )}
            </ul>
          )}
        </div>
      </div>

      <div className="border-t border-slate-100 pt-4">
        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
          Schema sameAs: {schemaSameAs.length} • Page links: {pageAnchors.length} • Add both for best AI verification
        </p>
      </div>
    </div>
  );
}
