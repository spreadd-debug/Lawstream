import React, { useState } from 'react';
import { Card, Badge, Button, Input } from './UI';
import { Matter } from '../types';
import { 
  Search, 
  Filter, 
  Plus, 
  MoreHorizontal, 
  Calendar, 
  User, 
  Clock, 
  AlertCircle, 
  ShieldAlert, 
  PauseCircle, 
  Zap, 
  ChevronDown,
  ArrowUpRight,
  LayoutGrid,
  List as ListIcon,
  CheckCircle2,
  XCircle,
  MessageSquare,
  History,
  MoreVertical,
  ExternalLink,
  FilePlus,
  UserCog,
  Flag
} from 'lucide-react';
import { format, parseISO, isPast, isToday, addDays, differenceInDays } from 'date-fns';
import { es } from 'date-fns/locale';
import { cn } from '../lib/utils';

import { ACTION_ICONS } from '../constants';

interface AsuntosProps {
  matters: Matter[];
  onSelectMatter: (id: string) => void;
  onCreateMatter: () => void;
}

export const Asuntos = ({ matters, onSelectMatter, onCreateMatter }: AsuntosProps) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
  const [filterHealth, setFilterHealth] = useState<string>('Todos');
  const [filterResponsible, setFilterResponsible] = useState<string>('Todos');
  const [filterType, setFilterType] = useState<string>('Todos');
  const [filterSubtype, setFilterSubtype] = useState<string>('Todos');
  const [filterPriority, setFilterPriority] = useState<string>('Todos');
  const [showFilters, setShowFilters] = useState(false);
  const [activeQuickFilters, setActiveQuickFilters] = useState<string[]>([]);

  const responsibles = Array.from(new Set(matters.map(m => m.responsible))).filter(Boolean);
  const types = Array.from(new Set(matters.map(m => m.type))).filter(Boolean);
  const subtypes = Array.from(new Set(matters.map(m => m.subtype))).filter(Boolean);

  const toggleQuickFilter = (filter: string) => {
    setActiveQuickFilters(prev => 
      prev.includes(filter) ? prev.filter(f => f !== filter) : [...prev, filter]
    );
  };

  const filteredMatters = matters.filter(m => {
    const matchesSearch = m.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
                         m.client.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         m.expediente?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesHealth = filterHealth === 'Todos' || m.health === filterHealth;
    const matchesResponsible = filterResponsible === 'Todos' || m.responsible === filterResponsible;
    const matchesType = filterType === 'Todos' || m.type === filterType;
    const matchesSubtype = filterSubtype === 'Todos' || m.subtype === filterSubtype;
    const matchesPriority = filterPriority === 'Todos' || m.priority === filterPriority;
    
    let matchesQuickFilters = true;
    if (activeQuickFilters.includes('Vencimiento Próx.')) {
      const days = m.nextActionDate ? differenceInDays(parseISO(m.nextActionDate), new Date()) : 999;
      if (days < 0 || days > 7) matchesQuickFilters = false;
    }
    if (activeQuickFilters.includes('Esperando Cliente') && m.health !== 'En espera') matchesQuickFilters = false;
    if (activeQuickFilters.includes('Sin Próxima Acción') && m.nextAction !== '') matchesQuickFilters = false;
    if (activeQuickFilters.includes('Sin Responsable') && m.responsible !== '') matchesQuickFilters = false;
    if (activeQuickFilters.includes('Inactivos') && m.status !== 'Pausado' && m.status !== 'Suspendido') matchesQuickFilters = false;
    
    return matchesSearch && matchesHealth && matchesResponsible && matchesType && matchesSubtype && matchesPriority && matchesQuickFilters;
  });

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <header className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-black tracking-tighter text-foreground">Lista de Asuntos</h1>
          <p className="text-xs text-muted-foreground font-bold uppercase tracking-widest mt-1">
            Gestión operativa de la cartera de asuntos
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button 
            variant={showFilters ? "secondary" : "outline"} 
            size="sm" 
            className="gap-2"
            onClick={() => setShowFilters(!showFilters)}
          >
            <Filter size={14} />
            <span>Filtros {showFilters ? 'Cerrar' : 'Avanzados'}</span>
          </Button>
          <Button className="bg-primary hover:bg-primary/90 text-primary-foreground gap-2" onClick={onCreateMatter}>
            <Plus size={16} />
            <span>Nuevo Asunto</span>
          </Button>
        </div>
      </header>

      {/* Advanced Filters Panel */}
      {showFilters && (
        <Card className="p-6 border-border/50 bg-muted/20 animate-in fade-in slide-in-from-top-4 duration-300">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Responsable</label>
              <select 
                className="w-full h-10 bg-background border border-border rounded-lg px-3 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-primary/20"
                value={filterResponsible}
                onChange={(e) => setFilterResponsible(e.target.value)}
              >
                <option value="Todos">Todos los responsables</option>
                {responsibles.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Rama / Tipo</label>
              <select 
                className="w-full h-10 bg-background border border-border rounded-lg px-3 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-primary/20"
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
              >
                <option value="Todos">Todas las ramas</option>
                {types.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Subtipo</label>
              <select 
                className="w-full h-10 bg-background border border-border rounded-lg px-3 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-primary/20"
                value={filterSubtype}
                onChange={(e) => setFilterSubtype(e.target.value)}
              >
                <option value="Todos">Todos los subtipos</option>
                {subtypes.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Prioridad</label>
              <select 
                className="w-full h-10 bg-background border border-border rounded-lg px-3 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-primary/20"
                value={filterPriority}
                onChange={(e) => setFilterPriority(e.target.value)}
              >
                <option value="Todos">Todas las prioridades</option>
                <option value="Alta">Alta</option>
                <option value="Media">Media</option>
                <option value="Baja">Baja</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Salud del Asunto</label>
              <select 
                className="w-full h-10 bg-background border border-border rounded-lg px-3 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-primary/20"
                value={filterHealth}
                onChange={(e) => setFilterHealth(e.target.value)}
              >
                <option value="Todos">Todos los estados</option>
                <option value="Sano">Sano</option>
                <option value="Trabado">Trabado</option>
                <option value="Roto">Roto</option>
                <option value="En espera">En espera</option>
              </select>
            </div>
          </div>
          <div className="mt-6 pt-4 border-t border-border/50 flex flex-wrap gap-2">
             <FilterBadge 
               label="Vencimiento Próx." 
               active={activeQuickFilters.includes('Vencimiento Próx.')} 
               onClick={() => toggleQuickFilter('Vencimiento Próx.')}
             />
             <FilterBadge 
               label="Esperando Cliente" 
               active={activeQuickFilters.includes('Esperando Cliente')} 
               onClick={() => toggleQuickFilter('Esperando Cliente')}
             />
             <FilterBadge 
               label="Sin Próxima Acción" 
               active={activeQuickFilters.includes('Sin Próxima Acción')} 
               onClick={() => toggleQuickFilter('Sin Próxima Acción')}
             />
             <FilterBadge 
               label="Sin Responsable" 
               active={activeQuickFilters.includes('Sin Responsable')} 
               onClick={() => toggleQuickFilter('Sin Responsable')}
             />
             <FilterBadge 
               label="Inactivos" 
               active={activeQuickFilters.includes('Inactivos')} 
               onClick={() => toggleQuickFilter('Inactivos')}
             />
             <button 
               onClick={() => {
                 setFilterHealth('Todos');
                 setFilterResponsible('Todos');
                 setFilterType('Todos');
                 setFilterSubtype('Todos');
                 setFilterPriority('Todos');
                 setSearchTerm('');
                 setActiveQuickFilters([]);
               }}
               className="text-[10px] font-black uppercase tracking-widest text-primary hover:underline ml-auto"
             >
               Limpiar Filtros
             </button>
          </div>
        </Card>
      )}

      {/* Search & View Controls */}
      <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="relative flex-1 w-full max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
          <Input 
            placeholder="Buscar por carátula, cliente o expediente..." 
            className="pl-10 bg-card/50 border-border/50"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-4 w-full md:w-auto">
          <div className="flex items-center gap-1 bg-muted/50 p-1 rounded-lg border border-border/50">
            <button 
              onClick={() => setViewMode('list')}
              className={cn("p-1.5 rounded-md transition-all", viewMode === 'list' ? "bg-background text-primary shadow-sm" : "text-muted-foreground")}
            >
              <ListIcon size={16} />
            </button>
            <button 
              onClick={() => setViewMode('grid')}
              className={cn("p-1.5 rounded-md transition-all", viewMode === 'grid' ? "bg-background text-primary shadow-sm" : "text-muted-foreground")}
            >
              <LayoutGrid size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* Matters List/Grid */}
      <div className={cn(
        viewMode === 'list' ? "space-y-3" : "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
      )}>
        {filteredMatters.length > 0 ? (
          filteredMatters.map((matter) => (
            <MatterItem 
              key={matter.id} 
              matter={matter} 
              viewMode={viewMode}
              onClick={() => onSelectMatter(matter.id)}
            />
          ))
        ) : (
          <div className={cn(
            "py-24 text-center border-2 border-dashed border-border/50 rounded-[2.5rem] bg-muted/5",
            viewMode === 'grid' && "col-span-full"
          )}>
            <div className="w-20 h-20 bg-muted/50 rounded-full flex items-center justify-center mx-auto mb-6">
              <ShieldAlert className="text-muted-foreground/30" size={40} />
            </div>
            <h3 className="text-lg font-black text-foreground uppercase tracking-tight">No se encontraron asuntos</h3>
            <p className="text-sm font-medium text-muted-foreground max-w-xs mx-auto mt-2">
              No hay asuntos que coincidan con los filtros seleccionados.
            </p>
            <Button 
              variant="outline" 
              size="sm" 
              className="mt-8 text-[10px] font-black uppercase tracking-widest h-10 px-6 rounded-xl"
              onClick={() => {
                setFilterHealth('Todos');
                setFilterResponsible('Todos');
                setFilterType('Todos');
                setFilterSubtype('Todos');
                setFilterPriority('Todos');
                setSearchTerm('');
                setActiveQuickFilters([]);
              }}
            >
              Limpiar Filtros
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

const FilterBadge = ({ label, active, onClick }: { label: string, active: boolean, onClick?: () => void }) => (
  <button
    onClick={onClick}
    className={cn(
      "px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border transition-all",
      active 
        ? "bg-primary/10 border-primary text-primary" 
        : "bg-background border-border text-muted-foreground hover:border-primary/30"
    )}
  >
    {label}
  </button>
);

interface MatterItemProps {
  matter: Matter;
  viewMode: 'list' | 'grid';
  onClick: () => void;
}

const MatterItem: React.FC<MatterItemProps> = ({ matter, viewMode, onClick }) => {
  const isOverdue = matter.nextActionDate && isPast(parseISO(matter.nextActionDate)) && !isToday(parseISO(matter.nextActionDate));
  const isTodayAction = matter.nextActionDate && isToday(parseISO(matter.nextActionDate));
  const daysSinceActivity = differenceInDays(new Date(), parseISO(matter.lastActivity));

  const healthStyles = {
    'Sano': 'bg-emerald-500',
    'Trabado': 'bg-amber-500',
    'Roto': 'bg-rose-600',
    'En espera': 'bg-sky-400',
  };

  const priorityStyles = {
    'Alta': 'text-rose-600 bg-rose-500/10 border-rose-500/20',
    'Media': 'text-amber-600 bg-amber-500/10 border-amber-500/20',
    'Baja': 'text-sky-600 bg-sky-500/10 border-sky-500/20',
  };

  if (viewMode === 'grid') {
    return (
      <Card 
        onClick={onClick}
        className="group border border-border hover:border-primary/50 transition-all cursor-pointer flex flex-col h-full relative overflow-hidden"
      >
        <div className={cn("absolute top-0 left-0 right-0 h-1.5", healthStyles[matter.health])} />
        
        <div className="p-5 flex flex-col flex-1 gap-4">
          <div className="flex justify-between items-start">
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-2">
                <HealthBadge health={matter.health} />
                {isOverdue && <Badge variant="error" className="animate-pulse">Vencido</Badge>}
              </div>
              <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mt-1">
                {matter.type} {matter.subtype && `• ${matter.subtype}`}
              </span>
            </div>
            <Badge className={cn("text-[8px] px-1.5 py-0", priorityStyles[matter.priority])}>
              {matter.priority}
            </Badge>
          </div>

          <div className="space-y-1">
            <h3 className="font-bold text-foreground group-hover:text-primary transition-colors text-lg tracking-tight leading-tight">
              {matter.title}
            </h3>
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">{matter.client}</p>
          </div>

          {matter.health === 'Trabado' && matter.blockage && (
            <div className="bg-amber-500/5 border border-amber-500/20 rounded-xl p-3 flex items-start gap-2">
              <ShieldAlert size={14} className="text-amber-500 shrink-0 mt-0.5" />
              <div className="flex flex-col">
                <span className="text-[9px] font-black text-amber-600 uppercase tracking-widest">Bloqueo Actual</span>
                <span className="text-xs font-medium text-amber-700 leading-tight">{matter.blockage}</span>
              </div>
            </div>
          )}

            <div className="mt-auto space-y-3 pt-4 border-t border-border/50">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center text-muted-foreground shrink-0">
                    {matter.nextActionType ? React.createElement(ACTION_ICONS[matter.nextActionType], { size: 16 }) : <Zap size={16} />}
                  </div>
                  <div className="flex flex-col min-w-0">
                    <span className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">Próxima Acción</span>
                    <span className="text-xs font-bold text-foreground truncate">{matter.nextAction || 'Sin definir'}</span>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <span className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">Fecha</span>
                  <div className={cn(
                    "text-xs font-black flex items-center gap-1 justify-end",
                    isOverdue ? "text-rose-600" : isTodayAction ? "text-amber-600" : "text-foreground"
                  )}>
                    <Calendar size={12} />
                    {matter.nextActionDate ? format(parseISO(matter.nextActionDate), 'd MMM', { locale: es }) : '--'}
                  </div>
                </div>
              </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-[9px] font-black text-primary border border-primary/20">
                  {matter.responsible.split(' ').map(n => n[0]).join('')}
                </div>
                <span className="text-[11px] font-bold text-muted-foreground">{matter.responsible.split(' ').pop()}</span>
              </div>
              <div className="flex items-center gap-1 text-[10px] font-bold text-muted-foreground">
                <History size={12} />
                <span>hace {daysSinceActivity}d</span>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Actions Overlay on Hover */}
        <div className="absolute inset-x-0 bottom-0 bg-background/95 backdrop-blur-sm border-t border-border p-3 translate-y-full group-hover:translate-y-0 transition-transform duration-300 flex items-center justify-around">
          <QuickAction icon={ExternalLink} label="Abrir" onClick={(e) => { e.stopPropagation(); onClick(); }} />
          <QuickAction icon={FilePlus} label="Acción" onClick={(e) => { e.stopPropagation(); }} />
          <QuickAction icon={History} label="Mov." onClick={(e) => { e.stopPropagation(); }} />
          <QuickAction icon={UserCog} label="Resp." onClick={(e) => { e.stopPropagation(); }} />
          <QuickAction icon={CheckCircle2} label="Cerrar" onClick={(e) => { e.stopPropagation(); }} />
        </div>
      </Card>
    );
  }

  return (
    <Card 
      onClick={onClick}
      className="group border border-border hover:bg-muted/30 transition-all cursor-pointer relative overflow-hidden"
    >
      <div className={cn("absolute left-0 top-0 bottom-0 w-1.5", healthStyles[matter.health])} />
      
      <div className="p-4 flex flex-col lg:flex-row lg:items-center gap-4 lg:gap-8">
        {/* Status & ID */}
        <div className="flex items-center gap-4 lg:w-40 shrink-0">
          <HealthBadge health={matter.health} />
          <div className="flex flex-col">
            <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest leading-none">
              {matter.type}
            </span>
            {matter.expediente && (
              <span className="font-mono text-[9px] text-muted-foreground mt-1">{matter.expediente}</span>
            )}
          </div>
        </div>

        {/* Title & Client */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <h3 className="font-bold text-foreground truncate text-base tracking-tight group-hover:text-primary transition-colors">
              {matter.title}
            </h3>
            {matter.priority === 'Alta' && <Flag size={12} className="text-rose-500 fill-rose-500" />}
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">{matter.client}</span>
            {matter.subtype && (
              <>
                <span className="text-muted-foreground/30">•</span>
                <span className="text-[10px] font-bold text-muted-foreground/70 uppercase tracking-widest">{matter.subtype}</span>
              </>
            )}
          </div>
        </div>

        {/* Operational Info */}
        <div className="flex flex-col sm:flex-row gap-4 lg:gap-8 flex-[1.5]">
          <div className="flex-1 min-w-0">
            <div className="text-[9px] font-black text-muted-foreground uppercase tracking-[0.2em] mb-1">
              {matter.health === 'Trabado' ? 'Bloqueo / Próxima' : 'Próxima Acción'}
            </div>
            <div className="flex items-center gap-3">
              <div className="w-6 h-6 rounded-md bg-muted/50 flex items-center justify-center text-muted-foreground shrink-0">
                {matter.nextActionType ? React.createElement(ACTION_ICONS[matter.nextActionType], { size: 12 }) : <Zap size={12} />}
              </div>
              <div className="flex flex-col gap-1 min-w-0">
                <div className={cn(
                  "text-xs font-bold truncate",
                  matter.health === 'Roto' ? "text-rose-500 italic" : "text-foreground"
                )}>
                  {matter.nextAction || 'Falta definir acción'}
                </div>
                {matter.health === 'Trabado' && matter.blockage && (
                  <div className="text-[10px] font-medium text-amber-600 truncate flex items-center gap-1">
                    <ShieldAlert size={10} />
                    {matter.blockage}
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-6 shrink-0">
            <div className="text-right">
              <div className="text-[9px] font-black text-muted-foreground uppercase tracking-[0.2em] mb-1">Fecha Clave</div>
              <div className={cn(
                "text-xs font-black flex items-center justify-end gap-1.5",
                isOverdue ? "text-rose-600" : isTodayAction ? "text-amber-600" : "text-foreground"
              )}>
                <Calendar size={14} />
                {matter.nextActionDate ? format(parseISO(matter.nextActionDate), 'd MMM', { locale: es }) : '--'}
              </div>
            </div>

            <div className="text-right w-24">
              <div className="text-[9px] font-black text-muted-foreground uppercase tracking-[0.2em] mb-1">Responsable</div>
              <div className="flex items-center gap-2 justify-end">
                <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-[9px] font-black text-primary border border-primary/20">
                  {matter.responsible.split(' ').map(n => n[0]).join('')}
                </div>
                <span className="text-xs font-bold text-foreground">{matter.responsible.split(' ').pop()}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1 shrink-0 border-l border-border/50 pl-4">
          <button className="p-2 text-muted-foreground hover:text-primary hover:bg-primary/5 rounded-lg transition-all" title="Abrir Asunto" onClick={(e) => { e.stopPropagation(); onClick(); }}>
            <ExternalLink size={16} />
          </button>
          <button className="p-2 text-muted-foreground hover:text-primary hover:bg-primary/5 rounded-lg transition-all" title="Nueva Acción" onClick={(e) => { e.stopPropagation(); }}>
            <FilePlus size={16} />
          </button>
          <button className="p-2 text-muted-foreground hover:text-primary hover:bg-primary/5 rounded-lg transition-all" title="Registrar Movimiento" onClick={(e) => { e.stopPropagation(); }}>
            <History size={16} />
          </button>
          <button className="p-2 text-muted-foreground hover:text-primary hover:bg-primary/5 rounded-lg transition-all" title="Cambiar Responsable" onClick={(e) => { e.stopPropagation(); }}>
            <UserCog size={16} />
          </button>
          <button className="p-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-all" title="Más opciones" onClick={(e) => { e.stopPropagation(); }}>
            <MoreVertical size={16} />
          </button>
        </div>
      </div>
    </Card>
  );
};

const QuickAction = ({ icon: Icon, label, onClick }: { icon: any, label: string, onClick: (e: React.MouseEvent) => void }) => (
  <button 
    onClick={onClick}
    className="flex flex-col items-center gap-1 p-2 rounded-lg hover:bg-primary/10 text-muted-foreground hover:text-primary transition-all"
  >
    <Icon size={16} />
    <span className="text-[8px] font-black uppercase tracking-widest">{label}</span>
  </button>
);

const HealthBadge = ({ health }: { health: Matter['health'] }) => {
  const styles = {
    'Sano': 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
    'Trabado': 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20',
    'Roto': 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20',
    'En espera': 'bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/20',
  };

  return (
    <span className={cn(
      'px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-[0.15em] border text-center inline-block',
      styles[health]
    )}>
      {health}
    </span>
  );
};
