import React, { useEffect, useState } from 'react';
import { Card, Button, Badge } from './UI';
import { UserPlus, Shield, ShieldCheck, GraduationCap, ClipboardList, ToggleLeft, ToggleRight, ArrowLeft } from 'lucide-react';
import { UserProfile, UserRole } from '../types';
import { useAuth } from '../lib/auth';
import * as db from '../lib/db';

const ROLE_CONFIG: Record<UserRole, { label: string; color: 'info' | 'success' | 'warning' | 'outline'; icon: React.ElementType; desc: string }> = {
  Socio:      { label: 'Socio',        color: 'success', icon: ShieldCheck,    desc: 'Acceso completo, gestión de usuarios' },
  Abogado:    { label: 'Abogado',      color: 'info',    icon: Shield,         desc: 'Gestión de asuntos asignados' },
  Pasante:    { label: 'Pasante',      color: 'warning', icon: GraduationCap,  desc: 'Tareas asignadas, acceso limitado' },
  Secretario: { label: 'Secretario/a', color: 'outline', icon: ClipboardList,  desc: 'Documentos, clientes, agenda' },
};

interface Props {
  onBack: () => void;
}

export const UsuariosConfig: React.FC<Props> = ({ onBack }) => {
  const { profile: currentUser } = useAuth();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [showInvite, setShowInvite] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteName, setInviteName] = useState('');
  const [inviteRole, setInviteRole] = useState<UserRole>('Abogado');
  const [inviteLoading, setInviteLoading] = useState(false);
  const [inviteError, setInviteError] = useState<string | null>(null);

  const isSocio = currentUser?.role === 'Socio';

  useEffect(() => {
    db.fetchProfiles()
      .then(setUsers)
      .catch(err => console.error('Error cargando usuarios:', err))
      .finally(() => setLoading(false));
  }, []);

  const handleRoleChange = async (userId: string, newRole: UserRole) => {
    if (!isSocio || userId === currentUser?.id) return;
    setUsers(prev => prev.map(u => u.id === userId ? { ...u, role: newRole } : u));
    try {
      await db.updateProfile(userId, { role: newRole });
    } catch (err) {
      console.error('Error actualizando rol:', err);
    }
  };

  const handleToggleActive = async (userId: string, isActive: boolean) => {
    if (!isSocio || userId === currentUser?.id) return;
    setUsers(prev => prev.map(u => u.id === userId ? { ...u, isActive } : u));
    try {
      await db.updateProfile(userId, { isActive });
    } catch (err) {
      console.error('Error actualizando estado:', err);
    }
  };

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail || !inviteName) return;
    setInviteLoading(true);
    setInviteError(null);

    const { error } = await db.inviteUser(inviteEmail, inviteName, inviteRole);
    if (error) {
      setInviteError(error);
    } else {
      setShowInvite(false);
      setInviteEmail('');
      setInviteName('');
      setInviteRole('Abogado');
      // Refresh users
      const updated = await db.fetchProfiles();
      setUsers(updated);
    }
    setInviteLoading(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-3xl mx-auto pb-20">
      <header className="flex items-center gap-4">
        <button onClick={onBack} className="p-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors">
          <ArrowLeft size={20} />
        </button>
        <div className="flex-1">
          <h1 className="text-3xl md:text-5xl font-black tracking-tighter text-foreground leading-none">Usuarios y Roles</h1>
          <p className="text-muted-foreground mt-3 text-sm font-black uppercase tracking-widest opacity-60">
            Gestioná quién accede al sistema y qué puede hacer.
          </p>
        </div>
        {isSocio && (
          <Button
            variant="primary"
            size="md"
            onClick={() => setShowInvite(!showInvite)}
            className="gap-2 rounded-xl"
          >
            <UserPlus size={18} />
            <span className="hidden sm:inline">Invitar</span>
          </Button>
        )}
      </header>

      {/* Invite Form */}
      {showInvite && (
        <Card className="p-6 border-primary/30 bg-primary/5">
          <h3 className="text-lg font-bold mb-4">Invitar nuevo usuario</h3>
          <form onSubmit={handleInvite} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-muted-foreground uppercase tracking-widest mb-2">Nombre</label>
                <input
                  type="text"
                  value={inviteName}
                  onChange={e => setInviteName(e.target.value)}
                  placeholder="Dr. Juan Pérez"
                  required
                  className="w-full px-4 py-2.5 bg-muted/50 border border-border rounded-xl text-sm focus:ring-2 focus:ring-primary/20 outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-muted-foreground uppercase tracking-widest mb-2">Email</label>
                <input
                  type="email"
                  value={inviteEmail}
                  onChange={e => setInviteEmail(e.target.value)}
                  placeholder="juan@estudio.com"
                  required
                  className="w-full px-4 py-2.5 bg-muted/50 border border-border rounded-xl text-sm focus:ring-2 focus:ring-primary/20 outline-none"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold text-muted-foreground uppercase tracking-widest mb-2">Rol</label>
              <div className="flex flex-wrap gap-2">
                {(Object.keys(ROLE_CONFIG) as UserRole[]).map(role => {
                  const config = ROLE_CONFIG[role];
                  return (
                    <button
                      key={role}
                      type="button"
                      onClick={() => setInviteRole(role)}
                      className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium border transition-all ${
                        inviteRole === role
                          ? 'border-primary bg-primary/10 text-primary'
                          : 'border-border bg-card text-muted-foreground hover:border-primary/30'
                      }`}
                    >
                      <config.icon size={16} />
                      {config.label}
                    </button>
                  );
                })}
              </div>
            </div>
            {inviteError && (
              <p className="text-sm text-rose-500">{inviteError}</p>
            )}
            <div className="flex gap-3">
              <Button type="submit" variant="primary" size="md" disabled={inviteLoading} className="rounded-xl">
                {inviteLoading ? 'Enviando...' : 'Enviar Invitación'}
              </Button>
              <Button type="button" variant="ghost" size="md" onClick={() => setShowInvite(false)} className="rounded-xl">
                Cancelar
              </Button>
            </div>
          </form>
        </Card>
      )}

      {/* Roles explanation */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {(Object.keys(ROLE_CONFIG) as UserRole[]).map(role => {
          const config = ROLE_CONFIG[role];
          const count = users.filter(u => u.role === role && u.isActive).length;
          return (
            <Card key={role} className="p-4 text-center">
              <config.icon size={24} className="mx-auto text-muted-foreground mb-2" />
              <div className="text-sm font-bold">{config.label}</div>
              <div className="text-[10px] text-muted-foreground uppercase tracking-widest mt-1">{count} activo{count !== 1 ? 's' : ''}</div>
            </Card>
          );
        })}
      </div>

      {/* User list */}
      <div className="space-y-3">
        {users.map(user => {
          const config = ROLE_CONFIG[user.role];
          const isCurrentUser = user.id === currentUser?.id;
          return (
            <Card key={user.id} className={`p-5 flex items-center gap-4 ${!user.isActive ? 'opacity-50' : ''}`}>
              <div className="w-11 h-11 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-black shrink-0">
                {user.initials}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold truncate">{user.fullName}</span>
                  {isCurrentUser && <Badge variant="info">Vos</Badge>}
                  {!user.isActive && <Badge variant="error">Inactivo</Badge>}
                </div>
                <div className="text-xs text-muted-foreground truncate">{user.email}</div>
              </div>

              <div className="flex items-center gap-3 shrink-0">
                {isSocio && !isCurrentUser ? (
                  <select
                    value={user.role}
                    onChange={e => handleRoleChange(user.id, e.target.value as UserRole)}
                    className="px-3 py-1.5 bg-muted/50 border border-border rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary/20"
                  >
                    {(Object.keys(ROLE_CONFIG) as UserRole[]).map(role => (
                      <option key={role} value={role}>{ROLE_CONFIG[role].label}</option>
                    ))}
                  </select>
                ) : (
                  <Badge variant={config.color}>{config.label}</Badge>
                )}

                {isSocio && !isCurrentUser && (
                  <button
                    onClick={() => handleToggleActive(user.id, !user.isActive)}
                    className="text-muted-foreground hover:text-foreground transition-colors"
                    title={user.isActive ? 'Desactivar usuario' : 'Activar usuario'}
                  >
                    {user.isActive ? <ToggleRight size={24} className="text-emerald-500" /> : <ToggleLeft size={24} />}
                  </button>
                )}
              </div>
            </Card>
          );
        })}
      </div>

      {users.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          <p className="text-sm">No hay usuarios registrados aún.</p>
        </div>
      )}
    </div>
  );
};
