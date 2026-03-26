import React from 'react';
import { Card, Badge, Button } from './UI';
import { Matter } from '../types';
import { 
  Calendar, 
  Clock, 
  AlertCircle, 
  ShieldAlert, 
  ChevronRight, 
  User, 
  Filter,
  ArrowUpRight,
  Zap
} from 'lucide-react';
import { format, parseISO, isPast, isToday, addDays, isSameDay } from 'date-fns';
import { es } from 'date-fns/locale';
import { cn } from '../lib/utils';

interface VencimientosProps {
  matters: Matter[];
  onSelectMatter: (id: string) => void;
}

export const Vencimientos = ({ matters, onSelectMatter }: VencimientosProps) => {
  const now = new Date();
  
  const overdue = matters.filter(m => m.nextActionDate && isPast(parseISO(m.nextActionDate)) && !isToday(parseISO(m.nextActionDate)));
  const today = matters.filter(m => m.nextActionDate && isToday(parseISO(m.nextActionDate)));
  const tomorrow = matters.filter(m => m.nextActionDate && isSameDay(parseISO(m.nextActionDate), addDays(now, 1)));
  const nextThreeDays = matters.filter(m => {
    if (!m.nextActionDate) return false;
    const date = parseISO(m.nextActionDate);
    return isPast(date) === false && !isToday(date) && !isSameDay(date, addDays(now, 1)) && date <= addDays(now, 3);
  });
  const upcoming = matters.filter(m => {
    if (!m.nextActionDate) return false;
    const date = parseISO(m.nextActionDate);
    return date > addDays(now, 3);
  });

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      <header className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-black tracking-tighter text-foreground">Agenda de Vencimientos</h1>
          <p className="text-xs text-muted-foreground font-bold uppercase tracking-widest mt-1">
            Control de plazos críticos y próximas acciones
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="gap-2">
            <Filter size={14} />
            <span>Filtros</span>
          </Button>
          <Button className="bg-primary hover:bg-primary/90 text-primary-foreground gap-2">
            <Calendar size={16} />
            <span>Ver Calendario</span>
          </Button>
        </div>
      </header>

      <div className="space-y-10">
        {/* Vencidos */}
        {overdue.length > 0 && (
          <section className="space-y-4">
            <div className="flex items-center gap-3 border-b border-rose-500/20 pb-3">
              <div className="w-8 h-8 bg-rose-500/20 rounded-lg flex items-center justify-center">
                <ShieldAlert size={18} className="text-rose-600" />
              </div>
              <h2 className="text-sm font-black text-rose-600 uppercase tracking-widest">Vencidos</h2>
              <Badge variant="destructive" className="text-[10px] font-black uppercase tracking-wider">{overdue.length}</Badge>
            </div>
            <div className="space-y-3">
              {overdue.map(matter => (
                <DeadlineItem key={matter.id} matter={matter} onClick={() => onSelectMatter(matter.id)} variant="error" />
              ))}
            </div>
          </section>
        )}

        {/* Hoy */}
        <section className="space-y-4">
          <div className="flex items-center gap-3 border-b border-amber-500/20 pb-3">
            <div className="w-8 h-8 bg-amber-500/20 rounded-lg flex items-center justify-center">
              <Zap size={18} className="text-amber-600 fill-amber-600" />
            </div>
            <h2 className="text-sm font-black text-amber-600 uppercase tracking-widest">Vence Hoy</h2>
            <Badge className="bg-amber-500 text-white text-[10px] font-black uppercase tracking-wider">{today.length}</Badge>
          </div>
          <div className="space-y-3">
            {today.length > 0 ? (
              today.map(matter => (
                <DeadlineItem key={matter.id} matter={matter} onClick={() => onSelectMatter(matter.id)} variant="warning" />
              ))
            ) : (
              <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest py-4 text-center">No hay vencimientos para hoy</p>
            )}
          </div>
        </section>

        {/* Mañana */}
        <section className="space-y-4">
          <div className="flex items-center gap-3 border-b border-border pb-3">
            <div className="w-8 h-8 bg-muted rounded-lg flex items-center justify-center">
              <Clock size={18} className="text-muted-foreground" />
            </div>
            <h2 className="text-sm font-black text-foreground uppercase tracking-widest">Mañana</h2>
          </div>
          <div className="space-y-3">
            {tomorrow.length > 0 ? (
              tomorrow.map(matter => (
                <DeadlineItem key={matter.id} matter={matter} onClick={() => onSelectMatter(matter.id)} variant="default" />
              ))
            ) : (
              <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest py-4 text-center">No hay vencimientos para mañana</p>
            )}
          </div>
        </section>

        {/* Próximos 3 días */}
        {nextThreeDays.length > 0 && (
          <section className="space-y-4">
            <div className="flex items-center gap-3 border-b border-border pb-3">
              <div className="w-8 h-8 bg-muted rounded-lg flex items-center justify-center">
                <Calendar size={18} className="text-muted-foreground" />
              </div>
              <h2 className="text-sm font-black text-foreground uppercase tracking-widest">Próximos 3 días</h2>
            </div>
            <div className="space-y-3">
              {nextThreeDays.map(matter => (
                <DeadlineItem key={matter.id} matter={matter} onClick={() => onSelectMatter(matter.id)} variant="default" />
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
};

interface DeadlineItemProps {
  matter: Matter;
  onClick: () => void;
  variant: 'error' | 'warning' | 'default';
}

const DeadlineItem: React.FC<DeadlineItemProps> = ({ matter, onClick, variant }) => {
  const styles = {
    error: 'border-rose-500/20 hover:bg-rose-500/5',
    warning: 'border-amber-500/20 hover:bg-amber-500/5',
    default: 'border-border hover:bg-muted/30',
  };

  const textStyles = {
    error: 'text-rose-600',
    warning: 'text-amber-600',
    default: 'text-foreground',
  };

  return (
    <Card 
      onClick={onClick}
      className={cn(
        "p-4 border transition-all cursor-pointer group flex flex-col md:flex-row md:items-center gap-6",
        styles[variant]
      )}
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <h3 className="font-bold text-foreground truncate text-base tracking-tight group-hover:text-primary transition-colors">
            {matter.title}
          </h3>
          <span className="px-1.5 py-0.5 rounded bg-muted text-[9px] font-black uppercase tracking-wider text-muted-foreground border border-border">
            {matter.type}
          </span>
        </div>
        <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">{matter.client}</p>
      </div>

      <div className="flex-[1.5] bg-muted/50 rounded-xl p-3 border border-border/50">
        <div className="text-[9px] font-black text-muted-foreground uppercase tracking-[0.2em] mb-1">Próxima Acción</div>
        <div className="text-xs font-bold text-foreground truncate">
          {matter.nextAction || 'Sin próxima acción'}
        </div>
      </div>

      <div className="flex items-center gap-8 md:w-64 justify-between md:justify-end">
        <div className="text-right">
          <div className="text-[9px] font-black text-muted-foreground uppercase tracking-[0.2em] mb-1">Vencimiento</div>
          <div className={cn(
            "text-xs font-black flex items-center justify-end gap-1.5",
            textStyles[variant]
          )}>
            <Clock size={14} />
            {matter.nextActionDate ? format(parseISO(matter.nextActionDate), "d 'de' MMM", { locale: es }) : '--'}
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
        <div className="p-2 text-muted-foreground group-hover:text-primary transition-colors">
          <ArrowUpRight size={18} />
        </div>
      </div>
    </Card>
  );
};
