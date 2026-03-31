import React from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Briefcase,
  Calendar,
  Users,
  UsersRound,
  FileText,
  Settings,
  Inbox,
  Clock,
  Search,
  Plus,
  Bell,
  ChevronRight,
  Menu,
  Sun,
  Moon,
  LogOut,
  BarChart3,
} from 'lucide-react';
import { cn } from '../lib/utils';
import { useAuth } from '../lib/auth';
import { useAppContext } from '../lib/AppContext';
import { Drawer } from './UI';
import { NuevaAccion } from './NuevaAccion';
import { EditMatterForm } from './EditMatterForm';
import { FiltersContent, defaultFilters } from './FiltersContent';
import { OverdueInterviewBanner } from './OverdueInterviewBanner';
import { EntrevistaModal } from './EntrevistaModal';

// ── Sidebar link using NavLink ────────────────────────────────────

interface SidebarLinkProps {
  to: string;
  icon: React.ElementType;
  label: string;
  badge?: string | number;
  theme: 'light' | 'dark';
  onClick?: () => void;
}

const SidebarLink: React.FC<SidebarLinkProps> = ({ to, icon: Icon, label, badge, theme, onClick }) => (
  <NavLink to={to} onClick={onClick} end={to === '/'}>
    {({ isActive }) => (
      <div
        className={cn(
          'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all group relative cursor-pointer',
          isActive
            ? theme === 'dark' ? 'bg-white/10 text-white' : 'bg-primary/10 text-primary'
            : 'text-muted-foreground hover:text-foreground hover:bg-muted'
        )}
      >
        {isActive && (
          <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-primary rounded-r-full" />
        )}
        <Icon
          size={18}
          className={cn(
            isActive
              ? theme === 'dark' ? 'text-white' : 'text-primary'
              : 'text-muted-foreground group-hover:text-foreground'
          )}
        />
        <span className="flex-1 text-left">{label}</span>
        {badge && (
          <span
            className={cn(
              'px-1.5 py-0.5 rounded-md text-[10px] font-bold',
              isActive
                ? theme === 'dark' ? 'bg-white/20 text-white' : 'bg-primary/20 text-primary'
                : 'bg-muted text-muted-foreground'
            )}
          >
            {badge}
          </span>
        )}
      </div>
    )}
  </NavLink>
);

const ROLE_LABELS: Record<string, string> = {
  Socio: 'Socio',
  Abogado: 'Abogado',
  Pasante: 'Pasante',
  Secretario: 'Secretario/a',
};

// ── AppLayout ─────────────────────────────────────────────────────

export const AppLayout: React.FC = () => {
  const { signOut, profile } = useAuth();
  const navigate = useNavigate();
  const {
    theme, toggleTheme,
    matters, consultations, tasks, profiles,
    isNewActionOpen, setIsNewActionOpen,
    isEditMatterOpen, setIsEditMatterOpen,
    isFiltersOpen, setIsFiltersOpen,
    activeFilters, setActiveFilters,
    selectedMatterId,
    handleSaveAction, handleSaveMatterEdit,
    handleUpdateConsultation,
    isLoading,
  } = useAppContext();

  const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);
  const [overdueInterview, setOverdueInterview] = React.useState<import('../types').Consultation | null>(null);

  const isSocioOrSecretario = profile?.role === 'Socio' || profile?.role === 'Secretario';

  const menuItems = [
    { to: '/hoy',          label: 'Hoy',          icon: Clock },
    { to: '/consultas',    label: 'Consultas',     icon: Inbox,          badge: consultations.filter(c => c.status === 'Nueva' || c.status === 'Esperando info').length || undefined },
    { to: '/asuntos',      label: 'Asuntos',       icon: Briefcase },
    { to: '/agenda',       label: 'Agenda',         icon: Calendar,       badge: tasks.filter(t => t.status === 'Pendiente' && t.dueDate && new Date(t.dueDate) <= new Date()).length || undefined },
    ...(isSocioOrSecretario ? [{ to: '/equipo', label: 'Equipo', icon: UsersRound }] : []),
    { to: '/clientes',     label: 'Clientes',      icon: Users },
    { to: '/documentos',   label: 'Documentos',    icon: FileText },
    { to: '/plantillas',   label: 'Plantillas',    icon: LayoutDashboard },
    ...(isSocioOrSecretario ? [{ to: '/reportes', label: 'Reportes', icon: BarChart3 }] : []),
  ];

  const splitAt = isSocioOrSecretario ? 5 : 4;

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

  return (
    <div className="flex h-screen bg-background text-foreground font-sans overflow-hidden">
      {/* ── Sidebar Desktop ── */}
      <aside className="hidden md:flex flex-col w-64 bg-card border-r border-border p-4 shrink-0">
        <div className="flex items-center justify-center mb-3">
          <img src="/logo.png" alt="Lawstream" className="w-36 h-auto" />
        </div>

        <nav className="flex-1 space-y-1">
          <div className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] px-3 mb-3">
            Operativo
          </div>
          {menuItems.slice(0, splitAt).map(item => (
            <SidebarLink key={item.to} {...item} theme={theme} />
          ))}

          <div className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] px-3 mt-8 mb-3">
            Gestión
          </div>
          {menuItems.slice(splitAt).map(item => (
            <SidebarLink key={item.to} {...item} theme={theme} />
          ))}
        </nav>

        <div className="mt-auto pt-4 space-y-2">
          <button
            onClick={toggleTheme}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-all"
          >
            {theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
            <span>Modo {theme === 'light' ? 'Oscuro' : 'Claro'}</span>
          </button>

          <div className="h-[1px] bg-border mx-2 my-2" />

          <SidebarLink to="/configuracion" icon={Settings} label="Configuración" theme={theme} />

          <div className="mt-4 flex items-center gap-3 px-3 py-3 bg-muted/50 rounded-xl border border-border/50">
            <div className="w-9 h-9 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-black">
              {profile?.initials || '??'}
            </div>
            <div className="flex-1 overflow-hidden">
              <div className="text-sm font-bold truncate">{profile?.fullName || 'Usuario'}</div>
              <div className="text-[10px] font-black text-muted-foreground uppercase tracking-widest truncate">
                {profile ? ROLE_LABELS[profile.role] || profile.role : ''}
              </div>
            </div>
            <button
              onClick={signOut}
              className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors"
              title="Cerrar sesión"
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </aside>

      {/* ── Main ── */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
        {/* Topbar */}
        <header className="h-16 bg-card border-b border-border flex items-center justify-between px-4 md:px-8 shrink-0 z-10">
          <div className="flex items-center gap-4 flex-1">
            <button
              className="md:hidden p-2 text-muted-foreground hover:bg-muted rounded-lg"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            >
              <Menu size={20} />
            </button>
            <div className="relative group flex-1 max-w-md">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-foreground transition-colors" />
              <input
                type="text"
                placeholder="Buscar asuntos, clientes..."
                className="w-full pl-10 pr-4 py-2 bg-muted/50 border border-border/50 rounded-xl text-sm focus:bg-card focus:ring-2 focus:ring-primary/20 focus:border-primary/30 transition-all outline-none"
              />
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button className="p-2 text-muted-foreground hover:bg-muted rounded-xl relative transition-colors">
              <Bell size={20} />
              <span className="absolute top-2.5 right-2.5 w-2 h-2 bg-primary rounded-full border-2 border-card" />
            </button>
            <div className="h-6 w-[1px] bg-border mx-1" />
            <button
              onClick={() => navigate('/asuntos/nuevo')}
              className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-xl text-sm font-bold hover:bg-primary/90 transition-all shadow-lg shadow-primary/20 active:scale-95"
            >
              <Plus size={18} />
              <span className="hidden sm:inline">Nuevo Asunto</span>
            </button>
          </div>
        </header>

        {/* Overdue interview banner */}
        <OverdueInterviewBanner
          consultations={consultations}
          profiles={profiles}
          onUpdate={handleUpdateConsultation}
          onStartInterview={(c) => setOverdueInterview(c)}
        />

        {/* Content via Outlet */}
        <div className="flex-1 overflow-y-auto p-4 md:p-8 bg-background/50">
          <Outlet />
        </div>

        {/* Overdue interview modal */}
        {overdueInterview && (
          <EntrevistaModal
            consultation={overdueInterview}
            profiles={profiles}
            onUpdate={(id, changes) => {
              handleUpdateConsultation(id, changes);
              setOverdueInterview(prev => prev ? { ...prev, ...changes } : null);
            }}
            onFinish={async (formaPago) => {
              const isWaived = formaPago === 'Bonificada' || formaPago === 'No aplica';
              const changes: Partial<import('../types').Consultation> = {
                consultationFeePaid: true,
                consultationFeeFormaPago: formaPago,
                consultationFeeSnapshot: isWaived ? 0 : undefined,
                nextStep: 'Pasar a Evaluación de viabilidad del caso',
              };
              const { updateConsultation: dbUpdate } = await import('../lib/db');
              await dbUpdate(overdueInterview.id, changes);
              handleUpdateConsultation(overdueInterview.id, changes);
              setOverdueInterview(null);
            }}
            onClose={() => setOverdueInterview(null)}
          />
        )}
      </main>

      {/* ── Mobile Sidebar Overlay ── */}
      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 bg-background/80 z-40 md:hidden backdrop-blur-sm transition-all"
          onClick={() => setIsMobileMenuOpen(false)}
        >
          <div
            className="w-72 h-full bg-card p-4 flex flex-col shadow-2xl border-r border-border"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-3 px-2">
                <img src="/logo.png" alt="Lawstream" className="h-10 w-auto" />
              </div>
              <button onClick={() => setIsMobileMenuOpen(false)} className="p-2 text-muted-foreground hover:bg-muted rounded-lg">
                <ChevronRight size={20} className="rotate-180" />
              </button>
            </div>
            <nav className="flex-1 space-y-1">
              {menuItems.map(item => (
                <SidebarLink
                  key={item.to}
                  {...item}
                  theme={theme}
                  onClick={() => setIsMobileMenuOpen(false)}
                />
              ))}
            </nav>
            <div className="mt-auto pt-4 border-t border-border space-y-1">
              <button
                onClick={toggleTheme}
                className="w-full flex items-center gap-3 px-3 py-3 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-all"
              >
                {theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
                <span>Modo {theme === 'light' ? 'Oscuro' : 'Claro'}</span>
              </button>
              <SidebarLink
                to="/configuracion"
                icon={Settings}
                label="Configuración"
                theme={theme}
                onClick={() => setIsMobileMenuOpen(false)}
              />
              <div className="flex items-center gap-3 px-3 py-3 bg-muted/50 rounded-xl border border-border/50 mt-2">
                <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-black shrink-0">
                  {profile?.initials || '??'}
                </div>
                <div className="flex-1 overflow-hidden">
                  <div className="text-sm font-bold truncate">{profile?.fullName || 'Usuario'}</div>
                  <div className="text-[10px] font-black text-muted-foreground uppercase tracking-widest truncate">
                    {profile ? ROLE_LABELS[profile.role] || profile.role : ''}
                  </div>
                </div>
                <button
                  onClick={signOut}
                  className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors"
                  title="Cerrar sesión"
                >
                  <LogOut size={16} />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Global Drawers ── */}
      <Drawer
        isOpen={isNewActionOpen}
        onClose={() => setIsNewActionOpen(false)}
        title="Nueva Acción"
        size="xl"
      >
        <NuevaAccion
          matterId={selectedMatterId || undefined}
          matterTitle={matters.find(m => m.id === selectedMatterId)?.title}
          matters={matters}
          onBack={() => setIsNewActionOpen(false)}
          onSave={handleSaveAction}
        />
      </Drawer>

      <Drawer
        isOpen={isEditMatterOpen}
        onClose={() => setIsEditMatterOpen(false)}
        title="Editar Asunto"
        size="lg"
      >
        <EditMatterForm
          matter={matters.find(m => m.id === selectedMatterId)}
          onSave={handleSaveMatterEdit}
          onCancel={() => setIsEditMatterOpen(false)}
        />
      </Drawer>

      <Drawer
        isOpen={isFiltersOpen}
        onClose={() => setIsFiltersOpen(false)}
        title="Filtros Avanzados"
        size="sm"
      >
        <FiltersContent
          initialFilters={activeFilters}
          onApply={(filters) => { setActiveFilters(filters); setIsFiltersOpen(false); }}
          onClose={() => { setActiveFilters(defaultFilters); setIsFiltersOpen(false); }}
        />
      </Drawer>
    </div>
  );
};
