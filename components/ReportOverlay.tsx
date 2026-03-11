
import React, { useState } from 'react';
import { DiagnosticReport } from '../types';
import { ReportService } from '../services/reportService';
import CitationIQLogo from './CitationIQLogo';
import { SectionIntro } from './VisualSystem';

interface ReportOverlayProps {
  report: DiagnosticReport | null;
  onClose: () => void;
}

const ReportOverlay: React.FC<ReportOverlayProps> = ({ report, onClose }) => {
  const [isDownloading, setIsDownloading] = useState(false);
  
  if (!report) return null;

  const handleDownload = async () => {
    setIsDownloading(true);
    try {
      await ReportService.downloadPDF(report);
    } catch (err) {
      console.error("PDF Generation Failed", err);
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-6 animate-in fade-in duration-300">
      <div className="bg-white w-full max-w-lg rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-500">
        <div className="bg-[radial-gradient(circle_at_top,rgba(99,102,241,0.28),transparent_32%),linear-gradient(180deg,#08112e_0%,#0b1537_60%,#0f172a_100%)] p-10 text-white">
          <div className="flex justify-between items-start mb-6">
            <CitationIQLogo theme="light" size="sm" />
            <button onClick={onClose} className="text-white/50 hover:text-white transition-colors">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M6 18L18 6M6 6l12 12"/></svg>
            </button>
          </div>
          <SectionIntro
            label={`Authority Snapshot ${report.reportId}`}
            title="Report delivered"
            description="Your report is ready to review, share, and download."
            invert
          />
        </div>

        <div className="p-10 space-y-8">
          <div className="space-y-4">
            <p className="text-sm text-slate-600 font-medium leading-relaxed">
              A professional AI Recommendation Diagnostic Report for <span className="font-black text-slate-900">{report.url}</span> has been generated and emailed to:
            </p>
            <div className="p-4 bg-slate-50 border border-slate-100 rounded-xl text-center">
              <span className="text-xs font-black text-indigo-600 uppercase tracking-widest">{report.email}</span>
            </div>
          </div>

          <div className="space-y-4">
            <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Available Actions</h4>
            <div className="grid grid-cols-1 gap-3">
              <button 
                onClick={handleDownload}
                disabled={isDownloading}
                className="flex items-center justify-center space-x-3 w-full py-4 bg-slate-900 text-white rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] hover:bg-black transition-all disabled:opacity-50"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M4 16v1a2 2 0 002 2h12a2 2 0 002-2v-1M7 10l5 5m0 0l5-5m-5 5V3"/></svg>
                <span>{isDownloading ? 'Generating...' : 'Download PDF Report'}</span>
              </button>
              <button onClick={onClose} className="w-full py-4 border-2 border-slate-100 text-slate-400 rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] hover:bg-slate-50 transition-all">
                Continue to Dashboard
              </button>
            </div>
          </div>

          <p className="text-[9px] text-center text-slate-400 font-bold uppercase tracking-widest italic">
            This report is a static, authoritative snapshot. No further action is required.
          </p>
        </div>
      </div>
    </div>
  );
};

export default ReportOverlay;
