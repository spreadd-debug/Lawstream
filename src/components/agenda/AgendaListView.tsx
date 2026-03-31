import React from 'react';
import { Card } from '../UI';
import {
  Clock,
  ShieldAlert,
  Zap,
  Calendar,
  CheckCircle2,
  ArrowUpRight,
} from 'lucide-react';
import { format, isPast, isToday, addDays, isSameDay } from 'date-fns';
import { es } from 'date-fns/locale';
import { cn } from '../../lib/utils';
import { AgendaEvent, getCategoryDef } from './agendaUtils';

interface AgendaListViewProps {
  events: AgendaEvent[];
  onSelect: (event: AgendaEvent) => void;
}

export const AgendaListView: React.FC<AgendaListViewProps> = ({ events, onSelect }) => {
  const now = new Date();

  const overdue = events.filter(e => isPast(e.date) && !isToday(e.date));
  const today = events.filter(e => isToday(e.date));
  const tomorrow = events.filter(e => isSameDay(e.date, addDays(now, 1)));
  const nextWeek = events.filter(e => {
    return !isPast(e.date) && !isToday(e.date) && !isSameDay(e.date, addDays(now, 1))
      && e.date <= addDays(now, 7);
  });

  return (
    <div className="space-y-10">
      {/* Vencidos */}
      {overdue.length > 0 && (
        <Section
          icon={<ShieldAlert size={18} className="text-rose-600" />}
          title="Vencidos"
          titleColor="text-rose-600"
          borderColor="border-rose-500/20"
          iconBg="bg-rose-500/20"
          badge={overdue.length}
          badgeClass="bg-rose-500 text-white"
        >
          {overdue.map(e => <AgendaItem key={e.id} event={e} urgency="error" onClick={() => onSelect(e)} />)}
        </Section>
      )}

      {/* Hoy */}
      <Section
        icon={<Zap size={18} className="text-amber-600 fill-amber-600" />}
        title="Hoy"
        titleColor="text-amber-600"
        borderColor="border-amber-500/20"
        iconBg="bg-amber-500/20"
        badge={today.length}
        badgeClass="bg-amber-500 text-white"
      >
        {today.length > 0 ? (
          today.map(e => <AgendaItem key={e.id} event={e} urgency="warning" onClick={() => onSelect(e)} />)
        ) : (
          <EmptyState text="Sin eventos para hoy" variant="success" />
        )}
      </Section>

      {/* Mañana */}
      <Section
        icon={<Clock size={18} className="text-muted-foreground" />}
        title="Mañana"
        titleColor="text-foreground"
        borderColor="border-border"
        iconBg="bg-muted"
      >
        {tomorrow.length > 0 ? (
          tomorrow.map(e => <AgendaItem key={e.id} event={e} onClick={() => onSelect(e)} />)
        ) : (
          <EmptyState text="Sin eventos para mañana" />
        )}
      </Section>

      {/* Próximos 7 días */}
      {nextWeek.length > 0 && (
        <Section
          icon={<Calendar size={18} className="text-muted-foreground" />}
          title="Próximos 7 días"
          titleColor="text-foreground"
          borderColor="border-border"
          iconBg="bg-muted"
        >
          {nextWeek.map(e => <AgendaItem key={e.id} event={e} onClick={() => onSelect(e)} />)}
        </Section>
      )}
    </div>
  );
};

// ── Section wrapper ──────────────────────────────────────────────

interface SectionProps {
  icon: React.ReactNode;
  title: string;
  titleColor: string;
  borderColor: string;
  iconBg: string;
  badge?: number;
  badgeClass?: string;
  children: React.ReactNode;
}

const Section: React.FC<SectionProps> = ({ icon, title, titleColor, borderColor, iconBg, badge, badgeClass, children }) => (
  <section className="space-y-4">
    <div className={cn('flex items-center gap-3 border-b pb-3', borderColor)}>
      <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center', iconBg)}>
        {icon}
      </div>
      <h2 className={cn('text-sm font-black uppercase tracking-widest', titleColor)}>{title}</h2>
      {badge !== undefined && (
        <span className={cn('px-1.5 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider', badgeClass || 'bg-muted text-muted-foreground')}>
          {badge}
        </span>
      )}
    </div>
    <div className="space-y-3">{children}</div>
  </section>
);

// ── Empty state ──────────────────────────────────────────────────

const EmptyState: React.FC<{ text: string; variant?: 'success' | 'default' }> = ({ text, variant = 'default' }) => (
  <div className={cn(
    'flex items-center gap-2.5 py-4 px-4 rounded-xl',
    variant === 'success'
      ? 'bg-emerald-500/5 border border-emerald-500/15'
      : 'bg-muted/30 border border-border/50'
  )}>
    <CheckCircle2 size={15} className={cn('shrink-0', variant === 'success' ? 'text-emerald-600' : 'text-muted-foreground')} />
    <span className={cn('text-xs font-bold', variant === 'success' ? 'text-emerald-700 dark:text-emerald-400' : 'text-muted-foreground')}>
      {text}
    </span>
  </div>
);

// ── Agenda item card ─────────────────────────────────────────────

interface AgendaItemProps {
  event: AgendaEvent;
  urgency?: 'error' | 'warning';
  onClick: () => void;
}

const AgendaItem: React.FC<AgendaItemProps> = ({ event, urgency, onClick }) => {
  const cat = getCategoryDef(event.category);
  const CatIcon = cat.icon;

  const hoverStyles = {
    error: 'hover:bg-rose-500/5',
    warning: 'hover:bg-amber-500/5',
  };
  const dateStyles = {
    error: 'text-rose-600',
    warning: 'text-amber-600',
  };

  return (
    <Card
      onClick={onClick}
      className={cn(
        'p-4 border border-l-4 transition-all cursor-pointer group flex flex-col md:flex-row md:items-center gap-4',
        cat.border,
        urgency ? `border-t-border border-r-border border-b-border ${hoverStyles[urgency]}` : 'border-t-border border-r-border border-b-border hover:bg-muted/30',
      )}
    >
      {/* Category icon */}
      <div className={cn('w-9 h-9 rounded-xl flex items-center justify-center shrink-0', cat.bg)}>
        <CatIcon size={16} className={cat.text} />
      </div>

      {/* Title + subtitle */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <h3 className="font-bold text-foreground text-sm tracking-tight group-hover:text-primary transition-colors truncate">
            {event.title}
          </h3>
          <span className={cn('px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-wider border shrink-0', cat.bg, cat.text, `border-current/20`)}>
            {cat.label.slice(0, -1)}
          </span>
        </div>
        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mt-0.5 truncate">
          {event.subtitle}
        </p>
      </div>

      {/* Date */}
      <div className={cn('text-xs font-black flex items-center gap-1.5 shrink-0', urgency ? dateStyles[urgency] : 'text-foreground')}>
        <Clock size={13} />
        {event.source === 'consultation'
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
