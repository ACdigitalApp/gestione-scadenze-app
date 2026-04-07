import { useState, useEffect, createContext, useContext, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

const ADMIN_EMAIL = 'acdigital.app@gmail.com';
const ADMIN_PASSWORD = 'acdigital2026';
const ADMIN_BYPASS_KEY = 'gs_admin_bypass';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signUp: (email: string, password: string, fullName?: string) => Promise<{ error: Error | null }>;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
}

export { supabase };

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check for local admin bypass session
    const bypassData = localStorage.getItem(ADMIN_BYPASS_KEY);
    if (bypassData) {
      try {
        const mockUser = JSON.parse(bypassData) as User;
        setUser(mockUser);
        setLoading(false);
      } catch {
        localStorage.removeItem(ADMIN_BYPASS_KEY);
      }
    }

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (session) {
          // Real Supabase session — clear any bypass
          localStorage.removeItem(ADMIN_BYPASS_KEY);
        }
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        localStorage.removeItem(ADMIN_BYPASS_KEY);
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
      } else if (!localStorage.getItem(ADMIN_BYPASS_KEY)) {
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const signUp = async (email: string, password: string, fullName?: string) => {
    const redirectUrl = `${window.location.origin}/`;
    
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
        data: {
          full_name: fullName,
          plan: 'free',
          tier: 'free'
        }
      }
    });
    return { error };
  };

  const signIn = async (email: string, password: string) => {
    if (email.toLowerCase() === ADMIN_EMAIL && password === ADMIN_PASSWORD) {
      // Try Supabase first
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (!error) return { error: null };
      // Supabase failed — use local bypass
      const mockUser = {
        id: 'admin-bypass-001',
        email: ADMIN_EMAIL,
        app_metadata: {},
        user_metadata: { full_name: 'Admin' },
        aud: 'authenticated',
        created_at: new Date().toISOString()
      } as User;
      localStorage.setItem(ADMIN_BYPASS_KEY, JSON.stringify(mockUser));
      setUser(mockUser);
      return { error: null };
    }
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error };
  };

  const signOut = async () => {
    localStorage.removeItem(ADMIN_BYPASS_KEY);
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, signUp, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
