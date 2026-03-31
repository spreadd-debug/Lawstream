import React from 'react';
import { Card, Badge, Button } from './UI';
import { Matter, Consultation } from '../types';
import {
  Calendar,
  Clock,
  AlertCircle,
  ShieldAlert,
  ChevronRight,
  User,
  Filter,
  ArrowUpRight,
  Zap,
  CheckCircle2,
  MessageSquare,
} from 'lucide-react';
import { format, parseISO, isPast, isToday, addDays, isSameDay } from 'date-fns';
import { es } from 'date-fns/locale';
import { cn } from '../lib/utils';

interface VencimientosProps {
  matters: Matter[];
  consultations?: Consultation[];
  onSelectMatter: (id: string) => void;
  onSelectConsultation?: (c: Consultation) => void;
}

// Consultas agendadas como eventos de agenda
interface AgendaEvent {
  id: string;
  title: string;
  subtitle: string;
  date: Date;
  type: 'matter' | 'consultation';
  matterId?: string;
  consultation?: Consultation;
}

export const Vencimientos = ({ matters, consultations = [], onSelectMatter, onSelectConsultation }: VencimientosProps) => {
  const now = new Date();

  // Build unified event list
  const matterEvents: AgendaEvent[] = matters
    .filter(m => m.nextActionDate)
    .map(m => ({
      id: m.id,
      title: m.title,
      subtitle: `${m.nextAction} · ${m.client}`,
      date: parseISO(m.nextActionDate),
      type: 'matter' as const,
      matterId: m.id,
    }));

  const consultationEvents: AgendaEvent[] = consultations
    .filter(c => c.scheduledAt && !['Rechazada', 'Archivada', 'Aceptada'].includes(c.status))
    .map(c => ({
      id: c.id,
      title: `Entrevista: ${c.name}`,
      subtitle: `${c.type ?? 'Consulta'} · ${format(parseISO(c.scheduledAt!), "HH:mm", { locale: es })}hs`,
      date: parseISO(c.scheduledAt!),
      type: 'consultation' as const,
      consultation: c,
    }));

  const allEvents = [...matterEvents, ...consultationEvents];

  const overdue       = allEvents.filter(e => isPast(e.date) && !isToday(e.date));
  const today         = allEvents.filter(e => isToday(e.date));
  const tomorrow      = allEvents.filter(e => isSameDay(e.date, addDays(now, 1)));
  const nextThreeDays = allEvents.filter(e => {
    return !isPast(e.date) && !isToday(e.date) && !isSameDay(e.date, addDays(now, 1)) && e.date <= addDays(now, 3);
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
              {overdue.map(e => (
                <AgendaItem key={e.id} event={e} variant="error"
                  onClick={() => e.type === 'matter' ? onSelectMatter(e.matterId!) : onSelectConsultation?.(e.consultation!)} />
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
            <h2 className="text-sm font-black text-amber-600 uppercase tracking-widest">Hoy</h2>
            <Badge className="bg-amber-500 text-white text-[10px] font-black uppercase tracking-wider">{today.length}</Badge>
          </div>
          <div className="space-y-3">
            {today.length > 0 ? (
              today.map(e => (
                <AgendaItem key={e.id} event={e} variant="warning"
                  onClick={() => e.type === 'matter' ? onSelectMatter(e.matterId!) : onSelectConsultation?.(e.consultation!)} />
              ))
            ) : (
              <div className="flex items-center gap-2.5 py-4 px-4 bg-emerald-500/5 border border-emerald-500/15 rounded-xl">
                <CheckCircle2 size={15} className="text-emerald-600 shrink-0" />
                <span className="text-xs font-bold text-emerald-700 dark:text-emerald-400">Sin eventos para hoy</span>
              </div>
            )}
          </div>
        </section>

        {/* Mañana — con énfasis especial para entrevistas (recordatorio) */}
        <section className="space-y-4">
          <div className="flex items-center gap-3 border-b border-border pb-3">
            <div className="w-8 h-8 bg-muted rounded-lg flex items-center justify-center">
              <Clock size={18} className="text-muted-foreground" />
            </div>
            <h2 className="text-sm font-black text-foreground uppercase tracking-widest">Mañana</h2>
          </div>
          <div className="space-y-3">
            {tomorrow.length > 0 ? (
              tomorrow.map(e => (
                <AgendaItem key={e.id} event={e} variant="default"
                  onClick={() => e.type === 'matter' ? onSelectMatter(e.matterId!) : onSelectConsultation?.(e.consultation!)} />
              ))
            ) : (
              <div className="flex items-center gap-2.5 py-4 px-4 bg-muted/30 border border-border/50 rounded-xl">
                <CheckCircle2 size={15} className="text-muted-foreground shrink-0" />
                <span className="text-xs font-bold text-muted-foreground">Sin eventos para mañana</span>
              </div>
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
              {nextThreeDays.map(e => (
                <AgendaItem key={e.id} event={e} variant="default"
                  onClick={() => e.type === 'matter' ? onSelectMatter(e.matterId!) : onSelectConsultation?.(e.consultation!)} />
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
};

interface AgendaItemProps {
  event: AgendaEvent;
  onClick: () => void;
  variant: 'error' | 'warning' | 'default';
}

const AgendaItem: React.FC<AgendaItemProps> = ({ event, onClick, variant }) => {
  const borderStyles = {
    error: 'border-rose-500/20 hover:bg-rose-500/5',
    warning: 'border-amber-500/20 hover:bg-amber-500/5',
    default: 'border-border hover:bg-muted/30',
  };
  const dateStyles = {
    error: 'text-rose-600',
    warning: 'text-amber-600',
    default: 'text-foreground',
  };

  const isConsultation = event.type === 'consultation';

  return (
    <Card
      onClick={onClick}
      className={cn(
        'p-4 border transition-all cursor-pointer group flex flex-col md:flex-row md:items-center gap-4',
        borderStyles[variant],
        isConsultation && 'border-l-4 border-l-primary/40',
      )}
    >
      {/* Icon */}
      <div className={cn(
        'w-9 h-9 rounded-xl flex items-center justify-center shrink-0',
        isConsultation ? 'bg-primary/10' : 'bg-muted',
      )}>
        {isConsultation
          ? <MessageSquare size={16} className="text-primary" />
          : <AlertCircle size={16} className="text-muted-foreground" />
        }
      </div>

      {/* Title + subtitle */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <h3 className="font-bold text-foreground text-sm tracking-tight group-hover:text-primary transition-colors truncate">
            {event.title}
          </h3>
          {isConsultation && (
            <span className="px-1.5 py-0.5 rounded bg-primary/10 text-[8px] font-black uppercase tracking-wider text-primary border border-primary/20 shrink-0">
              Entrevista
            </span>
          )}
        </div>
        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mt-0.5 truncate">
          {event.subtitle}
        </p>
      </div>

      {/* Date */}
      <div className={cn('text-xs font-black flex items-center gap-1.5 shrink-0', dateStyles[variant])}>
        <Clock size={13} />
        {isConsultation
          ? format(event.date, "d MMM · HH:mm'hs'", { locale: es })
          : format(event.date, "d 'de' MMM", { locale: es })
        }
      </div>

      <div className="p-1.5 text-muted-foreground group-hover:text-primary transition-colors">
        <ArrowUpRight size={16} />
      </div>
    </Card>
  );
};
