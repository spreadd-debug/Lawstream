import React, { createContext, useContext, useEffect, useState } from 'react';
import { Matter, Client, Consultation, LegalDocument, Task, TimelineEvent, UserProfile, Communication, Expediente, MatterMilestone, EventoExpediente, Plazo, Jurisdiccion, TipoProceso, TipoEvento, HiloPrueba, Perito, CompensacionEconomica, CuotaCompensacion, FrecuenciaCuota, LetradoParte, HonorarioRegulado, MatterKind, IncidenteTipo, INCIDENTE_TIPO_LABELS, AspectoApelado, ASPECTO_APELADO_LABELS, Cedula, CedulaIntento, HijoCaso, Reconvencion, Bien, BienValuacion, SociedadInterpuesta, CausaRelacionada, Cautelar, Veedor, CuotaAlimentaria, CuotaConceptoEspecie } from '../types';
import { GlobalFilters, defaultFilters } from '../components/FiltersContent';
import { useAuth } from './auth';
import * as db from './db';
import { logAudit } from './db';
import { generateConsultationTasks, generateExpedienteTasks } from './taskEngine';
import { findTemplate, MATTER_TEMPLATES } from '../data/templates';
import { instantiateFlow, regenerarTareasFaltantes } from './flowEngine';
import { calcularVencimiento, resetFeriadosCache, getPlazosSugeridosPara, diasHabilesEntre } from './plazos';
import { format, parseISO, addMonths } from 'date-fns';

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

/** Meses entre cuotas para cada frecuencia. 'unica' = 0 (sólo 1 cuota total). */
function mesesPorFrecuencia(f: FrecuenciaCuota): number {
  switch (f) {
    case 'mensual':    return 1;
    case 'bimestral':  return 2;
    case 'trimestral': return 3;
    case 'semestral':  return 6;
    case 'anual':      return 12;
    case 'unica':      return 0;
  }
}

/** Normaliza el valor de tipo de proceso al enum canónico. */
function normalizeTipoProceso(raw: string | undefined | null): TipoProceso | undefined {
  if (!raw || typeof raw !== 'string') return undefined;
  const n = raw.trim().toLowerCase();
  if (n === 'ordinario')  return 'ordinario';
  if (n === 'sumario')    return 'sumario';
  if (n === 'sumarisimo' || n === 'sumarísimo') return 'sumarisimo';
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
  handleArchiveMatter: (matterId: string) => Promise<void>;
  handleUpdateMatterDirect: (matterId: string, changes: Partial<Matter>) => Promise<void>;
  handleCreateMatter: (data: any) => Promise<Matter>;
  handleCreateSubProceso: (parentId: string, data: {
    kind: 'incidente' | 'apelacion';
    title: string;
    incidenteTipo?: string;
    description?: string;
    nextAction?: string;
    nextActionDate?: string;
    aspectosApelados?: string[];
    apeladoPor?: 'cliente' | 'contraparte';
  }) => Promise<Matter>;
  // Mutación de tipo de divorcio (GAP R6) — actualiza caseData,
  // cancela tareas pendientes de la rama vieja, crea tareas faltantes
  // de la rama nueva y registra evento `mutacion_tipo_divorcio`.
  handleMutarTipoDivorcio: (
    matterId: string,
    nuevoTipo: 'Unilateral' | 'De común acuerdo',
    motivo: string,
    fechaMutacion: string,
  ) => Promise<{ canceladas: number; creadas: number }>;
  // GAP UX-25: deshacer mutación reciente (<24h) — revierte caseData,
  // re-pendientea canceladas, cancela creadas que sigan pendientes.
  handleDeshacerMutacionTipoDivorcio: (
    eventoMutacionId: string,
  ) => Promise<{ rePendientes: number; canceladas: number; completadasPreservadas: number }>;
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
  handleSuspenderPlazo: (id: string, motivo: string, fechaDesde: string) => Promise<void>;
  handleReanudarPlazo: (id: string, fechaReanudacion: string) => Promise<void>;
  handleActualizarUltimaNotificacion: (id: string, fechaUltima: string) => Promise<void>;
  // Hilos de prueba
  hilos: HiloPrueba[];
  handleCreateHilo: (hilo: Omit<HiloPrueba, 'id' | 'createdAt' | 'updatedAt'>) => Promise<HiloPrueba>;
  handleUpdateHilo: (id: string, changes: Partial<HiloPrueba>) => Promise<void>;
  handleDeleteHilo: (id: string) => Promise<void>;
  // Peritos
  peritos: Perito[];
  handleCreatePerito: (perito: Omit<Perito, 'id' | 'createdAt' | 'updatedAt'>) => Promise<Perito>;
  handleUpdatePerito: (id: string, changes: Partial<Perito>) => Promise<void>;
  handleDeletePerito: (id: string) => Promise<void>;
  // Compensaciones económicas
  compensaciones: CompensacionEconomica[];
  cuotasCompensacion: CuotaCompensacion[];
  handleCreateCompensacion: (c: Omit<CompensacionEconomica, 'id' | 'createdAt' | 'updatedAt'>) => Promise<CompensacionEconomica>;
  handleUpdateCompensacion: (id: string, changes: Partial<CompensacionEconomica>) => Promise<void>;
  handleDeleteCompensacion: (id: string) => Promise<void>;
  handleMarcarCuotaPagada: (cuotaId: string, fechaPago: string, montoPagado: number, comprobanteUrl?: string) => Promise<void>;
  handleUpdateCuota: (cuotaId: string, changes: Partial<CuotaCompensacion>) => Promise<void>;
  // Letrados de la parte / contraparte
  letrados: LetradoParte[];
  handleCreateLetrado: (l: Omit<LetradoParte, 'id' | 'createdAt' | 'updatedAt'>) => Promise<LetradoParte>;
  handleUpdateLetrado: (id: string, changes: Partial<LetradoParte>) => Promise<void>;
  handleDeleteLetrado: (id: string) => Promise<void>;
  handleSustituirLetrado: (
    letradoId: string,
    nuevoLetrado: Omit<LetradoParte, 'id' | 'createdAt' | 'updatedAt'>,
    fechaCese: string,
    motivoCese?: string,
  ) => Promise<void>;
  // Honorarios regulados
  honorariosRegulados: HonorarioRegulado[];
  handleCreateHonorarioRegulado: (h: Omit<HonorarioRegulado, 'id' | 'createdAt' | 'updatedAt'>) => Promise<HonorarioRegulado>;
  handleUpdateHonorarioRegulado: (id: string, changes: Partial<HonorarioRegulado>) => Promise<void>;
  handleDeleteHonorarioRegulado: (id: string) => Promise<void>;
  // Cédulas (GAP 7)
  cedulas: Cedula[];
  cedulaIntentos: CedulaIntento[];
  handleCreateCedula: (c: Omit<Cedula, 'id' | 'createdAt' | 'updatedAt'>) => Promise<Cedula>;
  handleUpdateCedula: (id: string, changes: Partial<Cedula>) => Promise<void>;
  handleDeleteCedula: (id: string) => Promise<void>;
  handleCreateCedulaIntento: (i: Omit<CedulaIntento, 'id' | 'createdAt'>) => Promise<CedulaIntento>;
  handleDeleteCedulaIntento: (id: string) => Promise<void>;
  // Hijos del caso (migración 041 — R1+R2+R3)
  hijos: HijoCaso[];
  handleCreateHijoCaso: (h: Omit<HijoCaso, 'id' | 'createdAt' | 'updatedAt'>) => Promise<HijoCaso>;
  handleUpdateHijoCaso: (id: string, changes: Partial<HijoCaso>) => Promise<void>;
  handleDeleteHijoCaso: (id: string) => Promise<void>;
  // Reconvenciones (migración 043 — R10)
  reconvenciones: Reconvencion[];
  handleCreateReconvencion: (r: Omit<Reconvencion, 'id' | 'createdAt' | 'updatedAt'>) => Promise<Reconvencion>;
  handleUpdateReconvencion: (id: string, changes: Partial<Reconvencion>) => Promise<void>;
  handleDeleteReconvencion: (id: string) => Promise<void>;
  // Bienes / patrimonio (migración 045 — R4 + R9 + R14)
  bienes: Bien[];
  bienValuaciones: BienValuacion[];
  sociedadesInterpuestas: SociedadInterpuesta[];
  handleCreateBien: (b: Omit<Bien, 'id' | 'createdAt' | 'updatedAt'>) => Promise<Bien>;
  handleUpdateBien: (id: string, changes: Partial<Bien>) => Promise<void>;
  handleDeleteBien: (id: string) => Promise<void>;
  handleCreateBienValuacion: (v: Omit<BienValuacion, 'id' | 'createdAt'>) => Promise<BienValuacion>;
  handleDeleteBienValuacion: (id: string) => Promise<void>;
  handleCreateSociedadInterpuesta: (s: Omit<SociedadInterpuesta, 'id' | 'createdAt' | 'updatedAt'>) => Promise<SociedadInterpuesta>;
  handleUpdateSociedadInterpuesta: (id: string, changes: Partial<SociedadInterpuesta>) => Promise<void>;
  handleDeleteSociedadInterpuesta: (id: string) => Promise<void>;
  // Causas relacionadas (migración 046 — R12)
  causasRelacionadas: CausaRelacionada[];
  handleCreateCausaRelacionada: (c: Omit<CausaRelacionada, 'id' | 'createdAt' | 'updatedAt'>) => Promise<CausaRelacionada>;
  handleUpdateCausaRelacionada: (id: string, changes: Partial<CausaRelacionada>) => Promise<void>;
  handleDeleteCausaRelacionada: (id: string) => Promise<void>;
  // Cautelares + Veedores (migración 047 — R15)
  cautelares: Cautelar[];
  veedores: Veedor[];
  handleCreateCautelar: (c: Omit<Cautelar, 'id' | 'createdAt' | 'updatedAt'>) => Promise<Cautelar>;
  handleUpdateCautelar: (id: string, changes: Partial<Cautelar>) => Promise<void>;
  handleDeleteCautelar: (id: string) => Promise<void>;
  handleCreateVeedor: (v: Omit<Veedor, 'id' | 'createdAt' | 'updatedAt'>) => Promise<Veedor>;
  handleUpdateVeedor: (id: string, changes: Partial<Veedor>) => Promise<void>;
  handleDeleteVeedor: (id: string) => Promise<void>;
  // Cuotas alimentarias + conceptos en especie (migración 048 — R13)
  cuotasAlimentarias: CuotaAlimentaria[];
  cuotaConceptosEspecie: CuotaConceptoEspecie[];
  handleCreateCuotaAlimentaria: (c: Omit<CuotaAlimentaria, 'id' | 'createdAt' | 'updatedAt'>) => Promise<CuotaAlimentaria>;
  handleUpdateCuotaAlimentaria: (id: string, changes: Partial<CuotaAlimentaria>) => Promise<void>;
  handleDeleteCuotaAlimentaria: (id: string) => Promise<void>;
  handleCreateCuotaConceptoEspecie: (c: Omit<CuotaConceptoEspecie, 'id' | 'createdAt' | 'updatedAt'>) => Promise<CuotaConceptoEspecie>;
  handleUpdateCuotaConceptoEspecie: (id: string, changes: Partial<CuotaConceptoEspecie>) => Promise<void>;
  handleDeleteCuotaConceptoEspecie: (id: string) => Promise<void>;
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
  const [hilos, setHilos] = useState<HiloPrueba[]>([]);
  const [peritos, setPeritos] = useState<Perito[]>([]);
  const [compensaciones, setCompensaciones] = useState<CompensacionEconomica[]>([]);
  const [cuotasCompensacion, setCuotasCompensacion] = useState<CuotaCompensacion[]>([]);
  const [letrados, setLetrados] = useState<LetradoParte[]>([]);
  const [honorariosRegulados, setHonorariosRegulados] = useState<HonorarioRegulado[]>([]);
  const [cedulas, setCedulas] = useState<Cedula[]>([]);
  const [cedulaIntentos, setCedulaIntentos] = useState<CedulaIntento[]>([]);
  const [hijos, setHijos] = useState<HijoCaso[]>([]);
  const [reconvenciones, setReconvenciones] = useState<Reconvencion[]>([]);
  const [bienes, setBienes] = useState<Bien[]>([]);
  const [bienValuaciones, setBienValuaciones] = useState<BienValuacion[]>([]);
  const [sociedadesInterpuestas, setSociedadesInterpuestas] = useState<SociedadInterpuesta[]>([]);
  const [causasRelacionadas, setCausasRelacionadas] = useState<CausaRelacionada[]>([]);
  const [cautelares, setCautelares] = useState<Cautelar[]>([]);
  const [veedores, setVeedores] = useState<Veedor[]>([]);
  const [cuotasAlimentarias, setCuotasAlimentarias] = useState<CuotaAlimentaria[]>([]);
  const [cuotaConceptosEspecie, setCuotaConceptosEspecie] = useState<CuotaConceptoEspecie[]>([]);
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
      safe(db.fetchHilos(),            'hilos'),
      safe(db.fetchPeritos(),          'peritos'),
      safe(db.fetchCompensaciones(),   'compensaciones'),
      safe(db.fetchCuotasCompensacion(), 'cuotas_compensacion'),
      safe(db.fetchLetrados(),         'letrados'),
      safe(db.fetchHonorariosRegulados(), 'honorarios_regulados'),
      safe(db.fetchCedulas(),          'cedulas'),
      safe(db.fetchCedulaIntentos(),   'cedula_intentos'),
      safe(db.fetchHijosCaso(),        'hijos_caso'),
      safe(db.fetchReconvenciones(),   'reconvenciones'),
      safe(db.fetchBienes(),                 'bienes'),
      safe(db.fetchBienValuaciones(),        'bien_valuaciones'),
      safe(db.fetchSociedadesInterpuestas(), 'sociedades_interpuestas'),
      safe(db.fetchCausasRelacionadas(),     'causas_relacionadas'),
      safe(db.fetchCautelares(),             'cautelares'),
      safe(db.fetchVeedores(),               'veedores'),
      safe(db.fetchCuotasAlimentarias(),     'cuotas_alimentarias'),
      safe(db.fetchCuotaConceptosEspecie(),  'cuota_conceptos_especie'),
    ])
      .then(([m, c, co, d, t, tl, p, ex, ms, ev, pl, hi, pe, comps, cuotas, letr, honor, ced, cedI, hjs, rec, bn, bv, si, cr, cau, vd, ca, ce]) => {
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
        setHilos(hi);
        setPeritos(pe);
        setCompensaciones(comps);
        setCuotasCompensacion(cuotas);
        setLetrados(letr);
        setHonorariosRegulados(honor);
        setCedulas(ced);
        setCedulaIntentos(cedI);
        setHijos(hjs);
        setReconvenciones(rec);
        setBienes(bn);
        setBienValuaciones(bv);
        setSociedadesInterpuestas(si);
        setCausasRelacionadas(cr);
        setCautelares(cau);
        setVeedores(vd);
        setCuotasAlimentarias(ca);
        setCuotaConceptosEspecie(ce);
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

    const newTipoProceso = data.tipoProceso !== undefined
      ? normalizeTipoProceso(data.tipoProceso)
      : prevMatter?.tipoProceso;
    const tipoProcesoChanged =
      data.tipoProceso !== undefined &&
      newTipoProceso !== undefined &&
      newTipoProceso !== prevMatter?.tipoProceso;

    const changes: Partial<Matter> = {
      title:          data.title,
      responsible:    data.responsible,
      priority:       data.priority,
      health:         data.health,
      nextActionDate: data.nextActionDate,
      description:    data.description,
      lastActivity:   new Date().toISOString(),
    };
    if (data.subtype      !== undefined) changes.subtype      = data.subtype || undefined;
    if (data.expediente   !== undefined) changes.expediente   = data.expediente || undefined;
    if (newJurisdiccion   !== undefined) changes.jurisdiccion = newJurisdiccion;
    if (newTipoProceso    !== undefined) changes.tipoProceso  = newTipoProceso;

    setMatters(prev => prev.map(m => m.id === selectedMatterId ? { ...m, ...changes } : m));
    setIsEditMatterOpen(false);
    setEditMatterFocusField(null);
    try {
      await db.updateMatter(selectedMatterId, changes);
      audit('editar_asunto', 'matter', selectedMatterId, data.title, changes as Record<string, unknown>);

      // Recalcular plazos activos si cambió jurisdicción o tipo de proceso:
      //  - jurisdicción afecta el calendario (feriados) → cambia fechaVencimiento.
      //  - tipo de proceso afecta los DÍAS base → puede cambiar `dias` y luego fechaVencimiento.
      // Los plazos inactivos (cumplidos, cancelados, vencidos) no se tocan.
      if ((jurisdiccionChanged || tipoProcesoChanged) && newJurisdiccion) {
        resetFeriadosCache();
        const plazosActivos = plazos.filter(
          p => p.matterId === selectedMatterId && p.estado === 'activo',
        );
        for (const p of plazosActivos) {
          try {
            let nuevosDias = p.dias;
            let nuevosDiasHabiles = p.diasHabiles;

            // Si cambió el tipo de proceso, intentar buscar los nuevos plazos
            // sugeridos para el evento de origen y aplicar los días correctos.
            if (tipoProcesoChanged && newTipoProceso && p.eventoOrigenId) {
              const evento = eventos.find(e => e.id === p.eventoOrigenId);
              if (evento) {
                const sugeridos = getPlazosSugeridosPara(
                  evento.tipo as TipoEvento,
                  newJurisdiccion,
                  newTipoProceso,
                );
                const match = sugeridos.find(s => s.tipo === p.tipo);
                if (match) {
                  nuevosDias = match.dias;
                  nuevosDiasHabiles = match.diasHabiles;
                }
              }
            }

            const nuevaFecha = await calcularVencimiento({
              fechaInicio: parseISO(p.fechaInicio),
              dias: nuevosDias,
              diasHabiles: nuevosDiasHabiles,
              jurisdiccion: newJurisdiccion,
            });
            const plazoUpdate: Partial<Plazo> = {
              jurisdiccion:     newJurisdiccion,
              dias:             nuevosDias,
              diasHabiles:      nuevosDiasHabiles,
              fechaVencimiento: format(nuevaFecha, 'yyyy-MM-dd'),
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

  /**
   * Archiva un caso (estado 'Archivado'). Distinto de Cerrado:
   *  - Cerrado:   el caso terminó (con o sin éxito de fondo).
   *  - Archivado: el expediente fue archivado judicialmente (post-ejecución
   *               cumplida, perención, etc). Se mantiene como histórico
   *               consultable pero no aparece en listas de casos activos.
   */
  const handleArchiveMatter = async (matterId: string) => {
    const matter = matters.find(m => m.id === matterId);
    setMatters(prev => prev.map(m => m.id === matterId ? { ...m, status: 'Archivado' as any } : m));
    try {
      await db.updateMatter(matterId, { status: 'Archivado' });
      audit('cerrar_asunto', 'matter', matterId, matter?.title, { accion: 'archivar' });
    } catch (err) {
      console.error('Error archivando asunto:', err);
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
      tipoProceso:    normalizeTipoProceso(data.tipoProceso) ?? 'ordinario',
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

  // GAP 1 — crear incidente o apelación como matter hijo del padre.
  // Reusa toda la infra (timeline, plazos, documentos) pero queda fuera del
  // listado principal de casos (filtrado por kind='principal').
  const handleCreateSubProceso = async (
    parentId: string,
    data: {
      kind: 'incidente' | 'apelacion';
      title: string;
      incidenteTipo?: string;
      description?: string;
      nextAction?: string;
      nextActionDate?: string;
      aspectosApelados?: string[];
      apeladoPor?: 'cliente' | 'contraparte';
    },
  ): Promise<Matter> => {
    const parent = matters.find(m => m.id === parentId);
    if (!parent) throw new Error('Caso padre no encontrado');

    // GAP 4 — apelaciones tienen flow propio (Agravios → Traslado → Elevación
    // → Autos → Sentencia → Devolución). Mismo template para cualquier rama.
    const apelacionTemplateId = data.kind === 'apelacion' ? 'cam-apelacion-civil' : undefined;
    const apelacionEtapaInicial = data.kind === 'apelacion' ? 'Agravios' : undefined;

    // Hereda metadatos del padre (cliente, tipo, jurisdicción, responsable, expediente).
    const newMatter: Omit<Matter, 'id'> = {
      title:          data.title,
      client:         parent.client,
      type:           parent.type,
      subtype:        parent.subtype,
      description:    data.description,
      expediente:     parent.expediente,
      responsible:    parent.responsible,
      priority:       parent.priority,
      status:         'Activo',
      health:         'Sano',
      nextAction:     data.nextAction || (data.kind === 'apelacion' ? 'Expresar agravios' : 'Iniciar incidente'),
      nextActionDate: data.nextActionDate || new Date().toISOString().slice(0, 10),
      lastActivity:   new Date().toISOString(),
      jurisdiccion:   parent.jurisdiccion,
      tipoProceso:    parent.tipoProceso,
      kind:           data.kind,
      parentMatterId: parentId,
      incidenteTipo:  data.kind === 'incidente' ? (data.incidenteTipo as IncidenteTipo | undefined) : undefined,
      aspectosApelados: data.kind === 'apelacion' && data.aspectosApelados && data.aspectosApelados.length > 0
        ? (data.aspectosApelados as AspectoApelado[])
        : undefined,
      apeladoPor:     data.kind === 'apelacion' ? data.apeladoPor : undefined,
      flowTemplateId: apelacionTemplateId,
      currentStage:   apelacionEtapaInicial,
    };

    const optimistic: Matter = { ...newMatter, id: crypto.randomUUID() };
    setMatters(prev => [optimistic, ...prev]);

    let savedMatter: Matter;
    try {
      savedMatter = await db.createMatter(newMatter);
      setMatters(prev => prev.map(m => m.id === optimistic.id ? savedMatter : m));
      const tipoLabel = data.kind === 'apelacion'
        ? 'Apelación'
        : `Incidente${data.incidenteTipo ? ' · ' + (INCIDENTE_TIPO_LABELS[data.incidenteTipo as IncidenteTipo] ?? data.incidenteTipo) : ''}`;
      audit('crear_asunto', 'matter', savedMatter.id, savedMatter.title, {
        kind: data.kind,
        parent_id: parentId,
        parent_title: parent.title,
        tipo: tipoLabel,
      });
    } catch (err) {
      console.error('Error creando sub-proceso:', err);
      throw err;
    }

    // Registrar evento en el TIMELINE DEL PADRE para que quede trazable.
    try {
      const tipoLabel = data.kind === 'apelacion'
        ? 'Apelación'
        : `Incidente · ${data.incidenteTipo ? (INCIDENTE_TIPO_LABELS[data.incidenteTipo as IncidenteTipo] ?? data.incidenteTipo) : 'sin tipo'}`;
      const evt = await db.createTimelineEvent({
        matterId: parentId,
        type: 'creation',
        title: `Sub-proceso abierto: ${tipoLabel}`,
        description: data.title,
        user: parent.responsible,
        date: new Date().toISOString(),
      });
      setTimeline(prev => [evt, ...prev]);
    } catch (err) {
      console.error('Error registrando evento en padre:', err);
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

  /**
   * Suspende un plazo manual o judicialmente. Calcula los días hábiles ya
   * transcurridos entre la fecha de inicio y la fecha de suspensión, y los
   * guarda para que al reanudar se compute correctamente lo que falta.
   *
   * `fechaDesde` es la fecha (YYYY-MM-DD) en que entra en vigor la suspensión
   * — puede ser hoy o una fecha pasada (ej. acordada que regía retroactivamente).
   */
  const handleSuspenderPlazo = async (id: string, motivo: string, fechaDesde: string) => {
    const p = plazos.find(x => x.id === id);
    if (!p) return;
    if (p.estado !== 'activo') {
      console.warn('Solo se pueden suspender plazos activos:', p.estado);
      return;
    }
    let diasTranscurridos = 0;
    try {
      diasTranscurridos = await diasHabilesEntre(
        parseISO(p.fechaInicio),
        parseISO(fechaDesde),
        p.jurisdiccion,
      );
    } catch (err) {
      console.error('Error calculando días transcurridos:', err);
    }
    const cambios: Partial<Plazo> = {
      estado: 'suspendido',
      suspendidoDesde: fechaDesde,
      motivoSuspension: motivo.trim() || undefined,
      diasTranscurridosAlSuspender: diasTranscurridos,
    };
    setPlazos(prev => prev.map(x => x.id === id ? { ...x, ...cambios } : x));
    try {
      await db.updatePlazo(id, cambios);
      audit('cancelar_plazo', 'plazo', id, p.tipo, { accion: 'suspender', motivo, fecha: fechaDesde });
    } catch (err) {
      console.error('Error suspendiendo plazo:', err);
    }
  };

  /**
   * Reanuda un plazo suspendido desde una fecha. Recalcula la nueva fecha
   * de vencimiento usando los días que faltaban (total - transcurridos)
   * a partir de la fecha de reanudación, respetando feriados/feria de la
   * jurisdicción.
   */
  const handleReanudarPlazo = async (id: string, fechaReanudacion: string) => {
    const p = plazos.find(x => x.id === id);
    if (!p) return;
    if (p.estado !== 'suspendido') {
      console.warn('Solo se pueden reanudar plazos suspendidos:', p.estado);
      return;
    }
    const transcurridos = p.diasTranscurridosAlSuspender ?? 0;
    const restantes = Math.max(0, p.dias - transcurridos);
    let nuevaFecha = fechaReanudacion;
    try {
      const fecha = await calcularVencimiento({
        fechaInicio: parseISO(fechaReanudacion),
        dias: restantes,
        diasHabiles: p.diasHabiles,
        jurisdiccion: p.jurisdiccion,
      });
      nuevaFecha = format(fecha, 'yyyy-MM-dd');
    } catch (err) {
      console.error('Error recalculando vencimiento al reanudar:', err);
    }
    const cambios: Partial<Plazo> = {
      estado: 'activo',
      fechaReanudacion,
      reanudadoAt: new Date().toISOString(),
      fechaVencimiento: nuevaFecha,
    };
    setPlazos(prev => prev.map(x => x.id === id ? { ...x, ...cambios } : x));
    try {
      await db.updatePlazo(id, cambios);
      audit('editar_asunto', 'plazo', id, p.tipo, { accion: 'reanudar', fecha: fechaReanudacion, restantes });
    } catch (err) {
      console.error('Error reanudando plazo:', err);
    }
  };

  /**
   * Actualiza la "última notificación" de un plazo común y recalcula el
   * vencimiento. Solo aplica a plazos `tipoPlazo = 'comun'` activos.
   *
   * Caso típico: en alegatos (art. 482 CPCCN) hay 6 días COMUNES desde la
   * última notificación. Si el segundo letrado se notifica más tarde, el
   * abogado registra la nueva fecha y la fecha de vencimiento se mueve.
   */
  const handleActualizarUltimaNotificacion = async (id: string, fechaUltima: string) => {
    const p = plazos.find(x => x.id === id);
    if (!p) return;
    if (p.tipoPlazo !== 'comun') {
      console.warn('actualizarUltimaNotificacion solo aplica a plazos comunes');
      return;
    }
    if (p.estado !== 'activo') {
      console.warn('Solo plazos activos pueden actualizar la última notificación');
      return;
    }
    let nuevaFecha = p.fechaVencimiento;
    try {
      const venc = await calcularVencimiento({
        fechaInicio: parseISO(fechaUltima),
        dias: p.dias,
        diasHabiles: p.diasHabiles,
        jurisdiccion: p.jurisdiccion,
      });
      nuevaFecha = format(venc, 'yyyy-MM-dd');
    } catch (err) {
      console.error('Error recalculando vencimiento por nueva notificación:', err);
    }
    const cambios: Partial<Plazo> = {
      fechaUltimaNotificacion: fechaUltima,
      fechaVencimiento: nuevaFecha,
    };
    setPlazos(prev => prev.map(x => x.id === id ? { ...x, ...cambios } : x));
    try {
      await db.updatePlazo(id, cambios);
      audit('editar_asunto', 'plazo', id, p.tipo, { accion: 'nueva_notificacion', fecha: fechaUltima });
    } catch (err) {
      console.error('Error actualizando última notificación:', err);
    }
  };

  // ── Hilos de prueba ────────────────────────────────────────────

  const handleCreateHilo = async (
    hilo: Omit<HiloPrueba, 'id' | 'createdAt' | 'updatedAt'>,
  ): Promise<HiloPrueba> => {
    const optimistic: HiloPrueba = {
      ...hilo,
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    setHilos(prev => [...prev, optimistic]);
    try {
      const saved = await db.createHilo(hilo);
      setHilos(prev => prev.map(h => h.id === optimistic.id ? saved : h));
      return saved;
    } catch (err) {
      console.error('Error creando hilo de prueba:', err);
      setHilos(prev => prev.filter(h => h.id !== optimistic.id));
      throw err;
    }
  };

  const handleUpdateHilo = async (id: string, changes: Partial<HiloPrueba>): Promise<void> => {
    setHilos(prev => prev.map(h => h.id === id ? { ...h, ...changes, updatedAt: new Date().toISOString() } : h));
    try {
      await db.updateHilo(id, changes);
    } catch (err) {
      console.error('Error actualizando hilo:', err);
    }
  };

  const handleDeleteHilo = async (id: string): Promise<void> => {
    const prev = hilos;
    setHilos(curr => curr.filter(h => h.id !== id));
    try {
      await db.deleteHilo(id);
    } catch (err) {
      console.error('Error eliminando hilo:', err);
      setHilos(prev);
    }
  };

  // ── Peritos ────────────────────────────────────────────────────

  const handleCreatePerito = async (
    perito: Omit<Perito, 'id' | 'createdAt' | 'updatedAt'>,
  ): Promise<Perito> => {
    const optimistic: Perito = {
      ...perito,
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    setPeritos(prev => [...prev, optimistic]);
    try {
      const saved = await db.createPerito(perito);
      setPeritos(prev => prev.map(p => p.id === optimistic.id ? saved : p));
      return saved;
    } catch (err) {
      console.error('Error creando perito:', err);
      setPeritos(prev => prev.filter(p => p.id !== optimistic.id));
      throw err;
    }
  };

  const handleUpdatePerito = async (id: string, changes: Partial<Perito>): Promise<void> => {
    setPeritos(prev => prev.map(p => p.id === id ? { ...p, ...changes, updatedAt: new Date().toISOString() } : p));
    try {
      await db.updatePerito(id, changes);
    } catch (err) {
      console.error('Error actualizando perito:', err);
    }
  };

  const handleDeletePerito = async (id: string): Promise<void> => {
    const prev = peritos;
    setPeritos(curr => curr.filter(p => p.id !== id));
    try {
      await db.deletePerito(id);
    } catch (err) {
      console.error('Error eliminando perito:', err);
      setPeritos(prev);
    }
  };

  // ── Compensaciones económicas ──────────────────────────────────

  /**
   * Crea una compensación y genera automáticamente el calendario de cuotas.
   * Cada cuota tiene fecha de vencimiento = primera + (i × intervalo) y
   * monto = montoTotal / cantidadCuotas (la última absorbe el redondeo).
   */
  const handleCreateCompensacion = async (
    c: Omit<CompensacionEconomica, 'id' | 'createdAt' | 'updatedAt'>,
  ): Promise<CompensacionEconomica> => {
    const saved = await db.createCompensacion(c);
    setCompensaciones(prev => [saved, ...prev]);

    // Generar las cuotas
    const intervaloMeses = mesesPorFrecuencia(c.frecuencia);
    const montoCuota = +(c.montoTotal / c.cantidadCuotas).toFixed(2);
    const sumaParcial = +(montoCuota * (c.cantidadCuotas - 1)).toFixed(2);
    const ultimoMonto = +(c.montoTotal - sumaParcial).toFixed(2);

    const cuotas: Array<Omit<CuotaCompensacion, 'id' | 'createdAt' | 'updatedAt'>> = [];
    const baseFecha = parseISO(c.fechaPrimeraCuota);
    for (let i = 0; i < c.cantidadCuotas; i++) {
      const fecha = addMonths(baseFecha, i * intervaloMeses);
      cuotas.push({
        compensacionId:    saved.id,
        numero:            i + 1,
        fechaVencimiento:  format(fecha, 'yyyy-MM-dd'),
        monto:             i === c.cantidadCuotas - 1 ? ultimoMonto : montoCuota,
        estado:            'pendiente',
      });
    }
    try {
      const savedCuotas = await db.createCuotasBulk(cuotas);
      setCuotasCompensacion(prev => [...prev, ...savedCuotas]);
    } catch (err) {
      console.error('Error generando cuotas:', err);
    }
    audit('crear_asunto', 'matter', saved.matterId, undefined, {
      accion: 'crear_compensacion',
      monto: c.montoTotal,
      cuotas: c.cantidadCuotas,
    });
    return saved;
  };

  const handleUpdateCompensacion = async (id: string, changes: Partial<CompensacionEconomica>): Promise<void> => {
    setCompensaciones(prev => prev.map(c => c.id === id ? { ...c, ...changes, updatedAt: new Date().toISOString() } : c));
    try {
      await db.updateCompensacion(id, changes);
    } catch (err) {
      console.error('Error actualizando compensación:', err);
    }
  };

  const handleDeleteCompensacion = async (id: string): Promise<void> => {
    const prevC = compensaciones;
    const prevCu = cuotasCompensacion;
    setCompensaciones(curr => curr.filter(c => c.id !== id));
    setCuotasCompensacion(curr => curr.filter(cu => cu.compensacionId !== id));
    try {
      await db.deleteCompensacion(id);
    } catch (err) {
      console.error('Error eliminando compensación:', err);
      setCompensaciones(prevC);
      setCuotasCompensacion(prevCu);
    }
  };

  /**
   * Marca una cuota como pagada (o parcial si monto < cuota.monto) y
   * registra la fecha de pago + comprobante opcional.
   */
  const handleMarcarCuotaPagada = async (
    cuotaId: string,
    fechaPago: string,
    montoPagado: number,
    comprobanteUrl?: string,
  ): Promise<void> => {
    const cuota = cuotasCompensacion.find(c => c.id === cuotaId);
    if (!cuota) return;
    const nuevoEstado: CuotaCompensacion['estado'] =
      montoPagado >= cuota.monto ? 'pagada' : 'parcial';
    const cambios: Partial<CuotaCompensacion> = {
      estado: nuevoEstado,
      fechaPago,
      montoPagado,
      comprobanteUrl: comprobanteUrl ?? undefined,
    };
    setCuotasCompensacion(prev => prev.map(c => c.id === cuotaId ? { ...c, ...cambios } : c));
    try {
      await db.updateCuota(cuotaId, cambios);
    } catch (err) {
      console.error('Error marcando cuota pagada:', err);
    }
  };

  const handleUpdateCuota = async (cuotaId: string, changes: Partial<CuotaCompensacion>): Promise<void> => {
    setCuotasCompensacion(prev => prev.map(c => c.id === cuotaId ? { ...c, ...changes } : c));
    try {
      await db.updateCuota(cuotaId, changes);
    } catch (err) {
      console.error('Error actualizando cuota:', err);
    }
  };

  // ── Letrados de la parte / contraparte ─────────────────────────

  const handleCreateLetrado = async (
    l: Omit<LetradoParte, 'id' | 'createdAt' | 'updatedAt'>,
  ): Promise<LetradoParte> => {
    const optimistic: LetradoParte = {
      ...l,
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    setLetrados(prev => [...prev, optimistic]);
    try {
      const saved = await db.createLetrado(l);
      setLetrados(prev => prev.map(x => x.id === optimistic.id ? saved : x));
      return saved;
    } catch (err) {
      console.error('Error creando letrado:', err);
      setLetrados(prev => prev.filter(x => x.id !== optimistic.id));
      throw err;
    }
  };

  const handleUpdateLetrado = async (id: string, changes: Partial<LetradoParte>): Promise<void> => {
    setLetrados(prev => prev.map(x => x.id === id ? { ...x, ...changes, updatedAt: new Date().toISOString() } : x));
    try {
      await db.updateLetrado(id, changes);
    } catch (err) {
      console.error('Error actualizando letrado:', err);
    }
  };

  const handleDeleteLetrado = async (id: string): Promise<void> => {
    const prev = letrados;
    setLetrados(curr => curr.filter(x => x.id !== id));
    try {
      await db.deleteLetrado(id);
    } catch (err) {
      console.error('Error eliminando letrado:', err);
      setLetrados(prev);
    }
  };

  /**
   * Sustituye un letrado por otro: marca al actual como 'sustituido'
   * con la fecha de cese y crea uno nuevo 'vigente'. Operación
   * compuesta — preserva el histórico del letrado anterior y registra
   * el cambio como evento de timeline (tipo 'cambio_representacion').
   */
  const handleSustituirLetrado = async (
    letradoId: string,
    nuevoLetrado: Omit<LetradoParte, 'id' | 'createdAt' | 'updatedAt'>,
    fechaCese: string,
    motivoCese?: string,
  ): Promise<void> => {
    const anterior = letrados.find(l => l.id === letradoId);
    // 1. Marcar al actual como sustituido
    await handleUpdateLetrado(letradoId, {
      estado: 'sustituido',
      fechaCese,
      motivoCese: motivoCese?.trim() || undefined,
    });
    // 2. Crear el nuevo (forzando estado vigente y fechaDesignacion = fechaCese)
    await handleCreateLetrado({
      ...nuevoLetrado,
      estado: 'vigente',
      fechaDesignacion: nuevoLetrado.fechaDesignacion || fechaCese,
    });
    // 3. Registrar el cambio en el Timeline como evento procesal.
    //    No bloquea la sustitución si falla (ej. matter sin jurisdicción).
    if (anterior) {
      const matter = matters.find(m => m.id === nuevoLetrado.matterId);
      const jur = matter?.jurisdiccion;
      const rolLabel =
        nuevoLetrado.representaA === 'contraparte' ? 'la contraparte' :
        nuevoLetrado.representaA === 'tercero'     ? 'un tercero' :
        nuevoLetrado.representaA === 'fiscalia'    ? 'la fiscalía' :
        nuevoLetrado.representaA === 'defensoria'  ? 'la defensoría' :
                                                     'la otra parte';
      const partesAnterior = [anterior.nombre, anterior.matricula].filter(Boolean).join(' — ');
      const partesNuevo    = [nuevoLetrado.nombre, nuevoLetrado.matricula].filter(Boolean).join(' — ');
      const titulo = `Cambio de representación de ${rolLabel}: ${anterior.nombre} → ${nuevoLetrado.nombre}`;
      const descripcionLineas: string[] = [
        `Sale: ${partesAnterior}.`,
        `Asume: ${partesNuevo}.`,
      ];
      if (motivoCese?.trim()) descripcionLineas.push(`Motivo: ${motivoCese.trim()}.`);
      try {
        await handleCreateEvento({
          matterId:       nuevoLetrado.matterId,
          fecha:          fechaCese,
          tipo:           'cambio_representacion',
          titulo,
          descripcion:    descripcionLineas.join(' '),
          origen:         'manual',
          jurisdiccion:   jur,
          documentosUrls: [],
        });
      } catch (err) {
        console.error('Error registrando evento de cambio de representación:', err);
      }
    }
  };

  // ── Honorarios regulados ──────────────────────────────────────

  const handleCreateHonorarioRegulado = async (
    h: Omit<HonorarioRegulado, 'id' | 'createdAt' | 'updatedAt'>,
  ): Promise<HonorarioRegulado> => {
    const optimistic: HonorarioRegulado = {
      ...h,
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    setHonorariosRegulados(prev => [optimistic, ...prev]);
    try {
      const saved = await db.createHonorarioRegulado(h);
      setHonorariosRegulados(prev => prev.map(x => x.id === optimistic.id ? saved : x));
      return saved;
    } catch (err) {
      console.error('Error creando honorario regulado:', err);
      setHonorariosRegulados(prev => prev.filter(x => x.id !== optimistic.id));
      throw err;
    }
  };

  const handleUpdateHonorarioRegulado = async (id: string, changes: Partial<HonorarioRegulado>): Promise<void> => {
    setHonorariosRegulados(prev => prev.map(h => h.id === id ? { ...h, ...changes, updatedAt: new Date().toISOString() } : h));
    try {
      await db.updateHonorarioRegulado(id, changes);
    } catch (err) {
      console.error('Error actualizando honorario regulado:', err);
    }
  };

  const handleDeleteHonorarioRegulado = async (id: string): Promise<void> => {
    const prev = honorariosRegulados;
    setHonorariosRegulados(curr => curr.filter(h => h.id !== id));
    try {
      await db.deleteHonorarioRegulado(id);
    } catch (err) {
      console.error('Error eliminando honorario regulado:', err);
      setHonorariosRegulados(prev);
    }
  };

  // ── Cédulas + Intentos (GAP 7) ─────────────────────────────
  const handleCreateCedula = async (
    c: Omit<Cedula, 'id' | 'createdAt' | 'updatedAt'>,
  ): Promise<Cedula> => {
    const optimistic: Cedula = {
      ...c,
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    setCedulas(prev => [optimistic, ...prev]);
    try {
      const saved = await db.createCedula(c);
      setCedulas(prev => prev.map(x => x.id === optimistic.id ? saved : x));
      return saved;
    } catch (err) {
      console.error('Error creando cédula:', err);
      setCedulas(prev => prev.filter(x => x.id !== optimistic.id));
      throw err;
    }
  };

  const handleUpdateCedula = async (id: string, changes: Partial<Cedula>): Promise<void> => {
    setCedulas(prev => prev.map(c => c.id === id ? { ...c, ...changes, updatedAt: new Date().toISOString() } : c));
    try {
      await db.updateCedula(id, changes);
    } catch (err) {
      console.error('Error actualizando cédula:', err);
    }
  };

  const handleDeleteCedula = async (id: string): Promise<void> => {
    const prev = cedulas;
    const prevIntentos = cedulaIntentos;
    setCedulas(curr => curr.filter(c => c.id !== id));
    setCedulaIntentos(curr => curr.filter(i => i.cedulaId !== id));
    try {
      await db.deleteCedula(id);
    } catch (err) {
      console.error('Error eliminando cédula:', err);
      setCedulas(prev);
      setCedulaIntentos(prevIntentos);
    }
  };

  const handleCreateCedulaIntento = async (
    i: Omit<CedulaIntento, 'id' | 'createdAt'>,
  ): Promise<CedulaIntento> => {
    const optimistic: CedulaIntento = {
      ...i,
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
    };
    setCedulaIntentos(prev => [optimistic, ...prev]);
    try {
      const saved = await db.createCedulaIntento(i);
      setCedulaIntentos(prev => prev.map(x => x.id === optimistic.id ? saved : x));
      return saved;
    } catch (err) {
      console.error('Error creando intento de cédula:', err);
      setCedulaIntentos(prev => prev.filter(x => x.id !== optimistic.id));
      throw err;
    }
  };

  const handleDeleteCedulaIntento = async (id: string): Promise<void> => {
    const prev = cedulaIntentos;
    setCedulaIntentos(curr => curr.filter(i => i.id !== id));
    try {
      await db.deleteCedulaIntento(id);
    } catch (err) {
      console.error('Error eliminando intento de cédula:', err);
      setCedulaIntentos(prev);
    }
  };

  // ── Hijos del caso (migración 041 — R1+R2+R3) ─────────────
  const handleCreateHijoCaso = async (
    h: Omit<HijoCaso, 'id' | 'createdAt' | 'updatedAt'>,
  ): Promise<HijoCaso> => {
    const optimistic: HijoCaso = {
      ...h,
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    setHijos(prev => [...prev, optimistic]);
    try {
      const saved = await db.createHijoCaso(h);
      setHijos(prev => prev.map(x => x.id === optimistic.id ? saved : x));
      audit('crear_hijo', 'hijo_caso', saved.id, saved.nombre, { matterId: saved.matterId });
      return saved;
    } catch (err) {
      console.error('Error creando hijo:', err);
      setHijos(prev => prev.filter(x => x.id !== optimistic.id));
      throw err;
    }
  };

  const handleUpdateHijoCaso = async (id: string, changes: Partial<HijoCaso>): Promise<void> => {
    const prev = hijos;
    const hijoAnterior = hijos.find(h => h.id === id);
    setHijos(curr => curr.map(h => h.id === id ? { ...h, ...changes, updatedAt: new Date().toISOString() } : h));
    try {
      await db.updateHijoCaso(id, changes);
      // Audit con before/after de los campos efectivamente cambiados —
      // así una vista cronológica futura puede reconstruir cómo evolucionó
      // el régimen / los datos de salud sin necesidad de tabla histórica.
      if (hijoAnterior) {
        const before: Record<string, unknown> = {};
        const after:  Record<string, unknown> = {};
        for (const key of Object.keys(changes) as (keyof HijoCaso)[]) {
          before[key as string] = hijoAnterior[key];
          after[key  as string] = changes[key];
        }
        audit('editar_hijo', 'hijo_caso', id, hijoAnterior.nombre, { before, after });
      }
    } catch (err) {
      console.error('Error actualizando hijo:', err);
      setHijos(prev);
    }
  };

  const handleDeleteHijoCaso = async (id: string): Promise<void> => {
    const prev = hijos;
    const hijo = hijos.find(h => h.id === id);
    setHijos(curr => curr.filter(h => h.id !== id));
    try {
      await db.deleteHijoCaso(id);
      audit('eliminar_hijo', 'hijo_caso', id, hijo?.nombre);
    } catch (err) {
      console.error('Error eliminando hijo:', err);
      setHijos(prev);
    }
  };

  // ── Mutación de tipo de divorcio (GAP R6) ─────────────────
  // El divorcio puede mutar de "De común acuerdo" → "Unilateral" (o viceversa)
  // si una parte retira la conformidad. Este handler:
  //   1. Actualiza caseData.tipo_divorcio en DB.
  //   2. Calcula qué tareas pendientes de la rama vieja quedan obsoletas
  //      y las cancela con motivo legible. Tareas Completada NO se tocan.
  //   3. Crea tareas faltantes de la rama nueva (idempotente).
  //   4. Registra evento `mutacion_tipo_divorcio` en el timeline con metadata.
  //   5. Audita la operación.
  const handleMutarTipoDivorcio = async (
    matterId: string,
    nuevoTipo: 'Unilateral' | 'De común acuerdo',
    motivo: string,
    fechaMutacion: string,
  ): Promise<{ canceladas: number; creadas: number }> => {
    const matter = matters.find(m => m.id === matterId);
    if (!matter) throw new Error('Matter no encontrado');

    const tipoActual = matter.caseData?.tipo_divorcio;
    if (tipoActual === nuevoTipo) {
      throw new Error(`El caso ya está en "${nuevoTipo}"`);
    }

    const template = matter.flowTemplateId
      ? MATTER_TEMPLATES.find(t => t.id === matter.flowTemplateId)
      : findTemplate(matter.type, matter.subtype, matter.jurisdiccion);
    if (!template) throw new Error('Template del matter no encontrado');

    // 1. Persistir el cambio en caseData
    const newCaseData = { ...(matter.caseData ?? {}), tipo_divorcio: nuevoTipo };
    const matterActualizado: Matter = { ...matter, caseData: newCaseData };
    await db.updateMatter(matterId, { caseData: newCaseData, lastActivity: new Date().toISOString() });
    setMatters(prev => prev.map(m => m.id === matterId ? matterActualizado : m));

    // 2. Calcular cambios en tasks usando el caseData NUEVO
    const matterTasks = tasks.filter(t => t.matterId === matterId);
    const { aCancelar, aCrear } = regenerarTareasFaltantes(matterActualizado, template, matterTasks);

    // Detectar si es la PRIMERA definición (no había tipo real antes) o
    // una mutación entre dos tipos reales. Cambia la copy del evento y la
    // razón de cancelación, pero la mecánica (cancel + create) es idéntica.
    const esPrimeraDefinicion = !tipoActual || tipoActual === 'Por definir';
    const tituloEvento = esPrimeraDefinicion
      ? `Definición inicial: ${nuevoTipo}`
      : `Mutación a "${nuevoTipo}"`;

    // 3. Cancelar tareas obsoletas
    const motivoCancelacion = esPrimeraDefinicion
      ? `Definición inicial como "${nuevoTipo}" (${fechaMutacion})${motivo ? ': ' + motivo : ''}`
      : `Mutación a "${nuevoTipo}" (${fechaMutacion})${motivo ? ': ' + motivo : ''}`;
    const ahoraIso = new Date().toISOString();
    for (const t of aCancelar) {
      try {
        await db.updateTask(t.id, {
          status: 'Cancelada',
          canceladaMotivo: motivoCancelacion,
          canceladaAt: ahoraIso,
        });
      } catch (err) {
        console.error('Error cancelando tarea por mutación:', t.id, err);
      }
    }
    if (aCancelar.length > 0) {
      const cancelledIds = new Set(aCancelar.map(t => t.id));
      setTasks(prev => prev.map(t =>
        cancelledIds.has(t.id)
          ? { ...t, status: 'Cancelada', canceladaMotivo: motivoCancelacion, canceladaAt: ahoraIso }
          : t,
      ));
    }

    // 4. Crear tareas faltantes
    const created: Task[] = [];
    for (const nueva of aCrear) {
      try {
        const saved = await db.createTask(nueva);
        created.push(saved);
      } catch (err) {
        console.error('Error creando tarea por mutación:', nueva.title, err);
      }
    }
    if (created.length > 0) {
      setTasks(prev => [...created, ...prev]);
    }

    // 5. Crear evento en timeline procesal — guardamos los IDs concretos
    // de tareas canceladas y creadas para que el "Deshacer mutación"
    // (UX-25) pueda revertir la operación con precisión.
    try {
      await handleCreateEvento({
        matterId,
        fecha:        fechaMutacion,
        tipo:         'mutacion_tipo_divorcio',
        titulo:       tituloEvento,
        descripcion:  motivo || (esPrimeraDefinicion
          ? `Se definió el tipo de divorcio como "${nuevoTipo}".`
          : `Cambio de tipo de divorcio: ${tipoActual ?? '—'} → ${nuevoTipo}`),
        origen:       'manual',
        documentosUrls: [],
        metadata: {
          tipo_anterior:           tipoActual ?? null,
          tipo_nuevo:              nuevoTipo,
          motivo,
          es_primera_definicion:   esPrimeraDefinicion,
          tareas_canceladas:       aCancelar.length,
          tareas_creadas:          created.length,
          tareas_canceladas_ids:   aCancelar.map(t => t.id),
          tareas_creadas_ids:      created.map(t => t.id),
        },
      });
    } catch (err) {
      console.error('Error registrando evento de mutación:', err);
    }

    // 6. Audit
    audit('mutar_tipo_divorcio', 'matter', matterId, matter.title, {
      from:   tipoActual,
      to:     nuevoTipo,
      motivo,
      fecha:  fechaMutacion,
      tareas_canceladas: aCancelar.length,
      tareas_creadas:    created.length,
    });

    return { canceladas: aCancelar.length, creadas: created.length };
  };

  // ── Deshacer mutación de tipo de divorcio (GAP UX-25) ─────
  // Reverte una mutación reciente:
  //   1. Re-pendientea las tareas canceladas que siguen Canceladas
  //      (las que fueron re-canceladas manualmente después se respetan).
  //   2. Cancela las tareas creadas que siguen Pendientes (las que el
  //      usuario completó después se preservan como historia).
  //   3. Revierte caseData.tipo_divorcio al valor anterior.
  //   4. Registra evento `deshacer_mutacion_tipo_divorcio` con vínculo
  //      al evento original.
  // Limitación: solo se puede deshacer si la mutación tiene <24h y no
  // hay un deshacer posterior sobre el mismo evento.
  const handleDeshacerMutacionTipoDivorcio = async (
    eventoMutacionId: string,
  ): Promise<{ rePendientes: number; canceladas: number; completadasPreservadas: number }> => {
    const evento = eventos.find(e => e.id === eventoMutacionId);
    if (!evento || evento.tipo !== 'mutacion_tipo_divorcio') {
      throw new Error('El evento no es una mutación de tipo de divorcio.');
    }

    const matter = matters.find(m => m.id === evento.matterId);
    if (!matter) throw new Error('Matter del evento no encontrado.');

    // Validar ventana de 24h.
    const ahora = new Date();
    const creadoEn = new Date(evento.createdAt);
    const horasDesde = (ahora.getTime() - creadoEn.getTime()) / (1000 * 60 * 60);
    if (horasDesde > 24) {
      throw new Error(`La mutación tiene más de 24h (${Math.floor(horasDesde)}h). Si querés revertir, hacé una nueva mutación.`);
    }

    // Validar que no haya un deshacer posterior sobre el mismo evento.
    const yaDeshecho = eventos.some(e =>
      e.tipo === 'deshacer_mutacion_tipo_divorcio'
      && (e.metadata as any)?.evento_mutacion_id === eventoMutacionId,
    );
    if (yaDeshecho) {
      throw new Error('Esta mutación ya fue deshecha previamente.');
    }

    const meta = evento.metadata as any;
    const tipoAnterior: string | null    = meta?.tipo_anterior ?? null;
    const idsCanceladas: string[]        = meta?.tareas_canceladas_ids ?? [];
    const idsCreadas: string[]           = meta?.tareas_creadas_ids ?? [];

    if (!tipoAnterior) {
      throw new Error('El evento no tiene tipo_anterior — no se puede revertir.');
    }

    let rePendientes = 0;
    let canceladasDeshacer = 0;
    let completadasPreservadas = 0;
    const ahoraIso = ahora.toISOString();
    const motivoCancelacion = `Deshacer mutación de ${evento.fecha}: vuelve a "${tipoAnterior}"`;

    // 1. Re-pendientear las que siguen canceladas.
    for (const id of idsCanceladas) {
      const t = tasks.find(x => x.id === id);
      if (!t) continue;
      if (t.status !== 'Cancelada') continue; // alguien la re-cambió manualmente
      try {
        await db.updateTask(id, {
          status: 'Pendiente',
          canceladaMotivo: undefined,
          canceladaAt: undefined,
        });
        rePendientes++;
      } catch (err) {
        console.error('Error re-pendientando tarea:', id, err);
      }
    }

    // 2. Cancelar las que siguen pendientes (las completadas se preservan).
    for (const id of idsCreadas) {
      const t = tasks.find(x => x.id === id);
      if (!t) continue;
      if (t.status === 'Completada') {
        completadasPreservadas++;
        continue;
      }
      if (t.status === 'Cancelada') continue;
      try {
        await db.updateTask(id, {
          status: 'Cancelada',
          canceladaMotivo: motivoCancelacion,
          canceladaAt: ahoraIso,
        });
        canceladasDeshacer++;
      } catch (err) {
        console.error('Error cancelando tarea creada por mutación:', id, err);
      }
    }

    // 3. Reflejar cambios de tasks en memoria
    const idsRePendientesSet = new Set(idsCanceladas);
    const idsCanceladasSet   = new Set(idsCreadas);
    setTasks(prev => prev.map(t => {
      if (idsRePendientesSet.has(t.id) && t.status === 'Cancelada') {
        return { ...t, status: 'Pendiente', canceladaMotivo: undefined, canceladaAt: undefined };
      }
      if (idsCanceladasSet.has(t.id) && t.status === 'Pendiente') {
        return { ...t, status: 'Cancelada', canceladaMotivo: motivoCancelacion, canceladaAt: ahoraIso };
      }
      return t;
    }));

    // 4. Revertir caseData.tipo_divorcio
    const newCaseData = { ...(matter.caseData ?? {}), tipo_divorcio: tipoAnterior };
    await db.updateMatter(matter.id, { caseData: newCaseData, lastActivity: ahoraIso });
    setMatters(prev => prev.map(m => m.id === matter.id ? { ...m, caseData: newCaseData } : m));

    // 5. Crear evento de "deshacer"
    try {
      await handleCreateEvento({
        matterId:    matter.id,
        fecha:       ahoraIso.slice(0, 10),
        tipo:        'deshacer_mutacion_tipo_divorcio',
        titulo:      `Deshacer mutación a "${meta?.tipo_nuevo ?? '—'}" — vuelve a "${tipoAnterior}"`,
        descripcion: `Se revirtió la mutación del ${evento.fecha}. Re-pendienteadas: ${rePendientes}. Re-canceladas: ${canceladasDeshacer}. Tareas completadas preservadas: ${completadasPreservadas}.`,
        origen:      'manual',
        documentosUrls: [],
        metadata: {
          evento_mutacion_id:        eventoMutacionId,
          tipo_revertido:            meta?.tipo_nuevo ?? null,
          tipo_restaurado:           tipoAnterior,
          re_pendientes:             rePendientes,
          re_canceladas:             canceladasDeshacer,
          completadas_preservadas:   completadasPreservadas,
        },
      });
    } catch (err) {
      console.error('Error registrando evento de deshacer mutación:', err);
    }

    audit('deshacer_mutacion_tipo_divorcio', 'matter', matter.id, matter.title, {
      evento_mutacion_id: eventoMutacionId,
      tipo_restaurado:    tipoAnterior,
      re_pendientes:      rePendientes,
      re_canceladas:      canceladasDeshacer,
      completadas_preservadas: completadasPreservadas,
    });

    return {
      rePendientes,
      canceladas: canceladasDeshacer,
      completadasPreservadas,
    };
  };

  // ── Reconvenciones (migración 043 — GAP R10) ──────────────
  const handleCreateReconvencion = async (
    r: Omit<Reconvencion, 'id' | 'createdAt' | 'updatedAt'>,
  ): Promise<Reconvencion> => {
    const optimistic: Reconvencion = {
      ...r,
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    setReconvenciones(prev => [optimistic, ...prev]);
    try {
      const saved = await db.createReconvencion(r);
      setReconvenciones(prev => prev.map(x => x.id === optimistic.id ? saved : x));
      audit('crear_reconvencion', 'reconvencion', saved.id,
        `Reconvención de ${saved.presentadaPor === 'cliente' ? 'mi parte' : 'la contraparte'}`,
        { matterId: saved.matterId, pretensiones: saved.pretensiones, fecha: saved.fechaPresentacion },
      );
      return saved;
    } catch (err) {
      console.error('Error creando reconvención:', err);
      setReconvenciones(prev => prev.filter(x => x.id !== optimistic.id));
      throw err;
    }
  };

  const handleUpdateReconvencion = async (id: string, changes: Partial<Reconvencion>): Promise<void> => {
    const prev = reconvenciones;
    setReconvenciones(curr => curr.map(r => r.id === id ? { ...r, ...changes, updatedAt: new Date().toISOString() } : r));
    try {
      await db.updateReconvencion(id, changes);
      audit('editar_reconvencion', 'reconvencion', id, undefined, { changes: Object.keys(changes) });
    } catch (err) {
      console.error('Error actualizando reconvención:', err);
      setReconvenciones(prev);
    }
  };

  const handleDeleteReconvencion = async (id: string): Promise<void> => {
    const prev = reconvenciones;
    setReconvenciones(curr => curr.filter(r => r.id !== id));
    try {
      await db.deleteReconvencion(id);
      audit('eliminar_reconvencion', 'reconvencion', id);
    } catch (err) {
      console.error('Error eliminando reconvención:', err);
      setReconvenciones(prev);
    }
  };

  // ── Bienes / patrimonio (migración 045 — GAP R4 + R9 + R14) ─
  const handleCreateBien = async (
    b: Omit<Bien, 'id' | 'createdAt' | 'updatedAt'>,
  ): Promise<Bien> => {
    const optimistic: Bien = {
      ...b,
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    setBienes(prev => [...prev, optimistic]);
    try {
      const saved = await db.createBien(b);
      setBienes(prev => prev.map(x => x.id === optimistic.id ? saved : x));
      audit('crear_bien', 'bien', saved.id, saved.descripcion, {
        matterId: saved.matterId, naturaleza: saved.naturaleza, tipo: saved.tipo,
      });
      return saved;
    } catch (err) {
      console.error('Error creando bien:', err);
      setBienes(prev => prev.filter(x => x.id !== optimistic.id));
      throw err;
    }
  };

  const handleUpdateBien = async (id: string, changes: Partial<Bien>): Promise<void> => {
    const prev = bienes;
    setBienes(curr => curr.map(b => b.id === id ? { ...b, ...changes, updatedAt: new Date().toISOString() } : b));
    try {
      await db.updateBien(id, changes);
      const bien = bienes.find(b => b.id === id);
      audit('editar_bien', 'bien', id, bien?.descripcion, { changes: Object.keys(changes) });
    } catch (err) {
      console.error('Error actualizando bien:', err);
      setBienes(prev);
    }
  };

  const handleDeleteBien = async (id: string): Promise<void> => {
    const prev = bienes;
    const bien = bienes.find(b => b.id === id);
    setBienes(curr => curr.filter(b => b.id !== id));
    setBienValuaciones(curr => curr.filter(v => v.bienId !== id));
    try {
      await db.deleteBien(id);
      audit('eliminar_bien', 'bien', id, bien?.descripcion);
    } catch (err) {
      console.error('Error eliminando bien:', err);
      setBienes(prev);
    }
  };

  const handleCreateBienValuacion = async (
    v: Omit<BienValuacion, 'id' | 'createdAt'>,
  ): Promise<BienValuacion> => {
    const optimistic: BienValuacion = { ...v, id: crypto.randomUUID(), createdAt: new Date().toISOString() };
    setBienValuaciones(prev => [optimistic, ...prev]);
    try {
      const saved = await db.createBienValuacion(v);
      setBienValuaciones(prev => prev.map(x => x.id === optimistic.id ? saved : x));
      audit('crear_valuacion', 'bien_valuacion', saved.id, undefined, {
        bienId: saved.bienId, fecha: saved.fecha, valor: saved.valor, moneda: saved.moneda,
      });
      return saved;
    } catch (err) {
      console.error('Error creando valuación:', err);
      setBienValuaciones(prev => prev.filter(x => x.id !== optimistic.id));
      throw err;
    }
  };

  const handleDeleteBienValuacion = async (id: string): Promise<void> => {
    const prev = bienValuaciones;
    setBienValuaciones(curr => curr.filter(v => v.id !== id));
    try {
      await db.deleteBienValuacion(id);
      audit('eliminar_valuacion', 'bien_valuacion', id);
    } catch (err) {
      console.error('Error eliminando valuación:', err);
      setBienValuaciones(prev);
    }
  };

  const handleCreateSociedadInterpuesta = async (
    s: Omit<SociedadInterpuesta, 'id' | 'createdAt' | 'updatedAt'>,
  ): Promise<SociedadInterpuesta> => {
    const optimistic: SociedadInterpuesta = {
      ...s,
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    setSociedadesInterpuestas(prev => [optimistic, ...prev]);
    try {
      const saved = await db.createSociedadInterpuesta(s);
      setSociedadesInterpuestas(prev => prev.map(x => x.id === optimistic.id ? saved : x));
      audit('crear_sociedad_interpuesta', 'sociedad_interpuesta', saved.id, saved.denominacion, { matterId: saved.matterId });
      return saved;
    } catch (err) {
      console.error('Error creando sociedad interpuesta:', err);
      setSociedadesInterpuestas(prev => prev.filter(x => x.id !== optimistic.id));
      throw err;
    }
  };

  const handleUpdateSociedadInterpuesta = async (id: string, changes: Partial<SociedadInterpuesta>): Promise<void> => {
    const prev = sociedadesInterpuestas;
    setSociedadesInterpuestas(curr => curr.map(s => s.id === id ? { ...s, ...changes, updatedAt: new Date().toISOString() } : s));
    try {
      await db.updateSociedadInterpuesta(id, changes);
      const soc = sociedadesInterpuestas.find(s => s.id === id);
      audit('editar_sociedad_interpuesta', 'sociedad_interpuesta', id, soc?.denominacion, { changes: Object.keys(changes) });
    } catch (err) {
      console.error('Error actualizando sociedad interpuesta:', err);
      setSociedadesInterpuestas(prev);
    }
  };

  const handleDeleteSociedadInterpuesta = async (id: string): Promise<void> => {
    const prev = sociedadesInterpuestas;
    const soc = sociedadesInterpuestas.find(s => s.id === id);
    setSociedadesInterpuestas(curr => curr.filter(s => s.id !== id));
    // Bienes que apuntaban a esta sociedad pierden la FK (ON DELETE SET NULL en DB).
    setBienes(curr => curr.map(b => b.sociedadInterpuestaId === id ? { ...b, sociedadInterpuestaId: undefined } : b));
    try {
      await db.deleteSociedadInterpuesta(id);
      audit('eliminar_sociedad_interpuesta', 'sociedad_interpuesta', id, soc?.denominacion);
    } catch (err) {
      console.error('Error eliminando sociedad interpuesta:', err);
      setSociedadesInterpuestas(prev);
    }
  };

  // ── Causas relacionadas (migración 046 — GAP R12) ──────────
  const handleCreateCausaRelacionada = async (
    c: Omit<CausaRelacionada, 'id' | 'createdAt' | 'updatedAt'>,
  ): Promise<CausaRelacionada> => {
    const optimistic: CausaRelacionada = {
      ...c,
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    setCausasRelacionadas(prev => [optimistic, ...prev]);
    try {
      const saved = await db.createCausaRelacionada(c);
      setCausasRelacionadas(prev => prev.map(x => x.id === optimistic.id ? saved : x));
      audit('crear_causa_relacionada', 'causa_relacionada', saved.id, saved.caratula ?? saved.descripcion, {
        matterId: saved.matterId, vinculacion: saved.vinculacion, tipoCausa: saved.tipoCausa,
      });
      return saved;
    } catch (err) {
      console.error('Error creando causa relacionada:', err);
      setCausasRelacionadas(prev => prev.filter(x => x.id !== optimistic.id));
      throw err;
    }
  };

  const handleUpdateCausaRelacionada = async (id: string, changes: Partial<CausaRelacionada>): Promise<void> => {
    const prev = causasRelacionadas;
    setCausasRelacionadas(curr => curr.map(c => c.id === id ? { ...c, ...changes, updatedAt: new Date().toISOString() } : c));
    try {
      await db.updateCausaRelacionada(id, changes);
      const c = causasRelacionadas.find(x => x.id === id);
      audit('editar_causa_relacionada', 'causa_relacionada', id, c?.caratula ?? c?.descripcion, { changes: Object.keys(changes) });
    } catch (err) {
      console.error('Error actualizando causa relacionada:', err);
      setCausasRelacionadas(prev);
    }
  };

  const handleDeleteCausaRelacionada = async (id: string): Promise<void> => {
    const prev = causasRelacionadas;
    const c = causasRelacionadas.find(x => x.id === id);
    setCausasRelacionadas(curr => curr.filter(x => x.id !== id));
    try {
      await db.deleteCausaRelacionada(id);
      audit('eliminar_causa_relacionada', 'causa_relacionada', id, c?.caratula ?? c?.descripcion);
    } catch (err) {
      console.error('Error eliminando causa relacionada:', err);
      setCausasRelacionadas(prev);
    }
  };

  // ── Cautelares + Veedores (migración 047 — GAP R15) ────────
  const handleCreateCautelar = async (
    c: Omit<Cautelar, 'id' | 'createdAt' | 'updatedAt'>,
  ): Promise<Cautelar> => {
    const optimistic: Cautelar = {
      ...c,
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    setCautelares(prev => [optimistic, ...prev]);
    try {
      const saved = await db.createCautelar(c);
      setCautelares(prev => prev.map(x => x.id === optimistic.id ? saved : x));
      audit('crear_cautelar', 'cautelar', saved.id, saved.alcance ?? saved.tipo, {
        matterId: saved.matterId, tipo: saved.tipo, estado: saved.estado,
      });
      return saved;
    } catch (err) {
      console.error('Error creando cautelar:', err);
      setCautelares(prev => prev.filter(x => x.id !== optimistic.id));
      throw err;
    }
  };

  const handleUpdateCautelar = async (id: string, changes: Partial<Cautelar>): Promise<void> => {
    const prev = cautelares;
    setCautelares(curr => curr.map(c => c.id === id ? { ...c, ...changes, updatedAt: new Date().toISOString() } : c));
    try {
      await db.updateCautelar(id, changes);
      const c = cautelares.find(x => x.id === id);
      audit('editar_cautelar', 'cautelar', id, c?.alcance ?? c?.tipo, { changes: Object.keys(changes) });
    } catch (err) {
      console.error('Error actualizando cautelar:', err);
      setCautelares(prev);
    }
  };

  const handleDeleteCautelar = async (id: string): Promise<void> => {
    const prev = cautelares;
    const c = cautelares.find(x => x.id === id);
    setCautelares(curr => curr.filter(x => x.id !== id));
    // Veedores que apuntaban a esta cautelar pierden la FK (ON DELETE SET NULL).
    setVeedores(curr => curr.map(v => v.cautelarId === id ? { ...v, cautelarId: undefined } : v));
    try {
      await db.deleteCautelar(id);
      audit('eliminar_cautelar', 'cautelar', id, c?.alcance ?? c?.tipo);
    } catch (err) {
      console.error('Error eliminando cautelar:', err);
      setCautelares(prev);
    }
  };

  const handleCreateVeedor = async (
    v: Omit<Veedor, 'id' | 'createdAt' | 'updatedAt'>,
  ): Promise<Veedor> => {
    const optimistic: Veedor = {
      ...v,
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    setVeedores(prev => [optimistic, ...prev]);
    try {
      const saved = await db.createVeedor(v);
      setVeedores(prev => prev.map(x => x.id === optimistic.id ? saved : x));
      audit('crear_veedor', 'veedor', saved.id, saved.nombre, {
        matterId: saved.matterId, estado: saved.estado, cautelarId: saved.cautelarId,
      });
      return saved;
    } catch (err) {
      console.error('Error creando veedor:', err);
      setVeedores(prev => prev.filter(x => x.id !== optimistic.id));
      throw err;
    }
  };

  const handleUpdateVeedor = async (id: string, changes: Partial<Veedor>): Promise<void> => {
    const prev = veedores;
    setVeedores(curr => curr.map(v => v.id === id ? { ...v, ...changes, updatedAt: new Date().toISOString() } : v));
    try {
      await db.updateVeedor(id, changes);
      const v = veedores.find(x => x.id === id);
      audit('editar_veedor', 'veedor', id, v?.nombre, { changes: Object.keys(changes) });
    } catch (err) {
      console.error('Error actualizando veedor:', err);
      setVeedores(prev);
    }
  };

  const handleDeleteVeedor = async (id: string): Promise<void> => {
    const prev = veedores;
    const v = veedores.find(x => x.id === id);
    setVeedores(curr => curr.filter(x => x.id !== id));
    try {
      await db.deleteVeedor(id);
      audit('eliminar_veedor', 'veedor', id, v?.nombre);
    } catch (err) {
      console.error('Error eliminando veedor:', err);
      setVeedores(prev);
    }
  };

  // ── Cuotas alimentarias + conceptos en especie (migración 048 — GAP R13) ─
  const handleCreateCuotaAlimentaria = async (
    c: Omit<CuotaAlimentaria, 'id' | 'createdAt' | 'updatedAt'>,
  ): Promise<CuotaAlimentaria> => {
    const optimistic: CuotaAlimentaria = {
      ...c, id: crypto.randomUUID(),
      createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
    };
    setCuotasAlimentarias(prev => [optimistic, ...prev]);
    try {
      const saved = await db.createCuotaAlimentaria(c);
      setCuotasAlimentarias(prev => prev.map(x => x.id === optimistic.id ? saved : x));
      audit('crear_cuota_alimentaria', 'cuota_alimentaria', saved.id, saved.fundamento ?? saved.estado, {
        matterId: saved.matterId, estado: saved.estado, alcance: saved.alcance,
      });
      return saved;
    } catch (err) {
      console.error('Error creando cuota alimentaria:', err);
      setCuotasAlimentarias(prev => prev.filter(x => x.id !== optimistic.id));
      throw err;
    }
  };

  const handleUpdateCuotaAlimentaria = async (id: string, changes: Partial<CuotaAlimentaria>): Promise<void> => {
    const prev = cuotasAlimentarias;
    setCuotasAlimentarias(curr => curr.map(c => c.id === id ? { ...c, ...changes, updatedAt: new Date().toISOString() } : c));
    try {
      await db.updateCuotaAlimentaria(id, changes);
      const c = cuotasAlimentarias.find(x => x.id === id);
      audit('editar_cuota_alimentaria', 'cuota_alimentaria', id, c?.fundamento ?? c?.estado, { changes: Object.keys(changes) });
    } catch (err) {
      console.error('Error actualizando cuota alimentaria:', err);
      setCuotasAlimentarias(prev);
    }
  };

  const handleDeleteCuotaAlimentaria = async (id: string): Promise<void> => {
    const prev = cuotasAlimentarias;
    const c = cuotasAlimentarias.find(x => x.id === id);
    setCuotasAlimentarias(curr => curr.filter(x => x.id !== id));
    setCuotaConceptosEspecie(curr => curr.filter(ce => ce.cuotaAlimentariaId !== id));
    try {
      await db.deleteCuotaAlimentaria(id);
      audit('eliminar_cuota_alimentaria', 'cuota_alimentaria', id, c?.fundamento ?? c?.estado);
    } catch (err) {
      console.error('Error eliminando cuota alimentaria:', err);
      setCuotasAlimentarias(prev);
    }
  };

  const handleCreateCuotaConceptoEspecie = async (
    c: Omit<CuotaConceptoEspecie, 'id' | 'createdAt' | 'updatedAt'>,
  ): Promise<CuotaConceptoEspecie> => {
    const optimistic: CuotaConceptoEspecie = {
      ...c, id: crypto.randomUUID(),
      createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
    };
    setCuotaConceptosEspecie(prev => [...prev, optimistic]);
    try {
      const saved = await db.createCuotaConceptoEspecie(c);
      setCuotaConceptosEspecie(prev => prev.map(x => x.id === optimistic.id ? saved : x));
      audit('crear_concepto_especie', 'concepto_especie', saved.id, saved.concepto, {
        cuotaId: saved.cuotaAlimentariaId, categoria: saved.categoria,
      });
      return saved;
    } catch (err) {
      console.error('Error creando concepto:', err);
      setCuotaConceptosEspecie(prev => prev.filter(x => x.id !== optimistic.id));
      throw err;
    }
  };

  const handleUpdateCuotaConceptoEspecie = async (id: string, changes: Partial<CuotaConceptoEspecie>): Promise<void> => {
    const prev = cuotaConceptosEspecie;
    setCuotaConceptosEspecie(curr => curr.map(c => c.id === id ? { ...c, ...changes, updatedAt: new Date().toISOString() } : c));
    try {
      await db.updateCuotaConceptoEspecie(id, changes);
      const c = cuotaConceptosEspecie.find(x => x.id === id);
      audit('editar_concepto_especie', 'concepto_especie', id, c?.concepto, { changes: Object.keys(changes) });
    } catch (err) {
      console.error('Error actualizando concepto:', err);
      setCuotaConceptosEspecie(prev);
    }
  };

  const handleDeleteCuotaConceptoEspecie = async (id: string): Promise<void> => {
    const prev = cuotaConceptosEspecie;
    const c = cuotaConceptosEspecie.find(x => x.id === id);
    setCuotaConceptosEspecie(curr => curr.filter(x => x.id !== id));
    try {
      await db.deleteCuotaConceptoEspecie(id);
      audit('eliminar_concepto_especie', 'concepto_especie', id, c?.concepto);
    } catch (err) {
      console.error('Error eliminando concepto:', err);
      setCuotaConceptosEspecie(prev);
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
      handleCloseMatter, handleArchiveMatter, handleUpdateMatterDirect, handleCreateMatter,
      handleCreateSubProceso,
      handleMutarTipoDivorcio,
      handleDeshacerMutacionTipoDivorcio,
      handleCreateConsultation, handleUpdateConsultation,
      handleCreateTask, handleUpdateTask, handleCompleteTask,
      handleConsultationStatusChange,
      expedientes, handleRefreshExpedientes,
      milestones, handleUpdateMilestone, handleCreateMilestone,
      handleUpdateAssignments,
      eventos, plazos,
      handleCreateEvento, handleUpdateEvento, handleDeleteEvento,
      handleCreatePlazo, handleCumplirPlazo, handleCancelarPlazo,
      handleSuspenderPlazo, handleReanudarPlazo, handleActualizarUltimaNotificacion,
      hilos, handleCreateHilo, handleUpdateHilo, handleDeleteHilo,
      peritos, handleCreatePerito, handleUpdatePerito, handleDeletePerito,
      compensaciones, cuotasCompensacion,
      handleCreateCompensacion, handleUpdateCompensacion, handleDeleteCompensacion,
      handleMarcarCuotaPagada, handleUpdateCuota,
      letrados, handleCreateLetrado, handleUpdateLetrado, handleDeleteLetrado,
      handleSustituirLetrado,
      honorariosRegulados,
      handleCreateHonorarioRegulado, handleUpdateHonorarioRegulado, handleDeleteHonorarioRegulado,
      cedulas, cedulaIntentos,
      handleCreateCedula, handleUpdateCedula, handleDeleteCedula,
      handleCreateCedulaIntento, handleDeleteCedulaIntento,
      hijos, handleCreateHijoCaso, handleUpdateHijoCaso, handleDeleteHijoCaso,
      reconvenciones, handleCreateReconvencion, handleUpdateReconvencion, handleDeleteReconvencion,
      bienes, bienValuaciones, sociedadesInterpuestas,
      handleCreateBien, handleUpdateBien, handleDeleteBien,
      handleCreateBienValuacion, handleDeleteBienValuacion,
      handleCreateSociedadInterpuesta, handleUpdateSociedadInterpuesta, handleDeleteSociedadInterpuesta,
      causasRelacionadas,
      handleCreateCausaRelacionada, handleUpdateCausaRelacionada, handleDeleteCausaRelacionada,
      cautelares, veedores,
      handleCreateCautelar, handleUpdateCautelar, handleDeleteCautelar,
      handleCreateVeedor,   handleUpdateVeedor,   handleDeleteVeedor,
      cuotasAlimentarias, cuotaConceptosEspecie,
      handleCreateCuotaAlimentaria, handleUpdateCuotaAlimentaria, handleDeleteCuotaAlimentaria,
      handleCreateCuotaConceptoEspecie, handleUpdateCuotaConceptoEspecie, handleDeleteCuotaConceptoEspecie,
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
