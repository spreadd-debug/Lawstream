import React, { createContext, useContext, useEffect, useState } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from './supabase';
import { UserProfile } from '../types';
import { logAudit } from './db';

interface AuthState {
  session: Session | null;
  user: User | null;
  profile: UserProfile | null;
  isSuperAdmin: boolean;
  isLoading: boolean;
  mustChangePassword: boolean;
}

interface AuthContextType extends AuthState {
  signIn: (email: string, password: string, rememberMe?: boolean) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ error: string | null }>;
  updatePassword: (newPassword: string) => Promise<{ error: string | null }>;
  clearMustChangePassword: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const toProfile = (row: any): UserProfile => ({
  id: row.id,
  fullName: row.full_name,
  email: row.email,
  role: row.role,
  initials: row.initials,
  isActive: row.is_active,
  mustChangePassword: row.must_change_password ?? false,
});

const emptyState: AuthState = {
  session: null,
  user: null,
  profile: null,
  isSuperAdmin: false,
  isLoading: false,
  mustChangePassword: false,
};

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
      return null;
    }

    return toProfile(data);
  } catch (err) {
    console.error('fetchProfile excepción:', err);
    return null;
  }
}

async function checkSuperAdmin(): Promise<boolean> {
  try {
    const { data, error } = await supabase.rpc('is_super_admin');
    if (error) {
      console.error('is_super_admin error:', error);
      return false;
    }
    return data === true;
  } catch (err) {
    console.error('checkSuperAdmin excepción:', err);
    return false;
  }
}

const BLOCKED_FIRM_STATUSES = new Set(['suspended', 'inactive']);

async function checkFirmStatus(): Promise<{ ok: boolean; status: string | null }> {
  try {
    const { data, error } = await supabase.rpc('current_firm_status');
    if (error) {
      console.error('current_firm_status error:', error);
      return { ok: true, status: null }; // por las dudas, no romper sesión por error de RPC
    }
    const status = (data as string | null) ?? null;
    return { ok: !status || !BLOCKED_FIRM_STATUSES.has(status), status };
  } catch (err) {
    console.error('checkFirmStatus excepción:', err);
    return { ok: true, status: null };
  }
}

function firmBlockedMessage(status: string | null): string {
  if (status === 'suspended') return 'Tu estudio está suspendido. Contactá al administrador de Lawstream.';
  if (status === 'inactive')  return 'Tu estudio está inactivo. Contactá al administrador de Lawstream.';
  return 'Tu estudio no está habilitado. Contactá al administrador de Lawstream.';
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, setState] = useState<AuthState>({
    ...emptyState,
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
        // Si es el mismo usuario (ej: token refresh al volver al tab), conservar el
        // perfil ya cargado para evitar el flash. Solo vaciamos si cambia el usuario.
        if (mounted) {
          setState((prev: AuthState) => {
            const sameUser = !!session?.user && session.user.id === prev.user?.id;
            return {
              ...prev,
              session,
              user: session?.user ?? null,
              profile:      sameUser ? prev.profile      : null,
              isSuperAdmin: sameUser ? prev.isSuperAdmin : false,
              isLoading: false,
            };
          });
        }

        // Recargar perfil solo si no lo teníamos o cambió el usuario
        if (session?.user) {
          const profile = await fetchProfile(session.user.id);

          if (!mounted) return;

          // Si el usuario está desactivado → cerrar sesión
          if (profile && !profile.isActive) {
            await supabase.auth.signOut();
            safeSetState(emptyState);
            return;
          }

          // Sin profile → puede ser superadmin (no pertenece a ningún firm).
          // Si tampoco es superadmin, la cuenta no está vinculada a nada y
          // cerramos sesión.
          let isSuperAdmin = false;
          if (!profile) {
            isSuperAdmin = await checkSuperAdmin();
            if (!mounted) return;
            if (!isSuperAdmin) {
              await supabase.auth.signOut();
              safeSetState(emptyState);
              return;
            }
          } else {
            // Con profile: verificar que el firm no esté suspendido/inactivo.
            const firmStatus = await checkFirmStatus();
            if (!mounted) return;
            if (!firmStatus.ok) {
              await supabase.auth.signOut();
              safeSetState(emptyState);
              return;
            }
          }

          setState(prev => ({
            ...prev,
            session,
            user: session.user,
            profile,
            isSuperAdmin,
            mustChangePassword: profile?.mustChangePassword ?? false,
            isLoading: false,
          }));
        }
      } catch (err) {
        console.error('Error applying session:', err);

        if (mounted) {
          setState((prev: AuthState) => ({
            ...prev,
            session,
            user: session?.user ?? null,
            profile: session?.user?.id === prev.user?.id ? prev.profile : null,
            isLoading: false,
          }));
        }
      }
    };

    const init = async () => {
      try {
        const { data, error } = await supabase.auth.getSession();

        if (error) {
          console.error('getSession error:', error);
          safeSetState(emptyState);
          return;
        }

        // Si el usuario eligió NO recordar sesión y es un nuevo browser session → cerrar
        const remember = localStorage.getItem('lawstream_remember');
        const alive    = sessionStorage.getItem('lawstream_alive');
        if (data.session && remember === '0' && !alive) {
          await supabase.auth.signOut();
          safeSetState(emptyState);
          return;
        }

        // Si hay sesión activa, marcar el tab como vivo
        if (data.session) sessionStorage.setItem('lawstream_alive', '1');

        await applySession(data.session ?? null);
      } catch (err) {
        console.error('Error initializing auth:', err);
        safeSetState(emptyState);
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

  const signIn = async (email: string, password: string, rememberMe = true) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) return { error: error.message };

      // Verificar profile / superadmin antes de permitir el acceso
      if (data.user) {
        const profile = await fetchProfile(data.user.id);
        if (profile && !profile.isActive) {
          await supabase.auth.signOut();
          return { error: 'Tu cuenta fue desactivada. Contactá al administrador del estudio.' };
        }

        if (!profile) {
          const isSuperAdmin = await checkSuperAdmin();
          if (!isSuperAdmin) {
            await supabase.auth.signOut();
            return { error: 'Tu cuenta no está vinculada a ningún estudio.' };
          }
        } else {
          // Con profile: chequear que el firm esté habilitado.
          const firmStatus = await checkFirmStatus();
          if (!firmStatus.ok) {
            await supabase.auth.signOut();
            return { error: firmBlockedMessage(firmStatus.status) };
          }
        }
      }

      sessionStorage.setItem('lawstream_alive', '1');
      localStorage.setItem('lawstream_remember', rememberMe ? '1' : '0');

      // Audit: login
      if (data.user) {
        const p = await fetchProfile(data.user.id);
        logAudit({ actorId: data.user.id, actorName: p?.fullName || email, action: 'login', entityType: 'session' });
      }

      return { error: null };
    } catch (err) {
      console.error('signIn error:', err);
      return {
        error: err instanceof Error ? err.message : 'No se pudo iniciar sesión.',
      };
    }
  };

  const signOut = async () => {
    try {
      // Audit: logout
      if (state.user && state.profile) {
        logAudit({ actorId: state.user.id, actorName: state.profile.fullName, action: 'logout', entityType: 'session' });
      }
      await supabase.auth.signOut();
      setState(emptyState);
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
        mustChangePassword: profile?.mustChangePassword ?? false,
      }));
    } catch (err) {
      console.error('refreshProfile error:', err);
    }
  };

  const resetPassword = async (email: string) => {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      return { error: error?.message ?? null };
    } catch (err) {
      console.error('resetPassword error:', err);
      return { error: err instanceof Error ? err.message : 'No se pudo enviar el email.' };
    }
  };

  const updatePassword = async (newPassword: string) => {
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) return { error: error.message };

      // Limpiar flag must_change_password
      if (state.user) {
        await supabase
          .from('profiles')
          .update({ must_change_password: false, updated_at: new Date().toISOString() })
          .eq('id', state.user.id);

        setState((prev: AuthState) => ({
          ...prev,
          mustChangePassword: false,
          profile: prev.profile ? { ...prev.profile, mustChangePassword: false } : null,
        }));
      }

      return { error: null };
    } catch (err) {
      console.error('updatePassword error:', err);
      return { error: err instanceof Error ? err.message : 'No se pudo cambiar la contraseña.' };
    }
  };

  const clearMustChangePassword = () => {
    setState((prev: AuthState) => ({ ...prev, mustChangePassword: false }));
  };

  return (
    <AuthContext.Provider
      value={{
        ...state,
        signIn,
        signOut,
        refreshProfile,
        resetPassword,
        updatePassword,
        clearMustChangePassword,
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