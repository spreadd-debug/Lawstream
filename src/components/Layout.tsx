import React from 'react';
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
  LogOut
} from 'lucide-react';
import { cn } from '../lib/utils';
import { useAuth } from '../lib/auth';
import { UserProfile } from '../types';

interface SidebarItemProps {
  icon: React.ElementType;
  label: string;
  active?: boolean;
  onClick: () => void;
  badge?: string;
  theme: 'light' | 'dark';
}

const SidebarItem: React.FC<SidebarItemProps> = ({ icon: Icon, label, active, onClick, badge, theme }) => (
  <button
    onClick={onClick}
    className={cn(
      'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all group relative',
      active 
        ? theme === 'dark' ? 'bg-white/10 text-white' : 'bg-primary/10 text-primary' 
        : 'text-muted-foreground hover:text-foreground hover:bg-muted'
    )}
  >
    {active && (
      <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-primary rounded-r-full" />
    )}
    <Icon size={18} className={cn(active ? (theme === 'dark' ? 'text-white' : 'text-primary') : 'text-muted-foreground group-hover:text-foreground')} />
    <span className="flex-1 text-left">{label}</span>
    {badge && (
      <span className={cn(
        'px-1.5 py-0.5 rounded-md text-[10px] font-bold',
        active 
          ? theme === 'dark' ? 'bg-white/20 text-white' : 'bg-primary/20 text-primary' 
          : 'bg-muted text-muted-foreground'
      )}>
        {badge}
      </span>
    )}
  </button>
);

const ROLE_LABELS: Record<string, string> = {
  Socio: 'Socio',
  Abogado: 'Abogado',
  Pasante: 'Pasante',
  Secretario: 'Secretario/a',
};

interface LayoutProps {
  children: React.ReactNode;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  theme: 'light' | 'dark';
  toggleTheme: () => void;
  onNewMatter: () => void;
  profile: UserProfile | null;
}

export const Layout = ({ children, activeTab, setActiveTab, theme, toggleTheme, onNewMatter, profile }: LayoutProps) => {
  const { signOut } = useAuth();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);

  const isSocioOrSecretario = profile?.role === 'Socio' || profile?.role === 'Secretario';

  const menuItems = [
    { id: 'hoy', label: 'Hoy', icon: Clock },
    { id: 'consultas', label: 'Consultas', icon: Inbox, badge: '3' },
    { id: 'asuntos', label: 'Asuntos', icon: Briefcase },
    { id: 'vencimientos', label: 'Vencimientos', icon: Calendar, badge: '2' },
    ...(isSocioOrSecretario ? [{ id: 'equipo', label: 'Equipo', icon: UsersRound }] : []),
    { id: 'clientes', label: 'Clientes', icon: Users },
    { id: 'documentos', label: 'Documentos', icon: FileText },
    { id: 'plantillas', label: 'Plantillas', icon: LayoutDashboard },
  ];

  return (
    <div className="flex h-screen bg-background text-foreground font-sans overflow-hidden">
      {/* Sidebar Desktop */}
      <aside className="hidden md:flex flex-col w-64 bg-card border-r border-border p-4 shrink-0">
        <div className="flex items-center justify-center mb-3">
          <img src="/logo.png" alt="Lawstream" className="w-36 h-auto" />
        </div>

        <nav className="flex-1 space-y-1">
          <div className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] px-3 mb-3">Operativo</div>
          {menuItems.slice(0, 4).map((item) => (
            <SidebarItem
              key={item.id}
              icon={item.icon}
              label={item.label}
              active={activeTab === item.id}
              onClick={() => setActiveTab(item.id)}
              badge={item.badge}
              theme={theme}
            />
          ))}

          <div className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] px-3 mt-8 mb-3">Gestión</div>
          {menuItems.slice(4).map((item) => (
            <SidebarItem
              key={item.id}
              icon={item.icon}
              label={item.label}
              active={activeTab === item.id}
              onClick={() => setActiveTab(item.id)}
              badge={item.badge}
              theme={theme}
            />
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
          
          <div className="h-[1px] bg-border mx-2 my-2"></div>

          <SidebarItem
            icon={Settings}
            label="Configuración"
            active={activeTab === 'configuracion'}
            onClick={() => setActiveTab('configuracion')}
            theme={theme}
          />
          
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

      {/* Main Content */}
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
              <span className="absolute top-2.5 right-2.5 w-2 h-2 bg-primary rounded-full border-2 border-card"></span>
            </button>
            <div className="h-6 w-[1px] bg-border mx-1"></div>
            <button 
              onClick={onNewMatter}
              className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-xl text-sm font-bold hover:bg-primary/90 transition-all shadow-lg shadow-primary/20 active:scale-95"
            >
              <Plus size={18} />
              <span className="hidden sm:inline">Nuevo Asunto</span>
            </button>
          </div>
        </header>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-4 md:p-8 bg-background/50">
          {children}
        </div>
      </main>

      {/* Mobile Sidebar Overlay */}
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
                {menuItems.map((item) => (
                  <SidebarItem
                    key={item.id}
                    icon={item.icon}
                    label={item.label}
                    active={activeTab === item.id}
                    onClick={() => {
                      setActiveTab(item.id);
                      setIsMobileMenuOpen(false);
                    }}
                    badge={item.badge}
                    theme={theme}
                  />
                ))}
             </nav>
             <div className="mt-auto pt-4 border-t border-border">
                <button 
                  onClick={toggleTheme}
                  className="w-full flex items-center gap-3 px-3 py-3 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-all"
                >
                  {theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
                  <span>Modo {theme === 'light' ? 'Oscuro' : 'Claro'}</span>
                </button>
             </div>
          </div>
        </div>
      )}
    </div>
  );
};
