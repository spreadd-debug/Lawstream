export type UserRole = 'Socio' | 'Abogado' | 'Pasante' | 'Secretario';

export interface UserProfile {
  id: string;
  fullName: string;
  email: string;
  role: UserRole;
  initials: string;
  isActive: boolean;
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
}

export interface Task {
  id: string;
  matterId: string;
  title: string;
  dueDate: string;
  status: 'Pendiente' | 'Completada' | 'En revisión';
  priority: Priority;
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

export interface MatterTemplate {
  id: string;
  name: string;
  rama: MatterType;
  subtipo: string;
  jurisdiccion: string;
  via: string;
  etapaInicial: string;
  descripcion: string;
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
    type: 'text' | 'date' | 'number' | 'textarea';
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
