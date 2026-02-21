// services/extractionService.ts
// Real website signal extraction - replaces mock data

import * as cheerio from 'cheerio';

export interface ExtractedSignals {
  url: string;
  subjectName: string;
  title: string;
  metaDescription: string;
  mainContent: string;
  headings: string[];
  schemaMarkup: string[];
  structuredData: any[];
  wordCount: number;
  propositionalDensity: number;
  citationAnchors: string[];
  errors: string[];
}

export class ExtractionService {
  
  static async extractSignals(url: string): Promise<ExtractedSignals> {
    try {
      // Fetch the page
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'AISO-Instrument/5.0 (Clinical Audit Bot)'
        }
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const html = await response.text();
      const $ = cheerio.load(html);
      
      // Extract basic metadata
      const title = $('title').text() || '';
      const metaDescription = $('meta[name="description"]').attr('content') || 
                             $('meta[property="og:description"]').attr('content') || '';
      
      // Extract Schema.org JSON-LD
      const schemaMarkup: string[] = [];
      const structuredData: any[] = [];
      
      $('script[type="application/ld+json"]').each((_, elem) => {
        const content = $(elem).html();
        if (content) {
          schemaMarkup.push(content);
          try {
            structuredData.push(JSON.parse(content));
          } catch (e) {
            // Invalid JSON, skip
          }
        }
      });
      
      // Extract headings
      const headings: string[] = [];
      $('h1, h2, h3').each((_, elem) => {
        const text = $(elem).text().trim();
        if (text) headings.push(text);
      });
      
      // Extract main content
      const mainContent = $('main, article, [role="main"]').text().trim() ||
                         $('body').text().trim();
      
      // Calculate word count
      const wordCount = mainContent.split(/\s+/).length;
      
      // Calculate propositional density (simplified)
      // Ratio of factual statements to marketing fluff
      const propositionalDensity = this.calculatePropositionalDensity(mainContent);
      
      // Extract citation anchors (sameAs, social links)
      const citationAnchors: string[] = [];
      $('a[href*="linkedin.com"], a[href*="twitter.com"], a[href*="facebook.com"], a[href*="instagram.com"]').each((_, elem) => {
        const href = $(elem).attr('href');
        if (href) citationAnchors.push(href);
      });
      
      // Detect entity name from various sources
      const subjectName = this.detectEntityName($, structuredData, title);
      
      // Identify errors
      const errors: string[] = [];
      if (!title) errors.push('Missing <title> tag');
      if (!metaDescription) errors.push('Missing meta description');
      if (schemaMarkup.length === 0) errors.push('No Schema.org markup found');
      if (headings.length === 0) errors.push('No headings found');
      if (wordCount < 100) errors.push('Insufficient content (< 100 words)');
      
      return {
        url,
        subjectName,
        title,
        metaDescription,
        mainContent: mainContent.slice(0, 5000), // Limit to 5000 chars
        headings: headings.slice(0, 20), // Top 20 headings
        schemaMarkup,
        structuredData,
        wordCount,
        propositionalDensity,
        citationAnchors,
        errors
      };
      
    } catch (error) {
      throw new Error(`Extraction failed: ${error.message}`);
    }
  }
  
  private static detectEntityName($: cheerio.CheerioAPI, structuredData: any[], title: string): string {
    // Try Schema.org Organization name
    for (const schema of structuredData) {
      if (schema['@type'] === 'Organization' && schema.name) {
        return schema.name;
      }
      if (schema['@type'] === 'LocalBusiness' && schema.name) {
        return schema.name;
      }
    }
    
    // Try og:site_name
    const ogSiteName = $('meta[property="og:site_name"]').attr('content');
    if (ogSiteName) return ogSiteName;
    
    // Fallback to domain extraction
    const domain = new URL($('link[rel="canonical"]').attr('href') || '').hostname || '';
    if (domain) {
      return domain.replace('www.', '').split('.')[0];
    }
    
    // Last resort: first part of title
    return title.split(/[|-]/)[0].trim();
  }
  
  private static calculatePropositionalDensity(content: string): number {
    // Simplified propositional density calculation
    // Count factual markers vs fluff markers
    
    const factualMarkers = [
      /\d+/g, // Numbers
      /since \d{4}/gi, // Founded dates
      /\$[\d,]+/g, // Prices
      /\d+%/g, // Percentages
      /(monday|tuesday|wednesday|thursday|friday|saturday|sunday)/gi, // Specific times
      /(january|february|march|april|may|june|july|august|september|october|november|december)/gi,
      /\b(is|are|has|have|provides|offers|located|based)\b/gi // Factual verbs
    ];
    
    const fluffMarkers = [
      /\b(leading|innovative|cutting-edge|world-class|best-in-class|revolutionary|groundbreaking)\b/gi,
      /\b(amazing|incredible|outstanding|exceptional|superior|premium|elite)\b/gi,
      /\b(passionate|dedicated|committed|driven|focused)\b/gi
    ];
    
    let factualCount = 0;
    factualMarkers.forEach(regex => {
      const matches = content.match(regex);
      if (matches) factualCount += matches.length;
    });
    
    let fluffCount = 0;
    fluffMarkers.forEach(regex => {
      const matches = content.match(regex);
      if (matches) fluffCount += matches.length;
    });
    
    // Score 0-100 based on ratio
    const total = factualCount + fluffCount;
    if (total === 0) return 50; // Neutral if no markers found
    
    return Math.round((factualCount / total) * 100);
  }
}
