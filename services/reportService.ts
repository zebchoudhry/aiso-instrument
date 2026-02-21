import { jsPDF } from 'jspdf';
import type { AuditResponse, FixLibraryResponse, ClientTranslationResponse } from '../types';

export interface DiagnosticReport {
  id: string;
  generated: number;
  email: string;
  subject: string;
  audit: AuditResponse;
  pdfUrl?: string;
}

export interface WhiteLabelConfig {
  companyName: string;
  logoUrl?: string;
  primaryColor?: string;
}

export class ReportService {
  /**
   * Generates a diagnostic report from audit results
   * @param audit - The completed audit response
   * @param email - Recipient email address
   * @returns Structured report object
   */
  static generateReport(audit: AuditResponse, email: string): DiagnosticReport {
    const subjectName = audit.summary?.subjectName || 'Unknown Entity';
    const score = audit.summary?.scores?.overallMaturityIndex || 0;
    
    return {
      id: `report-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      generated: Date.now(),
      email,
      subject: `AI Visibility Audit: ${subjectName} (Score: ${score}/100)`,
      audit
    };
  }

  /**
   * Formats report for email delivery
   * @param report - The diagnostic report
   * @returns Formatted email content
   */
  static formatForEmail(report: DiagnosticReport): string {
    const audit = report.audit;
    const summary = audit.summary;
    
    return `
AI Visibility Diagnostic Report
━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Entity: ${summary?.subjectName}
URL: ${summary?.url}
Generated: ${new Date(report.generated).toLocaleString()}

TIER-1 VERDICT
${summary?.tier1Verdict}

AI READINESS SCORE: ${summary?.scores?.overallMaturityIndex}/100

BREAKDOWN:
• Entity Clarity: ${summary?.readinessScore?.breakdown?.entity_clarity?.score}/100
• Structural Signals: ${summary?.readinessScore?.breakdown?.structural_signals?.score}/100
• Compressibility: ${summary?.readinessScore?.breakdown?.compressibility?.score}/100
• Corroboration: ${summary?.readinessScore?.breakdown?.corroboration?.score}/100

KEY FINDINGS:
${audit.keyFindings?.map((f, i) => `${i + 1}. ${f.label} (${f.confidence}% confidence)`).join('\n') || 'No findings available'}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━
AISO Engine - Clinical AI Visibility Diagnostic
    `.trim();
  }

  /**
   * Generates a summary for quick display
   * @param report - The diagnostic report
   * @returns Summary object
   */
  static generateSummary(report: DiagnosticReport) {
    const audit = report.audit;
    const summary = audit.summary;
    
    return {
      entityName: summary?.subjectName,
      overallScore: summary?.scores?.overallMaturityIndex,
      verdict: summary?.tier1Verdict,
      findingsCount: audit.keyFindings?.length || 0,
      criticalIssues: audit.keyFindings?.filter(f => f.confidence > 80).length || 0,
      timestamp: report.generated
    };
  }

  /**
   * Generates a PDF report from audit results
   */
  static generatePdf(
    audit: AuditResponse,
    fixLibrary?: FixLibraryResponse | null,
    clientBriefing?: ClientTranslationResponse | null,
    config?: WhiteLabelConfig | null,
    verifications?: Array<{ query: string; result: string | null; pastedResponse?: string }> | null
  ): Blob {
    const doc = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4' });
    let y = 20;

    const brandName = config?.companyName ?? 'AISO Instrument';
    const summary = audit.summary;
    const score = summary?.scores?.overallMaturityIndex ?? summary?.readinessScore?.internal_ai_readiness_score ?? 0;
    const subject = summary?.subjectName ?? summary?.url ?? 'N/A';

    const addText = (text: string, fontSize = 10) => {
      doc.setFontSize(fontSize);
      const lines = doc.splitTextToSize(text, 180);
      lines.forEach((line: string) => {
        if (y > 270) { doc.addPage(); y = 20; }
        doc.text(line, 20, y);
        y += fontSize * 0.5;
      });
      y += 4;
    };

    // Board-ready first page
    doc.setFontSize(22);
    doc.text('AI Visibility Report', 20, y);
    y += 8;

    doc.setFontSize(11);
    const verdict = summary?.tier1Verdict ?? '';
    const isLow = score < 40 || verdict.includes('LOW');
    const isPartial = (score >= 40 && score < 60) || verdict.includes('DEVELOPING');
    const plainVerdict = isLow ? 'invisible' : isPartial ? 'partially visible' : 'visible';
    addText(`Plain-language verdict: ${subject} is ${plainVerdict} to AI search.`, 12);
    y += 2;

    const whyMatters = isLow
      ? 'When people ask ChatGPT or Perplexity about your space, they get short answers with 2–3 cited links. If you\'re not in that list, you\'re invisible for that search.'
      : isPartial
        ? 'AI answers often cite 2–3 sources. If you\'re partially visible, you may appear sometimes but won\'t be a primary reference.'
        : 'Key signals are in place. Keep them strong to maintain visibility in AI answers.';
    addText('Why this matters: ' + whyMatters);
    y += 4;

    addText('Your top actions:', 11);
    const fixes = Array.isArray(fixLibrary?.fixes) ? fixLibrary.fixes : [];
    fixes.slice(0, 3).forEach((f: { findingLabel?: string; fix?: string }, i: number) => {
      addText(`${i + 1}. ${f.findingLabel ?? 'Action'}: ${(f.fix ?? '').slice(0, 80)}`);
    });
    y += 4;

    const expectedAfter = isLow ? 'visible or partially visible' : 'stronger visibility and more consistent citations';
    addText(`What will change: Before (now): ${verdict || 'diagnostic'}. Score: ${score}. After (if you complete the plan): ${expectedAfter}. Verify with Re-audit and query re-test.`);
    y += 8;

    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    doc.text(`Generated: ${new Date().toLocaleString()} • ${brandName}`, 20, y);
    doc.setTextColor(0, 0, 0);
    y += 14;

    addText(`Subject: ${subject}`, 12);
    addText(`URL: ${summary?.url ?? 'N/A'}`);
    addText(`Verdict: ${verdict || 'N/A'}`, 12);
    addText(`AI Readiness Score: ${score}/100`, 12);
    y += 4;

    if (summary?.readinessScore?.breakdown) {
      addText('Breakdown:', 11);
      const b = summary.readinessScore.breakdown;
      addText(`  Entity Clarity: ${b.entity_clarity?.score ?? 0}/100`);
      addText(`  Structural Signals: ${b.structural_signals?.score ?? 0}/100`);
      addText(`  Compressibility: ${b.compressibility?.score ?? 0}/100`);
      addText(`  Corroboration: ${b.corroboration?.score ?? 0}/100`);
      y += 4;
    }

    if (clientBriefing?.summary) {
      addText('Executive Summary:', 11);
      addText(clientBriefing.summary);
      y += 4;
    }

    if (audit.keyFindings?.length) {
      addText('Key Findings:', 11);
      audit.keyFindings.forEach((f, i) => {
        addText(`${i + 1}. ${f.label} (${f.confidence}% confidence)`);
      });
      y += 4;
    }

    if (fixes.length) {
      addText('Action Items:', 11);
      fixes.slice(0, 6).forEach((f: { findingLabel?: string; fix?: string; priority?: number }, i: number) => {
        const priority = f.priority ? ` [P${f.priority}]` : '';
        addText(`${i + 1}. ${f.findingLabel ?? 'Fix'}${priority}: ${(f.fix ?? '').slice(0, 120)}`);
      });
    }

    if (clientBriefing?.nextSteps?.length) {
      y += 4;
      addText('Next Steps:', 11);
      clientBriefing.nextSteps.slice(0, 4).forEach((s: string, i: number) => {
        addText(`${i + 1}. ${s}`);
      });
    }

    const verif = (verifications ?? []).filter((v) => v.result || v.pastedResponse);
    if (verif.length) {
      y += 4;
      addText('Query Verification:', 11);
      const cited = verif.filter((v) => v.result === 'cited').length;
      addText(`Cited: ${cited} | Mentioned: ${verif.filter((v) => v.result === 'mentioned').length} | Not found: ${verif.filter((v) => v.result === 'not_found').length}`);
      verif.slice(0, 5).forEach((v, i) => {
        addText(`  ${i + 1}. "${v.query}" → ${v.result ?? '-'}`);
      });
    }

    doc.setFontSize(8);
    doc.setTextColor(120, 120, 120);
    doc.text(`${brandName} - AI Visibility Diagnostic`, 20, 285);

    return doc.output('blob');
  }
}
