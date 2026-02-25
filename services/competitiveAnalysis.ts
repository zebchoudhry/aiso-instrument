// services/competitiveAnalysis.ts
// Real side-by-side competitive analysis

import { ExtractionService, ExtractedSignals } from './extractionService.js';

export interface CompetitiveGap {
  category: string;
  yourScore: number;
  competitorScore: number;
  gap: number;
  impact: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  recommendation: string;
}

export interface CompetitiveAnalysis {
  yourDomain: string;
  competitorDomain: string;
  overallScoreYou: number;
  overallScoreCompetitor: number;
  winner: string;
  gaps: CompetitiveGap[];
  schemaComparison: {
    yourSchemas: string[];
    theirSchemas: string[];
    youHave: string[];
    theyHave: string[];
    youMissing: string[];
  };
  contentComparison: {
    yourWordCount: number;
    theirWordCount: number;
    yourPropositionalDensity: number;
    theirPropositionalDensity: number;
    winner: string;
  };
  citationComparison: {
    yourCitations: number;
    theirCitations: number;
    winner: string;
  };
}

export class CompetitiveAnalysisService {
  
  static async compareWebsites(
    yourUrl: string,
    competitorUrl: string
  ): Promise<CompetitiveAnalysis> {
    
    // Extract signals from both sites
    const yourSignals = await ExtractionService.extractSignals(yourUrl);
    const theirSignals = await ExtractionService.extractSignals(competitorUrl);
    
    // Calculate scores
    const yourScore = this.calculateOverallScore(yourSignals);
    const theirScore = this.calculateOverallScore(theirSignals);
    
    // Identify gaps
    const gaps = this.identifyGaps(yourSignals, theirSignals);
    
    // Schema comparison
    const schemaComparison = this.compareSchemas(yourSignals, theirSignals);
    
    // Content comparison
    const contentComparison = {
      yourWordCount: yourSignals.wordCount,
      theirWordCount: theirSignals.wordCount,
      yourPropositionalDensity: yourSignals.propositionalDensity,
      theirPropositionalDensity: theirSignals.propositionalDensity,
      winner: yourSignals.propositionalDensity > theirSignals.propositionalDensity ? yourUrl : competitorUrl
    };
    
    // Citation comparison
    const citationComparison = {
      yourCitations: yourSignals.citationAnchors.length,
      theirCitations: theirSignals.citationAnchors.length,
      winner: yourSignals.citationAnchors.length > theirSignals.citationAnchors.length ? yourUrl : competitorUrl
    };
    
    return {
      yourDomain: yourUrl,
      competitorDomain: competitorUrl,
      overallScoreYou: yourScore,
      overallScoreCompetitor: theirScore,
      winner: yourScore > theirScore ? yourUrl : competitorUrl,
      gaps,
      schemaComparison,
      contentComparison,
      citationComparison
    };
  }
  
  private static calculateOverallScore(signals: ExtractedSignals): number {
    let score = 0;
    
    // Schema markup (30 points)
    if (signals.schemaMarkup.length > 0) score += 10;
    if (signals.schemaMarkup.length > 2) score += 10;
    if (signals.schemaMarkup.length > 5) score += 10;
    
    // Content quality (30 points)
    if (signals.wordCount > 500) score += 10;
    if (signals.wordCount > 1500) score += 10;
    if (signals.propositionalDensity > 60) score += 10;
    
    // Metadata (20 points)
    if (signals.title) score += 10;
    if (signals.metaDescription) score += 10;
    
    // Citations (20 points)
    if (signals.citationAnchors.length > 0) score += 5;
    if (signals.citationAnchors.length > 2) score += 5;
    if (signals.citationAnchors.length > 5) score += 10;
    
    return Math.min(score, 100);
  }
  
  private static identifyGaps(
    yourSignals: ExtractedSignals,
    theirSignals: ExtractedSignals
  ): CompetitiveGap[] {
    const gaps: CompetitiveGap[] = [];
    
    // Schema gap
    const schemaGap = theirSignals.schemaMarkup.length - yourSignals.schemaMarkup.length;
    if (schemaGap > 0) {
      gaps.push({
        category: 'Schema Markup',
        yourScore: yourSignals.schemaMarkup.length,
        competitorScore: theirSignals.schemaMarkup.length,
        gap: schemaGap,
        impact: schemaGap > 3 ? 'CRITICAL' : schemaGap > 1 ? 'HIGH' : 'MEDIUM',
        recommendation: `Add ${schemaGap} more Schema.org markup blocks. Competitor has ${theirSignals.schemaMarkup.length}, you have ${yourSignals.schemaMarkup.length}.`
      });
    }
    
    // Content volume gap
    const wordCountGap = theirSignals.wordCount - yourSignals.wordCount;
    if (wordCountGap > 500) {
      gaps.push({
        category: 'Content Volume',
        yourScore: yourSignals.wordCount,
        competitorScore: theirSignals.wordCount,
        gap: wordCountGap,
        impact: wordCountGap > 2000 ? 'CRITICAL' : wordCountGap > 1000 ? 'HIGH' : 'MEDIUM',
        recommendation: `Add ~${Math.round(wordCountGap / 100) * 100} words of factual content. Competitor has ${theirSignals.wordCount} words, you have ${yourSignals.wordCount}.`
      });
    }
    
    // Propositional density gap
    const densityGap = theirSignals.propositionalDensity - yourSignals.propositionalDensity;
    if (densityGap > 10) {
      gaps.push({
        category: 'Propositional Density',
        yourScore: yourSignals.propositionalDensity,
        competitorScore: theirSignals.propositionalDensity,
        gap: densityGap,
        impact: densityGap > 30 ? 'CRITICAL' : densityGap > 20 ? 'HIGH' : 'MEDIUM',
        recommendation: `Replace marketing language with factual statements. Competitor has ${theirSignals.propositionalDensity}% factual density, you have ${yourSignals.propositionalDensity}%.`
      });
    }
    
    // Citation gap
    const citationGap = theirSignals.citationAnchors.length - yourSignals.citationAnchors.length;
    if (citationGap > 0) {
      gaps.push({
        category: 'Citation Network',
        yourScore: yourSignals.citationAnchors.length,
        competitorScore: theirSignals.citationAnchors.length,
        gap: citationGap,
        impact: citationGap > 5 ? 'HIGH' : citationGap > 2 ? 'MEDIUM' : 'LOW',
        recommendation: `Add ${citationGap} social/citation links. Competitor has ${theirSignals.citationAnchors.length} sameAs anchors, you have ${yourSignals.citationAnchors.length}.`
      });
    }
    
    // Metadata gap
    if (theirSignals.metaDescription && !yourSignals.metaDescription) {
      gaps.push({
        category: 'Meta Description',
        yourScore: 0,
        competitorScore: 100,
        gap: 100,
        impact: 'HIGH',
        recommendation: 'Add a meta description. Competitor has one, you don\'t. Critical for AI summarization.'
      });
    }
    
    return gaps.sort((a, b) => {
      const impactWeight = { CRITICAL: 4, HIGH: 3, MEDIUM: 2, LOW: 1 };
      return impactWeight[b.impact] - impactWeight[a.impact];
    });
  }
  
  private static compareSchemas(
    yourSignals: ExtractedSignals,
    theirSignals: ExtractedSignals
  ): {
    yourSchemas: string[];
    theirSchemas: string[];
    youHave: string[];
    theyHave: string[];
    youMissing: string[];
  } {
    const yourTypes = yourSignals.structuredData.map(s => s['@type']).filter(Boolean);
    const theirTypes = theirSignals.structuredData.map(s => s['@type']).filter(Boolean);
    
    const youHave = yourTypes.filter(t => !theirTypes.includes(t));
    const theyHave = theirTypes.filter(t => !yourTypes.includes(t));
    const youMissing = theyHave; // What they have that you don't
    
    return {
      yourSchemas: yourTypes,
      theirSchemas: theirTypes,
      youHave,
      theyHave,
      youMissing
    };
  }
  
  static generateCompetitiveReport(analysis: CompetitiveAnalysis): string {
    return `
# Competitive Analysis Report

## 📊 Overall Score

| Metric | You | Competitor | Winner |
|--------|-----|------------|--------|
| **Overall Score** | ${analysis.overallScoreYou}/100 | ${analysis.overallScoreCompetitor}/100 | **${analysis.winner}** |

${analysis.overallScoreYou < analysis.overallScoreCompetitor ? '⚠️ **You are behind by ' + (analysis.overallScoreCompetitor - analysis.overallScoreYou) + ' points**' : '✅ **You are ahead by ' + (analysis.overallScoreYou - analysis.overallScoreCompetitor) + ' points**'}

---

## 🎯 Critical Gaps (Priority Order)

${analysis.gaps.map((gap, i) => `
### ${i + 1}. ${gap.category} (${gap.impact} IMPACT)

- **Your Score:** ${gap.yourScore}
- **Competitor Score:** ${gap.competitorScore}
- **Gap:** ${gap.gap}
- **Action:** ${gap.recommendation}
`).join('\n')}

---

## 📋 Schema Comparison

### You Have (${analysis.schemaComparison.yourSchemas.length} schemas):
${analysis.schemaComparison.yourSchemas.join(', ') || 'None'}

### Competitor Has (${analysis.schemaComparison.theirSchemas.length} schemas):
${analysis.schemaComparison.theirSchemas.join(', ') || 'None'}

### ⚠️ You're Missing:
${analysis.schemaComparison.youMissing.length > 0 ? analysis.schemaComparison.youMissing.map(s => `- ${s}`).join('\n') : 'None - you have feature parity'}

---

## 📝 Content Analysis

| Metric | You | Competitor | Winner |
|--------|-----|------------|--------|
| Word Count | ${analysis.contentComparison.yourWordCount} | ${analysis.contentComparison.theirWordCount} | ${analysis.contentComparison.yourWordCount > analysis.contentComparison.theirWordCount ? '✅ You' : '⚠️ Them'} |
| Propositional Density | ${analysis.contentComparison.yourPropositionalDensity}% | ${analysis.contentComparison.theirPropositionalDensity}% | ${analysis.contentComparison.yourPropositionalDensity > analysis.contentComparison.theirPropositionalDensity ? '✅ You' : '⚠️ Them'} |

---

## 🔗 Citation Network

| Metric | You | Competitor |
|--------|-----|------------|
| Social/Citation Links | ${analysis.citationComparison.yourCitations} | ${analysis.citationComparison.theirCitations} |

${analysis.citationComparison.yourCitations < analysis.citationComparison.theirCitations ? '⚠️ **Add ' + (analysis.citationComparison.theirCitations - analysis.citationComparison.yourCitations) + ' more citation links to match competitor**' : '✅ **You have citation parity**'}

---

## 🎯 Next Steps (Priority Order)

${analysis.gaps.slice(0, 3).map((gap, i) => `${i + 1}. **${gap.category}:** ${gap.recommendation}`).join('\n')}
`;
  }
}
