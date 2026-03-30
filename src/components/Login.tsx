import React, { useState } from 'react';
import { useAuth } from '../lib/auth';
import { Button } from './UI';
import { LogIn, UserPlus, Eye, EyeOff, AlertCircle } from 'lucide-react';

export const Login = () => {
  const { signIn, signUp } = useAuth();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setLoading(true);

    if (mode === 'login') {
      const { error } = await signIn(email, password);
      if (error) setError(error);
    } else {
      if (!fullName.trim()) {
        setError('Ingresá tu nombre completo');
        setLoading(false);
        return;
      }
      const { error } = await signUp(email, password, fullName);
      if (error) {
        setError(error);
      } else {
        setSuccess('Cuenta creada. Revisá tu email para confirmar el registro.');
        setMode('login');
      }
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md">
        <div className="flex justify-center mb-8">
          <img src="/logo.png" alt="Lawstream" className="h-12 w-auto" />
        </div>

        <div className="bg-card border border-border rounded-2xl shadow-xl p-8">
          <div className="text-center mb-8">
            <h1 className="text-2xl font-black tracking-tight text-foreground">
              {mode === 'login' ? 'Iniciar Sesión' : 'Crear Cuenta'}
            </h1>
            <p className="text-xs font-black text-muted-foreground uppercase tracking-widest mt-2 opacity-60">
              {mode === 'login' ? 'Accedé a tu estudio' : 'Registrá tu cuenta'}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {mode === 'register' && (
              <div>
                <label className="block text-xs font-bold text-muted-foreground uppercase tracking-widest mb-2">
                  Nombre Completo
                </label>
                <input
                  type="text"
                  value={fullName}
                  onChange={e => setFullName(e.target.value)}
                  placeholder="Dr. Juan Pérez"
                  className="w-full px-4 py-3 bg-muted/50 border border-border rounded-xl text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary/30 transition-all outline-none"
                />
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-muted-foreground uppercase tracking-widest mb-2">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="juan@estudio.com"
                required
                className="w-full px-4 py-3 bg-muted/50 border border-border rounded-xl text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary/30 transition-all outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-muted-foreground uppercase tracking-widest mb-2">
                Contraseña
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  minLength={6}
                  className="w-full px-4 py-3 pr-12 bg-muted/50 border border-border rounded-xl text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary/30 transition-all outline-none"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {error && (
              <div className="flex items-center gap-2 p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-600 dark:text-rose-400 text-sm">
                <AlertCircle size={16} />
                <span>{error}</span>
              </div>
            )}

            {success && (
              <div className="flex items-center gap-2 p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-600 dark:text-emerald-400 text-sm">
                <span>{success}</span>
              </div>
            )}

            <Button
              type="submit"
              variant="primary"
              size="lg"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 rounded-xl font-black uppercase tracking-widest"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
              ) : mode === 'login' ? (
                <>
                  <LogIn size={18} />
                  Ingresar
                </>
              ) : (
                <>
                  <UserPlus size={18} />
                  Crear Cuenta
                </>
              )}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <button
              onClick={() => {
                setMode(mode === 'login' ? 'register' : 'login');
                setError(null);
                setSuccess(null);
              }}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              {mode === 'login'
                ? '¿No tenés cuenta? Registrate'
                : '¿Ya tenés cuenta? Iniciá sesión'}
            </button>
          </div>
        </div>

        <p className="text-center text-[10px] font-black text-muted-foreground uppercase tracking-widest mt-6 opacity-40">
          Lawstream v2.0.4
        </p>
      </div>
    </div>
  );
};
