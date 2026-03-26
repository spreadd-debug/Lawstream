import React, { useState, useMemo } from 'react';
import { Card, Badge, Button, Drawer } from './UI';
import { Matter, LegalDocument } from '../types';
import { AlertCircle, Clock, User, ArrowRight, Calendar, ShieldAlert, Zap, PauseCircle, Filter, ChevronDown, MoreHorizontal, FileWarning, Edit, XCircle } from 'lucide-react';
import { format, isPast, isToday, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { cn } from '../lib/utils';
import { GlobalFilters, isFiltersActive } from './FiltersContent';

interface HoyProps {
  matters: Matter[];
  documents: LegalDocument[];
  onSelectMatter: (id: string) => void;
  onNewAction: () => void;
  onEditMatter: (id: string) => void;
  onCloseMatter: (id: string) => void;
  onOpenFilters: () => void;
  activeFilters: GlobalFilters;
}

export const Hoy = ({ matters, documents, onSelectMatter, onNewAction, onEditMatter, onCloseMatter, onOpenFilters, activeFilters }: HoyProps) => {
  const [isActionMenuOpen, setIsActionMenuOpen] = useState(false);
  const [selectedMatterForMenu, setSelectedMatterForMenu] = useState<Matter | null>(null);

  const handleOpenMenu = (matter: Matter) => {
    setSelectedMatterForMenu(matter);
    setIsActionMenuOpen(true);
  };

  const activeMatters = matters.filter(m => m.status !== 'Cerrado');
  const overdue = activeMatters.filter(m => m.nextActionDate && isPast(parseISO(m.nextActionDate)) && !isToday(parseISO(m.nextActionDate)));
  const today = activeMatters.filter(m => m.nextActionDate && isToday(parseISO(m.nextActionDate)));
  const broken = activeMatters.filter(m => m.health === 'Roto');
  const stuck = activeMatters.filter(m => m.health === 'Trabado');
  const waiting = activeMatters.filter(m => m.health === 'En espera');
  const criticalDocs = documents.filter(d => d.criticality === 'Crítico' && (d.status === 'Faltante' || d.status === 'Solicitado'));

  const workQueue = useMemo(() => {
    let result = activeMatters;
    if (activeFilters.health.length > 0)
      result = result.filter(m => activeFilters.health.includes(m.health));
    if (activeFilters.priority.length > 0)
      result = result.filter(m => activeFilters.priority.includes(m.priority));
    if (activeFilters.venceHoy)
      result = result.filter(m => m.nextActionDate && isToday(parseISO(m.nextActionDate)));
    if (activeFilters.vencido)
      result = result.filter(m => m.nextActionDate && isPast(parseISO(m.nextActionDate)) && !isToday(parseISO(m.nextActionDate)));
    return result.sort((a, b) => {
      const p = { 'Alta': 3, 'Media': 2, 'Baja': 1 };
      return p[b.priority] - p[a.priority];
    });
  }, [activeMatters, activeFilters]);

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      <header className="flex flex-col gap-1">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-black tracking-tighter text-foreground">Mesa de Control</h1>
          <div className="flex items-center gap-2">
            <Button variant={isFiltersActive(activeFilters) ? "secondary" : "outline"} size="sm" className="gap-2" onClick={onOpenFilters}>
              <Filter size={14} />
              <span>Filtros{isFiltersActive(activeFilters) ? ' •' : ''}</span>
            </Button>
            <Button size="sm" className="bg-primary hover:bg-primary/90 text-primary-foreground gap-2" onClick={onNewAction}>
              <Plus size={14} />
              <span>Nueva Acción</span>
            </Button>
          </div>
        </div>
        <p className="text-xs text-muted-foreground font-bold uppercase tracking-widest">
          {format(new Date(), "EEEE d 'de' MMMM", { locale: es })} • 14:42
        </p>
      </header>

      {/* Operative Status Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <StatusCard 
          label="Vencidos" 
          count={overdue.length} 
          variant="error" 
          icon={AlertCircle} 
        />
        <StatusCard 
          label="Vence hoy" 
          count={today.length} 
          variant="warning" 
          icon={Clock} 
        />
        <StatusCard 
          label="Rotos" 
          count={broken.length} 
          variant="error" 
          icon={ShieldAlert} 
        />
        <StatusCard 
          label="Trabados" 
          count={stuck.length} 
          variant="info" 
          icon={PauseCircle} 
        />
        <StatusCard 
          label="En espera" 
          count={waiting.length} 
          variant="default" 
          icon={User} 
        />
        <StatusCard 
          label="Documentación Crítica" 
          count={criticalDocs.length} 
          variant="error" 
          icon={FileWarning} 
        />
      </div>

      {/* Work Queue */}
      <section className="space-y-4">
        <div className="flex items-center justify-between border-b border-border pb-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-amber-500/20 rounded-lg flex items-center justify-center">
              <Zap size={18} className="text-amber-500 fill-amber-500" />
            </div>
            <div>
              <h2 className="text-sm font-black text-foreground uppercase tracking-widest">Cola de Trabajo Crítica</h2>
              <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest">{workQueue.length} Asuntos Requieren Acción</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
             <div className="flex items-center gap-2 text-[11px] font-bold text-muted-foreground">
               <span>Ordenar por:</span>
               <button className="flex items-center gap-1 text-foreground hover:text-primary transition-colors">
                 Prioridad <ChevronDown size={12} />
               </button>
             </div>
          </div>
        </div>

        <div className="space-y-3">
          {workQueue.map(matter => (
            <WorkItem
              key={matter.id}
              matter={matter}
              onClick={() => onSelectMatter(matter.id)}
              onOpenMenu={() => handleOpenMenu(matter)}
            />
          ))}
        </div>
      </section>
      {/* Action Menu Drawer */}
      <Drawer
        isOpen={isActionMenuOpen}
        onClose={() => setIsActionMenuOpen(false)}
        title={selectedMatterForMenu?.title || 'Acciones'}
        size="sm"
      >
        <div className="space-y-1">
          <MenuActionItem 
            icon={ArrowRight} 
            label="Abrir Asunto" 
            onClick={() => {
              if (selectedMatterForMenu) onSelectMatter(selectedMatterForMenu.id);
              setIsActionMenuOpen(false);
            }} 
          />
          <MenuActionItem 
            icon={Plus} 
            label="Nueva Acción" 
            onClick={() => {
              onNewAction();
              setIsActionMenuOpen(false);
            }} 
          />
          <MenuActionItem
            icon={Edit}
            label="Editar Caso"
            onClick={() => {
              if (selectedMatterForMenu) onEditMatter(selectedMatterForMenu.id);
              setIsActionMenuOpen(false);
            }}
          />
          <MenuActionItem
            icon={Zap}
            label="Registrar Movimiento"
            onClick={() => {
              if (selectedMatterForMenu) {
                setIsActionMenuOpen(false);
                onNewAction();
              }
            }}
          />
          <MenuActionItem
            icon={Calendar}
            label="Marcar Seguimiento"
            onClick={() => {
              if (selectedMatterForMenu) {
                setIsActionMenuOpen(false);
                onNewAction();
              }
            }}
          />
          <div className="pt-4 mt-4 border-t border-border">
            <MenuActionItem
              icon={XCircle}
              label="Cerrar Asunto"
              variant="danger"
              onClick={() => {
                if (selectedMatterForMenu) onCloseMatter(selectedMatterForMenu.id);
                setIsActionMenuOpen(false);
              }}
            />
          </div>
        </div>
      </Drawer>
    </div>
  );
};

const MenuActionItem = ({ icon: Icon, label, onClick, variant = 'default' }: any) => (
  <button 
    onClick={onClick}
    className={cn(
      "w-full flex items-center gap-3 p-3 rounded-xl transition-all text-left font-bold text-sm",
      variant === 'danger' 
        ? "text-rose-500 hover:bg-rose-500/10" 
        : "text-foreground hover:bg-muted"
    )}
  >
    <Icon size={18} className={variant === 'danger' ? "text-rose-500" : "text-primary"} />
    {label}
  </button>
);

const Plus = ({ size, className }: { size?: number, className?: string }) => (
  <svg 
    width={size || 24} 
    height={size || 24} 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke="currentColor" 
    strokeWidth="2" 
    strokeLinecap="round" 
    strokeLinejoin="round" 
    className={className}
  >
    <line x1="12" y1="5" x2="12" y2="19"></line>
    <line x1="5" y1="12" x2="19" y2="12"></line>
  </svg>
);

const StatusCard = ({ label, count, variant, icon: Icon }: { label: string, count: number, variant: 'error' | 'warning' | 'info' | 'default' | 'outline', icon: any }) => {
  const styles = {
    error: 'text-rose-600 dark:text-rose-400 border-rose-500/20 bg-rose-500/5',
    warning: 'text-amber-600 dark:text-amber-400 border-amber-500/20 bg-amber-500/5',
    info: 'text-sky-600 dark:text-sky-400 border-sky-500/20 bg-sky-500/5',
    default: 'text-foreground border-border bg-muted/50',
    outline: 'text-muted-foreground border-border bg-transparent',
  };

  return (
    <Card className={cn('p-4 border flex flex-col justify-between h-28 hover:scale-[1.02] transition-transform', styles[variant])}>
      <div className="flex items-center justify-between">
        <div className="p-2 rounded-lg bg-background/50 border border-border/50">
          <Icon size={18} className="opacity-80" />
        </div>
        <div className="text-2xl font-black tracking-tighter">{count}</div>
      </div>
      <div className="text-[10px] font-black uppercase tracking-[0.2em] leading-none opacity-70">{label}</div>
    </Card>
  );
};

interface WorkItemProps {
  matter: Matter;
  onClick: () => void;
  onOpenMenu: () => void;
}

const WorkItem: React.FC<WorkItemProps> = ({ matter, onClick, onOpenMenu }) => {
  const isOverdue = matter.nextActionDate && isPast(parseISO(matter.nextActionDate)) && !isToday(parseISO(matter.nextActionDate));
  const isTodayAction = matter.nextActionDate && isToday(parseISO(matter.nextActionDate));

  return (
    <Card 
      onClick={onClick}
      className={cn(
        'group relative p-4 flex flex-col md:flex-row md:items-center gap-6 border-l-0 transition-all hover:bg-muted/30',
        'border border-border'
      )}
    >
      {/* Status Indicator Bar */}
      <div className={cn(
        "absolute left-0 top-0 bottom-0 w-1",
        matter.health === 'Roto' ? 'bg-rose-600' : 
        matter.health === 'Trabado' ? 'bg-amber-500' :
        matter.health === 'En espera' ? 'bg-sky-400' :
        'bg-emerald-500'
      )} />

      {/* Main Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-3 mb-1.5">
          <h3 className="font-bold text-foreground truncate group-hover:text-primary transition-colors text-base tracking-tight">
            {matter.title}
          </h3>
          <HealthBadge health={matter.health} />
        </div>
        <div className="flex items-center gap-3 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
          <span className="text-foreground/80">{matter.client}</span>
          <span className="opacity-30">•</span>
          <span>{matter.type}</span>
          {matter.expediente && (
            <>
              <span className="opacity-30">•</span>
              <span className="font-mono text-[10px] bg-muted px-1.5 py-0.5 rounded">{matter.expediente}</span>
            </>
          )}
        </div>
      </div>

      {/* Operative Context */}
      <div className="flex-[1.5] grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Why is it here? */}
        <div className="flex flex-col justify-center">
          <div className="text-[9px] font-black text-muted-foreground uppercase tracking-[0.2em] mb-1">Motivo Prioridad</div>
          <div className={cn(
            "text-xs font-bold flex items-center gap-2",
            isOverdue ? "text-rose-600 dark:text-rose-400" : isTodayAction ? "text-amber-600 dark:text-amber-400" : "text-foreground/80"
          )}>
            {isOverdue && <AlertCircle size={14} />}
            {isTodayAction && <Clock size={14} />}
            {matter.reasonForQueue || 'Seguimiento estándar'}
          </div>
        </div>

        {/* Next Action / Blockage */}
        <div className="flex flex-col justify-center bg-muted/50 rounded-xl p-2.5 border border-border/50">
          <div className="text-[9px] font-black text-muted-foreground uppercase tracking-[0.2em] mb-1">
            {matter.health === 'Trabado' ? 'Bloqueo Actual' : 'Próxima Acción'}
          </div>
          <div className={cn(
            "text-xs font-bold truncate",
            matter.health === 'Roto' ? "text-rose-500 italic" : "text-foreground"
          )}>
            {matter.health === 'Trabado' ? matter.blockage : (matter.nextAction || 'Sin próxima acción')}
          </div>
        </div>
      </div>

      {/* Meta & Action */}
      <div className="flex items-center gap-6 md:w-64 justify-between md:justify-end">
        <div className="text-right">
          <div className="text-[9px] font-black text-muted-foreground uppercase tracking-[0.2em] mb-1">Fecha de seguimiento</div>
          <div className={cn(
            "text-xs font-black flex items-center justify-end gap-1.5",
            isOverdue ? "text-rose-600 dark:text-rose-400" : isTodayAction ? "text-amber-600 dark:text-amber-400" : "text-foreground"
          )}>
            <Calendar size={14} />
            {matter.nextActionDate ? format(parseISO(matter.nextActionDate), 'd MMM', { locale: es }) : '--'}
          </div>
        </div>
        <div className="text-right hidden lg:block">
          <div className="text-[9px] font-black text-muted-foreground uppercase tracking-[0.2em] mb-1">Responsable</div>
          <div className="flex items-center gap-2 justify-end">
             <div className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center text-[8px] font-black text-primary border border-primary/20">
               {matter.responsible.split(' ').map(n => n[0]).join('')}
             </div>
             <div className="text-xs font-bold text-foreground">{matter.responsible.split(' ').pop()}</div>
          </div>
        </div>
        <button 
          onClick={(e) => {
            e.stopPropagation();
            onOpenMenu();
          }}
          className="p-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-all"
        >
          <MoreHorizontal size={18} />
        </button>
      </div>
    </Card>
  );
};

const HealthBadge = ({ health }: { health: Matter['health'] }) => {
  const styles = {
    'Sano': 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
    'Trabado': 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20',
    'Roto': 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20',
    'En espera': 'bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/20',
  };

  return (
    <span className={cn(
      'px-1.5 py-0.5 rounded text-[9px] font-black uppercase tracking-[0.15em] border',
      styles[health]
    )}>
      {health}
    </span>
  );
};
