import React, { createContext, useContext, useEffect, useState } from 'react';
import { Matter, Client, Consultation, LegalDocument, Task, TimelineEvent, UserProfile } from '../types';
import { GlobalFilters, defaultFilters } from '../components/FiltersContent';
import { useAuth } from './auth';
import * as db from './db';

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
    Promise.all([
      db.fetchMatters(),
      db.fetchClients(),
      db.fetchConsultations(),
      db.fetchDocuments(),
      db.fetchTasks(),
      db.fetchTimeline(),
      db.fetchProfiles(),
    ])
      .then(([m, c, co, d, t, tl, p]) => {
        setMatters(m);
        setClients(c);
        setConsultations(co);
        setDocuments(d);
        setTasks(t);
        setTimeline(tl);
        setProfiles(p);
      })
      .catch(err => console.error('Error cargando datos:', err))
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
    };
    const optimistic: Matter = { ...newMatter, id: crypto.randomUUID() };
    setMatters(prev => [optimistic, ...prev]);
    try {
      const saved = await db.createMatter(newMatter);
      setMatters(prev => prev.map(m => m.id === optimistic.id ? saved : m));
      return saved;
    } catch (err) {
      console.error('Error creando asunto:', err);
      return optimistic;
    }
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
