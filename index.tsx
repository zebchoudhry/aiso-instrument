import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import './index.css';
import App from './App.tsx';
import Admin from './pages/Admin.tsx';
import Methodology from './pages/Methodology.tsx';
import Report from './pages/Report.tsx';
import Terms from './pages/Terms.tsx';
import Privacy from './pages/Privacy.tsx';
import Roadmap from './pages/Roadmap.tsx';
import Trends from './pages/Trends.tsx';
import { AuthProvider, useAuth } from './context/AuthContext.tsx';

function RequireAdmin({ children }: { children: React.ReactElement }) {
  const auth = useAuth();
  if (!auth?.isConfigured) return children;
  if (auth.loading) return <div className="min-h-screen bg-slate-50 p-8 text-center">Loading...</div>;
  if (!auth.user) return <Navigate to="/" replace />;
  const role = (auth.user as { role?: string }).role;
  if (role !== 'admin' && role !== 'auditor') return <Navigate to="/" replace />;
  return children;
}

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<App />} />
          <Route
            path="/admin"
            element={
              <RequireAdmin>
                <Admin />
              </RequireAdmin>
            }
          />
          <Route path="/methodology" element={<Methodology />} />
          <Route path="/report/:id" element={<Report />} />
          <Route path="/terms" element={<Terms />} />
          <Route path="/privacy" element={<Privacy />} />
          <Route path="/roadmap" element={<Roadmap />} />
          <Route path="/roadmap/:auditId" element={<Roadmap />} />
          <Route path="/trends" element={<Trends />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  </React.StrictMode>
);