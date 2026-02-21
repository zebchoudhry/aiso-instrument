import React, { useState } from 'react';

interface LoginProps {
  onSignIn: (email: string, password: string) => Promise<void>;
  onSignUp: (email: string, password: string) => Promise<void>;
}

export default function Login({ onSignIn, onSignUp }: LoginProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (mode === 'signin') {
        await onSignIn(email, password);
      } else {
        await onSignUp(email, password);
      }
    } catch (err: any) {
      setError(err?.message ?? 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[40vh] flex items-center justify-center">
      <form onSubmit={handleSubmit} className="w-full max-w-sm space-y-4">
        <h2 className="text-lg font-black uppercase tracking-widest text-slate-900">
          {mode === 'signin' ? 'Sign In' : 'Sign Up'}
        </h2>
        {error && (
          <div className="bg-red-50 border border-red-200 p-3 rounded-lg text-sm text-red-700">
            {error}
          </div>
        )}
        <input
          type="email"
          placeholder="Email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm"
        />
        <input
          type="password"
          placeholder="Password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm"
        />
        <button
          type="submit"
          disabled={loading}
          className="w-full py-3 bg-indigo-600 text-white rounded-xl font-black text-xs uppercase tracking-widest disabled:opacity-50"
        >
          {loading ? 'Please wait...' : mode === 'signin' ? 'Sign In' : 'Sign Up'}
        </button>
        <button
          type="button"
          onClick={() => { setMode(mode === 'signin' ? 'signup' : 'signin'); setError(''); }}
          className="w-full text-[10px] text-slate-500 hover:text-indigo-600"
        >
          {mode === 'signin' ? 'Need an account? Sign up' : 'Have an account? Sign in'}
        </button>
      </form>
    </div>
  );
}
