import React, { createContext, useContext, useEffect, useState } from 'react';
import { Matter, Client, Consultation, LegalDocument, Task, TimelineEvent, UserProfile, Communication, Expediente, MatterMilestone, EventoExpediente, Plazo, Jurisdiccion } from '../types';
import { GlobalFilters, defaultFilters } from '../components/FiltersContent';
import { useAuth } from './auth';
import * as db from './db';
import { logAudit } from './db';
import { generateConsultationTasks, generateExpedienteTasks } from './taskEngine';
import { findTemplate } from '../data/templates';
import { instantiateFlow } from './flowEngine';
import { calcularVencimiento, resetFeriadosCache } from './plazos';
import { format, parseISO } from 'date-fns';

/** Normaliza el valor de jurisdicción que viene del wizard ('CABA'|'PBA'|'Nacional'
 *  o variantes) al enum canónico 'caba'|'pba'|'nacional'. Devuelve undefined si
 *  el input no es reconocible. */
function normalizeJurisdiccion(raw: string | undefined | null): Jurisdiccion | undefined {
  if (!raw || typeof raw !== 'string') return undefined;
  const n = raw.trim().toLowerCase();
  if (n === 'caba') return 'caba';
  if (n === 'pba' || n === 'provincia de buenos aires') return 'pba';
  if (n === 'nacional') return 'nacional';
  return undefined;
}

interface AppContextType {
  // Data
  matters: Matter[];
  clients: Client[];
  consultations: Consultation[];
  timeline: TimelineEvent[];
  tasks: Task[];
  documents: LegalDocument[];
  profiles: UserProfile[];
  isLoading: boolean;
  // Theme
  theme: 'light' | 'dark';
  toggleTheme: () => void;
  // Drawer / modal state
  isNewActionOpen: boolean;
  setIsNewActionOpen: (v: boolean) => void;
  isEditMatterOpen: boolean;
  setIsEditMatterOpen: (v: boolean) => void;
  editMatterFocusField: 'jurisdiccion' | null;
  setEditMatterFocusField: (v: 'jurisdiccion' | null) => void;
  isFiltersOpen: boolean;
  setIsFiltersOpen: (v: boolean) => void;
  activeFilters: GlobalFilters;
  setActiveFilters: (f: GlobalFilters) => void;
  selectedMatterId: string | null;
  setSelectedMatterId: (id: string | null) => void;
  prefilledMatter: any;
  setPrefilledMatter: (data: any) => void;
  // Handlers
  handleNewAction: (matterId?: string) => void;
  handleEditMatter: (matterId: string) => void;
  handleSaveAction: (data: any) => Promise<void>;
  handleSaveMatterEdit: (data: any) => Promise<void>;
  handleCreateClient: (data: any) => Promise<void>;
  handleUpdateClient: (id: string, data: any) => Promise<void>;
  handleUpdateDocument: (id: string, changes: any) => Promise<void>;
  handleAddDocument: (doc: any) => Promise<void>;
  handleCloseMatter: (matterId: string) => Promise<void>;
  handleUpdateMatterDirect: (matterId: string, changes: Partial<Matter>) => Promise<void>;
  handleCreateMatter: (data: any) => Promise<Matter>;
  handleCreateConsultation: (data: Omit<Consultation, 'id'>) => Promise<void>;
  handleUpdateConsultation: (id: string, changes: Partial<Consultation>) => void;
  // Tasks
  handleCreateTask: (task: Omit<Task, 'id'>) => Promise<void>;
  handleUpdateTask: (id: string, changes: Partial<Task>) => Promise<void>;
  handleCompleteTask: (id: string, completedBy: string) => Promise<void>;
  // Consultation status change with auto-tasks
  handleConsultationStatusChange: (id: string, newStatus: Consultation['status'], currentUser: string) => Promise<void>;
  // Expedientes
  expedientes: Expediente[];
  handleRefreshExpedientes: () => Promise<void>;
  // Milestones
  milestones: MatterMilestone[];
  handleUpdateMilestone: (id: string, changes: Partial<MatterMilestone>) => Promise<void>;
  handleCreateMilestone: (ms: Omit<MatterMilestone, 'id'>) => Promise<void>;
  // Assignments
  handleUpdateAssignments: (matterId: string, profileIds: string[], leadId: string) => Promise<void>;
  // Eventos de expediente + Plazos procesales
  eventos: EventoExpediente[];
  plazos: Plazo[];
  handleCreateEvento: (
    evento: Omit<EventoExpediente, 'id' | 'createdAt' | 'updatedAt'>,
    plazosDerivados?: Array<Omit<Plazo, 'id' | 'eventoOrigenId' | 'createdAt' | 'updatedAt'>>,
  ) => Promise<EventoExpediente>;
  handleUpdateEvento: (id: string, changes: Partial<EventoExpediente>) => Promise<void>;
  handleDeleteEvento: (id: string) => Promise<void>;
  handleCreatePlazo: (plazo: Omit<Plazo, 'id' | 'createdAt' | 'updatedAt'>) => Promise<Plazo>;
  handleCumplirPlazo: (id: string) => Promise<void>;
  handleCancelarPlazo: (id: string) => Promise<void>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { session, profile: authProfile } = useAuth();

  // Helper para audit log — fire-and-forget
  const audit = (action: import('../types').AuditAction, entityType: import('../types').AuditEntityType, entityId?: string, entityLabel?: string, details?: Record<string, unknown>) => {
    if (!session?.user || !authProfile) return;
    logAudit({ actorId: session.user.id, actorName: authProfile.fullName, action, entityType, entityId, entityLabel, details });
  };

  const [matters, setMatters] = useState<Matter[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [consultations, setConsultations] = useState<Consultation[]>([]);
  const [timeline, setTimeline] = useState<TimelineEvent[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [documents, setDocuments] = useState<LegalDocument[]>([]);
  const [profiles, setProfiles] = useState<UserProfile[]>([]);
  const [expedientes, setExpedientes] = useState<Expediente[]>([]);
  const [milestones, setMilestones] = useState<MatterMilestone[]>([]);
  const [eventos, setEventos] = useState<EventoExpediente[]>([]);
  const [plazos, setPlazos] = useState<Plazo[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('theme');
      if (saved) return saved as 'light' | 'dark';
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    return 'light';
  });

  const [isNewActionOpen, setIsNewActionOpen] = useState(false);
  const [isEditMatterOpen, setIsEditMatterOpen] = useState(false);
  // Campo al que el formulario de Editar Asunto debe saltar al abrirse (ej:
  // cuando el banner de "jurisdicción faltante" dispara la edición).
  const [editMatterFocusField, setEditMatterFocusField] = useState<'jurisdiccion' | null>(null);
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);
  const [activeFilters, setActiveFilters] = useState<GlobalFilters>(defaultFilters);
  const [selectedMatterId, setSelectedMatterId] = useState<string | null>(null);
  const [prefilledMatter, setPrefilledMatter] = useState<any>(null);

  // Carga inicial — depende solo del user ID para no recargar en cada
  // token refresh silencioso de Supabase al volver a la pestaña
  const userId = session?.user?.id ?? null;
  useEffect(() => {
    if (!userId) { setIsLoading(false); return; }
    setIsLoading(true);
    const safe = <T,>(p: Promise<T[]>, label: string): Promise<T[]> =>
      p.catch(err => { console.error(`[AppContext] fetchError — ${label}:`, err); return []; });

    Promise.all([
      safe(db.fetchMatters(),          'matters'),
      safe(db.fetchClients(),          'clients'),
      safe(db.fetchConsultations(),    'consultations'),
      safe(db.fetchDocuments(),        'documents'),
      safe(db.fetchTasks(),            'tasks'),
      safe(db.fetchTimeline(),         'timeline'),
      safe(db.fetchProfiles(),         'profiles'),
      safe(db.fetchAllExpedientes(),   'expedientes'),
      safe(db.fetchAllMilestones(),    'milestones'),
      safe(db.fetchAllEventos(),       'eventos'),
      safe(db.fetchAllPlazos(),        'plazos'),
    ])
      .then(([m, c, co, d, t, tl, p, ex, ms, ev, pl]) => {
        setMatters(m);
        setClients(c);
        setConsultations(co);
        setDocuments(d);
        setTasks(t);
        setTimeline(tl);
        setProfiles(p);
        setExpedientes(ex);
        setMilestones(ms);
        setEventos(ev);
        setPlazos(pl);
      })
      .finally(() => setIsLoading(false));
  }, [userId]);

  useEffect(() => {
    const root = window.document.documentElement;
    root.classList.toggle('dark', theme === 'dark');
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => setTheme(prev => prev === 'light' ? 'dark' : 'light');

  const handleNewAction = (matterId?: string) => {
    if (matterId) setSelectedMatterId(matterId);
    setIsNewActionOpen(true);
  };

  const handleEditMatter = (matterId: string) => {
    setSelectedMatterId(matterId);
    setIsEditMatterOpen(true);
  };

  const handleSaveAction = async (data: any) => {
    const targetId = data.matterId || selectedMatterId;
    if (!targetId) return;

    const matterChanges = {
      nextAction:     data.replacesNextAction ? data.title : undefined,
      nextActionType: data.replacesNextAction ? data.type  : undefined,
      nextActionDate: data.date,
      health:         data.healthImpact as any,
      priority:       data.priority as any,
      blockage:       data.isBlocking ? 'Bloqueado por nueva acción' : undefined,
      lastActivity:   new Date().toISOString(),
    };

    setMatters(prev => prev.map(m => m.id === targetId ? { ...m, ...matterChanges } : m));

    const newEvent: Omit<TimelineEvent, 'id'> = {
      matterId:    targetId,
      type:        'task_created',
      title:       data.title,
      description: data.notes,
      user:        data.responsible,
      date:        new Date().toISOString(),
    };
    setTimeline(prev => [{ ...newEvent, id: crypto.randomUUID() }, ...prev]);
    setIsNewActionOpen(false);

    try {
      await db.updateMatter(targetId, matterChanges);
      await db.createTimelineEvent(newEvent);
      audit('editar_asunto', 'matter', targetId, data.title, { action: data.title, type: data.type });
    } catch (err) {
      console.error('Error guardando acción:', err);
    }
  };

  const handleSaveMatterEdit = async (data: any) => {
    if (!selectedMatterId) return;
    const prevMatter = matters.find(m => m.id === selectedMatterId);
    const newJurisdiccion = data.jurisdiccion !== undefined
      ? normalizeJurisdiccion(data.jurisdiccion)
      : prevMatter?.jurisdiccion;
    const jurisdiccionChanged =
      data.jurisdiccion !== undefined &&
      newJurisdiccion !== undefined &&
      newJurisdiccion !== prevMatter?.jurisdiccion;

    const changes: Partial<Matter> = {
      title:          data.title,
      responsible:    data.responsible,
      priority:       data.priority,
      health:         data.health,
      nextActionDate: data.nextActionDate,
      description:    data.description,
      lastActivity:   new Date().toISOString(),
    };
    if (data.subtype     !== undefined) changes.subtype      = data.subtype || undefined;
    if (data.expediente  !== undefined) changes.expediente   = data.expediente || undefined;
    if (newJurisdiccion  !== undefined) changes.jurisdiccion = newJurisdiccion;

    setMatters(prev => prev.map(m => m.id === selectedMatterId ? { ...m, ...changes } : m));
    setIsEditMatterOpen(false);
    setEditMatterFocusField(null);
    try {
      await db.updateMatter(selectedMatterId, changes);
      audit('editar_asunto', 'matter', selectedMatterId, data.title, changes as Record<string, unknown>);

      // Si cambió la jurisdicción y hay plazos activos, recalcular con el
      // nuevo calendario de feriados. Los plazos inactivos (cumplidos,
      // cancelados, vencidos) se dejan como estaban.
      if (jurisdiccionChanged && newJurisdiccion) {
        resetFeriadosCache(); // por si cambió la jurisdicción y no la teníamos cacheada
        const plazosActivos = plazos.filter(
          p => p.matterId === selectedMatterId && p.estado === 'activo',
        );
        for (const p of plazosActivos) {
          try {
            const nuevaFecha = await calcularVencimiento({
              fechaInicio: parseISO(p.fechaInicio),
              dias: p.dias,
              diasHabiles: p.diasHabiles,
              jurisdiccion: newJurisdiccion,
            });
            const fechaStr = format(nuevaFecha, 'yyyy-MM-dd');
            const plazoUpdate: Partial<Plazo> = {
              jurisdiccion: newJurisdiccion,
              fechaVencimiento: fechaStr,
            };
            await db.updatePlazo(p.id, plazoUpdate);
            setPlazos(prev => prev.map(pp => pp.id === p.id ? { ...pp, ...plazoUpdate } : pp));
          } catch (err) {
            console.error(`Error recalculando plazo ${p.id}:`, err);
          }
        }
      }
    } catch (err) {
      console.error('Error editando asunto:', err);
    }
  };

  const handleCreateClient = async (data: any) => {
    const optimistic: Client = {
      ...data,
      id: crypto.randomUUID(),
      activeMatters: 0,
      closedMatters: 0,
      lastActivity: new Date().toISOString(),
    };
    setClients(prev => [optimistic, ...prev]);
    try {
      const saved = await db.createClient_({ ...data, lastActivity: optimistic.lastActivity });
      setClients(prev => prev.map(c => c.id === optimistic.id ? saved : c));
      audit('crear_cliente', 'client', saved.id, saved.name);
    } catch (err) {
      console.error('Error creando cliente:', err);
      setClients(prev => prev.filter(c => c.id !== optimistic.id));
    }
  };

  const handleUpdateClient = async (id: string, data: any) => {
    setClients(prev => prev.map(c => c.id === id ? { ...c, ...data } : c));
    try {
      await db.updateClient_(id, data);
      audit('editar_cliente', 'client', id, data.name);
    } catch (err) {
      console.error('Error actualizando cliente:', err);
    }
  };

  const handleUpdateDocument = async (id: string, changes: any) => {
    setDocuments(prev => prev.map(d => d.id === id ? { ...d, ...changes } : d));
    try {
      await db.updateDocument(id, changes);
      audit('editar_documento', 'document', id, undefined, changes);
    } catch (err) {
      console.error('Error actualizando documento:', err);
    }
  };

  const handleAddDocument = async (doc: any) => {
    const optimistic = { ...doc, id: crypto.randomUUID() };
    setDocuments(prev => [optimistic, ...prev]);
    try {
      const saved = await db.createDocument(doc);
      setDocuments(prev => prev.map(d => d.id === optimistic.id ? saved : d));
      audit('crear_documento', 'document', saved.id, saved.name);
    } catch (err) {
      console.error('Error creando documento:', err);
    }
  };

  const handleCloseMatter = async (matterId: string) => {
    const matter = matters.find(m => m.id === matterId);
    setMatters(prev => prev.map(m => m.id === matterId ? { ...m, status: 'Cerrado' as any } : m));
    try {
      await db.updateMatter(matterId, { status: 'Cerrado' });
      audit('cerrar_asunto', 'matter', matterId, matter?.title);
    } catch (err) {
      console.error('Error cerrando asunto:', err);
    }
  };

  const handleUpdateMatterDirect = async (matterId: string, changes: Partial<Matter>) => {
    const matter = matters.find(m => m.id === matterId);
    setMatters(prev => prev.map(m => m.id === matterId ? { ...m, ...changes, lastActivity: new Date().toISOString() } : m));
    try {
      await db.updateMatter(matterId, { ...changes, lastActivity: new Date().toISOString() });
      audit('editar_asunto', 'matter', matterId, matter?.title, changes as Record<string, unknown>);
    } catch (err) {
      console.error('Error actualizando asunto:', err);
    }
  };

  const handleCreateMatter = async (data: any): Promise<Matter> => {
    // Find matching flow template (include jurisdiction for PBA vs CABA distinction)
    const template = findTemplate(data.type, data.subtype, data.jurisdiction);

    const newMatter: Omit<Matter, 'id'> = {
      title:          data.title,
      client:         data.client,
      type:           data.type,
      subtype:        data.subtype || undefined,
      description:    data.description || undefined,
      expediente:     data.expediente || undefined,
      responsible:    data.responsible,
      priority:       data.priority,
      status:         'Activo',
      health:         'Sano',
      nextAction:     data.nextAction,
      nextActionDate: data.nextActionDate,
      lastActivity:   new Date().toISOString(),
      flowTemplateId: template?.id,
      currentStage:   template?.etapaInicial,
      caseData:       data.caseData && Object.keys(data.caseData).length > 0 ? data.caseData : undefined,
      jurisdiccion:   normalizeJurisdiccion(data.jurisdiction),
    };
    const optimistic: Matter = { ...newMatter, id: crypto.randomUUID() };
    setMatters(prev => [optimistic, ...prev]);

    let savedMatter: Matter;
    try {
      savedMatter = await db.createMatter(newMatter);
      setMatters(prev => prev.map(m => m.id === optimistic.id ? savedMatter : m));
      audit('crear_asunto', 'matter', savedMatter.id, savedMatter.title, { type: savedMatter.type, client: savedMatter.client });
    } catch (err) {
      console.error('Error creando asunto:', err);
      savedMatter = optimistic;
    }

    // Create matter assignments
    const assignedIds: string[] = data.assignedAttorneyIds || [];
    const leadProfile = profiles.find(p => p.fullName === data.responsible);
    const leadId = leadProfile?.id || '';
    // Ensure lead is in the list
    const allIds = leadId && !assignedIds.includes(leadId) ? [leadId, ...assignedIds] : assignedIds;
    if (allIds.length > 0 && leadId) {
      try {
        await db.updateMatterAssignments(savedMatter.id, allIds, leadId, session?.user?.id || '');
        setMatters(prev => prev.map(m =>
          m.id === savedMatter.id ? { ...m, assignedAttorneys: allIds } : m
        ));
      } catch (err) {
        console.error('Error creando asignaciones:', err);
      }
    }

    // Instantiate flow: create tasks, documents & milestones from template
    if (template) {
      const flow = instantiateFlow(
        savedMatter.id,
        savedMatter.title,
        savedMatter.client,
        savedMatter.responsible,
        template,
        savedMatter.caseData,
      );

      // Persist tasks
      for (const task of flow.tasks) {
        try {
          const saved = await db.createTask(task);
          setTasks(prev => [...prev, saved]);
        } catch (err) {
          console.error('Error creando tarea de flujo:', err);
        }
      }

      // Persist documents
      for (const doc of flow.documents) {
        try {
          const saved = await db.createDocument(doc);
          setDocuments(prev => [...prev, saved]);
        } catch (err) {
          console.error('Error creando documento de flujo:', err);
        }
      }

      // Persist milestones
      for (const ms of flow.milestones) {
        try {
          const saved = await db.createMilestone(ms);
          setMilestones(prev => [...prev, saved]);
        } catch (err) {
          console.error('Error creando hito de flujo:', err);
        }
      }

      // Timeline event for flow activation
      try {
        await db.createTimelineEvent({
          matterId: savedMatter.id,
          type: 'creation',
          title: `Flujo activado: ${template.name}`,
          description: `Template "${template.id}" con ${flow.tasks.length} tareas, ${flow.documents.length} documentos y ${flow.milestones.length} hitos`,
          user: data.responsible,
          date: new Date().toISOString(),
        });
      } catch (err) {
        console.error('Error registrando evento de flujo:', err);
      }
    }

    return savedMatter;
  };

  const handleCreateConsultation = async (data: Omit<Consultation, 'id'>) => {
    const optimistic = { ...data, id: crypto.randomUUID() };
    setConsultations(prev => [optimistic, ...prev]);
    try {
      const saved = await db.createConsultation(data);
      setConsultations(prev => prev.map(c => c.id === optimistic.id ? saved : c));
      audit('crear_consulta', 'consultation', saved.id, saved.name);
    } catch (err) {
      console.error('Error creando consulta:', err);
      setConsultations(prev => prev.filter(c => c.id !== optimistic.id));
    }
  };

  const handleUpdateConsultation = (id: string, changes: Partial<Consultation>) => {
    setConsultations(prev => prev.map(c => c.id === id ? { ...c, ...changes } : c));
  };

  // ── Tasks ─────────────────────────────────────────────────
  const handleCreateTask = async (task: Omit<Task, 'id'>) => {
    const optimistic: Task = { ...task, id: crypto.randomUUID() };
    setTasks(prev => [optimistic, ...prev]);
    try {
      const saved = await db.createTask(task);
      setTasks(prev => prev.map(t => t.id === optimistic.id ? saved : t));
      audit('crear_tarea', 'task', saved.id, saved.title);
    } catch (err) {
      console.error('Error creando tarea:', err);
      setTasks(prev => prev.filter(t => t.id !== optimistic.id));
    }
  };

  const handleUpdateTask = async (id: string, changes: Partial<Task>) => {
    setTasks(prev => prev.map(t => t.id === id ? { ...t, ...changes } : t));
    try {
      await db.updateTask(id, changes);
      const t = tasks.find(t => t.id === id);
      audit('editar_tarea', 'task', id, t?.title, changes as Record<string, unknown>);
    } catch (err) {
      console.error('Error actualizando tarea:', err);
    }
  };

  const handleCompleteTask = async (id: string, completedBy: string) => {
    const now = new Date().toISOString();
    setTasks(prev => prev.map(t =>
      t.id === id ? { ...t, status: 'Completada' as const, completedAt: now, completedBy } : t
    ));
    try {
      await db.updateTask(id, { status: 'Completada', completedAt: now, completedBy });
      const t = tasks.find(t => t.id === id);
      audit('completar_tarea', 'task', id, t?.title);
    } catch (err) {
      console.error('Error completando tarea:', err);
    }
  };

  const handleConsultationStatusChange = async (id: string, newStatus: Consultation['status'], currentUser: string) => {
    // Update consultation status
    const nextStep = {
      'Nueva': 'Agendar entrevista inicial',
      'Contactada': 'Realizar entrevista y cobrar consulta',
      'Esperando info': 'Esperar documentación del cliente',
      'Evaluando viabilidad': 'Elaborar presupuesto de honorarios',
      'Presupuestada': 'Aguardar respuesta del cliente',
      'Aceptada': 'Convertir en asunto y comenzar',
      'Rechazada': 'Consulta cerrada',
      'Archivada': 'Consulta archivada',
    }[newStatus] || '';

    setConsultations(prev => prev.map(c => c.id === id ? { ...c, status: newStatus, nextStep } : c));
    try {
      await db.updateConsultation(id, { status: newStatus, nextStep });
      const c = consultations.find(c => c.id === id);
      audit('cambiar_estado_consulta', 'consultation', id, c?.name, { newStatus });
    } catch (err) {
      console.error('Error actualizando estado consulta:', err);
    }

    // Generate automatic tasks for this status
    const autoTasks = generateConsultationTasks(id, newStatus);
    for (const task of autoTasks) {
      await handleCreateTask(task);
    }
  };

  const handleUpdateMilestone = async (id: string, changes: Partial<MatterMilestone>) => {
    setMilestones(prev => prev.map(m => m.id === id ? { ...m, ...changes } : m));
    try {
      await db.updateMilestone(id, changes);
      const ms = milestones.find(m => m.id === id);
      audit('editar_hito', 'milestone', id, ms?.label, changes as Record<string, unknown>);
    } catch (err) {
      console.error('Error actualizando hito:', err);
    }
  };

  const handleCreateMilestone = async (ms: Omit<MatterMilestone, 'id'>) => {
    const optimistic: MatterMilestone = { ...ms, id: crypto.randomUUID() };
    setMilestones(prev => [...prev, optimistic]);
    try {
      const saved = await db.createMilestone(ms);
      setMilestones(prev => prev.map(m => m.id === optimistic.id ? saved : m));
      audit('crear_hito', 'milestone', saved.id, saved.label);
    } catch (err) {
      console.error('Error creando hito:', err);
      setMilestones(prev => prev.filter(m => m.id !== optimistic.id));
    }
  };

  const handleRefreshExpedientes = async () => {
    try {
      const exps = await db.fetchAllExpedientes();
      setExpedientes(exps);
    } catch (err) {
      console.error('Error refrescando expedientes:', err);
    }
  };

  // ── Eventos de expediente + Plazos procesales ────────────────
  const handleCreateEvento = async (
    evento: Omit<EventoExpediente, 'id' | 'createdAt' | 'updatedAt'>,
    plazosDerivados?: Array<Omit<Plazo, 'id' | 'eventoOrigenId' | 'createdAt' | 'updatedAt'>>,
  ): Promise<EventoExpediente> => {
    const now = new Date().toISOString();
    const optimistic: EventoExpediente = {
      ...evento,
      id: crypto.randomUUID(),
      createdAt: now,
      updatedAt: now,
    };
    setEventos(prev => [optimistic, ...prev]);

    let saved: EventoExpediente;
    try {
      saved = await db.createEvento(evento);
      setEventos(prev => prev.map(e => e.id === optimistic.id ? saved : e));
      audit('crear_evento', 'evento', saved.id, saved.titulo, { tipo: saved.tipo, matterId: saved.matterId });
    } catch (err) {
      console.error('Error creando evento:', err);
      setEventos(prev => prev.filter(e => e.id !== optimistic.id));
      throw err;
    }

    // Timeline event mirror — aparece en el feed general del asunto.
    try {
      const tlEvent: Omit<TimelineEvent, 'id'> = {
        matterId:    saved.matterId,
        type:        'status_change',
        title:       saved.titulo,
        description: saved.descripcion,
        user:        authProfile?.fullName || 'Sistema',
        date:        saved.fecha,
      };
      const savedTl = await db.createTimelineEvent(tlEvent);
      setTimeline(prev => [savedTl, ...prev]);
    } catch (err) {
      console.error('Error espejando evento en timeline:', err);
    }

    // Plazos derivados — cada uno genera una tarea transversal no bloqueante.
    if (plazosDerivados?.length) {
      for (const p of plazosDerivados) {
        try {
          // 1) Tarea primero para tener tarea_id antes de insertar el plazo
          const tarea = await db.createTask({
            matterId:   saved.matterId,
            title:      `${p.tipo} — vence ${p.fechaVencimiento}`,
            dueDate:    p.fechaVencimiento,
            status:     'Pendiente',
            priority:   'Alta',
            bloqueante: false,
            etapa:      'transversal',
            generadaAutomaticamente: true,
          } as Omit<Task, 'id'>);
          setTasks(prev => [tarea, ...prev]);

          // 2) Plazo con referencia al evento y a la tarea
          const plazo = await db.createPlazo({
            ...p,
            eventoOrigenId: saved.id,
            tareaId:        tarea.id,
          });
          setPlazos(prev => [plazo, ...prev]);
          audit('crear_plazo', 'plazo', plazo.id, plazo.tipo, { matterId: plazo.matterId, vence: plazo.fechaVencimiento });
        } catch (err) {
          console.error('Error creando plazo derivado:', err);
        }
      }
    }

    return saved;
  };

  const handleUpdateEvento = async (id: string, changes: Partial<EventoExpediente>) => {
    setEventos(prev => prev.map(e => e.id === id ? { ...e, ...changes, updatedAt: new Date().toISOString() } : e));
    try {
      await db.updateEvento(id, changes);
      const e = eventos.find(e => e.id === id);
      audit('editar_evento', 'evento', id, e?.titulo, changes as Record<string, unknown>);
    } catch (err) {
      console.error('Error actualizando evento:', err);
    }
  };

  const handleDeleteEvento = async (id: string) => {
    const prev = eventos;
    const e = eventos.find(e => e.id === id);
    setEventos(curr => curr.filter(x => x.id !== id));
    // Los plazos caen por CASCADE en DB; reflejamos en memoria.
    setPlazos(curr => curr.filter(p => p.eventoOrigenId !== id));
    try {
      await db.deleteEvento(id);
      audit('eliminar_evento', 'evento', id, e?.titulo);
    } catch (err) {
      console.error('Error eliminando evento:', err);
      setEventos(prev);
    }
  };

  const handleCreatePlazo = async (plazo: Omit<Plazo, 'id' | 'createdAt' | 'updatedAt'>): Promise<Plazo> => {
    // Tarea transversal asociada para que el plazo aparezca en WorkQueue.
    let tareaId: string | undefined;
    try {
      const tarea = await db.createTask({
        matterId:   plazo.matterId,
        title:      `${plazo.tipo} — vence ${plazo.fechaVencimiento}`,
        dueDate:    plazo.fechaVencimiento,
        status:     'Pendiente',
        priority:   'Alta',
        bloqueante: false,
        etapa:      'transversal',
        generadaAutomaticamente: true,
      } as Omit<Task, 'id'>);
      setTasks(prev => [tarea, ...prev]);
      tareaId = tarea.id;
    } catch (err) {
      console.error('Error creando tarea para plazo:', err);
    }

    const saved = await db.createPlazo({ ...plazo, tareaId });
    setPlazos(prev => [saved, ...prev]);
    audit('crear_plazo', 'plazo', saved.id, saved.tipo, { matterId: saved.matterId, vence: saved.fechaVencimiento });
    return saved;
  };

  const handleCumplirPlazo = async (id: string) => {
    const p = plazos.find(p => p.id === id);
    const now = new Date().toISOString();
    setPlazos(prev => prev.map(x => x.id === id ? { ...x, estado: 'cumplido', cumplidoAt: now } : x));
    try {
      await db.cumplirPlazo(id);
      audit('cumplir_plazo', 'plazo', id, p?.tipo);
    } catch (err) {
      console.error('Error marcando plazo cumplido:', err);
    }
    // Completar tarea asociada, si existe.
    if (p?.tareaId) {
      try {
        await handleCompleteTask(p.tareaId, authProfile?.fullName || 'Sistema');
      } catch (err) {
        console.error('Error completando tarea del plazo:', err);
      }
    }
  };

  const handleCancelarPlazo = async (id: string) => {
    const p = plazos.find(p => p.id === id);
    setPlazos(prev => prev.map(x => x.id === id ? { ...x, estado: 'cancelado' } : x));
    try {
      await db.cancelarPlazo(id);
      audit('cancelar_plazo', 'plazo', id, p?.tipo);
    } catch (err) {
      console.error('Error cancelando plazo:', err);
    }
  };

  const handleUpdateAssignments = async (matterId: string, profileIds: string[], leadId: string) => {
    // Optimistic update
    setMatters(prev => prev.map(m =>
      m.id === matterId ? { ...m, assignedAttorneys: profileIds } : m
    ));
    // Update lead responsible name
    const leadProfile = profiles.find(p => p.id === leadId);
    if (leadProfile) {
      setMatters(prev => prev.map(m =>
        m.id === matterId ? { ...m, responsible: leadProfile.fullName } : m
      ));
    }
    try {
      await db.updateMatterAssignments(matterId, profileIds, leadId, session?.user?.id || '');
      if (leadProfile) {
        await db.updateMatter(matterId, { responsible: leadProfile.fullName });
      }
      const matter = matters.find(m => m.id === matterId);
      const names = profileIds.map(pid => profiles.find(p => p.id === pid)?.fullName).filter(Boolean);
      audit('asignar_abogados', 'assignment', matterId, matter?.title, { abogados: names, lead: leadProfile?.fullName });
    } catch (err) {
      console.error('Error actualizando asignaciones:', err);
    }
  };

  return (
    <AppContext.Provider value={{
      matters, clients, consultations, timeline, tasks, documents, profiles, isLoading,
      theme, toggleTheme,
      isNewActionOpen, setIsNewActionOpen,
      isEditMatterOpen, setIsEditMatterOpen,
      editMatterFocusField, setEditMatterFocusField,
      isFiltersOpen, setIsFiltersOpen,
      activeFilters, setActiveFilters,
      selectedMatterId, setSelectedMatterId,
      prefilledMatter, setPrefilledMatter,
      handleNewAction, handleEditMatter,
      handleSaveAction, handleSaveMatterEdit,
      handleCreateClient, handleUpdateClient,
      handleUpdateDocument, handleAddDocument,
      handleCloseMatter, handleUpdateMatterDirect, handleCreateMatter,
      handleCreateConsultation, handleUpdateConsultation,
      handleCreateTask, handleUpdateTask, handleCompleteTask,
      handleConsultationStatusChange,
      expedientes, handleRefreshExpedientes,
      milestones, handleUpdateMilestone, handleCreateMilestone,
      handleUpdateAssignments,
      eventos, plazos,
      handleCreateEvento, handleUpdateEvento, handleDeleteEvento,
      handleCreatePlazo, handleCumplirPlazo, handleCancelarPlazo,
    }}>
      {children}
    </AppContext.Provider>
  );
};

export const useAppContext = (): AppContextType => {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useAppContext debe usarse dentro de AppProvider');
  return ctx;
};
