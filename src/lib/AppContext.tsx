import React, { createContext, useContext, useEffect, useState } from 'react';
import { Matter, Client, Consultation, LegalDocument, Task, TimelineEvent, UserProfile, Communication, Expediente, MatterMilestone } from '../types';
import { GlobalFilters, defaultFilters } from '../components/FiltersContent';
import { useAuth } from './auth';
import * as db from './db';
import { generateConsultationTasks, generateExpedienteTasks } from './taskEngine';
import { findTemplate } from '../data/templates';
import { instantiateFlow } from './flowEngine';

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
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { session } = useAuth();

  const [matters, setMatters] = useState<Matter[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [consultations, setConsultations] = useState<Consultation[]>([]);
  const [timeline, setTimeline] = useState<TimelineEvent[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [documents, setDocuments] = useState<LegalDocument[]>([]);
  const [profiles, setProfiles] = useState<UserProfile[]>([]);
  const [expedientes, setExpedientes] = useState<Expediente[]>([]);
  const [milestones, setMilestones] = useState<MatterMilestone[]>([]);
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
    ])
      .then(([m, c, co, d, t, tl, p, ex, ms]) => {
        setMatters(m);
        setClients(c);
        setConsultations(co);
        setDocuments(d);
        setTasks(t);
        setTimeline(tl);
        setProfiles(p);
        setExpedientes(ex);
        setMilestones(ms);
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
    } catch (err) {
      console.error('Error guardando acción:', err);
    }
  };

  const handleSaveMatterEdit = async (data: any) => {
    if (!selectedMatterId) return;
    const changes = {
      title:          data.title,
      responsible:    data.responsible,
      priority:       data.priority,
      health:         data.health,
      nextActionDate: data.nextActionDate,
      description:    data.description,
      lastActivity:   new Date().toISOString(),
    };
    setMatters(prev => prev.map(m => m.id === selectedMatterId ? { ...m, ...changes } : m));
    setIsEditMatterOpen(false);
    try {
      await db.updateMatter(selectedMatterId, changes);
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
    } catch (err) {
      console.error('Error creando cliente:', err);
      setClients(prev => prev.filter(c => c.id !== optimistic.id));
    }
  };

  const handleUpdateClient = async (id: string, data: any) => {
    setClients(prev => prev.map(c => c.id === id ? { ...c, ...data } : c));
    try {
      await db.updateClient_(id, data);
    } catch (err) {
      console.error('Error actualizando cliente:', err);
    }
  };

  const handleUpdateDocument = async (id: string, changes: any) => {
    setDocuments(prev => prev.map(d => d.id === id ? { ...d, ...changes } : d));
    try {
      await db.updateDocument(id, changes);
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
    } catch (err) {
      console.error('Error creando documento:', err);
    }
  };

  const handleCloseMatter = async (matterId: string) => {
    setMatters(prev => prev.map(m => m.id === matterId ? { ...m, status: 'Cerrado' as any } : m));
    try {
      await db.updateMatter(matterId, { status: 'Cerrado' });
    } catch (err) {
      console.error('Error cerrando asunto:', err);
    }
  };

  const handleCreateMatter = async (data: any): Promise<Matter> => {
    // Find matching flow template
    const template = findTemplate(data.type, data.subtype);

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
    };
    const optimistic: Matter = { ...newMatter, id: crypto.randomUUID() };
    setMatters(prev => [optimistic, ...prev]);

    let savedMatter: Matter;
    try {
      savedMatter = await db.createMatter(newMatter);
      setMatters(prev => prev.map(m => m.id === optimistic.id ? savedMatter : m));
    } catch (err) {
      console.error('Error creando asunto:', err);
      savedMatter = optimistic;
    }

    // Instantiate flow: create tasks, documents & milestones from template
    if (template) {
      const flow = instantiateFlow(
        savedMatter.id,
        savedMatter.title,
        savedMatter.client,
        savedMatter.responsible,
        template,
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
    } catch (err) {
      console.error('Error creando tarea:', err);
      setTasks(prev => prev.filter(t => t.id !== optimistic.id));
    }
  };

  const handleUpdateTask = async (id: string, changes: Partial<Task>) => {
    setTasks(prev => prev.map(t => t.id === id ? { ...t, ...changes } : t));
    try {
      await db.updateTask(id, changes);
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
    } catch (err) {
      console.error('Error actualizando hito:', err);
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

  return (
    <AppContext.Provider value={{
      matters, clients, consultations, timeline, tasks, documents, profiles, isLoading,
      theme, toggleTheme,
      isNewActionOpen, setIsNewActionOpen,
      isEditMatterOpen, setIsEditMatterOpen,
      isFiltersOpen, setIsFiltersOpen,
      activeFilters, setActiveFilters,
      selectedMatterId, setSelectedMatterId,
      prefilledMatter, setPrefilledMatter,
      handleNewAction, handleEditMatter,
      handleSaveAction, handleSaveMatterEdit,
      handleCreateClient, handleUpdateClient,
      handleUpdateDocument, handleAddDocument,
      handleCloseMatter, handleCreateMatter,
      handleCreateConsultation, handleUpdateConsultation,
      handleCreateTask, handleUpdateTask, handleCompleteTask,
      handleConsultationStatusChange,
      expedientes, handleRefreshExpedientes,
      milestones, handleUpdateMilestone,
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
