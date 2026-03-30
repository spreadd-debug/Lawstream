import React, { createContext, useContext, useEffect, useState } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from './supabase';
import { UserProfile } from '../types';

interface AuthState {
  session: Session | null;
  user: User | null;
  profile: UserProfile | null;
  isLoading: boolean;
}

interface AuthContextType extends AuthState {
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signUp: (email: string, password: string, fullName: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const toProfile = (row: any): UserProfile => ({
  id: row.id,
  fullName: row.full_name,
  email: row.email,
  role: row.role,
  initials: row.initials,
  isActive: row.is_active,
});

async function fetchProfile(userId: string): Promise<UserProfile | null> {
  try {
    const result = await Promise.race([
      supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single(),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Timeout cargando profile')), 8000)
      ),
    ]);

    const { data, error } = result as {
      data: any;
      error: any;
    };

    if (error || !data) {
      console.error('fetchProfile error:', error);
      return null;
    }

    return toProfile(data);
  } catch (err) {
    console.error('fetchProfile excepción:', err);
    return null;
  }
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, setState] = useState<AuthState>({
    session: null,
    user: null,
    profile: null,
    isLoading: true,
  });

  useEffect(() => {
    let mounted = true;

    const safeSetState = (next: AuthState) => {
      if (!mounted) return;
      setState(next);
    };

    const applySession = async (session: Session | null) => {
      try {
        // Primero destrabamos la app rápido
        safeSetState({
          session,
          user: session?.user ?? null,
          profile: null,
          isLoading: false,
        });

        // Después intentamos cargar profile, pero sin bloquear toda la app
        if (session?.user) {
          const profile = await fetchProfile(session.user.id);

          if (!mounted) return;

          setState(prev => ({
            ...prev,
            session,
            user: session.user,
            profile,
            isLoading: false,
          }));
        }
      } catch (err) {
        console.error('Error applying session:', err);

        safeSetState({
          session,
          user: session?.user ?? null,
          profile: null,
          isLoading: false,
        });
      }
    };

    const init = async () => {
      try {
        const { data, error } = await supabase.auth.getSession();

        if (error) {
          console.error('getSession error:', error);
          safeSetState({
            session: null,
            user: null,
            profile: null,
            isLoading: false,
          });
          return;
        }

        await applySession(data.session ?? null);
      } catch (err) {
        console.error('Error initializing auth:', err);

        safeSetState({
          session: null,
          user: null,
          profile: null,
          isLoading: false,
        });
      }
    };

    void init();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('onAuthStateChange:', event);

      // Importante: no hacer await directo acá con otras calls de Supabase
      window.setTimeout(() => {
        void applySession(session ?? null);
      }, 0);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      return { error: error?.message ?? null };
    } catch (err) {
      console.error('signIn error:', err);
      return {
        error: err instanceof Error ? err.message : 'No se pudo iniciar sesión.',
      };
    }
  };

  const signUp = async (email: string, password: string, fullName: string) => {
    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { full_name: fullName } },
      });

      return { error: error?.message ?? null };
    } catch (err) {
      console.error('signUp error:', err);
      return {
        error: err instanceof Error ? err.message : 'No se pudo crear la cuenta.',
      };
    }
  };

  const signOut = async () => {
    try {
      await supabase.auth.signOut();

      setState({
        session: null,
        user: null,
        profile: null,
        isLoading: false,
      });
    } catch (err) {
      console.error('signOut error:', err);
    }
  };

  const refreshProfile = async () => {
    try {
      if (!state.user) return;

      const profile = await fetchProfile(state.user.id);

      setState(prev => ({
        ...prev,
        profile,
      }));
    } catch (err) {
      console.error('refreshProfile error:', err);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        ...state,
        signIn,
        signUp,
        signOut,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth debe usarse dentro de AuthProvider');
  return context;
};