/**
 * Motor de tareas automáticas — Lawstream
 *
 * Genera tareas bloqueantes cuando cambia el estado de una consulta o expediente.
 * Cada transición de estado tiene un conjunto de tareas predefinidas que se crean
 * automáticamente y bloquean el avance hasta completarlas.
 */

import { Task, Consultation } from '../types';

// ── Checklist de onboarding (Consulta → Aceptada) ───────────

export const ONBOARDING_CHECKLIST = [
  'Cobrar BONO CAO',
  'Cobrar honorarios pactados',
  'Asignar abogado responsable',
  'Completar datos del cliente (DNI, domicilio, estado civil)',
  'Subir documentación inicial',
];

// ── Tareas por transición de estado de consulta ─────────────

type ConsultationStatus = Consultation['status'];

interface TaskTemplate {
  title: string;
  priority: 'Alta' | 'Media' | 'Baja';
  bloqueante: boolean;
  dueDaysFromNow?: number;
}

const CONSULTATION_TASKS: Partial<Record<ConsultationStatus, TaskTemplate[]>> = {
  'Nueva': [
    { title: 'Contactar al potencial cliente', priority: 'Alta', bloqueante: true, dueDaysFromNow: 1 },
    { title: 'Registrar origen y motivo de consulta', priority: 'Media', bloqueante: false },
  ],
  'Contactada': [
    { title: 'Agendar entrevista inicial', priority: 'Alta', bloqueante: true, dueDaysFromNow: 3 },
  ],
  'Evaluando viabilidad': [
    { title: 'Registrar diagnóstico del caso', priority: 'Alta', bloqueante: true },
    { title: 'Registrar solución propuesta al cliente', priority: 'Alta', bloqueante: true },
    { title: 'Elaborar presupuesto de honorarios', priority: 'Alta', bloqueante: true, dueDaysFromNow: 5 },
  ],
  'Aceptada': [
    { title: 'Cobrar BONO CAO', priority: 'Alta', bloqueante: true },
    { title: 'Cobrar honorarios pactados', priority: 'Alta', bloqueante: true },
    { title: 'Asignar abogado responsable', priority: 'Alta', bloqueante: true },
    { title: 'Completar datos del cliente', priority: 'Alta', bloqueante: true },
    { title: 'Subir documentación inicial', priority: 'Media', bloqueante: false },
    { title: 'Convertir en asunto judicial', priority: 'Alta', bloqueante: true, dueDaysFromNow: 3 },
  ],
};

// ── Tareas por transición de estado de expediente ───────────

const EXPEDIENTE_TASKS: Record<string, TaskTemplate[]> = {
  'Presentado en MEV': [
    { title: 'Confirmar acuse de recibo MEV (24hs)', priority: 'Alta', bloqueante: true, dueDaysFromNow: 1 },
    { title: 'Registrar número de recepción MEV', priority: 'Alta', bloqueante: true },
  ],
  'Sorteado': [
    { title: 'Registrar número de receptoría', priority: 'Alta', bloqueante: true },
    { title: 'Registrar número de juzgado asignado', priority: 'Alta', bloqueante: true },
    { title: 'Registrar carátula oficial', priority: 'Alta', bloqueante: true },
    { title: 'Registrar secretaría', priority: 'Media', bloqueante: false },
  ],
  'A Despacho': [
    { title: 'Verificar estado del despacho', priority: 'Media', bloqueante: false, dueDaysFromNow: 7 },
  ],
  'Paralizado': [
    { title: 'Registrar motivo de paralización', priority: 'Alta', bloqueante: true },
    { title: 'ALERTA: Verificar plazo de perención (6 meses)', priority: 'Alta', bloqueante: false },
  ],
};

// ── Generadores ─────────────────────────────────────────────

function dueDate(daysFromNow?: number): string {
  if (!daysFromNow) return '';
  const d = new Date();
  d.setDate(d.getDate() + daysFromNow);
  return d.toISOString();
}

export function generateConsultationTasks(
  consultationId: string,
  newStatus: ConsultationStatus,
): Omit<Task, 'id'>[] {
  const templates = CONSULTATION_TASKS[newStatus];
  if (!templates) return [];

  return templates.map(t => ({
    consultationId,
    title: t.title,
    dueDate: dueDate(t.dueDaysFromNow),
    status: 'Pendiente' as const,
    priority: t.priority,
    bloqueante: t.bloqueante,
    generadaAutomaticamente: true,
    triggerEstado: newStatus,
  }));
}

export function generateExpedienteTasks(
  matterId: string,
  newEstado: string,
): Omit<Task, 'id'>[] {
  const templates = EXPEDIENTE_TASKS[newEstado];
  if (!templates) return [];

  return templates.map(t => ({
    matterId,
    title: t.title,
    dueDate: dueDate(t.dueDaysFromNow),
    status: 'Pendiente' as const,
    priority: t.priority,
    bloqueante: t.bloqueante,
    generadaAutomaticamente: true,
    triggerEstado: newEstado,
  }));
}

/** Returns true if there are incomplete bloqueante tasks for a consultation */
export function hasBlockingTasks(tasks: Task[], consultationId: string): boolean {
  return tasks.some(
    t => t.consultationId === consultationId
      && t.bloqueante
      && t.status !== 'Completada'
  );
}

/** Returns true if there are incomplete bloqueante tasks for a matter */
export function hasMatterBlockingTasks(tasks: Task[], matterId: string): boolean {
  return tasks.some(
    t => t.matterId === matterId
      && t.bloqueante
      && t.status !== 'Completada'
  );
}
