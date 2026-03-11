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
    <div className="space-y-8">
      <div className="space-y-3">
        <p className="text-[10px] font-black uppercase tracking-[0.35em] text-indigo-600">
          Run Your Visibility Audit
        </p>
        <h2 className="text-2xl font-black uppercase tracking-tight text-slate-900">
          Diagnose how AI sees your brand
        </h2>
        <p className="max-w-2xl text-sm text-slate-600">
          Enter your website to uncover where AI systems trust you, where they skip you, and what to fix first.
        </p>
      </div>

      <div className="flex gap-2 rounded-2xl border border-slate-200 bg-slate-100/90 p-1.5">
        <button
          type="button"
          onClick={() => setMode('url')}
          className={`flex-1 rounded-xl px-4 py-3 text-sm font-bold uppercase tracking-wider transition-all ${
            mode === 'url'
              ? 'bg-slate-950 text-white shadow-sm'
              : 'text-slate-600 hover:bg-white/70 hover:text-slate-900'
          }`}
        >
          Enter URL
        </button>
        <button
          type="button"
          onClick={() => setMode('paste')}
          className={`flex flex-1 items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-bold uppercase tracking-wider transition-all ${
            mode === 'paste'
              ? 'bg-slate-950 text-white shadow-sm'
              : 'text-slate-600 hover:bg-white/70 hover:text-slate-900'
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
              <label className="block text-[10px] font-black text-slate-600 uppercase tracking-widest">
                Business / Brand Name
              </label>
          <input 
            type="text" 
            required 
            placeholder="e.g. Fozias" 
            className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-5 py-4 text-sm text-slate-900 outline-none transition-all placeholder:text-slate-400 focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-100"
            value={name}
            onChange={e => setName(e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <label className="block text-[10px] font-black text-slate-600 uppercase tracking-widest">
            Target Website URL
          </label>
          <input 
            type="url" 
            required 
            placeholder="e.g. https://www.yourclient.com" 
            className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-5 py-4 text-sm text-slate-900 outline-none transition-all placeholder:text-slate-400 focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-100"
            value={url}
            onChange={e => setUrl(e.target.value)}
          />
          <p className="text-xs text-slate-500">
            Getting 403 or blocked? Use <button type="button" onClick={() => setMode('paste')} className="text-indigo-600 font-bold hover:underline">Paste HTML</button> instead.
          </p>
        </div>
        
        <div className="space-y-2">
          <label className="block text-[10px] font-black text-slate-600 uppercase tracking-widest">
            Recipient Email
          </label>
          <input 
            type="email" 
            required 
            placeholder="e.g. auditor@business.com" 
            className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-5 py-4 text-sm text-slate-900 outline-none transition-all placeholder:text-slate-400 focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-100"
            value={email}
            onChange={e => setEmail(e.target.value)}
          />
        </div>
      </div>

      <div className="pt-2">
        <button
          type="submit"
          disabled={isLoading || !url || !name || !email}
          className={`w-full rounded-2xl py-4 font-black text-xs uppercase tracking-[0.32em] text-white shadow-[0_14px_30px_rgba(79,70,229,0.28)] transition-all active:scale-[0.99] ${
            isLoading || !url || !name || !email
              ? "cursor-not-allowed bg-slate-400" 
              : "bg-[linear-gradient(135deg,#4f46e5_0%,#6366f1_55%,#7c83ff_100%)] hover:brightness-105"
          }`}
        >
          {isLoading ? "Running Visibility Audit..." : "Analyze My Site"}
        </button>
        <p className="mt-4 text-center text-[10px] font-medium text-slate-500">
          You will get a clear diagnosis, prioritized fixes, and a roadmap you can verify.
        </p>
      </div>
        </form>
      )}
    </div>
  );
};

export default AuditForm;
