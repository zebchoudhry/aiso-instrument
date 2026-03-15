import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Login() {
  const navigate = useNavigate();
  const auth = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      if (!auth?.signIn) {
        setError('Auth not configured');
        return;
      }
      await auth.signIn(email.trim(), password);
      navigate('/admin', { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sign in failed');
    } finally {
      setSubmitting(false);
    }
  };

  if (!auth?.isConfigured) {
    return (
      <div className="min-h-screen bg-slate-50 p-6 flex items-center justify-center">
        <div className="rounded-2xl border border-slate-200 bg-white p-8 max-w-md w-full text-center">
          <p className="text-slate-600">Auth is not configured. You can go directly to Admin.</p>
          <Link to="/admin" className="mt-4 inline-block text-[10px] font-bold uppercase tracking-widest text-indigo-600 hover:text-indigo-700">
            Go to Admin
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 p-6 flex items-center justify-center">
      <div className="rounded-[2rem] border border-slate-200 bg-white p-8 shadow-sm max-w-md w-full">
        <Link
          to="/"
          className="text-[10px] font-bold uppercase tracking-widest text-indigo-600 hover:text-indigo-700"
        >
          Back to Audit
        </Link>
        <h1 className="mt-6 text-2xl font-black uppercase tracking-tight text-slate-900">
          Sign In
        </h1>
        <p className="mt-2 text-sm text-slate-500">
          Sign in to access the admin dashboard.
        </p>
        <form onSubmit={handleSubmit} className="mt-8 space-y-5">
          <div>
            <label className="mb-2 block text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              className="w-full rounded-xl border border-slate-200 px-4 py-3 text-slate-900"
            />
          </div>
          <div>
            <label className="mb-2 block text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
              className="w-full rounded-xl border border-slate-200 px-4 py-3 text-slate-900"
            />
          </div>
          {error && (
            <p className="text-sm text-rose-600">{error}</p>
          )}
          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-xl bg-indigo-600 px-4 py-3 text-[10px] font-black uppercase tracking-[0.2em] text-white hover:bg-indigo-500 disabled:bg-slate-300 disabled:cursor-not-allowed"
          >
            {submitting ? 'Signing in...' : 'Sign In'}
          </button>
        </form>
      </div>
    </div>
  );
}
