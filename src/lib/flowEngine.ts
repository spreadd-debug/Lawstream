/**
 * FlowEngine — Motor de flujos guiados (SOPs) para Lawstream
 *
 * Dado un asunto con su template, tareas, documentos e hitos,
 * calcula: etapa actual, próxima acción, bloqueos y salud.
 *
 * Funciones puras — no accede a DB, recibe datos y devuelve estado.
 */

import {
  Matter,
  MatterHealth,
  MatterMilestone,
  Task,
  LegalDocument,
  FlowSnapshot,
  MatterTemplate,
  FlowStageTemplate,
  FlowTaskCondition,
} from '../types';

// ── Calcular etapa actual ──────────────────────────────────────

function computeCurrentStage(
  stages: FlowStageTemplate[],
  tasks: Task[],
): string {
  // Walk stages in order. A stage is "complete" when all its bloqueante tasks are Completada.
  // Tasks Canceladas (ej. canceladas por mutación de tipo de divorcio) se
  // excluyen del conteo: no atascan ni cuentan como completadas — son
  // historia de una rama del flujo que ya no aplica.
  for (const stage of stages) {
    const stageTasks = tasks.filter(t => t.etapa === stage.name && t.status !== 'Cancelada');
    const blockingTasks = stageTasks.filter(t => t.bloqueante);

    if (blockingTasks.length === 0) {
      // No blocking tasks → stage is complete if all tasks done
      const allDone = stageTasks.length > 0 && stageTasks.every(t => t.status === 'Completada');
      if (!allDone) return stage.name;
    } else {
      const allBlockingDone = blockingTasks.every(t => t.status === 'Completada');
      if (!allBlockingDone) return stage.name;
    }
  }
  // All stages complete → return last stage
  return stages[stages.length - 1]?.name ?? '';
}

// ── Calcular estado de cada etapa ──────────────────────────────

function computeStageStatuses(
  stages: FlowStageTemplate[],
  currentStage: string,
): { name: string; status: 'completed' | 'current' | 'pending' }[] {
  let foundCurrent = false;
  return stages.map(stage => {
    if (stage.name === currentStage) {
      foundCurrent = true;
      return { name: stage.name, status: 'current' as const };
    }
    if (!foundCurrent) {
      return { name: stage.name, status: 'completed' as const };
    }
    return { name: stage.name, status: 'pending' as const };
  });
}

// ── Próxima acción ─────────────────────────────────────────────

function computeNextAction(
  tasks: Task[],
  currentStage: string,
): string | null {
  // First: blocking pending task in current stage
  const blocking = tasks.find(
    t => t.etapa === currentStage && t.bloqueante && t.status === 'Pendiente'
  );
  if (blocking) return blocking.title;

  // Then: any pending task in current stage
  const pending = tasks.find(
    t => t.etapa === currentStage && t.status === 'Pendiente'
  );
  if (pending) return pending.title;

  // Then: any pending task at all
  const anyPending = tasks.find(t => t.status === 'Pendiente');
  return anyPending?.title ?? null;
}

// ── Detección de bloqueos ──────────────────────────────────────

function computeBlockages(
  tasks: Task[],
  docs: LegalDocument[],
  matter: Matter,
): string[] {
  const blockages: string[] = [];

  // 1. Documentos críticos faltantes que bloquean avance
  const criticalMissing = docs.filter(
    d => d.matterId === matter.id
      && d.criticality === 'Crítico'
      && d.blocksProgress
      && (d.status === 'Faltante' || d.status === 'Solicitado')
  );
  for (const d of criticalMissing) {
    blockages.push(`Documento crítico faltante: ${d.name}`);
  }

  // 2. Tareas bloqueantes vencidas
  const now = new Date();
  const overdueTasks = tasks.filter(
    t => t.matterId === matter.id
      && t.bloqueante
      && t.status === 'Pendiente'
      && t.dueDate
      && new Date(t.dueDate) < now
  );
  for (const t of overdueTasks) {
    blockages.push(`Tarea bloqueante vencida: ${t.title}`);
  }

  // 3. Plazo vencido de next action
  if (matter.nextActionDate && new Date(matter.nextActionDate) < now) {
    blockages.push('Próxima acción vencida');
  }

  return blockages;
}

// ── Cálculo de salud ───────────────────────────────────────────

function computeHealth(
  tasks: Task[],
  docs: LegalDocument[],
  matter: Matter,
): MatterHealth {
  // Manual override: if matter is explicitly paused / suspended
  if (matter.status === 'Suspendido' || matter.status === 'Pausado') {
    return 'En espera';
  }

  const matterTasks = tasks.filter(t => t.matterId === matter.id);
  const matterDocs = docs.filter(d => d.matterId === matter.id);
  const now = new Date();

  // Critical docs blocking progress
  const criticalBlocking = matterDocs.some(
    d => d.criticality === 'Crítico'
      && d.blocksProgress
      && (d.status === 'Faltante' || d.status === 'Solicitado')
  );

  // Overdue blocking tasks
  const overdueBlocking = matterTasks.some(
    t => t.bloqueante
      && t.status === 'Pendiente'
      && t.dueDate
      && new Date(t.dueDate) < now
  );

  // Severely overdue (> 7 days)
  const severeOverdue = matterTasks.some(
    t => t.bloqueante
      && t.status === 'Pendiente'
      && t.dueDate
      && (now.getTime() - new Date(t.dueDate).getTime()) > 7 * 86400000
  );

  // Next action overdue > 3 days
  const nextActionSevere = matter.nextActionDate
    && (now.getTime() - new Date(matter.nextActionDate).getTime()) > 3 * 86400000;

  if (severeOverdue || nextActionSevere) return 'Roto';
  if (overdueBlocking || criticalBlocking) return 'Trabado';
  return 'Sano';
}

// ── Progreso general ───────────────────────────────────────────

function computeProgress(
  tasks: Task[],
  matterId: string,
): number {
  // Canceladas no entran en el denominador — fueron parte de una rama
  // del flujo que ya no aplica (ej. tareas de "De común acuerdo" tras
  // mutación a "Unilateral").
  const matterTasks = tasks.filter(t => t.matterId === matterId && t.status !== 'Cancelada');
  if (matterTasks.length === 0) return 0;
  const completed = matterTasks.filter(t => t.status === 'Completada').length;
  return Math.round((completed / matterTasks.length) * 100);
}

// ── API pública ────────────────────────────────────────────────

/**
 * Calcula el snapshot completo del flujo de un asunto.
 * Si no tiene template con stages, devuelve un snapshot básico.
 */
export function getFlowSnapshot(
  matter: Matter,
  template: MatterTemplate | undefined,
  tasks: Task[],
  docs: LegalDocument[],
): FlowSnapshot {
  const matterTasks = tasks.filter(t => t.matterId === matter.id);
  const matterDocs = docs.filter(d => d.matterId === matter.id);

  if (!template?.stages || template.stages.length === 0) {
    // No stage-based template: basic snapshot
    return {
      currentStage: matter.currentStage || 'Inicio',
      stages: [],
      nextAction: computeNextAction(matterTasks, matter.currentStage || '') || matter.nextAction,
      blockages: computeBlockages(matterTasks, matterDocs, matter),
      health: computeHealth(matterTasks, matterDocs, matter),
      progress: computeProgress(matterTasks, matter.id),
    };
  }

  const currentStage = computeCurrentStage(template.stages, matterTasks);
  const stages = computeStageStatuses(template.stages, currentStage);
  const nextAction = computeNextAction(matterTasks, currentStage);
  const blockages = computeBlockages(matterTasks, matterDocs, matter);
  const health = computeHealth(matterTasks, matterDocs, matter);
  const progress = computeProgress(matterTasks, matter.id);

  return { currentStage, stages, nextAction, blockages, health, progress };
}

// ── Evaluación de condiciones ──────────────────────────────────

export function evaluateCondition(
  cond: FlowTaskCondition,
  caseData: Record<string, string>,
): boolean {
  const val = caseData[cond.key];
  if (cond.equals !== undefined) return val === cond.equals;
  if (cond.notEquals !== undefined) return val !== cond.notEquals;
  return !!val; // exists check
}

// Decide si el campo está "definido" para auto-completar la tarea asociada.
// Usa excludeValues para tratar sentinels como 'Por definir' como NO-definido.
function shouldAutoComplete(
  rule: { key: string; excludeValues?: string[] } | undefined,
  caseData: Record<string, string>,
): boolean {
  if (!rule) return false;
  const val = caseData[rule.key];
  if (!val) return false;
  if (rule.excludeValues?.includes(val)) return false;
  return true;
}

/**
 * Genera las tareas, documentos e hitos iniciales a partir de un template.
 * Retorna objetos listos para insertar en DB (sin id).
 * Si se pasa caseData, evalúa condiciones y auto-completa tareas.
 */
export function instantiateFlow(
  matterId: string,
  matterTitle: string,
  client: string,
  responsible: string,
  template: MatterTemplate,
  caseData?: Record<string, string>,
): {
  tasks: Omit<Task, 'id'>[];
  documents: Omit<LegalDocument, 'id'>[];
  milestones: Omit<MatterMilestone, 'id'>[];
} {
  const tasks: Omit<Task, 'id'>[] = [];
  const documents: Omit<LegalDocument, 'id'>[] = [];
  const milestones: Omit<MatterMilestone, 'id'>[] = [];
  const seenDocs = new Set<string>();
  const cd = caseData ?? {};

  if (template.stages && template.stages.length > 0) {
    template.stages.forEach((stage, stageIdx) => {
      // Tasks per stage
      stage.tasks.forEach(t => {
        // Skip task if condition not met
        if (t.condition && !evaluateCondition(t.condition, cd)) return;

        // Auto-complete if caseData already has the answer
        const autoCompleted = shouldAutoComplete(t.autoCompleteIf, cd);

        tasks.push({
          matterId,
          title: t.task,
          dueDate: '',
          status: autoCompleted ? 'Completada' : 'Pendiente',
          priority: t.priority === 'crítico' ? 'Alta' : t.priority === 'recomendado' ? 'Media' : 'Baja',
          bloqueante: t.bloqueante ?? (t.priority === 'crítico'),
          generadaAutomaticamente: true,
          triggerEstado: `flow:${template.id}`,
          etapa: stage.name,
          ...(autoCompleted ? { completedAt: new Date().toISOString(), completedBy: 'Sistema' } : {}),
          ...(t.satisfiedBy ? { satisfiedBy: t.satisfiedBy } : {}),
        });
      });

      // Documents per stage (deduplicate)
      stage.documents.forEach(d => {
        if (seenDocs.has(d.name)) return;
        seenDocs.add(d.name);
        documents.push({
          matterId,
          matterTitle,
          client,
          responsible,
          name: d.name,
          status: 'Faltante',
          criticality: d.required ? 'Crítico' : 'Recomendado',
          blocksProgress: d.required,
          updatedAt: new Date().toISOString(),
          associatedAction: stage.name,
          category: template.rama,
        });
      });

      // Milestone per stage
      milestones.push({
        matterId,
        label: stage.milestone,
        etapa: stage.name,
        orden: stageIdx,
        status: 'Pendiente',
      });
    });
  } else {
    // Legacy template without stages: use flat lists
    template.checklistBase.forEach(t => {
      tasks.push({
        matterId,
        title: t.task,
        dueDate: '',
        status: 'Pendiente',
        priority: t.priority === 'crítico' ? 'Alta' : t.priority === 'recomendado' ? 'Media' : 'Baja',
        bloqueante: t.priority === 'crítico',
        generadaAutomaticamente: true,
        triggerEstado: `flow:${template.id}`,
        etapa: template.etapaInicial,
      });
    });

    template.documentosBase.forEach(d => {
      documents.push({
        matterId,
        matterTitle,
        client,
        responsible,
        name: d.name,
        status: 'Faltante',
        criticality: d.required ? 'Crítico' : 'Recomendado',
        blocksProgress: d.required,
        updatedAt: new Date().toISOString(),
        category: template.rama,
      });
    });

    template.hitosProyectados.forEach((h, idx) => {
      milestones.push({
        matterId,
        label: h,
        orden: idx,
        status: 'Pendiente',
      });
    });
  }

  return { tasks, documents, milestones };
}

// ── Regeneración idempotente para mutaciones de caseData ──────
//
// Cuando el caseData del matter muta (ej. tipo_divorcio: De común acuerdo
// → Unilateral), las tareas del template que dependen de la condición
// vieja quedan inconsistentes. Este helper compara el estado actual de
// tasks en DB contra lo que el template AHORA pide y devuelve:
//
//   • aCancelar       — tasks Pendiente cuya condition ya no matchea.
//                       Tasks Completada NO se cancelan: tienen valor histórico.
//   • aCrear          — tasks del template (etapa, title) cuya condition matchea
//                       ahora y que no existen en DB todavía.
//   • aAutoCompletar  — tasks Pendiente que YA EXISTEN en DB y cuyo
//                       autoCompleteIf ahora se cumple (ej. el campo
//                       tipo_divorcio mutó de 'Por definir' a un valor real:
//                       la tarea "Determinar si es unilateral o de común
//                       acuerdo" debe pasar a Completada sola).
//
// El llamador es responsable de persistir cancelación + creación + auto-
// completado + audit.

export function regenerarTareasFaltantes(
  matter: Matter,
  template: MatterTemplate,
  existingTasks: Task[],
): { aCancelar: Task[]; aCrear: Omit<Task, 'id'>[]; aAutoCompletar: Task[] } {
  const cd = matter.caseData ?? {};
  const aCancelar: Task[] = [];
  const aCrear: Omit<Task, 'id'>[] = [];
  const aAutoCompletar: Task[] = [];

  if (!template.stages || template.stages.length === 0) {
    return { aCancelar, aCrear, aAutoCompletar };
  }

  // Indexar tasks existentes del matter por (etapa, title) — comparamos
  // así porque title es estable a través de regeneraciones.
  const tasksDelMatter = existingTasks.filter(t => t.matterId === matter.id);
  const existingByKey = new Map<string, Task>();
  for (const t of tasksDelMatter) {
    existingByKey.set(`${t.etapa ?? ''}::${t.title}`, t);
  }

  // Set de keys que SÍ están en el template hoy (con condición matcheando).
  const expectedKeys = new Set<string>();

  for (const stage of template.stages) {
    for (const taskDef of stage.tasks) {
      const conditionMatches = taskDef.condition
        ? evaluateCondition(taskDef.condition, cd)
        : true;
      const key = `${stage.name}::${taskDef.task}`;
      if (conditionMatches) expectedKeys.add(key);

      const existing = existingByKey.get(key);
      const autoCompleted = shouldAutoComplete(taskDef.autoCompleteIf, cd);

      if (existing) {
        // Existe en DB. Si la condición ya NO matchea y la tarea está
        // pendiente, marcarla para cancelar. Tasks Completada o Cancelada
        // se preservan (historia + idempotencia).
        if (!conditionMatches && existing.status === 'Pendiente') {
          aCancelar.push(existing);
        }
        // Si la condición sigue matcheando, la tarea está Pendiente y
        // ahora autoCompleteIf se cumple — auto-completarla.
        else if (conditionMatches && existing.status === 'Pendiente' && autoCompleted) {
          aAutoCompletar.push(existing);
        }
      } else {
        // No existe en DB. Si matchea, crear.
        if (conditionMatches) {
          aCrear.push({
            matterId: matter.id,
            title: taskDef.task,
            dueDate: '',
            status: autoCompleted ? 'Completada' : 'Pendiente',
            priority: taskDef.priority === 'crítico' ? 'Alta' : taskDef.priority === 'recomendado' ? 'Media' : 'Baja',
            bloqueante: taskDef.bloqueante ?? (taskDef.priority === 'crítico'),
            generadaAutomaticamente: true,
            triggerEstado: `flow:${template.id}`,
            etapa: stage.name,
            ...(autoCompleted ? { completedAt: new Date().toISOString(), completedBy: 'Sistema' } : {}),
            ...(taskDef.satisfiedBy ? { satisfiedBy: taskDef.satisfiedBy } : {}),
          });
        }
      }
    }
  }

  return { aCancelar, aCrear, aAutoCompletar };
}
