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
  type: 'creation' | 'call' | 'doc_received' | 'task_created' | 'deadline' | 'draft' | 'presentation' | 'note' | 'status_change';
  title: string;
  description?: string;
  user: string;
  date: string;
}
