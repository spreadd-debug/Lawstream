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
export type MatterStatus = 'Activo' | 'Suspendido' | 'Cerrado' | 'Pausado' | 'Archivado';
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
  // Jurisdicción procesal del caso ('caba' | 'pba' | 'nacional'). Persistida en
  // columna top-level `matters.jurisdiccion`. Se setea en el wizard de creación
  // y es editable desde "Editar Asunto". Puede ser undefined SOLO en casos
  // legados anteriores a la migración 017 — esos se marcan con banner en
  // MatterDetail hasta que el usuario la complete.
  jurisdiccion?: Jurisdiccion;
  // Tipo de proceso ('ordinario' | 'sumario' | 'sumarisimo'). Determina los
  // plazos aplicables. Persistida en `matters.tipo_proceso` (migración 018).
  // Default en backfill: 'ordinario'. Se puede cambiar desde "Editar Asunto" y
  // eso recalcula automáticamente los plazos activos del caso.
  tipoProceso?: TipoProceso;
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

/**
 * Categoría jurídica del documento. Vive como enum lógico en TypeScript;
 * la columna `documents.category` en DB es TEXT libre para no romper
 * datos legados con valores ad-hoc. La UI sugiere estos valores estándar.
 */
export type DocumentCategory =
  | 'escrito'      // Demanda, contestación, alegato, presentación de la parte.
  | 'resolucion'   // Resolución, providencia, sentencia interlocutoria.
  | 'sentencia'    // Sentencia definitiva.
  | 'pericia'      // Dictamen pericial.
  | 'oficio'       // Oficio (provisto, diligenciado, contestado).
  | 'cedula'       // Cédula de notificación.
  | 'documental'   // Prueba documental aportada (contratos, recibos, etc.).
  | 'identidad'    // DNI, partidas, actas civiles.
  | 'otro';

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
  /** Vínculo opcional con un evento del expediente (migración 025).
   *  Cuando el documento se generó/recibió en el contexto de un evento
   *  (ej. acta de audiencia, dictamen pericial, oficio diligenciado),
   *  permite navegar de evento → documento y viceversa. */
  eventoId?: string;
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

/**
 * Unidad arancelaria del presupuesto:
 *  - JUS: Justicia Nacional/CABA (Ley 27.423).
 *  - UMA: Provincia de Buenos Aires (Ley 14.967).
 *
 * `iusValorSnapshot` y `cantidadIus` mantienen su nombre por legacy;
 * conceptualmente representan el valor/cantidad de la unidad seleccionada
 * (sea JUS o UMA según el campo `unidad`).
 */
export type UnidadArancelaria = 'JUS' | 'UMA';

export interface Presupuesto {
  id: string;
  consultationId?: string;
  matterId?: string;
  clientName: string;
  status: PresupuestoStatus;
  /** Unidad arancelaria del presupuesto. Default 'JUS' por compatibilidad
   *  con presupuestos legados. Se elige al crear según jurisdicción. */
  unidad: UnidadArancelaria;
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

/**
 * Tipo de proceso procesal del caso. Determina qué set de plazos aplica.
 *  - 'ordinario'  → juicio ordinario civil (default, 99% de los casos).
 *  - 'sumario'    → juicio sumario, EXCLUSIVO de Provincia de Buenos Aires
 *                    (art. 484 CPCC PBA). Derogado en Nación por Ley 25.488.
 *  - 'sumarisimo' → juicio sumarísimo, ambas jurisdicciones
 *                    (art. 498 CPCCN / art. 496 CPCC PBA). Plazos más cortos.
 */
export type TipoProceso = 'ordinario' | 'sumario' | 'sumarisimo';

export type TipoEvento =
  | 'traslado'
  | 'resolucion'
  | 'oficio_provisto'
  | 'oficio_diligenciado'
  | 'proveido'
  | 'ofrecimiento_prueba'
  | 'audiencia_fijada'
  | 'audiencia_celebrada'
  | 'audiencia_suspendida'
  | 'audiencia_testimonial'
  | 'presentacion_propia'
  | 'presentacion_contraria'
  | 'pericia_designada'
  | 'aceptacion_perito'
  | 'pericia_presentada'
  | 'pedido_explicaciones'
  | 'contestacion_explicaciones'
  | 'notificacion_recibida'
  | 'autos_para_alegar'
  | 'autos_para_sentencia'
  | 'sentencia'
  | 'regulacion_honorarios'
  | 'recurso_interpuesto'
  | 'expresion_agravios'
  | 'contestacion_agravios'
  | 'elevacion_camara'
  | 'cambio_representacion'
  | 'otro';

export type OrigenEvento = 'manual' | 'scraper_mev' | 'scraper_pjn';
export type EstadoPlazo = 'activo' | 'suspendido' | 'cumplido' | 'vencido' | 'cancelado';

/**
 * Tipo de cómputo procesal del plazo.
 *  - 'individual' — corre desde la notificación a cada parte por separado (default).
 *  - 'comun'      — corre desde la ÚLTIMA notificación; recalcula si entra una posterior.
 *                   Aplica típicamente a alegatos (art. 482 CPCCN) y traslados con
 *                   litisconsorcio múltiple.
 */
export type TipoPlazo = 'individual' | 'comun';
export type TipoFeriado = 'nacional' | 'pba' | 'caba' | 'feria_judicial';

// ── HILOS DE PRUEBA ────────────────────────────────────────
// Un hilo agrupa eventos de la etapa probatoria por línea de
// producción (pericia X, testimonial Y, oficio Z) para poder
// seguirlos sin que se mezclen en el timeline.

export type TipoHilo = 'pericial' | 'testimonial' | 'informativa' | 'documental' | 'confesional' | 'otra';
export type OfrecidoPorHilo = 'propio' | 'contraria';
export type EstadoHilo = 'ofrecido' | 'admitido' | 'rechazado' | 'en_produccion' | 'producido' | 'desistido';

export interface HiloPrueba {
  id: string;
  matterId: string;
  nombre: string;
  tipo: TipoHilo;
  ofrecidoPor: OfrecidoPorHilo;
  estado: EstadoHilo;
  fechaOfrecido?: string;        // 'YYYY-MM-DD'
  fechaResolucion?: string;
  fechaProducido?: string;
  descripcion?: string;
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
}

// ── PERITOS ────────────────────────────────────────────────
// Perito designado por el juzgado en un caso (puede vincularse
// a un hilo pericial). Tiene su propio ciclo procesal.

export type EspecialidadPerito =
  | 'contador'
  | 'psicologo'
  | 'medico'
  | 'arquitecto'
  | 'ingeniero'
  | 'tasador'
  | 'asistente_social'
  | 'caligrafo'
  | 'traductor'
  | 'otra';

export type EstadoPerito =
  | 'designado'           // sorteado/designado por el juzgado
  | 'aceptado'            // aceptó el cargo
  | 'rechazado'           // rechazó
  | 'recusado'            // recusado por una parte
  | 'informe_presentado'  // entregó dictamen
  | 'sustituido';         // reemplazado por otro

export interface Perito {
  id: string;
  matterId: string;
  hiloId?: string;
  nombre: string;
  especialidad: EspecialidadPerito;
  matricula?: string;
  email?: string;
  telefono?: string;
  estado: EstadoPerito;
  fechaDesignado?: string;       // 'YYYY-MM-DD'
  fechaAceptado?: string;
  fechaInforme?: string;
  notas?: string;
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
}

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
  /** Hilo de prueba al que pertenece este evento (opcional). */
  hiloId?: string;
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
  // Suspensión/reanudación (migración 021)
  suspendidoDesde?: string;                   // 'YYYY-MM-DD'
  motivoSuspension?: string;
  diasTranscurridosAlSuspender?: number;      // hábiles ya consumidos al pausar
  fechaReanudacion?: string;                  // 'YYYY-MM-DD'
  reanudadoAt?: string;                       // ISO timestamp
  // Tipo de cómputo procesal (migración 022)
  tipoPlazo: TipoPlazo;
  /** Solo para tipoPlazo = 'comun': fecha desde la que se cuenta el plazo
   *  (corresponde a la ÚLTIMA notificación entre las partes). Si entra
   *  una notificación posterior, se actualiza y se recalcula vencimiento. */
  fechaUltimaNotificacion?: string;           // 'YYYY-MM-DD'
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

// ── COMPENSACIÓN ECONÓMICA ─────────────────────────────────
// Compensación pactada en sentencia (art. 441 CCyCN en divorcio,
// pero también aplicable a otros contextos). Se paga en cuotas
// con calendario auto-generado y tracking individual de pagos.

export type Moneda = 'ARS' | 'USD' | 'EUR';
export type FrecuenciaCuota = 'mensual' | 'bimestral' | 'trimestral' | 'semestral' | 'anual' | 'unica';
export type EstadoCompensacion = 'vigente' | 'cumplida' | 'incumplida' | 'renegociada';
export type EstadoCuota = 'pendiente' | 'pagada' | 'parcial' | 'mora';

export interface CompensacionEconomica {
  id: string;
  matterId: string;
  montoTotal: number;
  moneda: Moneda;
  cantidadCuotas: number;
  frecuencia: FrecuenciaCuota;
  fechaPrimeraCuota: string;     // 'YYYY-MM-DD'
  tasaInteresAnual?: number;     // % anual, opcional
  estado: EstadoCompensacion;
  notas?: string;
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CuotaCompensacion {
  id: string;
  compensacionId: string;
  numero: number;                // 1, 2, 3, …
  fechaVencimiento: string;
  monto: number;
  estado: EstadoCuota;
  fechaPago?: string;
  montoPagado?: number;
  comprobanteUrl?: string;
  notas?: string;
  createdAt: string;
  updatedAt: string;
}

// ── LETRADOS DE LA PARTE / CONTRAPARTE ─────────────────────
// Datos estructurados con historial. Reemplaza los strings sueltos en
// matter.caseData (conyuge2_abogado, etc.) que se sobrescribían al
// cambiar de letrado.

export type RolLetrado = 'contraparte' | 'tercero' | 'fiscalia' | 'defensoria' | 'otra';
export type EstadoLetrado = 'vigente' | 'renunciante' | 'cesado' | 'sustituido';

export interface LetradoParte {
  id: string;
  matterId: string;
  nombre: string;
  matricula?: string;
  colegio?: string;
  email?: string;
  telefono?: string;
  domicilioLegal?: string;
  domicilioElectronico?: string;
  representaA: RolLetrado;
  estado: EstadoLetrado;
  fechaDesignacion?: string;
  fechaCese?: string;
  motivoCese?: string;
  notas?: string;
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
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
