import React, { useState } from 'react';
import { useAuth } from '../lib/auth';
import { Eye, EyeOff, AlertCircle, LogIn, UserPlus } from 'lucide-react';

/* ─── Paleta ──────────────────────────────────────────────────── */
const C = {
  navy:    '#0D2137',
  navyMid: '#163554',
  teal:    '#1D9E75',
  cream:   '#F7F6F2',
  border:  '#D3D1C7',
  muted:   '#9C9A90',
  text:    '#2C2C2A',
  label:   '#5F5E5A',
};

/* ─── Figura de la Dama de la Justicia (SVG) ──────────────────── */
const JusticeFigure = () => (
  <svg
    viewBox="0 0 300 500"
    xmlns="http://www.w3.org/2000/svg"
    fill="white"
    style={{ position: 'absolute', bottom: 0, right: '-10px', width: '72%', opacity: 0.13, pointerEvents: 'none' }}
  >
    <ellipse cx="150" cy="48" rx="22" ry="26" />
    <rect x="128" y="44" width="44" height="8" rx="4" />
    <path d="M132 36 L138 28 L144 34 L150 24 L156 34 L162 28 L168 36 Z" />
    <rect x="143" y="72" width="14" height="14" />
    <path d="M120 86 Q150 78 180 86 L188 200 Q150 210 112 200 Z" />
    <path d="M120 100 L80 60 L72 68" stroke="white" strokeWidth="8" fill="none" strokeLinecap="round" />
    <line x1="52" y1="68" x2="92" y2="68" stroke="white" strokeWidth="3" />
    <line x1="58" y1="68" x2="50" y2="90" stroke="white" strokeWidth="2" />
    <ellipse cx="47" cy="93" rx="14" ry="5" />
    <line x1="86" y1="68" x2="94" y2="90" stroke="white" strokeWidth="2" />
    <ellipse cx="97" cy="93" rx="14" ry="5" />
    <path d="M180 110 L220 160" stroke="white" strokeWidth="8" fill="none" strokeLinecap="round" />
    <line x1="220" y1="160" x2="230" y2="260" stroke="white" strokeWidth="4" />
    <ellipse cx="225" cy="163" rx="10" ry="4" transform="rotate(20 225 163)" />
    <path d="M112 200 Q130 360 120 480 L180 480 Q170 360 188 200 Z" />
    <path d="M130 220 Q125 320 128 420" stroke="rgba(0,0,0,0.15)" strokeWidth="2" fill="none" />
    <path d="M150 215 Q148 330 150 430" stroke="rgba(0,0,0,0.15)" strokeWidth="2" fill="none" />
    <path d="M170 220 Q175 320 172 420" stroke="rgba(0,0,0,0.15)" strokeWidth="2" fill="none" />
    <rect x="108" y="478" width="84" height="12" rx="3" />
    <rect x="98" y="488" width="104" height="10" rx="2" />
  </svg>
);

/* ─── Componente principal ────────────────────────────────────── */
export const Login = () => {
  const { signIn, signUp } = useAuth();
  const [mode, setMode]               = useState<'login' | 'register'>('login');
  const [email, setEmail]             = useState('');
  const [password, setPassword]       = useState('');
  const [fullName, setFullName]       = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError]             = useState<string | null>(null);
  const [loading, setLoading]         = useState(false);
  const [success, setSuccess]         = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setLoading(true);

    if (mode === 'login') {
      const { error } = await signIn(email, password);
      if (error) setError(error);
    } else {
      if (!fullName.trim()) { setError('Ingresá tu nombre completo'); setLoading(false); return; }
      const { error } = await signUp(email, password, fullName);
      if (error) { setError(error); }
      else { setSuccess('Cuenta creada. Revisá tu email para confirmar el registro.'); setMode('login'); }
    }
    setLoading(false);
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#E8E6DF', padding: '24px', fontFamily: 'Arial, sans-serif' }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', maxWidth: 860, width: '100%', minHeight: 600, borderRadius: 16, overflow: 'hidden', boxShadow: '0 32px 80px rgba(13,33,55,0.22)' }}>

        {/* ── Panel Izquierdo ── */}
        <div style={{ background: C.navy, padding: '52px 48px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', inset: 0, background: `linear-gradient(160deg, ${C.navy} 0%, ${C.navy} 30%, ${C.navyMid} 70%, ${C.navy} 100%)` }} />
          <JusticeFigure />

          <div style={{ position: 'relative', zIndex: 2, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', height: '100%' }}>
            {/* Top */}
            <div>
              <div style={{ fontSize: 10, letterSpacing: '0.22em', color: C.teal, textTransform: 'uppercase', marginBottom: 20 }}>
                Software jurídico
              </div>
              <div style={{ fontFamily: 'Georgia, serif', fontSize: 26, color: '#fff', lineHeight: 1.5, fontStyle: 'italic', fontWeight: 'normal' }}>
                El flujo de tu estudio,<br />
                <span style={{ color: C.teal, fontStyle: 'normal' }}>organizado</span><br />
                y trazable.
              </div>
            </div>

            {/* Bottom quote */}
            <div>
              <div style={{ width: 32, height: 1, background: 'rgba(255,255,255,0.18)', marginBottom: 16 }} />
              <div style={{ fontFamily: 'Georgia, serif', fontSize: 11.5, color: 'rgba(255,255,255,0.36)', fontStyle: 'italic', lineHeight: 1.7 }}>
                "La justicia es la reina de las virtudes republicanas y con ella se sostiene la igualdad y la libertad."
              </div>
              <div style={{ fontSize: 10.5, color: 'rgba(255,255,255,0.2)', marginTop: 8, letterSpacing: '0.06em' }}>
                — Simón Bolívar
              </div>
            </div>
          </div>
        </div>

        {/* ── Panel Derecho ── */}
        <div style={{ background: C.cream, padding: '52px 52px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>

          {/* Logo */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 40 }}>
            <img src="/logo.png" alt="Lawstream" style={{ height: 44, width: 'auto', objectFit: 'contain' }} />
            <div>
              <div style={{ fontSize: 14, fontWeight: 700, letterSpacing: '0.13em', color: C.navy, textTransform: 'uppercase', lineHeight: 1 }}>
                Lawstream
              </div>
              <div style={{ fontSize: 9, letterSpacing: '0.15em', color: C.teal, textTransform: 'uppercase', marginTop: 3 }}>
                Gestión jurídica
              </div>
            </div>
          </div>

          {/* Título */}
          <div style={{ fontFamily: 'Georgia, serif', fontSize: 24, color: C.navy, fontWeight: 'normal', marginBottom: 4 }}>
            {mode === 'login' ? 'Iniciar sesión' : 'Crear cuenta'}
          </div>
          <div style={{ fontSize: 10.5, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 28 }}>
            {mode === 'login' ? 'Accedé a tu estudio' : 'Registrá tu cuenta'}
          </div>

          <form onSubmit={handleSubmit}>
            {/* Nombre completo (solo registro) */}
            {mode === 'register' && (
              <div style={{ marginBottom: 18 }}>
                <label style={{ display: 'block', fontSize: 10, letterSpacing: '0.13em', textTransform: 'uppercase', color: C.label, marginBottom: 7 }}>
                  Nombre completo
                </label>
                <input
                  type="text"
                  value={fullName}
                  onChange={e => setFullName(e.target.value)}
                  placeholder="Dr. Juan Pérez"
                  style={inputStyle}
                  onFocus={e => e.target.style.borderColor = C.teal}
                  onBlur={e => e.target.style.borderColor = C.border}
                />
              </div>
            )}

            {/* Email */}
            <div style={{ marginBottom: 18 }}>
              <label style={{ display: 'block', fontSize: 10, letterSpacing: '0.13em', textTransform: 'uppercase', color: C.label, marginBottom: 7 }}>
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="juan@estudio.com"
                required
                style={inputStyle}
                onFocus={e => e.target.style.borderColor = C.teal}
                onBlur={e => e.target.style.borderColor = C.border}
              />
            </div>

            {/* Contraseña */}
            <div style={{ marginBottom: 6 }}>
              <label style={{ display: 'block', fontSize: 10, letterSpacing: '0.13em', textTransform: 'uppercase', color: C.label, marginBottom: 7 }}>
                Contraseña
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  minLength={6}
                  style={{ ...inputStyle, paddingRight: 44 }}
                  onFocus={e => e.target.style.borderColor = C.teal}
                  onBlur={e => e.target.style.borderColor = C.border}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: C.muted, display: 'flex', alignItems: 'center' }}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* Error */}
            {error && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', background: 'rgba(220,38,38,0.08)', border: '1px solid rgba(220,38,38,0.2)', borderRadius: 8, color: '#b91c1c', fontSize: 13, marginTop: 12 }}>
                <AlertCircle size={15} style={{ flexShrink: 0 }} />
                {error}
              </div>
            )}

            {/* Éxito */}
            {success && (
              <div style={{ padding: '10px 14px', background: 'rgba(29,158,117,0.08)', border: '1px solid rgba(29,158,117,0.2)', borderRadius: 8, color: C.teal, fontSize: 13, marginTop: 12 }}>
                {success}
              </div>
            )}

            {/* Botón */}
            <button
              type="submit"
              disabled={loading}
              style={{
                width: '100%', padding: '13px', marginTop: 20,
                background: loading ? '#163554' : C.navy,
                color: '#fff', border: 'none', borderRadius: 8,
                fontSize: 11.5, letterSpacing: '0.13em', textTransform: 'uppercase',
                fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 9,
                transition: 'background 0.2s',
              }}
              onMouseEnter={e => { if (!loading) (e.currentTarget as HTMLButtonElement).style.background = '#163554'; }}
              onMouseLeave={e => { if (!loading) (e.currentTarget as HTMLButtonElement).style.background = C.navy; }}
            >
              {loading ? (
                <div style={{ width: 18, height: 18, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
              ) : mode === 'login' ? (
                <><LogIn size={15} /> Ingresar</>
              ) : (
                <><UserPlus size={15} /> Crear Cuenta</>
              )}
            </button>
          </form>

          {/* Toggle modo */}
          <div style={{ textAlign: 'center', fontSize: 12, color: C.muted, marginTop: 20 }}>
            {mode === 'login' ? (
              <>¿No tenés cuenta?{' '}
                <button onClick={() => { setMode('register'); setError(null); setSuccess(null); }} style={{ background: 'none', border: 'none', color: C.teal, cursor: 'pointer', fontSize: 12, fontWeight: 600 }}>
                  Registrate
                </button>
              </>
            ) : (
              <>¿Ya tenés cuenta?{' '}
                <button onClick={() => { setMode('login'); setError(null); setSuccess(null); }} style={{ background: 'none', border: 'none', color: C.teal, cursor: 'pointer', fontSize: 12, fontWeight: 600 }}>
                  Iniciá sesión
                </button>
              </>
            )}
          </div>

          <div style={{ textAlign: 'center', fontSize: 9.5, letterSpacing: '0.1em', color: '#C4C2B8', marginTop: 24, textTransform: 'uppercase' }}>
            Lawstream v2.0.4
          </div>
        </div>
      </div>

      {/* Animación spin para el loading */}
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
};

/* ─── Estilo base de inputs ───────────────────────────────────── */
const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '11px 14px',
  border: `1px solid ${C.border}`,
  borderRadius: 8,
  background: '#FFFFFF',
  fontSize: 13.5,
  color: C.text,
  outline: 'none',
  transition: 'border-color 0.15s',
  fontFamily: 'Arial, sans-serif',
};
