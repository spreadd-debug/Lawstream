import {
  UserRound,
  AlertTriangle,
  Scale,
  PhoneForwarded,
} from 'lucide-react';
import { parseISO, isSameDay } from 'date-fns';
import { es } from 'date-fns/locale';
import { format } from 'date-fns';
import type { Matter, Consultation } from '../../types';

// ── Category types ───────────────────────────────────────────────

export type AgendaEventCategory = 'entrevista' | 'vencimiento' | 'audiencia' | 'seguimiento';

export interface AgendaCategoryDef {
  id: AgendaEventCategory;
  label: string;
  icon: typeof UserRound;
  dot: string;        // bg class for dots
  bg: string;         // light bg for badges/chips
  text: string;       // text color
  border: string;     // left-border on cards
}

export const AGENDA_CATEGORIES: AgendaCategoryDef[] = [
  { id: 'entrevista',   label: 'Entrevistas',   icon: UserRound,      dot: 'bg-violet-500',  bg: 'bg-violet-500/10',  text: 'text-violet-600 dark:text-violet-400',  border: 'border-l-violet-500' },
  { id: 'vencimiento',  label: 'Vencimientos',  icon: AlertTriangle,  dot: 'bg-amber-500',   bg: 'bg-amber-500/10',   text: 'text-amber-600 dark:text-amber-400',    border: 'border-l-amber-500' },
  { id: 'audiencia',    label: 'Audiencias',     icon: Scale,          dot: 'bg-sky-500',     bg: 'bg-sky-500/10',     text: 'text-sky-600 dark:text-sky-400',        border: 'border-l-sky-500' },
  { id: 'seguimiento',  label: 'Seguimientos',   icon: PhoneForwarded, dot: 'bg-emerald-500', bg: 'bg-emerald-500/10', text: 'text-emerald-600 dark:text-emerald-400', border: 'border-l-emerald-500' },
];

export const getCategoryDef = (cat: AgendaEventCategory): AgendaCategoryDef =>
  AGENDA_CATEGORIES.find(c => c.id === cat)!;

// ── Event interface ──────────────────────────────────────────────

export interface AgendaEvent {
  id: string;
  title: string;
  subtitle: string;
  date: Date;
  category: AgendaEventCategory;
  source: 'matter' | 'consultation';
  matterId?: string;
  consultation?: Consultation;
}

// ── Categorization logic ─────────────────────────────────────────

const AUDIENCIA_TYPES = new Set(['redactar_demanda', 'seguir_despacho']);
const SEGUIMIENTO_TYPES = new Set(['llamar_cliente', 'revisar_doc', 'revisar_borrador', 'pedir_pericia']);

export function categorizeMatterEvent(nextActionType?: string): AgendaEventCategory {
  if (!nextActionType) return 'vencimiento';
  if (AUDIENCIA_TYPES.has(nextActionType)) return 'audiencia';
  if (SEGUIMIENTO_TYPES.has(nextActionType)) return 'seguimiento';
  return 'vencimiento';
}

// ── Build unified event list ─────────────────────────────────────

export function buildAgendaEvents(matters: Matter[], consultations: Consultation[]): AgendaEvent[] {
  const matterEvents: AgendaEvent[] = matters
    .filter(m => m.nextActionDate)
    .map(m => ({
      id: m.id,
      title: m.title,
      subtitle: `${m.nextAction} · ${m.client}`,
      date: parseISO(m.nextActionDate),
      category: categorizeMatterEvent(m.nextActionType),
      source: 'matter' as const,
      matterId: m.id,
    }));

  const consultationEvents: AgendaEvent[] = consultations
    .filter(c => c.scheduledAt && !['Rechazada', 'Archivada', 'Aceptada'].includes(c.status))
    .map(c => ({
      id: c.id,
      title: `Entrevista: ${c.name}`,
      subtitle: `${c.type ?? 'Consulta'} · ${format(parseISO(c.scheduledAt!), "HH:mm", { locale: es })}hs`,
      date: parseISO(c.scheduledAt!),
      category: 'entrevista' as const,
      source: 'consultation' as const,
      consultation: c,
    }));

  return [...matterEvents, ...consultationEvents];
}

// ── Helpers ──────────────────────────────────────────────────────

export function getEventsForDay(events: AgendaEvent[], day: Date): AgendaEvent[] {
  return events.filter(e => isSameDay(e.date, day));
}
