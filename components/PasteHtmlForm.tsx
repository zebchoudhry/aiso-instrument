import React, { useState } from 'react';

interface PasteHtmlFormProps {
  onAuditFromHtml: (html: string, url: string, name: string, email: string) => void;
  isLoading: boolean;
}

const PasteHtmlForm: React.FC<PasteHtmlFormProps> = ({ onAuditFromHtml, isLoading }) => {
  const [html, setHtml] = useState('');
  const [url, setUrl] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (html && name && email) {
      onAuditFromHtml(html, url || 'https://example.com', name, email);
    }
  };

  return (
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
            onChange={(e) => setName(e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest">
            Page URL (optional, for context)
          </label>
          <input
            type="url"
            placeholder="e.g. https://www.yourclient.com/about"
            className="w-full px-5 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all text-sm shadow-inner"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest">
            Paste Page HTML
          </label>
          <textarea
            required
            placeholder="Paste the full HTML source of the page (right-click → View Page Source → Copy all)"
            rows={8}
            className="w-full px-5 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all text-sm shadow-inner font-mono text-xs"
            value={html}
            onChange={(e) => setHtml(e.target.value)}
          />
          <p className="text-[9px] text-slate-400">
            On your site: right-click → View Page Source → Ctrl+A → Ctrl+C, then paste above.
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
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
      </div>

      <div className="pt-2">
        <button
          type="submit"
          disabled={isLoading || !html || !name || !email}
          className={`w-full py-4 rounded-xl font-black text-xs text-white uppercase tracking-[0.3em] shadow-lg transition-all active:scale-95 ${
            isLoading || !html || !name || !email ? 'bg-slate-400 cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-700'
          }`}
        >
          {isLoading ? 'Running Diagnostic...' : 'Analyze Pasted HTML'}
        </button>
        <p className="mt-4 text-[9px] text-slate-400 font-bold uppercase tracking-widest text-center">
          * Use when our server cannot reach your URL directly.
        </p>
      </div>
    </form>
  );
};

export default PasteHtmlForm;
