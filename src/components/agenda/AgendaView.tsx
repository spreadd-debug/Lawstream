import React, { useState, useMemo, useCallback } from 'react';
import { List, CalendarDays } from 'lucide-react';
import { cn } from '../../lib/utils';
import type { Matter, Consultation } from '../../types';
import {
  AgendaEventCategory,
  AGENDA_CATEGORIES,
  buildAgendaEvents,
  AgendaEvent,
} from './agendaUtils';
import { AgendaListView } from './AgendaListView';
import { AgendaCalendarGrid } from './AgendaCalendarGrid';

interface AgendaViewProps {
  matters: Matter[];
  consultations: Consultation[];
  onSelectMatter: (id: string) => void;
  onSelectConsultation?: (c: Consultation) => void;
}

export const AgendaView: React.FC<AgendaViewProps> = ({
  matters,
  consultations,
  onSelectMatter,
  onSelectConsultation,
}) => {
  const [viewMode, setViewMode] = useState<'lista' | 'calendario'>('lista');
  const [activeCategories, setActiveCategories] = useState<Set<AgendaEventCategory>>(
    () => new Set(AGENDA_CATEGORIES.map(c => c.id))
  );
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  // Build + filter events
  const allEvents = useMemo(
    () => buildAgendaEvents(matters, consultations),
    [matters, consultations]
  );
  const filteredEvents = useMemo(
    () => allEvents.filter(e => activeCategories.has(e.category)),
    [allEvents, activeCategories]
  );

  const toggleCategory = (cat: AgendaEventCategory) => {
    setActiveCategories(prev => {
      const next = new Set(prev);
      if (next.has(cat)) next.delete(cat);
      else next.add(cat);
      return next;
    });
  };

  const handleSelectEvent = useCallback((event: AgendaEvent) => {
    if (event.source === 'matter' && event.matterId) {
      onSelectMatter(event.matterId);
    } else if (event.source === 'consultation' && event.consultation) {
      onSelectConsultation?.(event.consultation);
    }
  }, [onSelectMatter, onSelectConsultation]);

  // Count events per category for badges
  const categoryCounts = useMemo(() => {
    const counts = new Map<AgendaEventCategory, number>();
    for (const e of allEvents) {
      counts.set(e.category, (counts.get(e.category) || 0) + 1);
    }
    return counts;
  }, [allEvents]);

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      {/* Header */}
      <header className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-black tracking-tighter text-foreground">Agenda</h1>
          <p className="text-xs text-muted-foreground font-bold uppercase tracking-widest mt-1">
            Plazos, entrevistas y eventos del estudio
          </p>
        </div>

        {/* View toggle */}
        <div className="flex items-center rounded-xl border border-border overflow-hidden bg-muted/30">
          <button
            onClick={() => setViewMode('lista')}
            className={cn(
              'flex items-center gap-2 px-4 py-2 text-xs font-bold transition-all',
              viewMode === 'lista'
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted'
            )}
          >
            <List size={14} />
            Lista
          </button>
          <button
            onClick={() => setViewMode('calendario')}
            className={cn(
              'flex items-center gap-2 px-4 py-2 text-xs font-bold transition-all',
              viewMode === 'calendario'
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted'
            )}
          >
            <CalendarDays size={14} />
            Calendario
          </button>
        </div>
      </header>

      {/* Filter chips */}
      <div className="flex flex-wrap gap-2">
        {AGENDA_CATEGORIES.map(cat => {
          const active = activeCategories.has(cat.id);
          const count = categoryCounts.get(cat.id) || 0;
          return (
            <button
              key={cat.id}
              onClick={() => toggleCategory(cat.id)}
              className={cn(
                'flex items-center gap-2 px-3.5 py-2 rounded-xl border text-xs font-bold transition-all',
                active
                  ? `${cat.bg} ${cat.text} border-current/20 shadow-sm`
                  : 'border-border text-muted-foreground hover:text-foreground hover:border-primary/30 opacity-50'
              )}
            >
              <div className={cn('w-2 h-2 rounded-full', active ? cat.dot : 'bg-muted-foreground/30')} />
              {cat.label}
              {count > 0 && (
                <span className={cn(
                  'px-1.5 py-0.5 rounded-md text-[9px] font-black',
                  active ? 'bg-white/20 dark:bg-black/20' : 'bg-muted'
                )}>
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Content */}
      {viewMode === 'lista' ? (
        <AgendaListView events={filteredEvents} onSelect={handleSelectEvent} />
      ) : (
        <AgendaCalendarGrid
          events={filteredEvents}
          currentMonth={currentMonth}
          selectedDate={selectedDate}
          onMonthChange={setCurrentMonth}
          onSelectDate={setSelectedDate}
          onSelectEvent={handleSelectEvent}
        />
      )}
    </div>
  );
};
