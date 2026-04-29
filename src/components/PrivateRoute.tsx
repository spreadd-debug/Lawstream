import React from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../lib/auth';

export const PrivateRoute: React.FC = () => {
  const { session, isLoading, mustChangePassword, isSuperAdmin } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
          <p className="text-sm font-black uppercase tracking-widest text-muted-foreground">Cargando...</p>
        </div>
      </div>
    );
  }

  if (!session) {
    return <Navigate to="/login" replace />;
  }

  // Force password change on first login
  if (mustChangePassword && location.pathname !== '/cambiar-password') {
    return <Navigate to="/cambiar-password" replace />;
  }

  // Superadmins solo viven en /admin. Cualquier otra ruta los manda allá.
  const isAdminRoute = location.pathname.startsWith('/admin');
  if (isSuperAdmin && !isAdminRoute) {
    return <Navigate to="/admin" replace />;
  }
  // Users normales no pueden entrar a /admin.
  if (!isSuperAdmin && isAdminRoute) {
    return <Navigate to="/hoy" replace />;
  }

  return <Outlet />;
};
