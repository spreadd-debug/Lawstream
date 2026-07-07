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
export type MatterType = 'Laboral' | 'Familia' | 'Daños' | 'Comercial' | 'Sucesiones' | 'Civil' | 'Penal';
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
  /**
   * @deprecated Columna legacy. La fuente canónica del número de
   * expediente es la tabla `expedientes` (nroReceptoria / nroJuzgado).
   * Migración 031 vacía esta columna después del backfill. La UI debe
   * usar `resolveExpedienteNumero()` de `lib/expedienteResolver.ts`
   * que prioriza la tabla y cae a este campo sólo como fallback.
   */
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
  // Naturaleza del matter (migración 028 - GAP 1).
  //  - 'principal': caso normal (default).
  //  - 'incidente': sub-proceso que tramita en cuerda separada dentro del
  //    mismo expediente (alimentos provisorios, tenencia cautelar, etc.).
  //  - 'apelacion': segunda instancia (Cámara) — GAP 4.
  // Cuando kind != 'principal' se requiere parentMatterId.
  kind?: MatterKind;
  // ID del matter padre cuando este es incidente o apelación.
  parentMatterId?: string;
  // Tipificación del incidente cuando kind='incidente'. NULL en otros casos.
  incidenteTipo?: IncidenteTipo;
  // Aspectos apelados cuando kind='apelacion'. Lista de items que se
  // apelaron de la sentencia del padre. Permite mostrar al padre como
  // "parcialmente firme" (GAP 5). Migración 029.
  aspectosApelados?: AspectoApelado[];
  // Apelante cuando kind='apelacion' (GAP R11, migración 044).
  // 'cliente' = nuestro cliente apela. 'contraparte' = la otra parte
  // apela. Permite distinguir apelaciones cruzadas sobre el mismo aspecto
  // (caso típico: ambas partes apelan compensación por motivos opuestos).
  apeladoPor?: ApeladoPor;
}

/**
 * Quién es el apelante cuando un matter es kind='apelacion'.
 * Alias semántico de PresentadaPor (R10) — son la misma idea: "actor del
 * acto procesal" — pero los mantenemos separados conceptualmente para
 * que mañana puedan divergir si hace falta.
 */
export type ApeladoPor = 'cliente' | 'contraparte';

export const APELADO_POR_LABELS: Record<ApeladoPor, string> = {
  cliente:     'Mi parte',
  contraparte: 'Contraparte',
};

/**
 * Naturaleza del matter — distingue casos principales de sub-procesos
 * que tramitan en cuerda separada (incidentes) o de segunda instancia
 * (apelaciones). Migración 028 (GAP 1).
 */
export type MatterKind = 'principal' | 'incidente' | 'apelacion';

/**
 * Tipos de incidente más frecuentes en familia y civil.
 * Si no encuadra en ninguno, usar 'otro'.
 */
export type IncidenteTipo =
  | 'alimentos_provisorios'
  | 'tenencia_cautelar'
  | 'exclusion_hogar'
  | 'autorizacion_viaje'
  | 'medida_cautelar'
  | 'beneficio_litigar_sin_gastos'
  | 'otro';

export const INCIDENTE_TIPO_LABELS: Record<IncidenteTipo, string> = {
  alimentos_provisorios: 'Alimentos provisorios',
  tenencia_cautelar: 'Tenencia cautelar',
  exclusion_hogar: 'Exclusión de hogar',
  autorizacion_viaje: 'Autorización de viaje',
  medida_cautelar: 'Medida cautelar',
  beneficio_litigar_sin_gastos: 'Beneficio de litigar sin gastos',
  otro: 'Otro',
};

/**
 * Aspectos apelables de una sentencia. Cuando un sub-proceso de
 * tipo 'apelacion' se abre, el usuario marca cuáles aspectos se
 * apelan; el resto queda firme. El padre se muestra "parcialmente
 * firme" mientras la apelación esté abierta (GAP 5, migración 029).
 */
export type AspectoApelado =
  | 'compensacion_economica'
  | 'cuota_alimentaria'
  | 'atribucion_vivienda'
  | 'regimen_comunicacion'
  | 'tenencia'
  | 'costas'
  | 'honorarios'
  | 'otro';

export const ASPECTO_APELADO_LABELS: Record<AspectoApelado, string> = {
  compensacion_economica: 'Compensación económica',
  cuota_alimentaria:      'Cuota alimentaria',
  atribucion_vivienda:    'Atribución de vivienda',
  regimen_comunicacion:   'Régimen de comunicación',
  tenencia:               'Tenencia',
  costas:                 'Costas',
  honorarios:             'Honorarios',
  otro:                   'Otro',
};

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
  /** Datos capturados durante la entrevista de consulta.
   *  Todos los valores son strings para mantener Record<string,string>
   *  compatible con el estado del componente. Claves adicionales
   *  introducidas en el refactor de entrevista estructurada:
   *   - contraparte_nombre / contraparte_dni / contraparte_domicilio / contraparte_telefono
   *   - hijos_menores: número como string ("2")
   *   - estado_civil: valor del select ("Casado/a", etc.)
   *  Legacy: datos_contraparte (string libre) — sigue siendo leído
   *  por backward compat en la conversión a asunto. */
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

export type TaskStatus = 'Pendiente' | 'Completada' | 'En revisión' | 'Cancelada';

export interface Task {
  id: string;
  matterId?: string;
  consultationId?: string;
  title: string;
  dueDate: string;
  status: TaskStatus;
  priority: Priority;
  bloqueante?: boolean;
  generadaAutomaticamente?: boolean;
  triggerEstado?: string;
  completedAt?: string;
  completedBy?: string;
  etapa?: string;
  /** Campos de caseData que satisfacen esta tarea (copiado del template) */
  satisfiedBy?: { key: string; label: string }[];
  /** Cuando status = 'Cancelada' (migración 042). Guarda el porqué en
   *  texto legible — típicamente la mutación de tipo de divorcio que
   *  invalidó la rama de la tarea. */
  canceladaMotivo?: string;
  /** Timestamp ISO de la cancelación. */
  canceladaAt?: string;
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
  /** Auto-completar si caseData[key] tiene valor.
   *  excludeValues: valores sentinel que NO se consideran "definidos"
   *  (ej. 'Por definir' como tercer estado de tipo_divorcio — el campo
   *  está seteado pero la decisión sigue pendiente). */
  autoCompleteIf?: { key: string; excludeValues?: string[] };
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
      type: 'text' | 'date' | 'select' | 'number' | 'money' | 'textarea' | 'repeatable' | 'info' | 'domicilio' | 'matricula';
      placeholder?: string;
      options?: string[];
      required?: boolean;
      /** Para type='info': tono visual del callout. Default 'amber'. */
      tone?: 'amber' | 'info' | 'rose';
      /** Para type='info': cuerpo del aviso (label es el título). */
      body?: string;
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
  /** Notas libres. Migración 031 lo usa para preservar matter.expediente
   *  legacy cuando hay conflicto con nroJuzgado/nroReceptoria. */
  notas?: string;
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
  | 'crear_hijo' | 'editar_hijo' | 'eliminar_hijo'
  | 'mutar_tipo_divorcio' | 'deshacer_mutacion_tipo_divorcio'
  | 'crear_reconvencion' | 'editar_reconvencion' | 'eliminar_reconvencion'
  | 'crear_bien' | 'editar_bien' | 'eliminar_bien'
  | 'crear_valuacion' | 'eliminar_valuacion'
  | 'crear_sociedad_interpuesta' | 'editar_sociedad_interpuesta' | 'eliminar_sociedad_interpuesta'
  | 'crear_causa_relacionada' | 'editar_causa_relacionada' | 'eliminar_causa_relacionada'
  | 'crear_cautelar' | 'editar_cautelar' | 'eliminar_cautelar'
  | 'crear_veedor' | 'editar_veedor' | 'eliminar_veedor'
  | 'crear_cuota_alimentaria' | 'editar_cuota_alimentaria' | 'eliminar_cuota_alimentaria'
  | 'crear_concepto_especie' | 'editar_concepto_especie' | 'eliminar_concepto_especie'
  | 'crear_controversia' | 'editar_controversia' | 'eliminar_controversia' | 'judicializar_controversia'
  | 'login' | 'logout';

export type AuditEntityType =
  | 'matter' | 'client' | 'consultation' | 'task'
  | 'document' | 'profile' | 'assignment' | 'milestone' | 'session'
  | 'evento' | 'plazo' | 'hijo_caso' | 'reconvencion'
  | 'bien' | 'bien_valuacion' | 'sociedad_interpuesta'
  | 'causa_relacionada'
  | 'cautelar' | 'veedor'
  | 'cuota_alimentaria' | 'concepto_especie'
  | 'controversia';

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
  | 'sentencia_camara'
  | 'cambio_representacion'
  | 'mutacion_tipo_divorcio'
  | 'deshacer_mutacion_tipo_divorcio'
  | 'demanda_reconvencional'
  | 'contestacion_reconvencion'
  | 'exhorto_internacional_librado'
  | 'exhorto_internacional_contestado'
  | 'exhorto_internacional_recibido'
  | 'exhorto_internacional_diligenciado'
  | 'exequatur_iniciado'
  | 'exequatur_concedido'
  // GAP UX-33: cuando una controversia pre-judicial se judicializa
  // (incidente, pedido cautelar, etc.), se inserta un evento en el
  // timeline procesal con este tipo y metadata.controversiaId para
  // mantener la traza bidireccional.
  | 'controversia_judicializada'
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

// ── HONORARIOS REGULADOS ───────────────────────────────────
// Honorarios que el juez fija al cerrar el juicio (típicamente al
// imponer costas). Distintos del Presupuesto inicial al cliente.
//
// Ciclo: regulado → notificado → firme → ejecutable → cobrado.

export type TipoHonorarioRegulado =
  | 'letrado_propio'      // mi parte / colega del estudio
  | 'letrado_contrario'   // letrado de la otra parte
  | 'perito'
  | 'mediador'
  | 'otro';

export type EstadoHonorarioRegulado =
  | 'regulado'
  | 'apelado'
  | 'firme'
  | 'en_ejecucion'
  | 'cobrado'
  | 'incobrable';

export interface HonorarioRegulado {
  id: string;
  matterId: string;
  profesional: string;                       // nombre del beneficiario
  tipo: TipoHonorarioRegulado;
  cantidadUnidades: number;                  // cantidad de JUS o UMA
  unidad: UnidadArancelaria;                 // 'JUS' | 'UMA'
  valorUnidadSnapshot: number;               // valor de la unidad al momento de la regulación
  montoPesos: number;                        // cantidadUnidades × valorUnidadSnapshot
  estado: EstadoHonorarioRegulado;
  obligadoAPagar?: string;                   // quién debe pagar (contraparte / mi cliente / etc.)
  fechaRegulacion?: string;
  fechaNotificacion?: string;
  fechaFirmeza?: string;
  fechaCobro?: string;
  apeladoPor?: string;
  notas?: string;
  createdBy?: string;
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

// ── CÉDULAS DE NOTIFICACIÓN (GAP 7) ─────────────────────────
// Una cédula = una notificación a un destinatario en un domicilio.
// Cada intento de diligenciamiento tiene fecha y resultado. El estado
// agregado de la cédula se DERIVA del último intento (en el front), salvo
// que el usuario lo fije manualmente como 'devuelta_sin_notificar' o
// 'vencida'.

export type TipoCedula =
  | 'demanda'
  | 'traslado'
  | 'audiencia'
  | 'sentencia'
  | 'citacion_testimonial'
  | 'intimacion'
  | 'oficio'
  | 'otro';

export const TIPO_CEDULA_LABELS: Record<TipoCedula, string> = {
  demanda:              'Notificación de demanda',
  traslado:             'Traslado',
  audiencia:            'Citación a audiencia',
  sentencia:            'Notificación de sentencia',
  citacion_testimonial: 'Citación de testigo',
  intimacion:           'Intimación',
  oficio:               'Oficio',
  otro:                 'Otro',
};

export type ResultadoIntentoCedula =
  | 'notificado_personalmente'
  | 'notificado_bajo_puerta'
  | 'nadie_atiende'
  | 'domicilio_cerrado'
  | 'domicilio_inexistente'
  | 'rehusa_recibir'
  | 'datos_erroneos'
  | 'fallecido'
  | 'otro';

export const RESULTADO_INTENTO_LABELS: Record<ResultadoIntentoCedula, string> = {
  notificado_personalmente: 'Notificado personalmente',
  notificado_bajo_puerta:   'Notificado bajo puerta',
  nadie_atiende:            'Nadie atiende',
  domicilio_cerrado:        'Domicilio cerrado',
  domicilio_inexistente:    'Domicilio inexistente',
  rehusa_recibir:           'Rehúsa recibir',
  datos_erroneos:           'Datos erróneos',
  fallecido:                'Destinatario fallecido',
  otro:                     'Otro',
};

/** Resultados que cuentan como notificación efectiva. */
export const RESULTADOS_EXITOSOS: ResultadoIntentoCedula[] = [
  'notificado_personalmente',
  'notificado_bajo_puerta',
];

export type EstadoCedulaManual = 'devuelta_sin_notificar' | 'vencida';

/**
 * Estado derivado de la cédula. Computado en el front a partir del
 * último intento + estadoManual.
 */
export type EstadoCedula =
  | 'pendiente'             // sin intentos
  | 'en_diligenciamiento'   // último intento fallido
  | 'notificada'            // último intento exitoso
  | 'devuelta_sin_notificar'// marcada manualmente
  | 'vencida';              // marcada manualmente

export interface CedulaIntento {
  id: string;
  cedulaId: string;
  fecha: string;            // 'YYYY-MM-DD'
  resultado: ResultadoIntentoCedula;
  hora?: string;            // 'HH:MM'
  notas?: string;
  createdBy?: string;
  createdAt: string;
}

export interface Cedula {
  id: string;
  matterId: string;
  tipo: TipoCedula;
  destinatario: string;
  domicilio: string;
  objeto?: string;
  fechaEmision?: string;    // 'YYYY-MM-DD'
  estadoManual?: EstadoCedulaManual;
  notas?: string;
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
}

// ── HIJOS DEL CASO (fuero Familia) ──────────────────────────
// Hijos como entidad de primera clase (migración 041). Soporta:
//   • R1: datos de discapacidad / terapias / cobertura especial.
//   • R2: régimen propio del hijo (override opcional del global del matter).
//   • R3: alerta de cumple 18 (calculada desde fechaNacimiento).
//
// Reemplaza al array JSON que vivía en `matter.caseData.hijos` y que solo
// se renderizaba en el formulario sin consumers reales. La tabla queda
// lista para recibir FKs futuros (pericial psicológica por hijo, evento
// de escucha del menor art. 707 CCyCN, etc.).

export type EstadoCud = 'si' | 'no' | 'en_tramite';
export type AcompananteTerapeutico = 'escolar' | 'domiciliario' | 'no';

export const ESTADO_CUD_LABELS: Record<EstadoCud, string> = {
  si:         'Sí',
  no:         'No',
  en_tramite: 'En trámite',
};

export const ACOMPANANTE_LABELS: Record<AcompananteTerapeutico, string> = {
  escolar:      'Escolar (en colegio)',
  domiciliario: 'Domiciliario',
  no:           'No requiere',
};

export interface HijoCaso {
  id: string;
  matterId: string;
  nombre: string;
  dni?: string;
  fechaNacimiento: string;       // 'YYYY-MM-DD'
  escolaridad?: string;
  establecimiento?: string;
  // R1
  tieneCud?: EstadoCud;
  diagnostico?: string;
  terapiasDesc?: string;
  acompananteTerapeutico?: AcompananteTerapeutico;
  coberturaEspecial?: string;
  // R2 — override opcional del régimen global del matter
  regimenCuidado?: string;
  residenciaPrincipal?: string;
  regimenComunicacion?: string;
  motivoRegimenDistinto?: string;
  // GAP UX-18 — transición a mayoría de edad gestionada (régimen ya
  // adaptado a alimentos art. 663 CCyCN, sin cuidado personal). Cuando
  // es true, el banner R3 deja de aparecer para este hijo aunque la
  // fecha lo justifique.
  transicion18Gestionada?: boolean;
  // Meta
  orden: number;
  notas?: string;
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
}

// ── RECONVENCIONES (GAP R10) ────────────────────────────────
// Demanda reconvencional: contrademanda planteada por el demandado en el
// mismo escrito de contestación. NO es sub-proceso (tramita junto con la
// principal) pero tiene ciclo propio (presentada → traslado → contestada
// → resuelta) y pretensiones propias.

export type PresentadaPor = 'cliente' | 'contraparte';

export type PretensionReconvencion =
  | 'compensacion_economica'
  | 'atribucion_vivienda'
  | 'cuota_alimentaria'
  | 'regimen_comunicacion'
  | 'tenencia'
  | 'costas'
  | 'honorarios'
  | 'danos_perjuicios'
  | 'nulidad'
  | 'otra';

export const PRETENSION_LABELS: Record<PretensionReconvencion, string> = {
  compensacion_economica: 'Compensación económica',
  atribucion_vivienda:    'Atribución de vivienda',
  cuota_alimentaria:      'Cuota alimentaria',
  regimen_comunicacion:   'Régimen de comunicación',
  tenencia:               'Tenencia / cuidado personal',
  costas:                 'Costas',
  honorarios:             'Honorarios',
  danos_perjuicios:       'Daños y perjuicios',
  nulidad:                'Nulidad',
  otra:                   'Otra',
};

export type EstadoReconvencion =
  | 'pendiente_traslado'
  | 'traslado_corrido'
  | 'contestada'
  | 'resuelta_por_sentencia'
  | 'desistida';

export const ESTADO_RECONVENCION_LABELS: Record<EstadoReconvencion, string> = {
  pendiente_traslado:     'Presentada — pendiente traslado',
  traslado_corrido:       'Traslado corrido',
  contestada:             'Contestada',
  resuelta_por_sentencia: 'Resuelta por sentencia',
  desistida:              'Desistida',
};

export interface Reconvencion {
  id: string;
  matterId: string;
  presentadaPor: PresentadaPor;
  fechaPresentacion: string;     // 'YYYY-MM-DD'
  // GAP UX-28: fecha en que el juzgado corrió el traslado de la reconvención.
  // Solo se llena cuando estado = 'traslado_corrido' — es el inicio del plazo
  // de 15 días hábiles para contestar (art. 357+338 CPCCN / 356+337 CPCC PBA).
  fechaTrasladoCorrido?: string; // 'YYYY-MM-DD'
  pretensiones: PretensionReconvencion[];
  montoReclamado?: string;
  pretensionDesc?: string;
  estado: EstadoReconvencion;
  eventoPresentacionId?: string;
  eventoContestacionId?: string;
  notas?: string;
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
}

// ── BIENES / PATRIMONIO (GAP R4 + R9 + R14) ─────────────────
// Modelo genérico aplicable a divorcio, sucesiones, comercial, daños.
// Lo único atado a divorcio es el campo `caracter` (propio/ganancial),
// que es opcional y NULL en otros fueros.

export type BienNaturaleza = 'activo' | 'pasivo';

export type BienTipo =
  | 'inmueble'
  | 'vehiculo'
  | 'cuenta_bancaria'
  | 'inversion_financiera'
  | 'sociedad'
  | 'mobiliario'
  | 'credito'
  | 'tarjeta_credito'
  | 'prestamo_personal'
  | 'prestamo_prendario'
  | 'hipoteca'
  | 'moratoria_fiscal'
  | 'otro';

export const BIEN_TIPO_LABELS: Record<BienTipo, string> = {
  inmueble:             'Inmueble',
  vehiculo:             'Vehículo',
  cuenta_bancaria:      'Cuenta bancaria',
  inversion_financiera: 'Inversión / Plazo fijo',
  sociedad:             'Participación societaria',
  mobiliario:           'Mobiliario / Electrodomésticos',
  credito:              'Crédito a cobrar',
  tarjeta_credito:      'Tarjeta de crédito',
  prestamo_personal:    'Préstamo personal',
  prestamo_prendario:   'Préstamo prendario',
  hipoteca:             'Hipoteca',
  moratoria_fiscal:     'Moratoria fiscal',
  otro:                 'Otro',
};

export type TitularRol = 'cliente' | 'contraparte' | 'ambos' | 'tercero';

export const TITULAR_ROL_LABELS: Record<TitularRol, string> = {
  cliente:     'Mi parte',
  contraparte: 'Contraparte',
  ambos:       'Ambos',
  tercero:     'Tercero',
};

export type BienCaracter = 'propio' | 'ganancial' | 'comun' | 'no_aplica';

export const BIEN_CARACTER_LABELS: Record<BienCaracter, string> = {
  propio:    'Propio',
  ganancial: 'Ganancial',
  comun:     'Común',
  no_aplica: 'No aplica',
};

export interface SociedadInterpuesta {
  id: string;
  matterId: string;
  denominacion: string;
  tipoSocietario?: string;
  jurisdiccion?: string;
  cuitOIdFiscal?: string;
  accionistasDesc?: string;
  observaciones?: string;
  notas?: string;
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
}

// Atributos estructurados específicos por tipo de bien ("activo vivo").
// Sparse — solo se completan los campos que aplican al `tipo` del bien.
// Se guardan en la columna JSONB `bienes.atributos` y se auto-completan
// en los oficios de embargo/cautelar (ver BIEN_AUTOFILL_MAP en Plantillas).
export interface BienAtributos {
  // inmueble
  matricula?: string;
  folio?: string;
  nomenclaturaCatastral?: string;
  partidaInmobiliaria?: string;
  ubicacion?: string;
  superficie?: string;
  // vehiculo
  marca?: string;
  modelo?: string;
  anio?: string;
  dominio?: string;                    // patente
  nroMotor?: string;
  nroChasis?: string;
  // cuenta_bancaria
  banco?: string;
  cbu?: string;
  nroCuenta?: string;
  tipoCuenta?: string;
  // inversion_financiera
  entidad?: string;
  nroComitente?: string;
  // sociedad
  porcentajeParticipacion?: string;
}

export interface Bien {
  id: string;
  matterId: string;
  naturaleza: BienNaturaleza;
  tipo: BienTipo;
  descripcion: string;
  pais?: string;
  titularRol: TitularRol;
  titularDetalle?: string;
  valorActual?: number;
  monedaActual?: Moneda;
  fechaValuacionActual?: string;       // 'YYYY-MM-DD'
  sociedadInterpuestaId?: string;
  caracter?: BienCaracter;
  // GAP UX-30: justificación del carácter — crítico cuando es 'propio'
  // (anterior al matrimonio, donación, herencia, permuta de propio).
  motivoCaracter?: string;
  // Atributos estructurados por tipo (patente, matrícula, CBU, etc.).
  atributos?: BienAtributos;
  observaciones?: string;
  notas?: string;
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
}

// Origen de una tasación — relevante como prueba: una tasación judicial
// (perito designado) pesa distinto que una privada o una estimación propia.
export type TipoTasacion = 'judicial' | 'privada' | 'estimada';

export const TIPO_TASACION_LABELS: Record<TipoTasacion, string> = {
  judicial: 'Judicial (perito)',
  privada:  'Privada',
  estimada: 'Estimada',
};

export interface BienValuacion {
  id: string;
  bienId: string;
  fecha: string;                       // 'YYYY-MM-DD'
  valor: number;
  moneda: Moneda;
  fuente?: string;
  // Datos estructurados de la tasación como prueba. Importan cuando la
  // contraparte impugna el valor: quién tasó y con qué matrícula respalda.
  tasadorNombre?: string;
  tasadorMatricula?: string;           // ej. 'CPI 3421', 'CUCICBA 1234'
  tipoTasacion?: TipoTasacion;
  fechaInforme?: string;               // 'YYYY-MM-DD' — fecha del dictamen
  notas?: string;
  createdBy?: string;
  createdAt: string;
}

// ── CAUSAS RELACIONADAS (GAP R12 — vínculo cross-fuero) ────
// Causas paralelas que impactan al matter principal pero viven en otro
// fuero (típicamente penal). Soporta dos modos:
//   • externa — la lleva otro estudio; solo referenciamos.
//   • interna — el estudio toma la causa también; FK a otro matter.

export type VinculacionCausa = 'externa' | 'interna';

export type TipoCausaRelacionada =
  | 'penal'
  | 'administrativa'
  | 'civil_paralela'
  | 'laboral_paralela'
  | 'concursal'
  | 'otra';

export const TIPO_CAUSA_LABELS: Record<TipoCausaRelacionada, string> = {
  penal:            'Penal',
  administrativa:   'Administrativa',
  civil_paralela:   'Civil paralela',
  laboral_paralela: 'Laboral paralela',
  concursal:        'Concursal',
  otra:             'Otra',
};

export type EstadoCausaExterna =
  | 'en_instruccion'
  | 'elevada_a_juicio'
  | 'en_juicio'
  | 'sentencia'
  | 'sentencia_firme'
  | 'archivada'
  | 'en_apelacion'
  | 'desconocido';

export const ESTADO_CAUSA_EXTERNA_LABELS: Record<EstadoCausaExterna, string> = {
  en_instruccion:   'En instrucción',
  elevada_a_juicio: 'Elevada a juicio',
  en_juicio:        'En juicio',
  sentencia:        'Sentencia',
  sentencia_firme:  'Sentencia firme',
  archivada:        'Archivada',
  en_apelacion:     'En apelación',
  desconocido:      'Desconocido',
};

export interface CausaRelacionada {
  id: string;
  matterId: string;
  vinculacion: VinculacionCausa;
  matterRelacionadaId?: string;
  tipoCausa: TipoCausaRelacionada;
  caratula?: string;
  fuero?: string;
  juzgado?: string;
  expedienteNumero?: string;
  jurisdiccion?: string;
  abogadoExternoNombre?: string;
  abogadoExternoContacto?: string;
  estadoExterno?: EstadoCausaExterna;
  descripcion?: string;
  impacto?: string;
  fechaInicio?: string;             // 'YYYY-MM-DD'
  fechaUltimoMovimiento?: string;
  notas?: string;
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
}

// ── CAUTELARES PATRIMONIALES + VEEDORES (GAP R15) ───────────
// Modelo separado del IncidenteTipo='medida_cautelar' (que era genérico).
// Acá el dato es estructurado: tipo, alcance, fechas del ciclo,
// inscripción registral, levantamientos parciales/totales.
//
// El veedor judicial NO encaja en Perito (rol distinto: vigila en el
// tiempo y emite informes periódicos, en lugar de un dictamen único).

export type TipoCautelar =
  | 'inhibicion_general'
  | 'embargo'
  | 'intervencion_judicial'
  | 'secuestro'
  | 'anotacion_litis'
  | 'prohibicion_innovar'
  | 'prohibicion_contratar'
  | 'otra';

export const TIPO_CAUTELAR_LABELS: Record<TipoCautelar, string> = {
  inhibicion_general:    'Inhibición general de bienes',
  embargo:               'Embargo',
  intervencion_judicial: 'Intervención judicial',
  secuestro:             'Secuestro',
  anotacion_litis:       'Anotación de litis',
  prohibicion_innovar:   'Prohibición de innovar',
  prohibicion_contratar: 'Prohibición de contratar',
  otra:                  'Otra',
};

export type EstadoCautelar =
  | 'solicitada'
  | 'concedida'
  | 'trabada'
  | 'parcialmente_levantada'
  | 'levantada'
  | 'rechazada';

export const ESTADO_CAUTELAR_LABELS: Record<EstadoCautelar, string> = {
  solicitada:             'Solicitada',
  concedida:              'Concedida',
  trabada:                'Trabada',
  parcialmente_levantada: 'Parcialmente levantada',
  levantada:              'Levantada',
  rechazada:              'Rechazada',
};

export type CaucionTipo = 'real' | 'juratoria' | 'fianza' | 'no_corresponde';

export interface Cautelar {
  id: string;
  matterId: string;
  tipo: TipoCautelar;
  contraRol: TitularRol;
  contraDetalle?: string;
  bienId?: string;
  sociedadInterpuestaId?: string;
  alcance?: string;
  estado: EstadoCautelar;
  fechaSolicitud?: string;
  fechaResolucion?: string;
  fechaTraba?: string;
  fechaLevantamientoParcial?: string;
  fechaLevantamientoTotal?: string;
  fechaRechazo?: string;
  registroInscripcion?: string;
  caucionTipo?: CaucionTipo;
  caucionMontoDesc?: string;
  observaciones?: string;
  notas?: string;
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
}

export type EstadoVeedor =
  | 'designado'
  | 'aceptado'
  | 'rechazado'
  | 'recusado'
  | 'sustituido'
  | 'cesado';

export const ESTADO_VEEDOR_LABELS: Record<EstadoVeedor, string> = {
  designado:  'Designado',
  aceptado:   'Aceptado',
  rechazado:  'Rechazado',
  recusado:   'Recusado',
  sustituido: 'Sustituido',
  cesado:     'Cesado',
};

export type FrecuenciaInformesVeedor =
  | 'mensual' | 'bimestral' | 'trimestral' | 'semestral' | 'a_requerimiento';

export const FRECUENCIA_INFORMES_LABELS: Record<FrecuenciaInformesVeedor, string> = {
  mensual:         'Mensual',
  bimestral:       'Bimestral',
  trimestral:      'Trimestral',
  semestral:       'Semestral',
  a_requerimiento: 'A requerimiento',
};

export interface Veedor {
  id: string;
  matterId: string;
  cautelarId?: string;
  nombre: string;
  especialidad?: string;
  matricula?: string;
  email?: string;
  telefono?: string;
  estado: EstadoVeedor;
  alcance?: string;
  frecuenciaInformes?: FrecuenciaInformesVeedor;
  fechaDesignacion?: string;
  fechaAceptacion?: string;
  fechaCese?: string;
  honorariosDesc?: string;
  observaciones?: string;
  notas?: string;
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
}

// ── CUOTAS ALIMENTARIAS (GAP R13) ───────────────────────────
// Régimen alimentario con desglose efectivo + componentes en especie.
// La cuota tiene su propio ciclo de vida (provisoria → definitiva →
// modificada → extinguida) y conceptos en especie con FK opcional a un
// hijo (terapias específicas, AT escolar, etc.).

export type EstadoCuotaAlimentaria =
  // 'borrador' (GAP UX-29): canasta de gastos en construcción, antes de
  // que se pida formalmente la cuota. No es una cuota fijada — sirve para
  // estructurar los gastos reales del/los hijos durante la entrevista o
  // instrucción, y después se "convierte" a provisoria/definitiva
  // arrastrando los conceptos en especie ya cargados.
  | 'borrador' | 'provisoria' | 'definitiva' | 'modificada' | 'extinguida';

export const ESTADO_CUOTA_LABELS: Record<EstadoCuotaAlimentaria, string> = {
  borrador:    'Borrador (canasta)',
  provisoria:  'Provisoria',
  definitiva:  'Definitiva',
  modificada:  'Modificada',
  extinguida:  'Extinguida',
};

export type AlcanceCuota =
  | 'todos_los_hijos' | 'hijos_especificos' | 'conyuge' | 'pariente';

export const ALCANCE_CUOTA_LABELS: Record<AlcanceCuota, string> = {
  todos_los_hijos:   'Todos los hijos',
  hijos_especificos: 'Hijos específicos',
  conyuge:           'Cónyuge (art. 432 CCyCN)',
  pariente:          'Pariente',
};

export type FrecuenciaCuotaAlim =
  | 'mensual' | 'quincenal' | 'bimestral' | 'trimestral' | 'semestral' | 'anual' | 'unica' | 'a_demanda';

export const FRECUENCIA_CUOTA_LABELS: Record<FrecuenciaCuotaAlim, string> = {
  mensual:     'Mensual',
  quincenal:   'Quincenal',
  bimestral:   'Bimestral',
  trimestral:  'Trimestral',
  semestral:   'Semestral',
  anual:       'Anual',
  unica:       'Pago único',
  a_demanda:   'A demanda',
};

export type AjusteCuota =
  | 'sin_ajuste' | 'ipc' | 'salarios_sec' | 'rIPC_y_sentencia' | 'mixto' | 'otro';

export const AJUSTE_CUOTA_LABELS: Record<AjusteCuota, string> = {
  sin_ajuste:        'Sin ajuste',
  ipc:               'IPC',
  salarios_sec:      'Salarios SEC / convenio',
  rIPC_y_sentencia:  'IPC + lo que fije sentencia',
  mixto:             'Mixto',
  otro:              'Otro',
};

export interface CuotaAlimentaria {
  id: string;
  matterId: string;
  estado: EstadoCuotaAlimentaria;
  obligadoRol: TitularRol;
  obligadoDetalle?: string;
  alcance: AlcanceCuota;
  hijosCubiertos: string[];        // UUIDs de hijos_caso
  montoEfectivo?: number;
  moneda?: Moneda;
  frecuencia: FrecuenciaCuotaAlim;
  ajuste?: AjusteCuota;
  ajusteDesc?: string;
  fechaVigenciaDesde?: string;     // 'YYYY-MM-DD'
  fechaVigenciaHasta?: string;
  fundamento?: string;
  eventoOrigenId?: string;
  notas?: string;
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
}

export type CategoriaConceptoEspecie =
  | 'colegio' | 'prepaga' | 'terapia' | 'acompanante_terapeutico'
  | 'extracurricular' | 'transporte' | 'gastos_medicos' | 'medicamentos'
  | 'vestimenta' | 'otro';

export const CATEGORIA_CONCEPTO_LABELS: Record<CategoriaConceptoEspecie, string> = {
  colegio:                 'Colegio',
  prepaga:                 'Prepaga / obra social',
  terapia:                 'Terapia',
  acompanante_terapeutico: 'Acompañante terapéutico',
  extracurricular:         'Extracurricular',
  transporte:              'Transporte',
  gastos_medicos:          'Gastos médicos',
  medicamentos:            'Medicamentos',
  vestimenta:              'Vestimenta',
  otro:                    'Otro',
};

export type PagadorConcepto =
  | 'obligado_directo' | 'reembolso' | 'compartido_50_50' | 'compartido_otro';

export const PAGADOR_CONCEPTO_LABELS: Record<PagadorConcepto, string> = {
  obligado_directo:  'Obligado paga directo al prestador',
  reembolso:         'Beneficiario paga, obligado reembolsa',
  compartido_50_50:  'Compartido 50/50',
  compartido_otro:   'Compartido (otra proporción)',
};

export interface CuotaConceptoEspecie {
  id: string;
  cuotaAlimentariaId: string;
  categoria: CategoriaConceptoEspecie;
  concepto: string;
  prestador?: string;
  montoEstimado?: number;
  moneda?: Moneda;
  frecuencia: FrecuenciaCuotaAlim;
  pagador: PagadorConcepto;
  pagadorDetalle?: string;
  hijoId?: string;
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

// ── CONTROVERSIAS DEL CASO (GAP UX-33) ───────────────────────
// Hechos extrajudiciales que generan conflicto antes de que entre el
// expediente (o en paralelo). El cónyuge anuncia que se lleva los
// chicos, saca un préstamo, cambia la obra social, etc. La app los
// estructura para que el abogado pueda priorizarlos por plazo y, si
// hace falta, judicializarlos como sub-proceso (incidente).

export type CategoriaControversia =
  | 'vacaciones'
  | 'cuota_alimentaria'
  | 'regimen_comunicacion'
  | 'mudanza'
  | 'bienes'
  | 'comunicacion'
  | 'salud'
  | 'educacion'
  | 'otra';

export const CATEGORIA_CONTROVERSIA_LABELS: Record<CategoriaControversia, string> = {
  vacaciones:           'Vacaciones',
  cuota_alimentaria:    'Cuota alimentaria',
  regimen_comunicacion: 'Régimen de comunicación',
  mudanza:              'Mudanza / cambio de domicilio',
  bienes:               'Bienes',
  comunicacion:         'Comunicación entre partes',
  salud:                'Salud',
  educacion:            'Educación',
  otra:                 'Otra',
};

export type EstadoControversia =
  | 'abierta' | 'negociando' | 'acordada' | 'judicializada' | 'desistida';

export const ESTADO_CONTROVERSIA_LABELS: Record<EstadoControversia, string> = {
  abierta:        'Abierta',
  negociando:     'Negociando',
  acordada:       'Acordada (extrajudicial)',
  judicializada:  'Judicializada',
  desistida:      'Desistida',
};

// Estados que cuentan como "abiertas" para la UI: aparecen arriba con
// banner de plazo y se incluyen en el resumen de alertas (UX-9).
export const ESTADO_CONTROVERSIA_ABIERTOS: EstadoControversia[] = ['abierta', 'negociando'];

export interface Controversia {
  id: string;
  matterId: string;
  categoria: CategoriaControversia;
  titulo: string;
  fechaHecho: string;                  // 'YYYY-MM-DD'
  descripcion?: string;
  posicionCliente?: string;
  posicionContraparte?: string;
  plazoCritico?: string;               // 'YYYY-MM-DD'
  estado: EstadoControversia;
  subprocesoId?: string;
  eventoOrigenId?: string;
  documentosUrls: string[];
  notas?: string;
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
}
