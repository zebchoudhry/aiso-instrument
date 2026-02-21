import React, { useState, useEffect } from 'react';
import PasteHtmlForm from './PasteHtmlForm';

export type AuditInputMode = 'url' | 'paste';

interface AuditFormProps {
  onAudit: (url: string, name: string, email: string) => void;
  onAuditFromHtml: (html: string, url: string, name: string, email: string) => void;
  isLoading: boolean;
  showPasteFallback?: boolean;
}

const AuditForm: React.FC<AuditFormProps> = ({
  onAudit,
  onAuditFromHtml,
  isLoading,
  showPasteFallback = false,
}) => {
  const [mode, setMode] = useState<'url' | 'paste'>(showPasteFallback ? 'paste' : 'url');

  useEffect(() => {
    if (showPasteFallback) setMode('paste');
  }, [showPasteFallback]);
  const [url, setUrl] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (url && name && email) onAudit(url, name, email);
  };

  return (
    <div className="space-y-6">
      <div className="flex gap-2 p-1 bg-slate-100 rounded-xl">
        <button
          type="button"
          onClick={() => setMode('url')}
          className={`flex-1 py-3 px-4 rounded-lg text-sm font-bold uppercase tracking-wider transition-all ${
            mode === 'url'
              ? 'bg-white text-indigo-600 shadow-sm'
              : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
          }`}
        >
          Enter URL
        </button>
        <button
          type="button"
          onClick={() => setMode('paste')}
          className={`flex-1 py-3 px-4 rounded-lg text-sm font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-2 ${
            mode === 'paste'
              ? 'bg-white text-indigo-600 shadow-sm'
              : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
          }`}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/></svg>
          Paste HTML
        </button>
      </div>

      {mode === 'paste' ? (
        <PasteHtmlForm onAuditFromHtml={onAuditFromHtml} isLoading={isLoading} />
      ) : (
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-6">
            <div className="space-y-2">
              <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest">
                Business / Brand Name
              </label>
          <input 
            type="text" 
            required 
            placeholder="e.g. Fozias" 
            className="w-full px-5 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all text-sm shadow-inner"
            value={name}
            onChange={e => setName(e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest">
            Target Website URL
          </label>
          <input 
            type="url" 
            required 
            placeholder="e.g. https://www.yourclient.com" 
            className="w-full px-5 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all text-sm shadow-inner"
            value={url}
            onChange={e => setUrl(e.target.value)}
          />
          <p className="text-xs text-slate-500">
            Getting 403 or blocked? Use <button type="button" onClick={() => setMode('paste')} className="text-indigo-600 font-bold hover:underline">Paste HTML</button> instead.
          </p>
        </div>
        
        <div className="space-y-2">
          <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest">
            Recipient Email (For Diagnostic Report)
          </label>
          <input 
            type="email" 
            required 
            placeholder="e.g. auditor@business.com" 
            className="w-full px-5 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all text-sm shadow-inner"
            value={email}
            onChange={e => setEmail(e.target.value)}
          />
        </div>
      </div>

      <div className="pt-2">
        <button
          type="submit"
          disabled={isLoading || !url || !name || !email}
          className={`w-full py-4 rounded-xl font-black text-xs text-white uppercase tracking-[0.3em] shadow-lg transition-all active:scale-95 ${
            isLoading || !url || !name || !email
              ? "bg-slate-400 cursor-not-allowed" 
              : "bg-indigo-600 hover:bg-indigo-700"
          }`}
        >
          {isLoading ? "Running Diagnostic..." : "Initiate Professional Audit"}
        </button>
        <p className="mt-4 text-[9px] text-slate-400 font-bold uppercase tracking-widest text-center">
          * Standard Entity Audit mode active. Clinical boundaries enforced.
        </p>
      </div>
        </form>
      )}
    </div>
  );
};

export default AuditForm;
