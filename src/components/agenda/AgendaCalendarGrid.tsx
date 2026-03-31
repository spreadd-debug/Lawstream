import React, { useMemo } from 'react';
import { Card } from '../UI';
import {
  ChevronLeft,
  ChevronRight,
  Clock,
  ArrowUpRight,
  CalendarDays,
} from 'lucide-react';
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  addMonths,
  isSameMonth,
  isSameDay,
  isToday,
} from 'date-fns';
import { es } from 'date-fns/locale';
import { cn } from '../../lib/utils';
import {
  AgendaEvent,
  AgendaEventCategory,
  getCategoryDef,
  getEventsForDay,
} from './agendaUtils';

const WEEKDAYS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

interface AgendaCalendarGridProps {
  events: AgendaEvent[];
  currentMonth: Date;
  selectedDate: Date | null;
  onMonthChange: (date: Date) => void;
  onSelectDate: (date: Date) => void;
  onSelectEvent: (event: AgendaEvent) => void;
}

export const AgendaCalendarGrid: React.FC<AgendaCalendarGridProps> = ({
  events,
  currentMonth,
  selectedDate,
  onMonthChange,
  onSelectDate,
  onSelectEvent,
}) => {
  // Build grid days (6 rows x 7 cols, week starts Monday)
  const days = useMemo(() => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    const gridStart = startOfWeek(monthStart, { weekStartsOn: 1 });
    const gridEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
    return eachDayOfInterval({ start: gridStart, end: gridEnd });
  }, [currentMonth]);

  // Pre-compute category dots per day
  const dayCategories = useMemo(() => {
    const map = new Map<string, Set<AgendaEventCategory>>();
    for (const e of events) {
      const key = format(e.date, 'yyyy-MM-dd');
      if (!map.has(key)) map.set(key, new Set());
      map.get(key)!.add(e.category);
    }
    return map;
  }, [events]);

  // Events for selected day
  const selectedDayEvents = useMemo(
    () => selectedDate ? getEventsForDay(events, selectedDate) : [],
    [events, selectedDate]
  );

  const goToToday = () => {
    onMonthChange(new Date());
    onSelectDate(new Date());
  };

  return (
    <div className="space-y-6">
      {/* Month navigation */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button
            onClick={() => onMonthChange(addMonths(currentMonth, -1))}
            className="p-2 hover:bg-muted rounded-xl transition-colors text-muted-foreground hover:text-foreground"
          >
            <ChevronLeft size={18} />
          </button>
          <h2 className="text-lg font-black tracking-tight capitalize min-w-[160px] text-center">
            {format(currentMonth, 'MMMM yyyy', { locale: es })}
          </h2>
          <button
            onClick={() => onMonthChange(addMonths(currentMonth, 1))}
            className="p-2 hover:bg-muted rounded-xl transition-colors text-muted-foreground hover:text-foreground"
          >
            <ChevronRight size={18} />
          </button>
        </div>
        <button
          onClick={goToToday}
          className="px-3 py-1.5 text-xs font-bold rounded-xl border border-border hover:bg-muted transition-colors"
        >
          Hoy
        </button>
      </div>

      {/* Calendar grid */}
      <div className="border border-border rounded-2xl overflow-hidden bg-card">
        {/* Weekday headers */}
        <div className="grid grid-cols-7 border-b border-border">
          {WEEKDAYS.map(d => (
            <div key={d} className="py-2.5 text-center text-[10px] font-black uppercase tracking-widest text-muted-foreground">
              {d}
            </div>
          ))}
        </div>

        {/* Day cells */}
        <div className="grid grid-cols-7">
          {days.map((day, i) => {
            const inMonth = isSameMonth(day, currentMonth);
            const today = isToday(day);
            const selected = selectedDate && isSameDay(day, selectedDate);
            const key = format(day, 'yyyy-MM-dd');
            const cats = dayCategories.get(key);
            const uniqueCats = cats ? [...cats].slice(0, 4) : [] as AgendaEventCategory[];

            return (
              <button
                key={i}
                onClick={() => onSelectDate(day)}
                className={cn(
                  'relative flex flex-col items-center justify-start py-2 min-h-[72px] border-b border-r border-border/50 transition-all hover:bg-muted/50',
                  !inMonth && 'opacity-30',
                  selected && 'bg-primary/5 ring-2 ring-primary ring-inset',
                  // Remove right border on last column
                  (i + 1) % 7 === 0 && 'border-r-0',
                )}
              >
                <span className={cn(
                  'text-sm font-bold w-7 h-7 flex items-center justify-center rounded-full transition-colors',
                  today && !selected && 'bg-primary text-primary-foreground',
                  selected && 'bg-primary text-primary-foreground',
                )}>
                  {format(day, 'd')}
                </span>

                {/* Category dots */}
                {uniqueCats.length > 0 && (
                  <div className="flex items-center gap-1 mt-1.5">
                    {uniqueCats.map(cat => (
                      <div key={cat} className={cn('w-1.5 h-1.5 rounded-full', getCategoryDef(cat).dot)} />
                    ))}
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Selected day panel */}
      {selectedDate && (
        <div className="space-y-4">
          <div className="flex items-center gap-3 border-b border-border pb-3">
            <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center">
              <CalendarDays size={18} className="text-primary" />
            </div>
            <h3 className="text-sm font-black uppercase tracking-widest text-foreground">
              {format(selectedDate, "EEEE d 'de' MMMM", { locale: es })}
            </h3>
            <span className="px-1.5 py-0.5 rounded-md text-[10px] font-black bg-muted text-muted-foreground">
              {selectedDayEvents.length}
            </span>
          </div>

          {selectedDayEvents.length > 0 ? (
            <div className="space-y-3">
              {selectedDayEvents.map(e => {
                const cat = getCategoryDef(e.category);
                const CatIcon = cat.icon;
                return (
                  <Card
                    key={e.id}
                    onClick={() => onSelectEvent(e)}
                    className={cn(
                      'p-4 border border-l-4 transition-all cursor-pointer group flex flex-col md:flex-row md:items-center gap-4 hover:bg-muted/30',
                      cat.border,
                    )}
                  >
                    <div className={cn('w-9 h-9 rounded-xl flex items-center justify-center shrink-0', cat.bg)}>
                      <CatIcon size={16} className={cat.text} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-bold text-foreground text-sm tracking-tight group-hover:text-primary transition-colors truncate">
                        {e.title}
                      </h4>
                      <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mt-0.5 truncate">
                        {e.subtitle}
                      </p>
                    </div>
                    <div className="text-xs font-black flex items-center gap-1.5 shrink-0 text-foreground">
                      <Clock size={13} />
                      {e.source === 'consultation'
                        ? format(e.date, "HH:mm'hs'", { locale: es })
                        : format(e.date, "d 'de' MMM", { locale: es })
                      }
                    </div>
                    <div className="p-1.5 text-muted-foreground group-hover:text-primary transition-colors">
                      <ArrowUpRight size={16} />
                    </div>
                  </Card>
                );
              })}
            </div>
          ) : (
            <div className="flex items-center gap-2.5 py-4 px-4 bg-muted/30 border border-border/50 rounded-xl">
              <CalendarDays size={15} className="text-muted-foreground shrink-0" />
              <span className="text-xs font-bold text-muted-foreground">Sin eventos para este día</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
