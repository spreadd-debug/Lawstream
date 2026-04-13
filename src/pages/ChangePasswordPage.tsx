import React, { useState } from 'react';
import { useAuth } from '../lib/auth';
import { Eye, EyeOff, AlertCircle, KeyRound, ShieldCheck } from 'lucide-react';

export const ChangePasswordPage = () => {
  const { updatePassword } = useAuth();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password.length < 6) {
      setError('La contrasena debe tener al menos 6 caracteres');
      return;
    }
    if (password !== confirmPassword) {
      setError('Las contrasenas no coinciden');
      return;
    }

    setLoading(true);
    const { error } = await updatePassword(password);
    if (error) {
      setError(error);
    }
    // On success, updatePassword clears mustChangePassword flag and the
    // PrivateRoute will redirect to /hoy automatically
    setLoading(false);
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#E8E6DF', padding: 24, fontFamily: 'Arial, sans-serif' }}>
      <div style={{ maxWidth: 420, width: '100%', background: '#F7F6F2', borderRadius: 16, padding: '48px 40px', boxShadow: '0 32px 80px rgba(13,33,55,0.15)' }}>
        <div style={{ marginBottom: 32 }}>
          <img src="/logo.png" alt="Lawstream" style={{ height: 60, width: 'auto' }} />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
          <ShieldCheck size={22} style={{ color: '#1D9E75' }} />
          <div style={{ fontFamily: 'Georgia, serif', fontSize: 22, color: '#0D2137' }}>
            Cambia tu contrasena
          </div>
        </div>
        <div style={{ fontSize: 13, color: '#9C9A90', marginBottom: 24 }}>
          Es tu primer inicio de sesion. Por seguridad, necesitas establecer una contrasena propia antes de continuar.
        </div>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', fontSize: 10, letterSpacing: '0.13em', textTransform: 'uppercase', color: '#5F5E5A', marginBottom: 7 }}>
              Nueva contrasena
            </label>
            <div style={{ position: 'relative' }}>
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Minimo 6 caracteres"
                required
                minLength={6}
                style={{ width: '100%', padding: '11px 44px 11px 14px', border: '1px solid #D3D1C7', borderRadius: 8, background: '#fff', fontSize: 13.5, color: '#2C2C2A', outline: 'none' }}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#9C9A90', display: 'flex' }}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', fontSize: 10, letterSpacing: '0.13em', textTransform: 'uppercase', color: '#5F5E5A', marginBottom: 7 }}>
              Confirmar contrasena
            </label>
            <input
              type={showPassword ? 'text' : 'password'}
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
              placeholder="Repeti la contrasena"
              required
              minLength={6}
              style={{ width: '100%', padding: '11px 14px', border: '1px solid #D3D1C7', borderRadius: 8, background: '#fff', fontSize: 13.5, color: '#2C2C2A', outline: 'none' }}
            />
          </div>

          {error && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', background: 'rgba(220,38,38,0.08)', border: '1px solid rgba(220,38,38,0.2)', borderRadius: 8, color: '#b91c1c', fontSize: 13, marginBottom: 12 }}>
              <AlertCircle size={15} style={{ flexShrink: 0 }} />
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%', padding: '13px', marginTop: 8,
              background: loading ? '#163554' : '#0D2137',
              color: '#fff', border: 'none', borderRadius: 8,
              fontSize: 11.5, letterSpacing: '0.13em', textTransform: 'uppercase',
              fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 9,
            }}
          >
            {loading ? (
              <div style={{ width: 18, height: 18, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
            ) : (
              <><KeyRound size={15} /> Establecer contrasena</>
            )}
          </button>
        </form>
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
};
