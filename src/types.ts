export type UserRole = 'Socio' | 'Abogado' | 'Pasante' | 'Secretario';

export interface UserProfile {
  id: string;
  fullName: string;
  email: string;
  role: UserRole;
  initials: string;
  isActive: boolean;
  mustChangePassword?: boolean;
  matricula?: string;
}

export type Priority = 'Alta' | 'Media' | 'Baja';
export type MatterStatus = 'Activo' | 'Suspendido' | 'Cerrado' | 'Pausado';
export type MatterType = 'Laboral' | 'Familia' | 'Daños' | 'Comercial' | 'Sucesiones' | 'Civil';
export type MatterHealth = 'Sano' | 'Trabado' | 'Roto' | 'En espera';

export interface Matter {
  id: string;
  title: string;
  client: string;
  type: MatterType;
  status: MatterStatus;
  health: MatterHealth;
  responsible: string;
  nextAction: string;
  nextActionType?: string;
  nextActionDate: string; // ISO string
  priority: Priority;
  lastActivity: string; // ISO string
  subtype?: string;
  blockage?: string;
  reasonForQueue?: string;
  expediente?: string;
  description?: string;
  flowTemplateId?: string;
  currentStage?: string;
  caseData?: Record<string, string>;
  assignedAttorneys?: string[]; // profile IDs from matter_assignments
}

export type AssignmentRole = 'lead' | 'assigned';

export interface MatterAssignment {
  id: string;
  matterId: string;
  profileId: string;
  role: AssignmentRole;
  assignedAt: string;
  assignedBy?: string;
}

export interface Consultation {
  id: string;
  name: string;
  status: 'Nueva' | 'Contactada' | 'Esperando info' | 'Evaluando viabilidad' | 'Presupuestada' | 'Aceptada' | 'Rechazada' | 'Archivada';
  date: string;
  origin: 'WhatsApp' | 'Web' | 'Referido' | 'Llamada' | 'Otro';
  nextStep: string;
  responsible?: string;
  type?: string;
  description?: string;
  email?: string;
  phone?: string;
  notes?: string[];
  consultationFeePaid?: boolean;
  consultationFeeSnapshot?: number;
  consultationFeeFormaPago?: 'Efectivo' | 'Transferencia' | 'Bonificada' | 'No aplica';
  scheduledAt?: string; // ISO datetime de la entrevista agendada
  diagnostico?: string;
  solucionPropuesta?: string;
  atendidoPor?: string;
  checklistData?: Record<string, string>;
}

export interface Client {
  id: string;
  name: string;
  email: string;
  phone: string;
  type: 'Persona' | 'Empresa';
  activeMatters: number;
  closedMatters: number;
  lastActivity: string;
  notes?: string;
  dni?: string;
  domicilio?: string;
  fechaNacimiento?: string;
  nacionalidad?: string;
  profesion?: string;
  situacionLaboral?: string;
  empleador?: string;
  ingresosEstimados?: string;
}

export interface Task {
  id: string;
  matterId?: string;
  consultationId?: string;
  title: string;
  dueDate: string;
  status: 'Pendiente' | 'Completada' | 'En revisión';
  priority: Priority;
  bloqueante?: boolean;
  generadaAutomaticamente?: boolean;
  triggerEstado?: string;
  completedAt?: string;
  completedBy?: string;
  etapa?: string;
  /** Campos de caseData que satisfacen esta tarea (copiado del template) */
  satisfiedBy?: { key: string; label: string }[];
}

export type DocumentStatus = 'Faltante' | 'Solicitado' | 'Recibido' | 'En revisión' | 'Aprobado' | 'Listo para presentar' | 'Presentado';
export type DocumentCriticality = 'Crítico' | 'Recomendado' | 'Opcional';

export interface LegalDocument {
  id: string;
  matterId: string;
  matterTitle?: string;
  client?: string;
  responsible?: string;
  name: string;
  status: DocumentStatus;
  criticality: DocumentCriticality;
  blocksProgress: boolean;
  updatedAt: string;
  associatedAction?: string;
  category?: string;
}

export interface FlowTaskCondition {
  key: string;
  equals?: string;
  notEquals?: string;
}

export interface FlowTaskDef {
  task: string;
  priority: 'crítico' | 'recomendado' | 'opcional';
  bloqueante?: boolean;
  /** Solo generar esta tarea si caseData cumple la condición */
  condition?: FlowTaskCondition;
  /** Auto-completar si caseData[key] tiene valor */
  autoCompleteIf?: { key: string };
  /** Campos de caseData que satisfacen esta tarea — UI muestra cuáles faltan */
  satisfiedBy?: { key: string; label: string }[];
}

export interface FlowStageTemplate {
  name: string;
  tasks: FlowTaskDef[];
  documents: { name: string; required: boolean }[];
  milestone: string;
  fichaTitle?: string;
  fichaFields?: {
    title: string;
    icon: string;
    fields: {
      key: string;
      label: string;
      type: 'text' | 'date' | 'select' | 'number' | 'money' | 'textarea' | 'repeatable';
      placeholder?: string;
      options?: string[];
      required?: boolean;
      subFields?: {
        key: string;
        label: string;
        type: 'text' | 'date' | 'select' | 'number' | 'money' | 'textarea';
        placeholder?: string;
        options?: string[];
        required?: boolean;
      }[];
      addLabel?: string;
    }[];
  }[];
}

export interface MatterTemplate {
  id: string;
  name: string;
  rama: MatterType;
  subtipo: string;
  jurisdiccion: string;
  via: string;
  etapaInicial: string;
  descripcion: string;
  stages?: FlowStageTemplate[];
  checklistBase: {
    task: string;
    priority: 'crítico' | 'recomendado' | 'opcional';
  }[];
  documentosBase: {
    name: string;
    required: boolean;
  }[];
  hitosProyectados: string[];
  bloqueantesTipicos: string[];
  proximaAccionSugerida: string;
  fechaSeguimientoSugeridaDays: number;
  prioridadSugerida: Priority;
  notasOperativas?: string;
}

export interface LegalTemplate {
  id: string;
  title: string;
  category: MatterType;
  subcategory: string;
  description: string;
  tags: string[];
  content: string;
  placeholders: {
    key: string;
    label: string;
    type: 'text' | 'date' | 'number' | 'money' | 'textarea';
    defaultValue?: string;
  }[];
  legalBasis: string;
}

export interface TimelineEvent {
  id: string;
  matterId: string;
  type: 'creation' | 'call' | 'doc_received' | 'task_created' | 'deadline' | 'draft' | 'presentation' | 'note' | 'status_change' | 'mev_submission' | 'expediente_update' | 'juzgado_assigned';
  title: string;
  description?: string;
  user: string;
  date: string;
}

// ── MÓDULO FINANCIERO ─────────────────────────────────────────────

export type PresupuestoStatus = 'Borrador' | 'Enviado' | 'Aceptado' | 'Rechazado';
export type PaymentStatus = 'Pendiente' | 'Parcial' | 'Pagado';

export interface CuotaOpcion {
  cuotas: 1 | 2 | 3 | 4;
  recargoPorcentaje: number;
  enabled: boolean;
}

export interface PresupuestoItem {
  id: string;
  presupuestoId: string;
  concepto: string;
  tipo: 'bono' | 'honorario' | 'gasto' | 'otro';
  cantidadIus?: number;
  montoPesos: number;
  fiscalPorcentaje: number;
  descuentoItemPorcentaje: number;
  /** montoPesos × (1 - fiscal/100) × (1 - descuento/100) */
  subtotalPesos: number;
  obligatorio: boolean;
  orden: number;
}

export interface Presupuesto {
  id: string;
  consultationId?: string;
  matterId?: string;
  clientName: string;
  status: PresupuestoStatus;
  iusValorSnapshot: number;
  subtotalIus: number;
  subtotalPesos: number;
  descuentoPorcentaje: number;
  paymentStatus: PaymentStatus;
  notes?: string;
  numero?: string;
  cuotaOpciones?: CuotaOpcion[];
  approvedAt?: string;
  approvedBy?: string;
  createdBy?: string;
  items: PresupuestoItem[];
  createdAt: string;
  updatedAt: string;
}

export type FormaPago = 'Efectivo' | 'Transferencia' | 'Cheque' | 'Otro';
export type ReciboStatus = 'Borrador' | 'Emitido';

export interface Recibo {
  id: string;
  presupuestoId: string;
  clientName: string;
  montoPesos: number;
  formaPago: FormaPago;
  concepto: string;
  notas?: string;
  numero?: string;
  status: ReciboStatus;
  cuotaNumero?: number;
  createdAt: string;
  updatedAt: string;
}

export interface EstudioPerfil {
  id?: string;
  nombre: string;
  cuit?: string;
  email?: string;
  telefono?: string;
  direccion?: string;
  logoUrl?: string;
  cbu?: string;
  aliasCbu?: string;
  banco?: string;
  titularCuenta?: string;
  firmaUrl?: string;
  footerText?: string;
  updatedAt?: string;
}

export interface StudioConfig {
  key: string;
  value: Record<string, unknown>;
  updatedAt: string;
  updatedBy?: string;
}

// ── MÓDULO JUDICIAL ───────────────────────────────────────────────

export type EstadoTroncal =
  | 'Sin presentar'
  | 'Presentado en MEV'
  | 'Sorteado'
  | 'A Despacho'
  | 'En Letra'
  | 'Fuera de Letra'
  | 'Fuera del Organismo'
  | 'Paralizado';

export interface ExpedienteEstadoLog {
  id: string;
  expedienteId: string;
  estadoTroncal: EstadoTroncal;
  subestado?: string;
  fechaDesde: string;
  fechaHasta?: string;
  observaciones?: string;
  registradoPor?: string;
}

export interface Expediente {
  id: string;
  matterId: string;
  nroReceptoria?: string;
  nroJuzgado?: string;
  caratula: string;
  fuero: string;
  juzgado?: string;
  secretaria?: string;
  estadoTroncal: EstadoTroncal;
  subestado?: string;
  estadoDesde: string;
  mevPresentado: boolean;
  mevFecha?: string;
  mevToken?: string;
  createdAt: string;
  updatedAt: string;
  estadosLog?: ExpedienteEstadoLog[];
}

// ── FLOW ENGINE (SOPs) ─────────────────────────────────────

export type MilestoneStatus = 'Pendiente' | 'En curso' | 'Completado';

export interface MatterMilestone {
  id: string;
  matterId: string;
  label: string;
  etapa?: string;
  orden: number;
  status: MilestoneStatus;
  targetDate?: string;
  completedAt?: string;
  completedBy?: string;
}

export interface FlowSnapshot {
  currentStage: string;
  stages: { name: string; status: 'completed' | 'current' | 'pending' }[];
  nextAction: string | null;
  blockages: string[];
  health: MatterHealth;
  progress: number; // 0–100
}

// ── MÓDULO LABORAL ────────────────────────────────────────────

export type JurisdiccionLaboral = 'CABA' | 'PBA';
export type TipoCasoLaboral = 'DESPIDO' | 'DIFERENCIAS' | 'NO_REGISTRADO' | 'ART' | 'SINDICAL' | 'PLATAFORMA';
export type EstadoCasoLaboral = 'encuadre' | 'telegramas' | 'seclo' | 'juicio' | 'sentencia' | 'ejecucion' | 'cerrado';
export type EstadoNormativo = 'VIGENTE' | 'SUSPENDIDA_CAUTELAR' | 'PENDIENTE_REGLAMENTACION' | 'DEROGADA';
export type ClasificacionDependencia = 'DEPENDIENTE' | 'BORDERLINE' | 'INDEPENDIENTE';
export type TipoTelegrama = 'INTIMACION_REGISTRACION' | 'DIFERENCIAS' | 'NOTIFICACION_DESPIDO' | 'RENUNCIA' | 'RESPUESTA' | 'OTRO';
export type ResultadoSeclo = 'ACUERDO' | 'FRACASO' | 'INCOMPARECENCIA';
export type EstadoProcesalLaboral = 'demanda' | 'contestacion' | 'prueba' | 'vista_de_causa' | 'sentencia' | 'apelacion' | 'ejecucion';
export type TipoEmpresa = 'GRAN_EMPRESA' | 'MIPYME';
export type ModuloAfectado = 'ENCUADRE' | 'EXTINCION' | 'LIQUIDACION' | 'PLATAFORMAS' | 'SINDICAL' | 'TODOS';

export interface VersionNormativa {
  id: string;
  articulo: string;
  ley: string;
  descripcion?: string;
  estado: EstadoNormativo;
  vigenteDesde?: string;
  vigenteHasta?: string;
  jurisdiccion: 'NACIONAL' | 'CABA' | 'PBA' | 'TODAS';
  fuente?: string;
  afectaModulo: ModuloAfectado;
  createdAt: string;
  updatedAt: string;
}

export interface CasoLaboral {
  id: string;
  clientId: string;
  matterId: string;
  jurisdiccion: JurisdiccionLaboral;
  tipoCaso: TipoCasoLaboral;
  modulosActivos: string[];
  estado: EstadoCasoLaboral;
  createdAt: string;
  updatedAt: string;
}

export interface EncuadreLaboral {
  id: string;
  casoId: string;
  clasificacionDependencia: ClasificacionDependencia;
  hayTercerizacion: boolean;
  hayGrupoEconomico: boolean;
  hayPlataforma: boolean;
  cctAplicable?: string;
  teoriaDelCaso?: string;
  datosDeEncuadre: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface Telegrama {
  id: string;
  casoId: string;
  tipo: TipoTelegrama;
  enviadoPor: 'TRABAJADOR' | 'EMPLEADOR';
  fechaEnvio?: string;
  fechaRecepcion?: string;
  contenido?: string;
  respondido: boolean;
  createdAt: string;
}

export interface SecloTramite {
  id: string;
  casoId: string;
  numeroTramite?: string;
  conciliador?: string;
  fechaAudiencia?: string;
  ofertaEmpleador?: number;
  calculoInterno?: number;
  diferencia?: number;
  resultado?: ResultadoSeclo;
  acuerdoHomologado: boolean;
  fechaHomologacion?: string;
  createdAt: string;
  updatedAt: string;
}

export interface LiquidacionLaboral {
  id: string;
  casoId: string;
  fechaIngreso: string;
  fechaEgreso: string;
  antiguedadAnios?: number;
  mejorRemuneracion?: number;
  incluyeVariables: boolean;
  indemnizacionArt245?: number;
  preaviso?: number;
  integracionMes?: number;
  sacPreaviso?: number;
  sacProporcional?: number;
  vacacionesProporcional?: number;
  diasTrabajados?: number;
  multaArt2Ley25323?: number;
  multaArt80?: number;
  multasLey24013?: number;
  otrosRubros: Record<string, unknown>;
  total?: number;
  actualizadoCon?: 'IPC' | 'IPC_3' | 'OTRO';
  tasaInteresAnual?: number;
  notaCautelar?: string;
  versionNormativaArt245Id?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ExpedienteLaboral {
  id: string;
  casoId: string;
  jurisdiccion: JurisdiccionLaboral;
  juzgado?: string;
  numeroExpediente?: string;
  caratula?: string;
  estadoProcesal: EstadoProcesalLaboral;
  fechaSentencia?: string;
  montoSentencia?: number;
  cuotasPago?: number;
  tipoEmpresa?: TipoEmpresa;
  createdAt: string;
  updatedAt: string;
}

// ── ONBOARDING ──────────────────────────────────────────────

export interface OnboardingItem {
  id: string;
  consultationId: string;
  label: string;
  completed: boolean;
  completedAt?: string;
  completedBy?: string;
  orden: number;
}

// ── MENSAJERÍA (Conversations) ─────────────────────────────

export type ConversationType = 'direct' | 'group';

export interface Conversation {
  id: string;
  type: ConversationType;
  name?: string;
  createdBy: string;
  createdAt: string;
  memberIds: string[];
  lastMessage?: ConversationMessage;
  unreadCount?: number;
}

export interface ConversationMessage {
  id: string;
  conversationId: string;
  senderId: string;
  content: string;
  createdAt: string;
}

// ── BITÁCORA / AUDIT LOG ───────────────────────────────────

export type AuditAction =
  | 'crear_asunto' | 'editar_asunto' | 'cerrar_asunto'
  | 'crear_cliente' | 'editar_cliente'
  | 'crear_consulta' | 'cambiar_estado_consulta'
  | 'crear_tarea' | 'editar_tarea' | 'completar_tarea'
  | 'crear_documento' | 'editar_documento'
  | 'asignar_abogados'
  | 'invitar_usuario' | 'editar_usuario' | 'desactivar_usuario'
  | 'crear_hito' | 'editar_hito'
  | 'crear_evento' | 'editar_evento' | 'eliminar_evento'
  | 'crear_plazo' | 'cumplir_plazo' | 'cancelar_plazo'
  | 'login' | 'logout';

export type AuditEntityType =
  | 'matter' | 'client' | 'consultation' | 'task'
  | 'document' | 'profile' | 'assignment' | 'milestone' | 'session'
  | 'evento' | 'plazo';

export interface AuditLogEntry {
  id: string;
  actorId: string;
  actorName: string;
  action: AuditAction;
  entityType: AuditEntityType;
  entityId?: string;
  entityLabel?: string;
  details?: Record<string, unknown>;
  createdAt: string;
}

// ── TIMELINE DE EVENTOS + PLAZOS PROCESALES ────────────────

export type Jurisdiccion = 'caba' | 'pba' | 'nacional';

export type TipoEvento =
  | 'traslado'
  | 'resolucion'
  | 'oficio_provisto'
  | 'oficio_diligenciado'
  | 'proveido'
  | 'audiencia_fijada'
  | 'audiencia_celebrada'
  | 'audiencia_suspendida'
  | 'presentacion_propia'
  | 'presentacion_contraria'
  | 'pericia_designada'
  | 'pericia_presentada'
  | 'notificacion_recibida'
  | 'autos_para_sentencia'
  | 'sentencia'
  | 'recurso_interpuesto'
  | 'otro';

export type OrigenEvento = 'manual' | 'scraper_mev' | 'scraper_pjn';
export type EstadoPlazo = 'activo' | 'cumplido' | 'vencido' | 'cancelado';
export type TipoFeriado = 'nacional' | 'pba' | 'caba' | 'feria_judicial';

export interface EventoExpediente {
  id: string;
  matterId: string;
  fecha: string;                 // 'YYYY-MM-DD'
  tipo: TipoEvento;
  titulo: string;
  descripcion?: string;
  origen: OrigenEvento;
  jurisdiccion?: Jurisdiccion;
  documentosUrls: string[];
  metadata?: Record<string, unknown>;
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Plazo {
  id: string;
  matterId: string;
  eventoOrigenId?: string;
  tipo: string;
  descripcion?: string;
  fechaInicio: string;           // 'YYYY-MM-DD'
  dias: number;
  diasHabiles: boolean;
  jurisdiccion: Jurisdiccion;
  fechaVencimiento: string;      // 'YYYY-MM-DD'
  estado: EstadoPlazo;
  cumplidoAt?: string;
  tareaId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Feriado {
  id: string;
  fecha: string;                 // 'YYYY-MM-DD'
  tipo: TipoFeriado;
  descripcion: string;
  jurisdiccionAplica: 'todas' | Jurisdiccion;
}

// ── COMUNICACIONES ──────────────────────────────────────────

export type CanalCommunication = 'WhatsApp' | 'Email' | 'Teléfono' | 'Presencial' | 'Interno';

export interface Communication {
  id: string;
  matterId?: string;
  clientId?: string;
  consultationId?: string;
  canal: CanalCommunication;
  contenido: string;
  enviadoPor: string;
  visibleParaCliente: boolean;
  createdAt: string;
}
