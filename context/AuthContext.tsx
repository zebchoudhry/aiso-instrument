import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';

interface User {
  id: string;
  email?: string;
  role?: string;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  isConfigured: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

async function fetchUserRole(id: string, email?: string | null): Promise<string | undefined> {
  try {
    const params = new URLSearchParams({ id });
    if (email) params.set('email', email);
    const res = await fetch(`/api/users?${params.toString()}`);
    if (!res.ok) return undefined;
    const data = await res.json();
    return data?.user?.role;
  } catch {
    return undefined;
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const isConfigured = !!supabase;

  useEffect(() => {
    if (!supabase) {
      setLoading(false);
      return;
    }

    supabase.auth.getSession().then(async ({ data: { session } }) => {
      const sessionUser = session?.user;
      if (sessionUser) {
        const baseUser: User = { id: sessionUser.id, email: sessionUser.email ?? undefined };
        let role: string | undefined;
        try {
          role = await fetchUserRole(sessionUser.id, sessionUser.email);
        } catch {
          role = undefined;
        }
        setUser({ ...baseUser, role });
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      const sessionUser = session?.user;
      if (sessionUser) {
        const baseUser: User = { id: sessionUser.id, email: sessionUser.email ?? undefined };
        const role = await fetchUserRole(sessionUser.id, sessionUser.email);
        setUser({ ...baseUser, role });
      } else {
        setUser(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    if (!supabase) throw new Error('Auth not configured');
    await supabase.auth.signInWithPassword({ email, password });
  };

  const signUp = async (email: string, password: string) => {
    if (!supabase) throw new Error('Auth not configured');
    await supabase.auth.signUp({ email, password });
  };

  const signOut = async () => {
    if (supabase) await supabase.auth.signOut();
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, signIn, signUp, signOut, isConfigured }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  return ctx;
}
