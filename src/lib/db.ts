/**
 * Capa de acceso a datos — Lawstream × Supabase
 *
 * Convención de nombres:
 *   DB (snake_case)        ←→  TypeScript (camelCase)
 *   next_action            ←→  nextAction
 *   next_action_date       ←→  nextActionDate
 *   blocks_progress        ←→  blocksProgress
 *   matter_id              ←→  matterId
 *   last_activity          ←→  lastActivity
 *   user_name              ←→  user   (reservada en PostgreSQL)
 */

import { supabase } from './supabase';

// ── Multi-tenant helpers ──────────────────────────────────────────
// firm_id del user logueado, cacheado en memoria para no llamar la RPC
// en cada query. Se invalida en SIGNED_OUT (cuando entra otro user, el
// cache queda en null y la próxima llamada lo refresca).

let cachedFirmId: string | null = null;

supabase.auth.onAuthStateChange((event) => {
  if (event === 'SIGNED_OUT') cachedFirmId = null;
});

const getCurrentFirmId = async (): Promise<string> => {
  if (cachedFirmId) return cachedFirmId;
  const { data, error } = await supabase.rpc('current_firm_id');
  if (error || !data) throw new Error('No se pudo obtener el firm del user actual.');
  cachedFirmId = data as string;
  return cachedFirmId;
};

import {
  Matter,
  Client,
  Consultation,
  LegalDocument,
  Task,
  TimelineEvent,
  UserProfile,
  Presupuesto,
  PresupuestoItem,
  Recibo,
  StudioConfig,
  EstudioPerfil,
  Expediente,
  ExpedienteEstadoLog,
  EstadoTroncal,
  OnboardingItem,
  Communication,
  MatterMilestone,
  VersionNormativa,
  CasoLaboral,
  EncuadreLaboral,
  Telegrama,
  SecloTramite,
  LiquidacionLaboral,
  ExpedienteLaboral,
  Conversation,
  ConversationMessage,
  ConversationType,
  MatterAssignment,
  AssignmentRole,
  AuditLogEntry,
  AuditAction,
  AuditEntityType,
  EventoExpediente,
  Plazo,
  Feriado,
  EstadoPlazo,
  HiloPrueba,
  Perito,
  CompensacionEconomica,
  CuotaCompensacion,
  LetradoParte,
  HonorarioRegulado,
  Cedula,
  CedulaIntento,
  HijoCaso,
  Reconvencion,
  PresentadaPor,
  PretensionReconvencion,
  EstadoReconvencion,
  Bien,
  BienValuacion,
  SociedadInterpuesta,
  BienNaturaleza,
  BienTipo,
  TitularRol,
  BienCaracter,
  CausaRelacionada,
  VinculacionCausa,
  TipoCausaRelacionada,
  EstadoCausaExterna,
  Cautelar,
  TipoCautelar,
  EstadoCautelar,
  CaucionTipo,
  Veedor,
  EstadoVeedor,
  FrecuenciaInformesVeedor,
  CuotaAlimentaria,
  CuotaConceptoEspecie,
  EstadoCuotaAlimentaria,
  AlcanceCuota,
  FrecuenciaCuotaAlim,
  AjusteCuota,
  CategoriaConceptoEspecie,
  PagadorConcepto,
  Controversia,
  CategoriaControversia,
  EstadoControversia,
} from '../types';

// ── Profiles ──────────────────────────────────────────────────────

const toProfile = (r: any): UserProfile => ({
  id:       r.id,
  fullName: r.full_name,
  email:    r.email,
  role:     r.role,
  initials: r.initials,
  isActive: r.is_active,
  mustChangePassword: r.must_change_password ?? false,
});

export const fetchProfiles = async (): Promise<UserProfile[]> => {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .order('full_name');
  if (error) throw error;
  return (data ?? []).map(toProfile);
};

export const updateProfile = async (id: string, changes: Partial<UserProfile>): Promise<void> => {
  const row: any = {};
  if (changes.fullName !== undefined) row.full_name = changes.fullName;
  if (changes.role !== undefined)     row.role = changes.role;
  if (changes.initials !== undefined) row.initials = changes.initials;
  if (changes.isActive !== undefined)          row.is_active = changes.isActive;
  if (changes.mustChangePassword !== undefined) row.must_change_password = changes.mustChangePassword;
  row.updated_at = new Date().toISOString();

  const { error } = await supabase
    .from('profiles')
    .update(row)
    .eq('id', id);
  if (error) throw error;
};

export const inviteUser = async (email: string, fullName: string, role: string): Promise<{ error: string | null }> => {
  // Usar Supabase Auth admin invite (requiere service role key en el backend)
  // Por ahora, creamos el perfil manualmente después del signup
  const { error } = await supabase.auth.signUp({
    email,
    password: crypto.randomUUID().slice(0, 12), // password temporal
    options: { data: { full_name: fullName } },
  });
  if (error) return { error: error.message };

  // El trigger handle_new_user crea el perfil automáticamente
  // Actualizamos el rol después
  const { data: profiles } = await supabase
    .from('profiles')
    .select('id')
    .eq('email', email)
    .single();

  if (profiles) {
    await supabase
      .from('profiles')
      .update({
        role,
        initials: fullName.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2),
        must_change_password: true,
      })
      .eq('id', profiles.id);
  }

  return { error: null };
};

// ── Mappers: DB row → TypeScript ──────────────────────────────────

const toMatter = (r: any): Matter => ({
  id:               r.id,
  title:            r.title,
  client:           r.client,
  type:             r.type,
  status:           r.status,
  health:           r.health,
  responsible:      r.responsible,
  nextAction:       r.next_action     ?? '',
  nextActionType:   r.next_action_type ?? undefined,
  nextActionDate:   r.next_action_date ?? '',
  priority:         r.priority,
  lastActivity:     r.last_activity,
  subtype:          r.subtype          ?? undefined,
  blockage:         r.blockage         ?? undefined,
  reasonForQueue:   r.reason_for_queue ?? undefined,
  expediente:       r.expediente       ?? undefined,
  description:      r.description      ?? undefined,
  flowTemplateId:   r.flow_template_id ?? undefined,
  currentStage:     r.current_stage    ?? undefined,
  caseData:         r.case_data        ?? undefined,
  jurisdiccion:     r.jurisdiccion     ?? undefined,
  tipoProceso:      r.tipo_proceso     ?? undefined,
  kind:             r.kind             ?? undefined,
  parentMatterId:   r.parent_matter_id ?? undefined,
  incidenteTipo:    r.incidente_tipo   ?? undefined,
  aspectosApelados: r.aspectos_apelados ?? undefined,
  apeladoPor:       r.apelado_por       ?? undefined,
});

const toClient = (r: any): Client => ({
  id:                r.id,
  name:              r.name,
  email:             r.email              ?? '',
  phone:             r.phone              ?? '',
  type:              r.type,
  lastActivity:      r.last_activity,
  notes:             r.notes              ?? undefined,
  activeMatters:     0,
  closedMatters:     0,
  // Campos extendidos — null en DB llega como undefined en el cliente.
  // Se usan para pre-poblar los campos del asunto (conyuge1_*, trabajador_*, etc.)
  // cuando el abogado selecciona un cliente existente en el wizard de crear asunto.
  dni:               r.dni               ?? undefined,
  domicilio:         r.domicilio         ?? undefined,
  fechaNacimiento:   r.fecha_nacimiento  ?? undefined,
  nacionalidad:      r.nacionalidad      ?? undefined,
  profesion:         r.profesion         ?? undefined,
  situacionLaboral:  r.situacion_laboral ?? undefined,
  empleador:         r.empleador         ?? undefined,
  ingresosEstimados: r.ingresos_estimados ?? undefined,
});

const toConsultation = (r: any): Consultation => ({
  id:                   r.id,
  name:                 r.name,
  status:               r.status,
  date:                 r.date,
  origin:               r.origin,
  nextStep:             r.next_step             ?? '',
  responsible:          r.responsible           ?? undefined,
  type:                 r.type                  ?? undefined,
  description:          r.description           ?? undefined,
  email:                r.email                 ?? undefined,
  phone:                r.phone                 ?? undefined,
  notes:                r.notes                 ?? undefined,
  consultationFeePaid:        r.consultation_fee_paid     ?? false,
  consultationFeeSnapshot:    r.consulta_fee_snapshot   != null ? parseFloat(r.consulta_fee_snapshot) : undefined,
  consultationFeeFormaPago:   r.consulta_fee_forma_pago  ?? undefined,
  scheduledAt:                r.scheduled_at             ?? undefined,
  diagnostico:                r.diagnostico              ?? undefined,
  solucionPropuesta:          r.solucion_propuesta       ?? undefined,
  atendidoPor:                r.atendido_por             ?? undefined,
  checklistData:              r.checklist_data           ?? undefined,
});

const toDocument = (r: any): LegalDocument => ({
  id:               r.id,
  matterId:         r.matter_id,
  matterTitle:      r.matter_title      ?? undefined,
  client:           r.client            ?? undefined,
  responsible:      r.responsible       ?? undefined,
  name:             r.name,
  status:           r.status,
  criticality:      r.criticality,
  blocksProgress:   r.blocks_progress,
  updatedAt:        r.updated_at        ?? '',
  associatedAction: r.associated_action ?? undefined,
  category:         r.category          ?? undefined,
  eventoId:         r.evento_id         ?? undefined,
});

const toTask = (r: any): Task => ({
  id:                       r.id,
  matterId:                 r.matter_id        ?? undefined,
  consultationId:           r.consultation_id  ?? undefined,
  title:                    r.title,
  dueDate:                  r.due_date ?? '',
  status:                   r.status,
  priority:                 r.priority,
  bloqueante:               r.bloqueante       ?? false,
  generadaAutomaticamente:  r.generada_automaticamente ?? false,
  triggerEstado:            r.trigger_estado    ?? undefined,
  completedAt:              r.completed_at      ?? undefined,
  completedBy:              r.completed_by      ?? undefined,
  etapa:                    r.etapa             ?? undefined,
  canceladaMotivo:          r.cancelada_motivo  ?? undefined,
  canceladaAt:              r.cancelada_at      ?? undefined,
});

const toTimeline = (r: any): TimelineEvent => ({
  id:          r.id,
  matterId:    r.matter_id,
  type:        r.type,
  title:       r.title,
  description: r.description ?? undefined,
  user:        r.user_name,   // user_name en DB → user en TypeScript
  date:        r.date,
});

// ── Mappers: TypeScript → DB row (para inserts / updates) ─────────

const matterToRow = (m: Partial<Matter>) => ({
  ...(m.title            !== undefined && { title:            m.title }),
  ...(m.client           !== undefined && { client:           m.client }),
  ...(m.type             !== undefined && { type:             m.type }),
  ...(m.status           !== undefined && { status:           m.status }),
  ...(m.health           !== undefined && { health:           m.health }),
  ...(m.responsible      !== undefined && { responsible:      m.responsible }),
  ...(m.nextAction       !== undefined && { next_action:      m.nextAction }),
  ...(m.nextActionType   !== undefined && { next_action_type: m.nextActionType }),
  ...(m.nextActionDate   !== undefined && { next_action_date: m.nextActionDate || null }),
  ...(m.priority         !== undefined && { priority:         m.priority }),
  ...(m.lastActivity     !== undefined && { last_activity:    m.lastActivity }),
  ...(m.subtype          !== undefined && { subtype:          m.subtype }),
  ...(m.blockage         !== undefined && { blockage:         m.blockage }),
  ...(m.reasonForQueue   !== undefined && { reason_for_queue: m.reasonForQueue }),
  ...(m.expediente       !== undefined && { expediente:       m.expediente }),
  ...(m.description      !== undefined && { description:      m.description }),
  ...(m.flowTemplateId   !== undefined && { flow_template_id: m.flowTemplateId }),
  ...(m.currentStage     !== undefined && { current_stage:    m.currentStage }),
  ...(m.caseData         !== undefined && { case_data:        m.caseData }),
  ...(m.jurisdiccion     !== undefined && { jurisdiccion:     m.jurisdiccion }),
  ...(m.tipoProceso      !== undefined && { tipo_proceso:     m.tipoProceso }),
  ...(m.kind             !== undefined && { kind:             m.kind }),
  ...(m.parentMatterId   !== undefined && { parent_matter_id: m.parentMatterId ?? null }),
  ...(m.incidenteTipo    !== undefined && { incidente_tipo:   m.incidenteTipo ?? null }),
  ...(m.aspectosApelados !== undefined && { aspectos_apelados: m.aspectosApelados ?? null }),
  ...(m.apeladoPor       !== undefined && { apelado_por:       m.apeladoPor       ?? null }),
});

const clientToRow = (c: Partial<Client>) => ({
  ...(c.name              !== undefined && { name:               c.name }),
  ...(c.email             !== undefined && { email:              c.email }),
  ...(c.phone             !== undefined && { phone:              c.phone }),
  ...(c.type              !== undefined && { type:               c.type }),
  ...(c.lastActivity      !== undefined && { last_activity:      c.lastActivity }),
  ...(c.notes             !== undefined && { notes:              c.notes }),
  // Campos extendidos — se guardan cuando existen (si la columna no existe
  // en DB, Supabase los ignora sin error gracias a su validación por schema).
  ...(c.dni               !== undefined && { dni:                c.dni }),
  ...(c.domicilio         !== undefined && { domicilio:          c.domicilio }),
  ...(c.fechaNacimiento   !== undefined && { fecha_nacimiento:   c.fechaNacimiento }),
  ...(c.nacionalidad      !== undefined && { nacionalidad:       c.nacionalidad }),
  ...(c.profesion         !== undefined && { profesion:          c.profesion }),
  ...(c.situacionLaboral  !== undefined && { situacion_laboral:  c.situacionLaboral }),
  ...(c.empleador         !== undefined && { empleador:          c.empleador }),
  ...(c.ingresosEstimados !== undefined && { ingresos_estimados: c.ingresosEstimados }),
});

const documentToRow = (d: Partial<LegalDocument>) => ({
  ...(d.matterId         !== undefined && { matter_id:         d.matterId }),
  ...(d.matterTitle      !== undefined && { matter_title:      d.matterTitle }),
  ...(d.client           !== undefined && { client:            d.client }),
  ...(d.responsible      !== undefined && { responsible:       d.responsible }),
  ...(d.name             !== undefined && { name:              d.name }),
  ...(d.status           !== undefined && { status:            d.status }),
  ...(d.criticality      !== undefined && { criticality:       d.criticality }),
  ...(d.blocksProgress   !== undefined && { blocks_progress:   d.blocksProgress }),
  ...(d.updatedAt        !== undefined && { updated_at:        d.updatedAt || null }),
  ...(d.associatedAction !== undefined && { associated_action: d.associatedAction }),
  ...(d.category         !== undefined && { category:          d.category }),
  ...(d.eventoId         !== undefined && { evento_id:         d.eventoId ?? null }),
});

// ── Fetches ───────────────────────────────────────────────────────

export const fetchMatters = async (): Promise<Matter[]> => {
  const { data, error } = await supabase
    .from('matters')
    .select('*, matter_assignments(profile_id, role)')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []).map(r => ({
    ...toMatter(r),
    assignedAttorneys: (r.matter_assignments || []).map((a: any) => a.profile_id),
  }));
};

export const fetchClients = async (): Promise<Client[]> => {
  const { data, error } = await supabase
    .from('clients')
    .select('*')
    .order('name');
  if (error) throw error;
  return (data ?? []).map(toClient);
};

export const updateConsultation = async (id: string, changes: Partial<Consultation>): Promise<void> => {
  const row: any = {};
  if (changes.status              !== undefined) row.status               = changes.status;
  if (changes.nextStep            !== undefined) row.next_step            = changes.nextStep;
  if (changes.responsible         !== undefined) row.responsible          = changes.responsible;
  if (changes.type                !== undefined) row.type                 = changes.type;
  if (changes.description         !== undefined) row.description          = changes.description;
  if (changes.email               !== undefined) row.email                = changes.email;
  if (changes.phone               !== undefined) row.phone                = changes.phone;
  if (changes.notes               !== undefined) row.notes                = changes.notes;
  if (changes.consultationFeePaid      !== undefined) row.consultation_fee_paid    = changes.consultationFeePaid;
  if (changes.consultationFeeSnapshot  !== undefined) row.consulta_fee_snapshot   = changes.consultationFeeSnapshot;
  if (changes.consultationFeeFormaPago !== undefined) row.consulta_fee_forma_pago  = changes.consultationFeeFormaPago;
  if (changes.scheduledAt             !== undefined) row.scheduled_at             = changes.scheduledAt ?? null;
  if (changes.diagnostico            !== undefined) row.diagnostico              = changes.diagnostico ?? null;
  if (changes.solucionPropuesta      !== undefined) row.solucion_propuesta       = changes.solucionPropuesta ?? null;
  if (changes.atendidoPor            !== undefined) row.atendido_por             = changes.atendidoPor ?? null;
  if (changes.checklistData          !== undefined) row.checklist_data            = changes.checklistData ?? null;
  const { error } = await supabase.from('consultations').update(row).eq('id', id);
  if (error) throw error;
};

export const createConsultation = async (c: Omit<Consultation, 'id'>): Promise<Consultation> => {
  const { data, error } = await supabase
    .from('consultations')
    .insert({
      name:                 c.name,
      status:               c.status,
      date:                 c.date,
      origin:               c.origin,
      next_step:            c.nextStep,
      responsible:          c.responsible ?? null,
      type:                 c.type ?? null,
      description:          c.description ?? null,
      email:                c.email ?? null,
      phone:                c.phone ?? null,
      notes:                c.notes ?? null,
      consultation_fee_paid:    c.consultationFeePaid     ?? false,
      consulta_fee_snapshot:    c.consultationFeeSnapshot ?? null,
      consulta_fee_forma_pago:  c.consultationFeeFormaPago ?? null,
      scheduled_at:             c.scheduledAt              ?? null,
      checklist_data:           c.checklistData            ?? null,
    })
    .select()
    .single();
  if (error) throw error;
  return toConsultation(data);
};

export const fetchConsultations = async (): Promise<Consultation[]> => {
  const { data, error } = await supabase
    .from('consultations')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []).map(toConsultation);
};

export const fetchDocuments = async (): Promise<LegalDocument[]> => {
  const { data, error } = await supabase
    .from('documents')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []).map(toDocument);
};

export const fetchTasks = async (): Promise<Task[]> => {
  const { data, error } = await supabase
    .from('tasks')
    .select('*')
    .order('due_date');
  if (error) throw error;
  return (data ?? []).map(toTask);
};

export const fetchTimeline = async (): Promise<TimelineEvent[]> => {
  const { data, error } = await supabase
    .from('timeline')
    .select('*')
    .order('date', { ascending: false });
  if (error) throw error;
  return (data ?? []).map(toTimeline);
};

// ── Matters ───────────────────────────────────────────────────────

export const createMatter = async (matter: Omit<Matter, 'id'>): Promise<Matter> => {
  const { data, error } = await supabase
    .from('matters')
    .insert(matterToRow(matter))
    .select()
    .single();
  if (error) throw error;
  return toMatter(data);
};

export const updateMatter = async (id: string, changes: Partial<Matter>): Promise<void> => {
  const { error } = await supabase
    .from('matters')
    .update(matterToRow(changes))
    .eq('id', id);
  if (error) throw error;
};

// ── Clients ───────────────────────────────────────────────────────

export const createClient_ = async (client: Omit<Client, 'id' | 'activeMatters' | 'closedMatters'>): Promise<Client> => {
  const { data, error } = await supabase
    .from('clients')
    .insert(clientToRow(client))
    .select()
    .single();
  if (error) throw error;
  return toClient(data);
};

export const updateClient_ = async (id: string, changes: Partial<Client>): Promise<void> => {
  const { error } = await supabase
    .from('clients')
    .update(clientToRow(changes))
    .eq('id', id);
  if (error) throw error;
};

// ── Documents ─────────────────────────────────────────────────────

export const createDocument = async (doc: Omit<LegalDocument, 'id'>): Promise<LegalDocument> => {
  const { data, error } = await supabase
    .from('documents')
    .insert(documentToRow(doc))
    .select()
    .single();
  if (error) throw error;
  return toDocument(data);
};

export const updateDocument = async (id: string, changes: Partial<LegalDocument>): Promise<void> => {
  const { error } = await supabase
    .from('documents')
    .update(documentToRow(changes))
    .eq('id', id);
  if (error) throw error;
};

// ── Timeline ──────────────────────────────────────────────────────

export const createTimelineEvent = async (event: Omit<TimelineEvent, 'id'>): Promise<TimelineEvent> => {
  const row = {
    matter_id:   event.matterId,
    type:        event.type,
    title:       event.title,
    description: event.description ?? null,
    user_name:   event.user,        // user en TypeScript → user_name en DB
    date:        event.date,
  };
  const { data, error } = await supabase
    .from('timeline')
    .insert(row)
    .select()
    .single();
  if (error) throw error;
  return toTimeline(data);
};

// ── Studio Config ─────────────────────────────────────────────────

const toStudioConfig = (r: any): StudioConfig => ({
  key:       r.key,
  value:     r.value,
  updatedAt: r.updated_at,
  updatedBy: r.updated_by ?? undefined,
});

export const fetchStudioConfig = async (key: string): Promise<StudioConfig | null> => {
  const firmId = await getCurrentFirmId();
  const { data, error } = await supabase
    .from('studio_config')
    .select('*')
    .eq('firm_id', firmId)
    .eq('key', key)
    .maybeSingle();
  if (error || !data) return null;
  return toStudioConfig(data);
};

export const upsertStudioConfig = async (key: string, value: Record<string, unknown>, updatedBy?: string): Promise<void> => {
  const firmId = await getCurrentFirmId();
  const { error } = await supabase
    .from('studio_config')
    .upsert(
      { firm_id: firmId, key, value, updated_at: new Date().toISOString(), updated_by: updatedBy ?? null },
      { onConflict: 'firm_id,key' },
    );
  if (error) throw error;
};

/** Devuelve el valor actual de la consulta en pesos (0 si no está configurado). */
export const fetchConsultaValor = async (): Promise<number> => {
  const cfg = await fetchStudioConfig('consulta_valor');
  return cfg ? ((cfg.value as any).pesos ?? 0) : 0;
};

// ── Presupuestos ──────────────────────────────────────────────────

const toPresupuestoItem = (r: any): PresupuestoItem => {
  const monto    = parseFloat(r.monto_pesos ?? 0);
  const fiscal   = parseFloat(r.fiscal_porcentaje ?? 0);
  const descuento= parseFloat(r.descuento_item_porcentaje ?? 0);
  const subtotal = monto * (1 - fiscal / 100) * (1 - descuento / 100);
  return {
    id:                       r.id,
    presupuestoId:            r.presupuesto_id,
    concepto:                 r.concepto,
    tipo:                     r.tipo,
    cantidadIus:              r.cantidad_ius != null ? parseFloat(r.cantidad_ius) : undefined,
    montoPesos:               monto,
    fiscalPorcentaje:         fiscal,
    descuentoItemPorcentaje:  descuento,
    subtotalPesos:            subtotal,
    obligatorio:              r.obligatorio,
    orden:                    r.orden,
  };
};

const toPresupuesto = (r: any, items: PresupuestoItem[] = []): Presupuesto => ({
  id:                  r.id,
  consultationId:      r.consultation_id    ?? undefined,
  matterId:            r.matter_id          ?? undefined,
  clientName:          r.client_name,
  status:              r.status,
  unidad:              r.unidad             ?? 'JUS',
  iusValorSnapshot:    parseFloat(r.ius_valor_snapshot),
  subtotalIus:         parseFloat(r.subtotal_ius),
  subtotalPesos:       parseFloat(r.subtotal_pesos),
  descuentoPorcentaje: parseFloat(r.descuento_porcentaje ?? 0),
  paymentStatus:       r.payment_status,
  notes:               r.notes              ?? undefined,
  numero:              r.numero             ?? undefined,
  cuotaOpciones:       r.cuota_opciones     ?? undefined,
  approvedAt:          r.approved_at        ?? undefined,
  approvedBy:          r.approved_by        ?? undefined,
  createdBy:           r.created_by         ?? undefined,
  items,
  createdAt:           r.created_at,
  updatedAt:           r.updated_at,
});

export const fetchPresupuestoByConsultation = async (consultationId: string): Promise<Presupuesto | null> => {
  const { data, error } = await supabase
    .from('presupuestos')
    .select('*')
    .eq('consultation_id', consultationId)
    .order('created_at', { ascending: false })
    .limit(1)
    .single();
  if (error) return null;
  const { data: itemsData } = await supabase
    .from('presupuesto_items')
    .select('*')
    .eq('presupuesto_id', data.id)
    .order('orden');
  return toPresupuesto(data, (itemsData ?? []).map(toPresupuestoItem));
};

export const fetchPresupuesto = async (id: string): Promise<Presupuesto | null> => {
  const { data, error } = await supabase
    .from('presupuestos')
    .select('*')
    .eq('id', id)
    .single();
  if (error) return null;
  const { data: itemsData } = await supabase
    .from('presupuesto_items')
    .select('*')
    .eq('presupuesto_id', id)
    .order('orden');
  return toPresupuesto(data, (itemsData ?? []).map(toPresupuestoItem));
};

export const createPresupuesto = async (p: Omit<Presupuesto, 'id' | 'items' | 'createdAt' | 'updatedAt'>): Promise<Presupuesto> => {
  const now = new Date().toISOString();
  // Generate correlative number PRE-XXX
  const { count } = await supabase.from('presupuestos').select('*', { count: 'exact', head: true });
  const numero = `PRE-${String((count ?? 0) + 1).padStart(3, '0')}`;
  const { data, error } = await supabase
    .from('presupuestos')
    .insert({
      consultation_id:     p.consultationId     ?? null,
      matter_id:           p.matterId           ?? null,
      client_name:         p.clientName,
      status:              p.status,
      unidad:              p.unidad             ?? 'JUS',
      ius_valor_snapshot:  p.iusValorSnapshot,
      subtotal_ius:        p.subtotalIus,
      subtotal_pesos:      p.subtotalPesos,
      descuento_porcentaje: p.descuentoPorcentaje ?? 0,
      payment_status:      p.paymentStatus,
      notes:               p.notes              ?? null,
      cuota_opciones:      p.cuotaOpciones      ?? null,
      numero,
      created_by:          p.createdBy          ?? null,
      created_at:          now,
      updated_at:          now,
    })
    .select()
    .single();
  if (error) throw error;
  return toPresupuesto(data, []);
};

export const updatePresupuesto = async (id: string, changes: Partial<Omit<Presupuesto, 'id' | 'items'>>): Promise<void> => {
  const row: any = { updated_at: new Date().toISOString() };
  if (changes.status              !== undefined) row.status               = changes.status;
  if (changes.paymentStatus       !== undefined) row.payment_status       = changes.paymentStatus;
  if (changes.subtotalIus         !== undefined) row.subtotal_ius         = changes.subtotalIus;
  if (changes.subtotalPesos       !== undefined) row.subtotal_pesos       = changes.subtotalPesos;
  if (changes.iusValorSnapshot    !== undefined) row.ius_valor_snapshot   = changes.iusValorSnapshot;
  if (changes.descuentoPorcentaje !== undefined) row.descuento_porcentaje = changes.descuentoPorcentaje;
  if (changes.unidad              !== undefined) row.unidad               = changes.unidad;
  if (changes.notes               !== undefined) row.notes                = changes.notes;
  if (changes.cuotaOpciones       !== undefined) row.cuota_opciones       = changes.cuotaOpciones;
  if (changes.matterId            !== undefined) row.matter_id            = changes.matterId;
  if (changes.approvedAt          !== undefined) row.approved_at          = changes.approvedAt;
  if (changes.approvedBy          !== undefined) row.approved_by          = changes.approvedBy;
  const { error } = await supabase.from('presupuestos').update(row).eq('id', id);
  if (error) throw error;
};

export const createPresupuestoItem = async (item: Omit<PresupuestoItem, 'id' | 'subtotalPesos'>): Promise<PresupuestoItem> => {
  const { data, error } = await supabase
    .from('presupuesto_items')
    .insert({
      presupuesto_id:             item.presupuestoId,
      concepto:                   item.concepto,
      tipo:                       item.tipo,
      cantidad_ius:               item.cantidadIus               ?? null,
      monto_pesos:                item.montoPesos,
      fiscal_porcentaje:          item.fiscalPorcentaje          ?? 0,
      descuento_item_porcentaje:  item.descuentoItemPorcentaje   ?? 0,
      obligatorio:                item.obligatorio,
      orden:                      item.orden,
    })
    .select()
    .single();
  if (error) throw error;
  return toPresupuestoItem(data);
};

export const updatePresupuestoItem = async (id: string, changes: Partial<PresupuestoItem>): Promise<void> => {
  const row: any = {};
  if (changes.concepto                !== undefined) row.concepto                    = changes.concepto;
  if (changes.tipo                    !== undefined) row.tipo                        = changes.tipo;
  if (changes.cantidadIus             !== undefined) row.cantidad_ius                = changes.cantidadIus;
  if (changes.montoPesos              !== undefined) row.monto_pesos                 = changes.montoPesos;
  if (changes.fiscalPorcentaje        !== undefined) row.fiscal_porcentaje           = changes.fiscalPorcentaje;
  if (changes.descuentoItemPorcentaje !== undefined) row.descuento_item_porcentaje   = changes.descuentoItemPorcentaje;
  if (changes.obligatorio             !== undefined) row.obligatorio                 = changes.obligatorio;
  if (changes.orden                   !== undefined) row.orden                       = changes.orden;
  const { error } = await supabase.from('presupuesto_items').update(row).eq('id', id);
  if (error) throw error;
};

export const deletePresupuestoItem = async (id: string): Promise<void> => {
  const { error } = await supabase.from('presupuesto_items').delete().eq('id', id);
  if (error) throw error;
};

/** Reemplaza todos los ítems del presupuesto y recalcula los totales */
export const savePresupuestoItems = async (
  presupuestoId: string,
  items: Omit<PresupuestoItem, 'id' | 'presupuestoId' | 'subtotalPesos'>[],
): Promise<void> => {
  // Delete existing items
  await supabase.from('presupuesto_items').delete().eq('presupuesto_id', presupuestoId);

  if (items.length === 0) return;

  const rows = items.map((item, i) => ({
    presupuesto_id:            presupuestoId,
    concepto:                  item.concepto,
    tipo:                      item.tipo,
    cantidad_ius:              item.cantidadIus              ?? null,
    monto_pesos:               item.montoPesos,
    fiscal_porcentaje:         item.fiscalPorcentaje         ?? 0,
    descuento_item_porcentaje: item.descuentoItemPorcentaje  ?? 0,
    obligatorio:               item.obligatorio,
    orden:                     i,
  }));

  const { error } = await supabase.from('presupuesto_items').insert(rows);
  if (error) throw error;

  // Recalculate totals
  const subtotalPesos = items.reduce((acc, item) => {
    const subtotal = item.montoPesos * (1 - (item.fiscalPorcentaje ?? 0) / 100) * (1 - (item.descuentoItemPorcentaje ?? 0) / 100);
    return acc + subtotal;
  }, 0);
  const subtotalIus = items.reduce((acc, item) => acc + (item.cantidadIus ?? 0), 0);

  await supabase
    .from('presupuestos')
    .update({ subtotal_pesos: subtotalPesos, subtotal_ius: subtotalIus, updated_at: new Date().toISOString() })
    .eq('id', presupuestoId);
};

// ── Estudio Perfil ────────────────────────────────────────────────

const toEstudioPerfil = (r: any): EstudioPerfil => ({
  id:             r.id,
  nombre:         r.nombre ?? '',
  cuit:           r.cuit          ?? undefined,
  email:          r.email         ?? undefined,
  telefono:       r.telefono      ?? undefined,
  direccion:      r.direccion     ?? undefined,
  logoUrl:        r.logo_url      ?? undefined,
  cbu:            r.cbu           ?? undefined,
  aliasCbu:       r.alias_cbu     ?? undefined,
  banco:          r.banco         ?? undefined,
  titularCuenta:  r.titular_cuenta ?? undefined,
  firmaUrl:       r.firma_url     ?? undefined,
  footerText:     r.footer_text   ?? undefined,
  updatedAt:      r.updated_at,
});

// Storage helpers — bucket privado, signed URLs con TTL.
// La columna estudio_perfil.logo_url guarda el PATH (ej "00000000-.../logo/123.png").
// Al fetch, firmamos el path. Al guardar, si vino un signed URL, extraemos el path.

const SIGNED_URL_TTL_SECONDS = 8 * 60 * 60; // 8 horas — cubre una sesión de trabajo

const signAssetPath = async (pathOrUrl: string | undefined | null): Promise<string | undefined> => {
  if (!pathOrUrl) return undefined;
  // Si por alguna razón quedó una URL https legacy sin migrar, devolverla tal cual.
  // Después del SQL 039 esto no pasa, pero sirve de fallback.
  if (/^https?:\/\//.test(pathOrUrl)) return pathOrUrl;
  const { data, error } = await supabase.storage
    .from('estudio-assets')
    .createSignedUrl(pathOrUrl, SIGNED_URL_TTL_SECONDS);
  if (error) {
    console.error('signAssetPath error:', error);
    return undefined;
  }
  return data.signedUrl;
};

/** Convierte una URL (pública o signed) a path puro. Si ya es path, lo devuelve igual. */
const urlOrPathToPath = (urlOrPath: string | null | undefined): string | null => {
  if (!urlOrPath) return null;
  if (!/^https?:\/\//.test(urlOrPath)) return urlOrPath;
  const m = urlOrPath.match(/\/(public|sign)\/estudio-assets\/([^?]+)/);
  return m ? m[2] : null;
};

export const fetchEstudioPerfil = async (): Promise<EstudioPerfil> => {
  const firmId = await getCurrentFirmId();
  const { data } = await supabase
    .from('estudio_perfil')
    .select('*')
    .eq('firm_id', firmId)
    .maybeSingle();
  if (!data) return { nombre: 'Mi Estudio Jurídico' };
  const perfil = toEstudioPerfil(data);
  perfil.logoUrl  = await signAssetPath(perfil.logoUrl);
  perfil.firmaUrl = await signAssetPath(perfil.firmaUrl);
  return perfil;
};

export const upsertEstudioPerfil = async (perfil: Partial<EstudioPerfil>): Promise<void> => {
  const firmId = await getCurrentFirmId();
  const row: any = { firm_id: firmId, updated_at: new Date().toISOString() };
  if (perfil.nombre         !== undefined) row.nombre          = perfil.nombre;
  if (perfil.cuit           !== undefined) row.cuit            = perfil.cuit;
  if (perfil.email          !== undefined) row.email           = perfil.email;
  if (perfil.telefono       !== undefined) row.telefono        = perfil.telefono;
  if (perfil.direccion      !== undefined) row.direccion       = perfil.direccion;
  if (perfil.logoUrl        !== undefined) row.logo_url        = urlOrPathToPath(perfil.logoUrl);
  if (perfil.cbu            !== undefined) row.cbu             = perfil.cbu;
  if (perfil.aliasCbu       !== undefined) row.alias_cbu       = perfil.aliasCbu;
  if (perfil.banco          !== undefined) row.banco           = perfil.banco;
  if (perfil.titularCuenta  !== undefined) row.titular_cuenta  = perfil.titularCuenta;
  if (perfil.firmaUrl       !== undefined) row.firma_url       = urlOrPathToPath(perfil.firmaUrl);
  if (perfil.footerText     !== undefined) row.footer_text     = perfil.footerText;

  // UNIQUE(firm_id) en estudio_perfil → upsert directo, sin lookup previo.
  const { error } = await supabase
    .from('estudio_perfil')
    .upsert(row, { onConflict: 'firm_id' });
  if (error) throw error;
};

/** Sube logo/firma al bucket privado y devuelve un signed URL para preview.
 *  El path queda prefijado por firm_id. Al persistir vía upsertEstudioPerfil,
 *  el signed URL se convierte de vuelta al path puro. */
export const uploadEstudioAsset = async (file: File, path: 'logo' | 'firma'): Promise<string> => {
  const { data: firmId, error: firmErr } = await supabase.rpc('current_firm_id');
  if (firmErr || !firmId) throw new Error('No se pudo determinar el firm para el upload.');

  const ext = file.name.split('.').pop();
  const filePath = `${firmId}/${path}/${Date.now()}.${ext}`;
  const { error } = await supabase.storage.from('estudio-assets').upload(filePath, file, { upsert: true });
  if (error) throw error;

  const { data, error: signErr } = await supabase.storage
    .from('estudio-assets')
    .createSignedUrl(filePath, SIGNED_URL_TTL_SECONDS);
  if (signErr || !data) throw signErr ?? new Error('No se pudo firmar el URL del asset');
  return data.signedUrl;
};

// ── Expedientes ───────────────────────────────────────────────────

const toEstadoLog = (r: any): ExpedienteEstadoLog => ({
  id:            r.id,
  expedienteId:  r.expediente_id,
  estadoTroncal: r.estado_troncal,
  subestado:     r.subestado      ?? undefined,
  fechaDesde:    r.fecha_desde,
  fechaHasta:    r.fecha_hasta    ?? undefined,
  observaciones: r.observaciones  ?? undefined,
  registradoPor: r.registrado_por ?? undefined,
});

const toExpediente = (r: any, log: ExpedienteEstadoLog[] = []): Expediente => ({
  id:             r.id,
  matterId:       r.matter_id,
  nroReceptoria:  r.nro_receptoria ?? undefined,
  nroJuzgado:     r.nro_juzgado    ?? undefined,
  caratula:       r.caratula,
  fuero:          r.fuero,
  juzgado:        r.juzgado        ?? undefined,
  estadoTroncal:  r.estado_troncal,
  subestado:      r.subestado      ?? undefined,
  estadoDesde:    r.estado_desde,
  mevPresentado:  r.mev_presentado,
  mevFecha:       r.mev_fecha      ?? undefined,
  mevToken:       r.mev_token      ?? undefined,
  notas:          r.notas          ?? undefined,
  createdAt:      r.created_at,
  updatedAt:      r.updated_at,
  estadosLog:     log,
});

export const fetchAllExpedientes = async (): Promise<Expediente[]> => {
  const { data, error } = await supabase
    .from('expedientes')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []).map(r => toExpediente(r, []));
};

export const fetchExpediente = async (matterId: string): Promise<Expediente | null> => {
  const { data, error } = await supabase
    .from('expedientes')
    .select('*')
    .eq('matter_id', matterId)
    .single();
  if (error) return null;
  const { data: logData } = await supabase
    .from('expediente_estados_log')
    .select('*')
    .eq('expediente_id', data.id)
    .order('fecha_desde', { ascending: false });
  return toExpediente(data, (logData ?? []).map(toEstadoLog));
};

export const fetchExpedienteEstadosLog = async (expedienteId: string): Promise<ExpedienteEstadoLog[]> => {
  const { data, error } = await supabase
    .from('expediente_estados_log')
    .select('*')
    .eq('expediente_id', expedienteId)
    .order('fecha_desde', { ascending: false });
  if (error) throw error;
  return (data ?? []).map(toEstadoLog);
};

export const createExpediente = async (e: Omit<Expediente, 'id' | 'estadosLog' | 'createdAt' | 'updatedAt'>): Promise<Expediente> => {
  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from('expedientes')
    .insert({
      matter_id:      e.matterId,
      nro_receptoria: e.nroReceptoria ?? null,
      nro_juzgado:    e.nroJuzgado    ?? null,
      caratula:       e.caratula,
      fuero:          e.fuero,
      juzgado:        e.juzgado       ?? null,
      estado_troncal: e.estadoTroncal,
      subestado:      e.subestado     ?? null,
      estado_desde:   e.estadoDesde   ?? now,
      mev_presentado: e.mevPresentado,
      mev_fecha:      e.mevFecha      ?? null,
      mev_token:      e.mevToken      ?? null,
      created_at:     now,
      updated_at:     now,
    })
    .select()
    .single();
  if (error) throw error;
  // Crear primer registro en el log
  await supabase.from('expediente_estados_log').insert({
    expediente_id:  data.id,
    estado_troncal: e.estadoTroncal,
    subestado:      e.subestado ?? null,
    fecha_desde:    e.estadoDesde ?? now,
    registrado_por: null,
  });
  return toExpediente(data, []);
};

export const updateExpediente = async (id: string, changes: Partial<Omit<Expediente, 'estadosLog'>>): Promise<void> => {
  const row: any = { updated_at: new Date().toISOString() };
  if (changes.nroReceptoria !== undefined) row.nro_receptoria = changes.nroReceptoria;
  if (changes.nroJuzgado    !== undefined) row.nro_juzgado    = changes.nroJuzgado;
  if (changes.caratula      !== undefined) row.caratula       = changes.caratula;
  if (changes.fuero         !== undefined) row.fuero          = changes.fuero;
  if (changes.juzgado       !== undefined) row.juzgado        = changes.juzgado;
  if (changes.mevPresentado !== undefined) row.mev_presentado = changes.mevPresentado;
  if (changes.mevFecha      !== undefined) row.mev_fecha      = changes.mevFecha;
  if (changes.mevToken      !== undefined) row.mev_token      = changes.mevToken;
  const { error } = await supabase.from('expedientes').update(row).eq('id', id);
  if (error) throw error;
};

export const cambiarEstadoExpediente = async (
  expedienteId: string,
  nuevoEstado: EstadoTroncal,
  subestado?: string,
  observaciones?: string,
  registradoPor?: string,
): Promise<void> => {
  const now = new Date().toISOString();
  // Cerrar el estado anterior en el log
  await supabase
    .from('expediente_estados_log')
    .update({ fecha_hasta: now })
    .eq('expediente_id', expedienteId)
    .is('fecha_hasta', null);
  // Actualizar el expediente
  const { error } = await supabase
    .from('expedientes')
    .update({
      estado_troncal: nuevoEstado,
      subestado:      subestado ?? null,
      estado_desde:   now,
      updated_at:     now,
    })
    .eq('id', expedienteId);
  if (error) throw error;
  // Crear nuevo registro en el log
  await supabase.from('expediente_estados_log').insert({
    expediente_id:  expedienteId,
    estado_troncal: nuevoEstado,
    subestado:      subestado      ?? null,
    fecha_desde:    now,
    observaciones:  observaciones  ?? null,
    registrado_por: registradoPor  ?? null,
  });
};

// ── Recibos ───────────────────────────────────────────────────────

const toRecibo = (r: any): Recibo => ({
  id:             r.id,
  presupuestoId:  r.presupuesto_id,
  clientName:     r.client_name,
  montoPesos:     parseFloat(r.monto_pesos),
  formaPago:      r.forma_pago,
  concepto:       r.concepto,
  notas:          r.notas          ?? undefined,
  numero:         r.numero         ?? undefined,
  status:         r.status,
  cuotaNumero:    r.cuota_numero   ?? undefined,
  createdAt:      r.created_at,
  updatedAt:      r.updated_at,
});

export const fetchRecibosByPresupuesto = async (presupuestoId: string): Promise<Recibo[]> => {
  const { data } = await supabase
    .from('recibos')
    .select('*')
    .eq('presupuesto_id', presupuestoId)
    .order('created_at', { ascending: false });
  return (data ?? []).map(toRecibo);
};

export const createRecibo = async (
  r: Omit<Recibo, 'id' | 'numero' | 'createdAt' | 'updatedAt'>,
): Promise<Recibo> => {
  const now = new Date().toISOString();
  const { count } = await supabase.from('recibos').select('*', { count: 'exact', head: true });
  const numero = `REC-${String((count ?? 0) + 1).padStart(3, '0')}`;
  const { data, error } = await supabase
    .from('recibos')
    .insert({
      presupuesto_id: r.presupuestoId,
      client_name:    r.clientName,
      monto_pesos:    r.montoPesos,
      forma_pago:     r.formaPago,
      concepto:       r.concepto,
      notas:          r.notas         ?? null,
      status:         r.status,
      cuota_numero:   r.cuotaNumero   ?? null,
      numero,
      created_at:     now,
      updated_at:     now,
    })
    .select()
    .single();
  if (error) throw error;
  return toRecibo(data);
};

export const updateRecibo = async (id: string, changes: Partial<Pick<Recibo, 'status' | 'notas'>>): Promise<void> => {
  const row: any = { updated_at: new Date().toISOString() };
  if (changes.status !== undefined) row.status = changes.status;
  if (changes.notas  !== undefined) row.notas  = changes.notas;
  const { error } = await supabase.from('recibos').update(row).eq('id', id);
  if (error) throw error;
};

// ── Tasks (extended) ─────────────────────────────────────────

export const createTask = async (task: Omit<Task, 'id'>): Promise<Task> => {
  const { data, error } = await supabase
    .from('tasks')
    .insert({
      matter_id:                task.matterId           ?? null,
      consultation_id:          task.consultationId     ?? null,
      title:                    task.title,
      due_date:                 task.dueDate            || null,
      status:                   task.status,
      priority:                 task.priority,
      bloqueante:               task.bloqueante         ?? false,
      generada_automaticamente: task.generadaAutomaticamente ?? false,
      trigger_estado:           task.triggerEstado       ?? null,
      etapa:                    task.etapa               ?? null,
      completed_at:             task.completedAt         ?? null,
      completed_by:             task.completedBy         ?? null,
    })
    .select()
    .single();
  if (error) throw error;
  return toTask(data);
};

export const updateTask = async (id: string, changes: Partial<Task>): Promise<void> => {
  const row: any = {};
  if (changes.status            !== undefined) row.status            = changes.status;
  if (changes.title             !== undefined) row.title             = changes.title;
  if (changes.dueDate           !== undefined) row.due_date          = changes.dueDate || null;
  if (changes.priority          !== undefined) row.priority          = changes.priority;
  if (changes.completedAt       !== undefined) row.completed_at      = changes.completedAt;
  if (changes.completedBy       !== undefined) row.completed_by      = changes.completedBy;
  if (changes.canceladaMotivo   !== undefined) row.cancelada_motivo  = changes.canceladaMotivo ?? null;
  if (changes.canceladaAt       !== undefined) row.cancelada_at      = changes.canceladaAt     ?? null;
  const { error } = await supabase.from('tasks').update(row).eq('id', id);
  if (error) throw error;
};

export const fetchTasksByConsultation = async (consultationId: string): Promise<Task[]> => {
  const { data, error } = await supabase
    .from('tasks')
    .select('*')
    .eq('consultation_id', consultationId)
    .order('due_date');
  if (error) throw error;
  return (data ?? []).map(toTask);
};

// ── Onboarding Items ─────────────────────────────────────────

const toOnboardingItem = (r: any): OnboardingItem => ({
  id:            r.id,
  consultationId: r.consultation_id,
  label:         r.label,
  completed:     r.completed,
  completedAt:   r.completed_at   ?? undefined,
  completedBy:   r.completed_by   ?? undefined,
  orden:         r.orden,
});

export const fetchOnboardingItems = async (consultationId: string): Promise<OnboardingItem[]> => {
  const { data, error } = await supabase
    .from('onboarding_items')
    .select('*')
    .eq('consultation_id', consultationId)
    .order('orden');
  if (error) throw error;
  return (data ?? []).map(toOnboardingItem);
};

export const createOnboardingItems = async (consultationId: string, labels: string[]): Promise<OnboardingItem[]> => {
  const rows = labels.map((label, i) => ({
    consultation_id: consultationId,
    label,
    completed: false,
    orden: i,
  }));
  const { data, error } = await supabase.from('onboarding_items').insert(rows).select();
  if (error) throw error;
  return (data ?? []).map(toOnboardingItem);
};

export const updateOnboardingItem = async (id: string, completed: boolean, completedBy?: string): Promise<void> => {
  const row: any = { completed };
  if (completed) {
    row.completed_at = new Date().toISOString();
    row.completed_by = completedBy ?? null;
  } else {
    row.completed_at = null;
    row.completed_by = null;
  }
  const { error } = await supabase.from('onboarding_items').update(row).eq('id', id);
  if (error) throw error;
};

// ── Communications ───────────────────────────────────────────

const toCommunication = (r: any): Communication => ({
  id:                 r.id,
  matterId:           r.matter_id        ?? undefined,
  clientId:           r.client_id        ?? undefined,
  consultationId:     r.consultation_id  ?? undefined,
  canal:              r.canal,
  contenido:          r.contenido,
  enviadoPor:         r.enviado_por,
  visibleParaCliente: r.visible_para_cliente ?? false,
  createdAt:          r.created_at,
});

export const fetchCommunications = async (matterId: string): Promise<Communication[]> => {
  const { data, error } = await supabase
    .from('communications')
    .select('*')
    .eq('matter_id', matterId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []).map(toCommunication);
};

export const fetchAllCommunications = async (): Promise<Communication[]> => {
  const { data, error } = await supabase
    .from('communications')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []).map(toCommunication);
};

export const createCommunication = async (c: Omit<Communication, 'id' | 'createdAt'>): Promise<Communication> => {
  const { data, error } = await supabase
    .from('communications')
    .insert({
      matter_id:            c.matterId          ?? null,
      client_id:            c.clientId          ?? null,
      consultation_id:      c.consultationId    ?? null,
      canal:                c.canal,
      contenido:            c.contenido,
      enviado_por:          c.enviadoPor,
      visible_para_cliente: c.visibleParaCliente ?? false,
    })
    .select()
    .single();
  if (error) throw error;
  return toCommunication(data);
};

// ── Recibos by client ────────────────────────────────────────

export const fetchRecibosByClient = async (clientName: string): Promise<Recibo[]> => {
  const { data } = await supabase
    .from('recibos')
    .select('*')
    .eq('client_name', clientName)
    .order('created_at', { ascending: false });
  return (data ?? []).map(toRecibo);
};

export const fetchPresupuestosByClient = async (clientName: string): Promise<Presupuesto[]> => {
  const { data } = await supabase
    .from('presupuestos')
    .select('*')
    .eq('client_name', clientName)
    .order('created_at', { ascending: false });
  return (data ?? []).map(r => toPresupuesto(r, []));
};

// ── Matter Milestones ────────────────────────────────────────

const toMilestone = (r: any): MatterMilestone => ({
  id:          r.id,
  matterId:    r.matter_id,
  label:       r.label,
  etapa:       r.etapa       ?? undefined,
  orden:       r.orden       ?? 0,
  status:      r.status,
  targetDate:  r.target_date ?? undefined,
  completedAt: r.completed_at ?? undefined,
  completedBy: r.completed_by ?? undefined,
});

export const fetchMilestones = async (matterId: string): Promise<MatterMilestone[]> => {
  const { data, error } = await supabase
    .from('matter_milestones')
    .select('*')
    .eq('matter_id', matterId)
    .order('orden');
  if (error) throw error;
  return (data ?? []).map(toMilestone);
};

export const fetchAllMilestones = async (): Promise<MatterMilestone[]> => {
  const { data, error } = await supabase
    .from('matter_milestones')
    .select('*')
    .order('orden');
  if (error) throw error;
  return (data ?? []).map(toMilestone);
};

export const createMilestone = async (m: Omit<MatterMilestone, 'id'>): Promise<MatterMilestone> => {
  const { data, error } = await supabase
    .from('matter_milestones')
    .insert({
      matter_id:    m.matterId,
      label:        m.label,
      etapa:        m.etapa       ?? null,
      orden:        m.orden       ?? 0,
      status:       m.status      ?? 'Pendiente',
      target_date:  m.targetDate  ?? null,
    })
    .select()
    .single();
  if (error) throw error;
  return toMilestone(data);
};

export const updateMilestone = async (id: string, changes: Partial<MatterMilestone>): Promise<void> => {
  const row: any = {};
  if (changes.status      !== undefined) row.status       = changes.status;
  if (changes.targetDate  !== undefined) row.target_date  = changes.targetDate || null;
  if (changes.completedAt !== undefined) row.completed_at = changes.completedAt;
  if (changes.completedBy !== undefined) row.completed_by = changes.completedBy;
  if (changes.label       !== undefined) row.label        = changes.label;
  if (changes.orden       !== undefined) row.orden        = changes.orden;
  const { error } = await supabase.from('matter_milestones').update(row).eq('id', id);
  if (error) throw error;
};

// ── MÓDULO LABORAL ───────────────────────────────────────────────

// ── Version Normativa ────────────────────────────────────────────

const toVersionNormativa = (r: any): VersionNormativa => ({
  id:            r.id,
  articulo:      r.articulo,
  ley:           r.ley,
  descripcion:   r.descripcion    ?? undefined,
  estado:        r.estado,
  vigenteDesde:  r.vigente_desde  ?? undefined,
  vigenteHasta:  r.vigente_hasta  ?? undefined,
  jurisdiccion:  r.jurisdiccion,
  fuente:        r.fuente         ?? undefined,
  afectaModulo:  r.afecta_modulo,
  createdAt:     r.created_at,
  updatedAt:     r.updated_at,
});

export const fetchVersionesNormativas = async (modulo?: string): Promise<VersionNormativa[]> => {
  let q = supabase.from('version_normativa').select('*').order('ley').order('articulo');
  if (modulo) q = q.or(`afecta_modulo.eq.${modulo},afecta_modulo.eq.TODOS`);
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []).map(toVersionNormativa);
};

export const fetchVersionesSuspendidas = async (): Promise<VersionNormativa[]> => {
  const { data, error } = await supabase
    .from('version_normativa')
    .select('*')
    .eq('estado', 'SUSPENDIDA_CAUTELAR')
    .order('articulo');
  if (error) throw error;
  return (data ?? []).map(toVersionNormativa);
};

export const updateVersionNormativa = async (id: string, changes: Partial<VersionNormativa>): Promise<void> => {
  const row: any = {};
  if (changes.estado        !== undefined) row.estado         = changes.estado;
  if (changes.vigenteHasta  !== undefined) row.vigente_hasta  = changes.vigenteHasta || null;
  if (changes.fuente        !== undefined) row.fuente         = changes.fuente;
  if (changes.descripcion   !== undefined) row.descripcion    = changes.descripcion;
  row.updated_at = new Date().toISOString();
  const { error } = await supabase.from('version_normativa').update(row).eq('id', id);
  if (error) throw error;
};

// ── Caso Laboral ─────────────────────────────────────────────────

const toCasoLaboral = (r: any): CasoLaboral => ({
  id:              r.id,
  clientId:        r.client_id,
  matterId:        r.matter_id,
  jurisdiccion:    r.jurisdiccion,
  tipoCaso:        r.tipo_caso,
  modulosActivos:  r.modulos_activos ?? [],
  estado:          r.estado,
  createdAt:       r.created_at,
  updatedAt:       r.updated_at,
});

const casoLaboralToRow = (m: Partial<CasoLaboral>) => ({
  ...(m.clientId        !== undefined && { client_id:        m.clientId }),
  ...(m.matterId        !== undefined && { matter_id:        m.matterId }),
  ...(m.jurisdiccion    !== undefined && { jurisdiccion:     m.jurisdiccion }),
  ...(m.tipoCaso        !== undefined && { tipo_caso:        m.tipoCaso }),
  ...(m.modulosActivos  !== undefined && { modulos_activos:  m.modulosActivos }),
  ...(m.estado          !== undefined && { estado:           m.estado }),
});

export const fetchCasoLaboral = async (matterId: string): Promise<CasoLaboral | null> => {
  const { data, error } = await supabase
    .from('casos_laborales')
    .select('*')
    .eq('matter_id', matterId)
    .maybeSingle();
  if (error) throw error;
  return data ? toCasoLaboral(data) : null;
};

export const createCasoLaboral = async (c: Omit<CasoLaboral, 'id' | 'createdAt' | 'updatedAt'>): Promise<CasoLaboral> => {
  const { data, error } = await supabase
    .from('casos_laborales')
    .insert(casoLaboralToRow(c))
    .select()
    .single();
  if (error) throw error;
  return toCasoLaboral(data);
};

export const updateCasoLaboral = async (id: string, changes: Partial<CasoLaboral>): Promise<void> => {
  const row = { ...casoLaboralToRow(changes), updated_at: new Date().toISOString() };
  const { error } = await supabase.from('casos_laborales').update(row).eq('id', id);
  if (error) throw error;
};

// ── Encuadre Laboral ─────────────────────────────────────────────

const toEncuadreLaboral = (r: any): EncuadreLaboral => ({
  id:                        r.id,
  casoId:                    r.caso_id,
  clasificacionDependencia:  r.clasificacion_dependencia,
  hayTercerizacion:          r.hay_tercerizacion   ?? false,
  hayGrupoEconomico:         r.hay_grupo_economico ?? false,
  hayPlataforma:             r.hay_plataforma      ?? false,
  cctAplicable:              r.cct_aplicable       ?? undefined,
  teoriaDelCaso:             r.teoria_del_caso     ?? undefined,
  datosDeEncuadre:           r.datos_de_encuadre   ?? {},
  createdAt:                 r.created_at,
  updatedAt:                 r.updated_at,
});

export const fetchEncuadreLaboral = async (casoId: string): Promise<EncuadreLaboral | null> => {
  const { data, error } = await supabase
    .from('encuadres_laborales')
    .select('*')
    .eq('caso_id', casoId)
    .maybeSingle();
  if (error) throw error;
  return data ? toEncuadreLaboral(data) : null;
};

export const createEncuadreLaboral = async (e: Omit<EncuadreLaboral, 'id' | 'createdAt' | 'updatedAt'>): Promise<EncuadreLaboral> => {
  const { data, error } = await supabase
    .from('encuadres_laborales')
    .insert({
      caso_id:                    e.casoId,
      clasificacion_dependencia:  e.clasificacionDependencia,
      hay_tercerizacion:          e.hayTercerizacion,
      hay_grupo_economico:        e.hayGrupoEconomico,
      hay_plataforma:             e.hayPlataforma,
      cct_aplicable:              e.cctAplicable   ?? null,
      teoria_del_caso:            e.teoriaDelCaso  ?? null,
      datos_de_encuadre:          e.datosDeEncuadre,
    })
    .select()
    .single();
  if (error) throw error;
  return toEncuadreLaboral(data);
};

export const updateEncuadreLaboral = async (id: string, changes: Partial<EncuadreLaboral>): Promise<void> => {
  const row: any = { updated_at: new Date().toISOString() };
  if (changes.clasificacionDependencia !== undefined) row.clasificacion_dependencia = changes.clasificacionDependencia;
  if (changes.hayTercerizacion         !== undefined) row.hay_tercerizacion          = changes.hayTercerizacion;
  if (changes.hayGrupoEconomico        !== undefined) row.hay_grupo_economico        = changes.hayGrupoEconomico;
  if (changes.hayPlataforma            !== undefined) row.hay_plataforma             = changes.hayPlataforma;
  if (changes.cctAplicable             !== undefined) row.cct_aplicable              = changes.cctAplicable;
  if (changes.teoriaDelCaso            !== undefined) row.teoria_del_caso            = changes.teoriaDelCaso;
  if (changes.datosDeEncuadre          !== undefined) row.datos_de_encuadre          = changes.datosDeEncuadre;
  const { error } = await supabase.from('encuadres_laborales').update(row).eq('id', id);
  if (error) throw error;
};

// ── Telegramas ───────────────────────────────────────────────────

const toTelegrama = (r: any): Telegrama => ({
  id:              r.id,
  casoId:          r.caso_id,
  tipo:            r.tipo,
  enviadoPor:      r.enviado_por,
  fechaEnvio:      r.fecha_envio     ?? undefined,
  fechaRecepcion:  r.fecha_recepcion ?? undefined,
  contenido:       r.contenido       ?? undefined,
  respondido:      r.respondido      ?? false,
  createdAt:       r.created_at,
});

export const fetchTelegramas = async (casoId: string): Promise<Telegrama[]> => {
  const { data, error } = await supabase
    .from('telegramas')
    .select('*')
    .eq('caso_id', casoId)
    .order('fecha_envio', { ascending: true });
  if (error) throw error;
  return (data ?? []).map(toTelegrama);
};

export const createTelegrama = async (t: Omit<Telegrama, 'id' | 'createdAt'>): Promise<Telegrama> => {
  const { data, error } = await supabase
    .from('telegramas')
    .insert({
      caso_id:          t.casoId,
      tipo:             t.tipo,
      enviado_por:      t.enviadoPor,
      fecha_envio:      t.fechaEnvio     ?? null,
      fecha_recepcion:  t.fechaRecepcion ?? null,
      contenido:        t.contenido      ?? null,
      respondido:       t.respondido     ?? false,
    })
    .select()
    .single();
  if (error) throw error;
  return toTelegrama(data);
};

export const updateTelegrama = async (id: string, changes: Partial<Telegrama>): Promise<void> => {
  const row: any = {};
  if (changes.fechaRecepcion !== undefined) row.fecha_recepcion = changes.fechaRecepcion || null;
  if (changes.respondido     !== undefined) row.respondido      = changes.respondido;
  if (changes.contenido      !== undefined) row.contenido       = changes.contenido;
  const { error } = await supabase.from('telegramas').update(row).eq('id', id);
  if (error) throw error;
};

// ── SECLO Tramites ───────────────────────────────────────────────

const toSecloTramite = (r: any): SecloTramite => ({
  id:                  r.id,
  casoId:              r.caso_id,
  numeroTramite:       r.numero_tramite       ?? undefined,
  conciliador:         r.conciliador          ?? undefined,
  fechaAudiencia:      r.fecha_audiencia      ?? undefined,
  ofertaEmpleador:     r.oferta_empleador != null ? parseFloat(r.oferta_empleador) : undefined,
  calculoInterno:      r.calculo_interno  != null ? parseFloat(r.calculo_interno)  : undefined,
  diferencia:          r.diferencia       != null ? parseFloat(r.diferencia)        : undefined,
  resultado:           r.resultado            ?? undefined,
  acuerdoHomologado:   r.acuerdo_homologado   ?? false,
  fechaHomologacion:   r.fecha_homologacion   ?? undefined,
  createdAt:           r.created_at,
  updatedAt:           r.updated_at,
});

export const fetchSecloTramite = async (casoId: string): Promise<SecloTramite | null> => {
  const { data, error } = await supabase
    .from('seclo_tramites')
    .select('*')
    .eq('caso_id', casoId)
    .maybeSingle();
  if (error) throw error;
  return data ? toSecloTramite(data) : null;
};

export const createSecloTramite = async (s: Omit<SecloTramite, 'id' | 'createdAt' | 'updatedAt'>): Promise<SecloTramite> => {
  const { data, error } = await supabase
    .from('seclo_tramites')
    .insert({
      caso_id:            s.casoId,
      numero_tramite:     s.numeroTramite    ?? null,
      conciliador:        s.conciliador      ?? null,
      fecha_audiencia:    s.fechaAudiencia   ?? null,
      oferta_empleador:   s.ofertaEmpleador  ?? null,
      calculo_interno:    s.calculoInterno   ?? null,
      diferencia:         s.diferencia       ?? null,
      resultado:          s.resultado        ?? null,
      acuerdo_homologado: s.acuerdoHomologado ?? false,
      fecha_homologacion: s.fechaHomologacion ?? null,
    })
    .select()
    .single();
  if (error) throw error;
  return toSecloTramite(data);
};

export const updateSecloTramite = async (id: string, changes: Partial<SecloTramite>): Promise<void> => {
  const row: any = { updated_at: new Date().toISOString() };
  if (changes.numeroTramite     !== undefined) row.numero_tramite     = changes.numeroTramite;
  if (changes.conciliador       !== undefined) row.conciliador        = changes.conciliador;
  if (changes.fechaAudiencia    !== undefined) row.fecha_audiencia    = changes.fechaAudiencia || null;
  if (changes.ofertaEmpleador   !== undefined) row.oferta_empleador   = changes.ofertaEmpleador;
  if (changes.calculoInterno    !== undefined) row.calculo_interno    = changes.calculoInterno;
  if (changes.diferencia        !== undefined) row.diferencia         = changes.diferencia;
  if (changes.resultado         !== undefined) row.resultado          = changes.resultado;
  if (changes.acuerdoHomologado !== undefined) row.acuerdo_homologado = changes.acuerdoHomologado;
  if (changes.fechaHomologacion !== undefined) row.fecha_homologacion = changes.fechaHomologacion || null;
  const { error } = await supabase.from('seclo_tramites').update(row).eq('id', id);
  if (error) throw error;
};

// ── Liquidacion Laboral ──────────────────────────────────────────

const toLiquidacionLaboral = (r: any): LiquidacionLaboral => ({
  id:                         r.id,
  casoId:                     r.caso_id,
  fechaIngreso:               r.fecha_ingreso,
  fechaEgreso:                r.fecha_egreso,
  antiguedadAnios:            r.antiguedad_anios       ?? undefined,
  mejorRemuneracion:          r.mejor_remuneracion != null ? parseFloat(r.mejor_remuneracion) : undefined,
  incluyeVariables:           r.incluye_variables      ?? false,
  indemnizacionArt245:        r.indemnizacion_art_245 != null ? parseFloat(r.indemnizacion_art_245) : undefined,
  preaviso:                   r.preaviso            != null ? parseFloat(r.preaviso)               : undefined,
  integracionMes:             r.integracion_mes     != null ? parseFloat(r.integracion_mes)        : undefined,
  sacPreaviso:                r.sac_preaviso        != null ? parseFloat(r.sac_preaviso)           : undefined,
  sacProporcional:            r.sac_proporcional    != null ? parseFloat(r.sac_proporcional)       : undefined,
  vacacionesProporcional:     r.vacaciones_proporcional != null ? parseFloat(r.vacaciones_proporcional) : undefined,
  diasTrabajados:             r.dias_trabajados     != null ? parseFloat(r.dias_trabajados)        : undefined,
  multaArt2Ley25323:          r.multa_art_2_ley_25323 != null ? parseFloat(r.multa_art_2_ley_25323) : undefined,
  multaArt80:                 r.multa_art_80        != null ? parseFloat(r.multa_art_80)           : undefined,
  multasLey24013:             r.multas_ley_24013    != null ? parseFloat(r.multas_ley_24013)       : undefined,
  otrosRubros:                r.otros_rubros        ?? {},
  total:                      r.total               != null ? parseFloat(r.total)                  : undefined,
  actualizadoCon:             r.actualizado_con     ?? undefined,
  tasaInteresAnual:           r.tasa_interes_anual  != null ? parseFloat(r.tasa_interes_anual)     : undefined,
  notaCautelar:               r.nota_cautelar       ?? undefined,
  versionNormativaArt245Id:   r.version_normativa_art_245_id ?? undefined,
  createdAt:                  r.created_at,
  updatedAt:                  r.updated_at,
});

export const fetchLiquidacionLaboral = async (casoId: string): Promise<LiquidacionLaboral | null> => {
  const { data, error } = await supabase
    .from('liquidaciones_laborales')
    .select('*')
    .eq('caso_id', casoId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data ? toLiquidacionLaboral(data) : null;
};

export const createLiquidacionLaboral = async (l: Omit<LiquidacionLaboral, 'id' | 'createdAt' | 'updatedAt'>): Promise<LiquidacionLaboral> => {
  const { data, error } = await supabase
    .from('liquidaciones_laborales')
    .insert({
      caso_id:                       l.casoId,
      fecha_ingreso:                 l.fechaIngreso,
      fecha_egreso:                  l.fechaEgreso,
      antiguedad_anios:              l.antiguedadAnios        ?? null,
      mejor_remuneracion:            l.mejorRemuneracion      ?? null,
      incluye_variables:             l.incluyeVariables       ?? false,
      indemnizacion_art_245:         l.indemnizacionArt245    ?? null,
      preaviso:                      l.preaviso               ?? null,
      integracion_mes:               l.integracionMes         ?? null,
      sac_preaviso:                  l.sacPreaviso            ?? null,
      sac_proporcional:              l.sacProporcional        ?? null,
      vacaciones_proporcional:       l.vacacionesProporcional ?? null,
      dias_trabajados:               l.diasTrabajados         ?? null,
      multa_art_2_ley_25323:         l.multaArt2Ley25323      ?? null,
      multa_art_80:                  l.multaArt80             ?? null,
      multas_ley_24013:              l.multasLey24013         ?? null,
      otros_rubros:                  l.otrosRubros            ?? {},
      total:                         l.total                  ?? null,
      actualizado_con:               l.actualizadoCon         ?? null,
      tasa_interes_anual:            l.tasaInteresAnual       ?? null,
      nota_cautelar:                 l.notaCautelar           ?? null,
      version_normativa_art_245_id:  l.versionNormativaArt245Id ?? null,
    })
    .select()
    .single();
  if (error) throw error;
  return toLiquidacionLaboral(data);
};

export const updateLiquidacionLaboral = async (id: string, changes: Partial<LiquidacionLaboral>): Promise<void> => {
  const row: any = { updated_at: new Date().toISOString() };
  if (changes.mejorRemuneracion      !== undefined) row.mejor_remuneracion       = changes.mejorRemuneracion;
  if (changes.indemnizacionArt245    !== undefined) row.indemnizacion_art_245     = changes.indemnizacionArt245;
  if (changes.preaviso               !== undefined) row.preaviso                  = changes.preaviso;
  if (changes.integracionMes         !== undefined) row.integracion_mes           = changes.integracionMes;
  if (changes.sacPreaviso            !== undefined) row.sac_preaviso              = changes.sacPreaviso;
  if (changes.sacProporcional        !== undefined) row.sac_proporcional          = changes.sacProporcional;
  if (changes.vacacionesProporcional !== undefined) row.vacaciones_proporcional   = changes.vacacionesProporcional;
  if (changes.diasTrabajados         !== undefined) row.dias_trabajados           = changes.diasTrabajados;
  if (changes.multaArt2Ley25323      !== undefined) row.multa_art_2_ley_25323     = changes.multaArt2Ley25323;
  if (changes.multaArt80             !== undefined) row.multa_art_80              = changes.multaArt80;
  if (changes.multasLey24013         !== undefined) row.multas_ley_24013          = changes.multasLey24013;
  if (changes.otrosRubros            !== undefined) row.otros_rubros              = changes.otrosRubros;
  if (changes.total                  !== undefined) row.total                     = changes.total;
  if (changes.actualizadoCon         !== undefined) row.actualizado_con           = changes.actualizadoCon;
  if (changes.tasaInteresAnual       !== undefined) row.tasa_interes_anual        = changes.tasaInteresAnual;
  const { error } = await supabase.from('liquidaciones_laborales').update(row).eq('id', id);
  if (error) throw error;
};

// ── Expediente Laboral ───────────────────────────────────────────

const toExpedienteLaboral = (r: any): ExpedienteLaboral => ({
  id:                r.id,
  casoId:            r.caso_id,
  jurisdiccion:      r.jurisdiccion,
  juzgado:           r.juzgado            ?? undefined,
  numeroExpediente:  r.numero_expediente  ?? undefined,
  caratula:          r.caratula           ?? undefined,
  estadoProcesal:    r.estado_procesal,
  fechaSentencia:    r.fecha_sentencia    ?? undefined,
  montoSentencia:    r.monto_sentencia != null ? parseFloat(r.monto_sentencia) : undefined,
  cuotasPago:        r.cuotas_pago        ?? undefined,
  tipoEmpresa:       r.tipo_empresa       ?? undefined,
  createdAt:         r.created_at,
  updatedAt:         r.updated_at,
});

export const fetchExpedienteLaboral = async (casoId: string): Promise<ExpedienteLaboral | null> => {
  const { data, error } = await supabase
    .from('expedientes_laborales')
    .select('*')
    .eq('caso_id', casoId)
    .maybeSingle();
  if (error) throw error;
  return data ? toExpedienteLaboral(data) : null;
};

export const createExpedienteLaboral = async (e: Omit<ExpedienteLaboral, 'id' | 'createdAt' | 'updatedAt'>): Promise<ExpedienteLaboral> => {
  const { data, error } = await supabase
    .from('expedientes_laborales')
    .insert({
      caso_id:           e.casoId,
      jurisdiccion:      e.jurisdiccion,
      juzgado:           e.juzgado           ?? null,
      numero_expediente: e.numeroExpediente  ?? null,
      caratula:          e.caratula          ?? null,
      estado_procesal:   e.estadoProcesal    ?? 'demanda',
      fecha_sentencia:   e.fechaSentencia    ?? null,
      monto_sentencia:   e.montoSentencia    ?? null,
      cuotas_pago:       e.cuotasPago        ?? null,
      tipo_empresa:      e.tipoEmpresa       ?? null,
    })
    .select()
    .single();
  if (error) throw error;
  return toExpedienteLaboral(data);
};

export const updateExpedienteLaboral = async (id: string, changes: Partial<ExpedienteLaboral>): Promise<void> => {
  const row: any = { updated_at: new Date().toISOString() };
  if (changes.juzgado          !== undefined) row.juzgado           = changes.juzgado;
  if (changes.numeroExpediente !== undefined) row.numero_expediente = changes.numeroExpediente;
  if (changes.caratula         !== undefined) row.caratula          = changes.caratula;
  if (changes.estadoProcesal   !== undefined) row.estado_procesal   = changes.estadoProcesal;
  if (changes.fechaSentencia   !== undefined) row.fecha_sentencia   = changes.fechaSentencia || null;
  if (changes.montoSentencia   !== undefined) row.monto_sentencia   = changes.montoSentencia;
  if (changes.cuotasPago       !== undefined) row.cuotas_pago       = changes.cuotasPago;
  if (changes.tipoEmpresa      !== undefined) row.tipo_empresa      = changes.tipoEmpresa;
  const { error } = await supabase.from('expedientes_laborales').update(row).eq('id', id);
  if (error) throw error;
};

// ── Matter Assignments ───────────────────────────────────────────

const toAssignment = (r: any): MatterAssignment => ({
  id:         r.id,
  matterId:   r.matter_id,
  profileId:  r.profile_id,
  role:       r.role,
  assignedAt: r.assigned_at,
  assignedBy: r.assigned_by ?? undefined,
});

export const fetchMatterAssignments = async (matterId: string): Promise<MatterAssignment[]> => {
  const { data, error } = await supabase
    .from('matter_assignments')
    .select('*')
    .eq('matter_id', matterId);
  if (error) throw error;
  return (data ?? []).map(toAssignment);
};

export const updateMatterAssignments = async (
  matterId: string,
  profileIds: string[],
  leadId: string,
  assignedBy: string,
): Promise<void> => {
  // 1. Remove existing assignments for this matter
  const { error: delErr } = await supabase
    .from('matter_assignments')
    .delete()
    .eq('matter_id', matterId);
  if (delErr) throw delErr;

  // 2. Insert new assignments
  if (profileIds.length === 0) return;
  const rows = profileIds.map(pid => ({
    matter_id:   matterId,
    profile_id:  pid,
    role:        pid === leadId ? 'lead' : 'assigned',
    assigned_by: assignedBy,
  }));
  const { error: insErr } = await supabase
    .from('matter_assignments')
    .insert(rows);
  if (insErr) throw insErr;
};

// ── Mensajería (Conversations) ────────────────────────────────────

const toConversationMessage = (r: any): ConversationMessage => ({
  id:             r.id,
  conversationId: r.conversation_id,
  senderId:       r.sender_id,
  content:        r.content,
  createdAt:      r.created_at,
});

const toConversation = (r: any): Conversation => ({
  id:        r.id,
  type:      r.type,
  name:      r.name ?? undefined,
  createdBy: r.created_by,
  createdAt: r.created_at,
  memberIds: (r.conversation_members || []).map((m: any) => m.profile_id),
  lastMessage: r.last_msg?.[0] ? toConversationMessage(r.last_msg[0]) : undefined,
});

export const fetchConversations = async (): Promise<Conversation[]> => {
  const { data, error } = await supabase
    .from('conversations')
    .select('*, conversation_members(profile_id), last_msg:conversation_messages(id, conversation_id, sender_id, content, created_at)')
    .order('created_at', { foreignTable: 'conversation_messages', ascending: false })
    .limit(1, { foreignTable: 'conversation_messages' })
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []).map(toConversation);
};

export const fetchConversationMessages = async (conversationId: string, limit = 80): Promise<ConversationMessage[]> => {
  const { data, error } = await supabase
    .from('conversation_messages')
    .select('*')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data ?? []).map(toConversationMessage).reverse();
};

export const sendConversationMessage = async (conversationId: string, senderId: string, content: string): Promise<ConversationMessage> => {
  const { data, error } = await supabase
    .from('conversation_messages')
    .insert({ conversation_id: conversationId, sender_id: senderId, content })
    .select()
    .single();
  if (error) throw error;
  return toConversationMessage(data);
};

export const createConversation = async (
  type: ConversationType,
  memberIds: string[],
  createdBy: string,
  name?: string,
): Promise<Conversation> => {
  // 1. Create the conversation
  const { data: conv, error: convErr } = await supabase
    .from('conversations')
    .insert({ type, name: name ?? null, created_by: createdBy })
    .select()
    .single();
  if (convErr) throw convErr;

  // 2. Add creator as member first (needed for RLS on subsequent inserts)
  const { error: selfErr } = await supabase
    .from('conversation_members')
    .insert({ conversation_id: conv.id, profile_id: createdBy });
  if (selfErr) throw selfErr;

  // 3. Add remaining members
  const others = memberIds.filter(id => id !== createdBy);
  if (others.length > 0) {
    const rows = others.map(pid => ({ conversation_id: conv.id, profile_id: pid }));
    const { error: memErr } = await supabase
      .from('conversation_members')
      .insert(rows);
    if (memErr) throw memErr;
  }

  return {
    id: conv.id,
    type: conv.type,
    name: conv.name ?? undefined,
    createdBy: conv.created_by,
    createdAt: conv.created_at,
    memberIds,
  };
};

export const findDirectConversation = async (userId1: string, userId2: string): Promise<Conversation | null> => {
  // Find a 'direct' conversation where both users are members
  const { data, error } = await supabase
    .from('conversations')
    .select('*, conversation_members(profile_id), last_msg:conversation_messages(id, conversation_id, sender_id, content, created_at)')
    .eq('type', 'direct')
    .order('created_at', { foreignTable: 'conversation_messages', ascending: false })
    .limit(1, { foreignTable: 'conversation_messages' });
  if (error) throw error;

  const match = (data ?? []).find((c: any) => {
    const members = (c.conversation_members || []).map((m: any) => m.profile_id);
    return members.length === 2 && members.includes(userId1) && members.includes(userId2);
  });

  return match ? toConversation(match) : null;
};

export const addConversationMembers = async (conversationId: string, profileIds: string[]): Promise<void> => {
  const rows = profileIds.map(pid => ({ conversation_id: conversationId, profile_id: pid }));
  const { error } = await supabase
    .from('conversation_members')
    .insert(rows);
  if (error) throw error;
};

export const leaveConversation = async (conversationId: string, profileId: string): Promise<void> => {
  const { error } = await supabase
    .from('conversation_members')
    .delete()
    .eq('conversation_id', conversationId)
    .eq('profile_id', profileId);
  if (error) throw error;
};

// ── Bitácora / Audit Log ──────────────────────────────────────────

const toAuditEntry = (r: any): AuditLogEntry => ({
  id:          r.id,
  actorId:     r.actor_id,
  actorName:   r.actor_name,
  action:      r.action,
  entityType:  r.entity_type,
  entityId:    r.entity_id ?? undefined,
  entityLabel: r.entity_label ?? undefined,
  details:     r.details ?? undefined,
  createdAt:   r.created_at,
});

export const logAudit = async (entry: {
  actorId: string;
  actorName: string;
  action: AuditAction;
  entityType: AuditEntityType;
  entityId?: string;
  entityLabel?: string;
  details?: Record<string, unknown>;
}): Promise<void> => {
  const { error } = await supabase
    .from('audit_log')
    .insert({
      actor_id:     entry.actorId,
      actor_name:   entry.actorName,
      action:       entry.action,
      entity_type:  entry.entityType,
      entity_id:    entry.entityId ?? null,
      entity_label: entry.entityLabel ?? null,
      details:      entry.details ?? {},
    });
  if (error) console.error('[audit] Error logging:', error);
};

export const fetchAuditLog = async (opts?: {
  limit?: number;
  offset?: number;
  action?: AuditAction;
  entityType?: AuditEntityType;
  actorId?: string;
}): Promise<AuditLogEntry[]> => {
  let query = supabase
    .from('audit_log')
    .select('*')
    .order('created_at', { ascending: false });

  if (opts?.action)     query = query.eq('action', opts.action);
  if (opts?.entityType) query = query.eq('entity_type', opts.entityType);
  if (opts?.actorId)    query = query.eq('actor_id', opts.actorId);

  const limit  = opts?.limit  ?? 100;
  const offset = opts?.offset ?? 0;
  query = query.range(offset, offset + limit - 1);

  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []).map(toAuditEntry);
};

// ── Eventos de expediente ──────────────────────────────────────

const toEvento = (r: any): EventoExpediente => ({
  id:             r.id,
  matterId:       r.matter_id,
  fecha:          r.fecha,
  tipo:           r.tipo,
  titulo:         r.titulo,
  descripcion:    r.descripcion ?? undefined,
  origen:         r.origen,
  jurisdiccion:   r.jurisdiccion ?? undefined,
  documentosUrls: Array.isArray(r.documentos_urls) ? r.documentos_urls : [],
  metadata:       r.metadata ?? undefined,
  hiloId:         r.hilo_id ?? undefined,
  createdBy:      r.created_by ?? undefined,
  createdAt:      r.created_at,
  updatedAt:      r.updated_at,
});

const eventoToRow = (e: Partial<EventoExpediente>): Record<string, unknown> => {
  const row: Record<string, unknown> = {};
  if (e.matterId       !== undefined) row.matter_id       = e.matterId;
  if (e.fecha          !== undefined) row.fecha           = e.fecha;
  if (e.tipo           !== undefined) row.tipo            = e.tipo;
  if (e.titulo         !== undefined) row.titulo          = e.titulo;
  if (e.descripcion    !== undefined) row.descripcion     = e.descripcion ?? null;
  if (e.origen         !== undefined) row.origen          = e.origen;
  if (e.jurisdiccion   !== undefined) row.jurisdiccion    = e.jurisdiccion ?? null;
  if (e.documentosUrls !== undefined) row.documentos_urls = e.documentosUrls;
  if (e.metadata       !== undefined) row.metadata        = e.metadata ?? {};
  if (e.hiloId         !== undefined) row.hilo_id         = e.hiloId ?? null;
  if (e.createdBy      !== undefined) row.created_by      = e.createdBy ?? null;
  return row;
};

export const fetchEventosByMatter = async (matterId: string): Promise<EventoExpediente[]> => {
  const { data, error } = await supabase
    .from('eventos_expediente')
    .select('*')
    .eq('matter_id', matterId)
    .order('fecha', { ascending: false });
  if (error) throw error;
  return (data ?? []).map(toEvento);
};

export const fetchAllEventos = async (): Promise<EventoExpediente[]> => {
  const { data, error } = await supabase
    .from('eventos_expediente')
    .select('*')
    .order('fecha', { ascending: false });
  if (error) throw error;
  return (data ?? []).map(toEvento);
};

export const createEvento = async (
  evento: Omit<EventoExpediente, 'id' | 'createdAt' | 'updatedAt'>,
): Promise<EventoExpediente> => {
  const { data, error } = await supabase
    .from('eventos_expediente')
    .insert(eventoToRow(evento))
    .select()
    .single();
  if (error) throw error;
  return toEvento(data);
};

export const updateEvento = async (
  id: string,
  changes: Partial<EventoExpediente>,
): Promise<void> => {
  const { error } = await supabase
    .from('eventos_expediente')
    .update(eventoToRow(changes))
    .eq('id', id);
  if (error) throw error;
};

export const deleteEvento = async (id: string): Promise<void> => {
  const { error } = await supabase
    .from('eventos_expediente')
    .delete()
    .eq('id', id);
  if (error) throw error;
};

// ── Plazos procesales ──────────────────────────────────────────

const toPlazo = (r: any): Plazo => ({
  id:               r.id,
  matterId:         r.matter_id,
  eventoOrigenId:   r.evento_origen_id ?? undefined,
  tipo:             r.tipo,
  descripcion:      r.descripcion ?? undefined,
  fechaInicio:      r.fecha_inicio,
  dias:             r.dias,
  diasHabiles:      r.dias_habiles,
  jurisdiccion:     r.jurisdiccion,
  fechaVencimiento: r.fecha_vencimiento,
  estado:           r.estado,
  cumplidoAt:       r.cumplido_at ?? undefined,
  tareaId:          r.tarea_id    ?? undefined,
  suspendidoDesde:                r.suspendido_desde                  ?? undefined,
  motivoSuspension:               r.motivo_suspension                 ?? undefined,
  diasTranscurridosAlSuspender:   r.dias_transcurridos_al_suspender   ?? undefined,
  fechaReanudacion:               r.fecha_reanudacion                 ?? undefined,
  reanudadoAt:                    r.reanudado_at                      ?? undefined,
  tipoPlazo:                      r.tipo_plazo                        ?? 'individual',
  fechaUltimaNotificacion:        r.fecha_ultima_notificacion         ?? undefined,
  createdAt:        r.created_at,
  updatedAt:        r.updated_at,
});

const plazoToRow = (p: Partial<Plazo>): Record<string, unknown> => {
  const row: Record<string, unknown> = {};
  if (p.matterId         !== undefined) row.matter_id         = p.matterId;
  if (p.eventoOrigenId   !== undefined) row.evento_origen_id  = p.eventoOrigenId ?? null;
  if (p.tipo             !== undefined) row.tipo              = p.tipo;
  if (p.descripcion      !== undefined) row.descripcion       = p.descripcion ?? null;
  if (p.fechaInicio      !== undefined) row.fecha_inicio      = p.fechaInicio;
  if (p.dias             !== undefined) row.dias              = p.dias;
  if (p.diasHabiles      !== undefined) row.dias_habiles      = p.diasHabiles;
  if (p.jurisdiccion     !== undefined) row.jurisdiccion      = p.jurisdiccion;
  if (p.fechaVencimiento !== undefined) row.fecha_vencimiento = p.fechaVencimiento;
  if (p.estado           !== undefined) row.estado            = p.estado;
  if (p.cumplidoAt       !== undefined) row.cumplido_at       = p.cumplidoAt ?? null;
  if (p.tareaId          !== undefined) row.tarea_id          = p.tareaId ?? null;
  if (p.suspendidoDesde              !== undefined) row.suspendido_desde                = p.suspendidoDesde              ?? null;
  if (p.motivoSuspension             !== undefined) row.motivo_suspension               = p.motivoSuspension             ?? null;
  if (p.diasTranscurridosAlSuspender !== undefined) row.dias_transcurridos_al_suspender = p.diasTranscurridosAlSuspender ?? null;
  if (p.fechaReanudacion             !== undefined) row.fecha_reanudacion               = p.fechaReanudacion             ?? null;
  if (p.reanudadoAt                  !== undefined) row.reanudado_at                    = p.reanudadoAt                  ?? null;
  if (p.tipoPlazo                    !== undefined) row.tipo_plazo                      = p.tipoPlazo;
  if (p.fechaUltimaNotificacion      !== undefined) row.fecha_ultima_notificacion       = p.fechaUltimaNotificacion       ?? null;
  return row;
};

export const fetchPlazosByMatter = async (matterId: string): Promise<Plazo[]> => {
  const { data, error } = await supabase
    .from('plazos')
    .select('*')
    .eq('matter_id', matterId)
    .order('fecha_vencimiento', { ascending: true });
  if (error) throw error;
  return (data ?? []).map(toPlazo);
};

export const fetchAllPlazos = async (): Promise<Plazo[]> => {
  const { data, error } = await supabase
    .from('plazos')
    .select('*')
    .order('fecha_vencimiento', { ascending: true });
  if (error) throw error;
  return (data ?? []).map(toPlazo);
};

export const fetchActivePlazos = async (): Promise<Plazo[]> => {
  const { data, error } = await supabase
    .from('plazos')
    .select('*')
    .eq('estado', 'activo')
    .order('fecha_vencimiento', { ascending: true });
  if (error) throw error;
  return (data ?? []).map(toPlazo);
};

export const createPlazo = async (
  plazo: Omit<Plazo, 'id' | 'createdAt' | 'updatedAt'>,
): Promise<Plazo> => {
  const { data, error } = await supabase
    .from('plazos')
    .insert(plazoToRow(plazo))
    .select()
    .single();
  if (error) throw error;
  return toPlazo(data);
};

export const updatePlazo = async (id: string, changes: Partial<Plazo>): Promise<void> => {
  const { error } = await supabase
    .from('plazos')
    .update(plazoToRow(changes))
    .eq('id', id);
  if (error) throw error;
};

export const cumplirPlazo = async (id: string): Promise<void> => {
  const { error } = await supabase
    .from('plazos')
    .update({ estado: 'cumplido' as EstadoPlazo, cumplido_at: new Date().toISOString() })
    .eq('id', id);
  if (error) throw error;
};

export const cancelarPlazo = async (id: string): Promise<void> => {
  const { error } = await supabase
    .from('plazos')
    .update({ estado: 'cancelado' as EstadoPlazo })
    .eq('id', id);
  if (error) throw error;
};

export const deletePlazo = async (id: string): Promise<void> => {
  const { error } = await supabase
    .from('plazos')
    .delete()
    .eq('id', id);
  if (error) throw error;
};

// ── Feriados ───────────────────────────────────────────────────

const toFeriado = (r: any): Feriado => ({
  id:                 r.id,
  fecha:              r.fecha,
  tipo:               r.tipo,
  descripcion:        r.descripcion,
  jurisdiccionAplica: r.jurisdiccion_aplica,
});

export const fetchFeriados = async (): Promise<Feriado[]> => {
  const { data, error } = await supabase
    .from('feriados')
    .select('*')
    .order('fecha', { ascending: true });
  if (error) throw error;
  return (data ?? []).map(toFeriado);
};

// ── Hilos de prueba ────────────────────────────────────────────

const toHilo = (r: any): HiloPrueba => ({
  id:              r.id,
  matterId:        r.matter_id,
  nombre:          r.nombre,
  tipo:            r.tipo,
  ofrecidoPor:     r.ofrecido_por,
  estado:          r.estado,
  fechaOfrecido:   r.fecha_ofrecido   ?? undefined,
  fechaResolucion: r.fecha_resolucion ?? undefined,
  fechaProducido:  r.fecha_producido  ?? undefined,
  descripcion:     r.descripcion      ?? undefined,
  createdBy:       r.created_by       ?? undefined,
  createdAt:       r.created_at,
  updatedAt:       r.updated_at,
});

const hiloToRow = (h: Partial<HiloPrueba>): Record<string, unknown> => {
  const row: Record<string, unknown> = {};
  if (h.matterId        !== undefined) row.matter_id        = h.matterId;
  if (h.nombre          !== undefined) row.nombre           = h.nombre;
  if (h.tipo            !== undefined) row.tipo             = h.tipo;
  if (h.ofrecidoPor     !== undefined) row.ofrecido_por     = h.ofrecidoPor;
  if (h.estado          !== undefined) row.estado           = h.estado;
  if (h.fechaOfrecido   !== undefined) row.fecha_ofrecido   = h.fechaOfrecido   ?? null;
  if (h.fechaResolucion !== undefined) row.fecha_resolucion = h.fechaResolucion ?? null;
  if (h.fechaProducido  !== undefined) row.fecha_producido  = h.fechaProducido  ?? null;
  if (h.descripcion     !== undefined) row.descripcion      = h.descripcion     ?? null;
  if (h.createdBy       !== undefined) row.created_by       = h.createdBy       ?? null;
  return row;
};

export const fetchHilos = async (): Promise<HiloPrueba[]> => {
  const { data, error } = await supabase
    .from('hilos_prueba')
    .select('*')
    .order('created_at', { ascending: true });
  if (error) throw error;
  return (data ?? []).map(toHilo);
};

export const fetchHilosByMatter = async (matterId: string): Promise<HiloPrueba[]> => {
  const { data, error } = await supabase
    .from('hilos_prueba')
    .select('*')
    .eq('matter_id', matterId)
    .order('created_at', { ascending: true });
  if (error) throw error;
  return (data ?? []).map(toHilo);
};

export const createHilo = async (
  hilo: Omit<HiloPrueba, 'id' | 'createdAt' | 'updatedAt'>,
): Promise<HiloPrueba> => {
  const { data, error } = await supabase
    .from('hilos_prueba')
    .insert(hiloToRow(hilo))
    .select()
    .single();
  if (error) throw error;
  return toHilo(data);
};

export const updateHilo = async (id: string, changes: Partial<HiloPrueba>): Promise<void> => {
  const { error } = await supabase
    .from('hilos_prueba')
    .update(hiloToRow(changes))
    .eq('id', id);
  if (error) throw error;
};

export const deleteHilo = async (id: string): Promise<void> => {
  const { error } = await supabase
    .from('hilos_prueba')
    .delete()
    .eq('id', id);
  if (error) throw error;
};

// ── Peritos ────────────────────────────────────────────────────

const toPerito = (r: any): Perito => ({
  id:             r.id,
  matterId:       r.matter_id,
  hiloId:         r.hilo_id        ?? undefined,
  nombre:         r.nombre,
  especialidad:   r.especialidad,
  matricula:      r.matricula      ?? undefined,
  email:          r.email          ?? undefined,
  telefono:       r.telefono       ?? undefined,
  estado:         r.estado,
  fechaDesignado: r.fecha_designado ?? undefined,
  fechaAceptado:  r.fecha_aceptado  ?? undefined,
  fechaInforme:   r.fecha_informe   ?? undefined,
  notas:          r.notas           ?? undefined,
  createdBy:      r.created_by      ?? undefined,
  createdAt:      r.created_at,
  updatedAt:      r.updated_at,
});

const peritoToRow = (p: Partial<Perito>): Record<string, unknown> => {
  const row: Record<string, unknown> = {};
  if (p.matterId        !== undefined) row.matter_id        = p.matterId;
  if (p.hiloId          !== undefined) row.hilo_id          = p.hiloId          ?? null;
  if (p.nombre          !== undefined) row.nombre           = p.nombre;
  if (p.especialidad    !== undefined) row.especialidad     = p.especialidad;
  if (p.matricula       !== undefined) row.matricula        = p.matricula       ?? null;
  if (p.email           !== undefined) row.email            = p.email           ?? null;
  if (p.telefono        !== undefined) row.telefono         = p.telefono        ?? null;
  if (p.estado          !== undefined) row.estado           = p.estado;
  if (p.fechaDesignado  !== undefined) row.fecha_designado  = p.fechaDesignado  ?? null;
  if (p.fechaAceptado   !== undefined) row.fecha_aceptado   = p.fechaAceptado   ?? null;
  if (p.fechaInforme    !== undefined) row.fecha_informe    = p.fechaInforme    ?? null;
  if (p.notas           !== undefined) row.notas            = p.notas           ?? null;
  if (p.createdBy       !== undefined) row.created_by       = p.createdBy       ?? null;
  return row;
};

export const fetchPeritos = async (): Promise<Perito[]> => {
  const { data, error } = await supabase
    .from('peritos')
    .select('*')
    .order('created_at', { ascending: true });
  if (error) throw error;
  return (data ?? []).map(toPerito);
};

export const createPerito = async (
  perito: Omit<Perito, 'id' | 'createdAt' | 'updatedAt'>,
): Promise<Perito> => {
  const { data, error } = await supabase
    .from('peritos')
    .insert(peritoToRow(perito))
    .select()
    .single();
  if (error) throw error;
  return toPerito(data);
};

export const updatePerito = async (id: string, changes: Partial<Perito>): Promise<void> => {
  const { error } = await supabase
    .from('peritos')
    .update(peritoToRow(changes))
    .eq('id', id);
  if (error) throw error;
};

export const deletePerito = async (id: string): Promise<void> => {
  const { error } = await supabase
    .from('peritos')
    .delete()
    .eq('id', id);
  if (error) throw error;
};

// ── Compensaciones económicas ──────────────────────────────────

const toCompensacion = (r: any): CompensacionEconomica => ({
  id:                r.id,
  matterId:          r.matter_id,
  montoTotal:        parseFloat(r.monto_total),
  moneda:            r.moneda,
  cantidadCuotas:    r.cantidad_cuotas,
  frecuencia:        r.frecuencia,
  fechaPrimeraCuota: r.fecha_primera_cuota,
  tasaInteresAnual:  r.tasa_interes_anual != null ? parseFloat(r.tasa_interes_anual) : undefined,
  estado:            r.estado,
  notas:             r.notas      ?? undefined,
  createdBy:         r.created_by ?? undefined,
  createdAt:         r.created_at,
  updatedAt:         r.updated_at,
});

const compensacionToRow = (c: Partial<CompensacionEconomica>): Record<string, unknown> => {
  const row: Record<string, unknown> = {};
  if (c.matterId          !== undefined) row.matter_id           = c.matterId;
  if (c.montoTotal        !== undefined) row.monto_total         = c.montoTotal;
  if (c.moneda            !== undefined) row.moneda              = c.moneda;
  if (c.cantidadCuotas    !== undefined) row.cantidad_cuotas     = c.cantidadCuotas;
  if (c.frecuencia        !== undefined) row.frecuencia          = c.frecuencia;
  if (c.fechaPrimeraCuota !== undefined) row.fecha_primera_cuota = c.fechaPrimeraCuota;
  if (c.tasaInteresAnual  !== undefined) row.tasa_interes_anual  = c.tasaInteresAnual ?? null;
  if (c.estado            !== undefined) row.estado              = c.estado;
  if (c.notas             !== undefined) row.notas               = c.notas      ?? null;
  if (c.createdBy         !== undefined) row.created_by          = c.createdBy  ?? null;
  return row;
};

export const fetchCompensaciones = async (): Promise<CompensacionEconomica[]> => {
  const { data, error } = await supabase
    .from('compensaciones')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []).map(toCompensacion);
};

export const createCompensacion = async (
  c: Omit<CompensacionEconomica, 'id' | 'createdAt' | 'updatedAt'>,
): Promise<CompensacionEconomica> => {
  const { data, error } = await supabase
    .from('compensaciones')
    .insert(compensacionToRow(c))
    .select()
    .single();
  if (error) throw error;
  return toCompensacion(data);
};

export const updateCompensacion = async (id: string, changes: Partial<CompensacionEconomica>): Promise<void> => {
  const { error } = await supabase
    .from('compensaciones')
    .update(compensacionToRow(changes))
    .eq('id', id);
  if (error) throw error;
};

export const deleteCompensacion = async (id: string): Promise<void> => {
  const { error } = await supabase
    .from('compensaciones')
    .delete()
    .eq('id', id);
  if (error) throw error;
};

// ── Cuotas de compensación ─────────────────────────────────────

const toCuota = (r: any): CuotaCompensacion => ({
  id:                r.id,
  compensacionId:    r.compensacion_id,
  numero:            r.numero,
  fechaVencimiento:  r.fecha_vencimiento,
  monto:             parseFloat(r.monto),
  estado:            r.estado,
  fechaPago:         r.fecha_pago      ?? undefined,
  montoPagado:       r.monto_pagado != null ? parseFloat(r.monto_pagado) : undefined,
  comprobanteUrl:    r.comprobante_url ?? undefined,
  notas:             r.notas           ?? undefined,
  createdAt:         r.created_at,
  updatedAt:         r.updated_at,
});

const cuotaToRow = (c: Partial<CuotaCompensacion>): Record<string, unknown> => {
  const row: Record<string, unknown> = {};
  if (c.compensacionId   !== undefined) row.compensacion_id   = c.compensacionId;
  if (c.numero           !== undefined) row.numero            = c.numero;
  if (c.fechaVencimiento !== undefined) row.fecha_vencimiento = c.fechaVencimiento;
  if (c.monto            !== undefined) row.monto             = c.monto;
  if (c.estado           !== undefined) row.estado            = c.estado;
  if (c.fechaPago        !== undefined) row.fecha_pago        = c.fechaPago      ?? null;
  if (c.montoPagado      !== undefined) row.monto_pagado      = c.montoPagado    ?? null;
  if (c.comprobanteUrl   !== undefined) row.comprobante_url   = c.comprobanteUrl ?? null;
  if (c.notas            !== undefined) row.notas             = c.notas          ?? null;
  return row;
};

export const fetchCuotasCompensacion = async (): Promise<CuotaCompensacion[]> => {
  const { data, error } = await supabase
    .from('cuotas_compensacion')
    .select('*')
    .order('fecha_vencimiento', { ascending: true });
  if (error) throw error;
  return (data ?? []).map(toCuota);
};

export const createCuotasBulk = async (
  cuotas: Array<Omit<CuotaCompensacion, 'id' | 'createdAt' | 'updatedAt'>>,
): Promise<CuotaCompensacion[]> => {
  if (cuotas.length === 0) return [];
  const { data, error } = await supabase
    .from('cuotas_compensacion')
    .insert(cuotas.map(cuotaToRow))
    .select();
  if (error) throw error;
  return (data ?? []).map(toCuota);
};

export const updateCuota = async (id: string, changes: Partial<CuotaCompensacion>): Promise<void> => {
  const { error } = await supabase
    .from('cuotas_compensacion')
    .update(cuotaToRow(changes))
    .eq('id', id);
  if (error) throw error;
};

// ── Letrados de la parte / contraparte ─────────────────────────

const toLetrado = (r: any): LetradoParte => ({
  id:                   r.id,
  matterId:             r.matter_id,
  nombre:               r.nombre,
  matricula:            r.matricula            ?? undefined,
  colegio:              r.colegio              ?? undefined,
  email:                r.email                ?? undefined,
  telefono:             r.telefono             ?? undefined,
  domicilioLegal:       r.domicilio_legal      ?? undefined,
  domicilioElectronico: r.domicilio_electronico ?? undefined,
  representaA:          r.representa_a,
  estado:               r.estado,
  fechaDesignacion:     r.fecha_designacion    ?? undefined,
  fechaCese:            r.fecha_cese           ?? undefined,
  motivoCese:           r.motivo_cese          ?? undefined,
  notas:                r.notas                ?? undefined,
  createdBy:            r.created_by           ?? undefined,
  createdAt:            r.created_at,
  updatedAt:            r.updated_at,
});

const letradoToRow = (l: Partial<LetradoParte>): Record<string, unknown> => {
  const row: Record<string, unknown> = {};
  if (l.matterId             !== undefined) row.matter_id              = l.matterId;
  if (l.nombre               !== undefined) row.nombre                 = l.nombre;
  if (l.matricula            !== undefined) row.matricula              = l.matricula            ?? null;
  if (l.colegio              !== undefined) row.colegio                = l.colegio              ?? null;
  if (l.email                !== undefined) row.email                  = l.email                ?? null;
  if (l.telefono             !== undefined) row.telefono               = l.telefono             ?? null;
  if (l.domicilioLegal       !== undefined) row.domicilio_legal        = l.domicilioLegal       ?? null;
  if (l.domicilioElectronico !== undefined) row.domicilio_electronico  = l.domicilioElectronico ?? null;
  if (l.representaA          !== undefined) row.representa_a           = l.representaA;
  if (l.estado               !== undefined) row.estado                 = l.estado;
  if (l.fechaDesignacion     !== undefined) row.fecha_designacion      = l.fechaDesignacion     ?? null;
  if (l.fechaCese            !== undefined) row.fecha_cese             = l.fechaCese            ?? null;
  if (l.motivoCese           !== undefined) row.motivo_cese            = l.motivoCese           ?? null;
  if (l.notas                !== undefined) row.notas                  = l.notas                ?? null;
  if (l.createdBy            !== undefined) row.created_by             = l.createdBy            ?? null;
  return row;
};

export const fetchLetrados = async (): Promise<LetradoParte[]> => {
  const { data, error } = await supabase
    .from('letrados_parte')
    .select('*')
    .order('created_at', { ascending: true });
  if (error) throw error;
  return (data ?? []).map(toLetrado);
};

export const createLetrado = async (
  l: Omit<LetradoParte, 'id' | 'createdAt' | 'updatedAt'>,
): Promise<LetradoParte> => {
  const { data, error } = await supabase
    .from('letrados_parte')
    .insert(letradoToRow(l))
    .select()
    .single();
  if (error) throw error;
  return toLetrado(data);
};

export const updateLetrado = async (id: string, changes: Partial<LetradoParte>): Promise<void> => {
  const { error } = await supabase
    .from('letrados_parte')
    .update(letradoToRow(changes))
    .eq('id', id);
  if (error) throw error;
};

export const deleteLetrado = async (id: string): Promise<void> => {
  const { error } = await supabase
    .from('letrados_parte')
    .delete()
    .eq('id', id);
  if (error) throw error;
};

// ── Honorarios regulados ──────────────────────────────────────

const toHonorario = (r: any): HonorarioRegulado => ({
  id:                  r.id,
  matterId:            r.matter_id,
  profesional:         r.profesional,
  tipo:                r.tipo,
  cantidadUnidades:    parseFloat(r.cantidad_unidades),
  unidad:              r.unidad,
  valorUnidadSnapshot: parseFloat(r.valor_unidad_snapshot),
  montoPesos:          parseFloat(r.monto_pesos),
  estado:              r.estado,
  obligadoAPagar:      r.obligado_a_pagar    ?? undefined,
  fechaRegulacion:     r.fecha_regulacion    ?? undefined,
  fechaNotificacion:   r.fecha_notificacion  ?? undefined,
  fechaFirmeza:        r.fecha_firmeza       ?? undefined,
  fechaCobro:          r.fecha_cobro         ?? undefined,
  apeladoPor:          r.apelado_por         ?? undefined,
  notas:               r.notas               ?? undefined,
  createdBy:           r.created_by          ?? undefined,
  createdAt:           r.created_at,
  updatedAt:           r.updated_at,
});

const honorarioToRow = (h: Partial<HonorarioRegulado>): Record<string, unknown> => {
  const row: Record<string, unknown> = {};
  if (h.matterId            !== undefined) row.matter_id              = h.matterId;
  if (h.profesional         !== undefined) row.profesional            = h.profesional;
  if (h.tipo                !== undefined) row.tipo                   = h.tipo;
  if (h.cantidadUnidades    !== undefined) row.cantidad_unidades      = h.cantidadUnidades;
  if (h.unidad              !== undefined) row.unidad                 = h.unidad;
  if (h.valorUnidadSnapshot !== undefined) row.valor_unidad_snapshot  = h.valorUnidadSnapshot;
  if (h.montoPesos          !== undefined) row.monto_pesos            = h.montoPesos;
  if (h.estado              !== undefined) row.estado                 = h.estado;
  if (h.obligadoAPagar      !== undefined) row.obligado_a_pagar       = h.obligadoAPagar      ?? null;
  if (h.fechaRegulacion     !== undefined) row.fecha_regulacion       = h.fechaRegulacion     ?? null;
  if (h.fechaNotificacion   !== undefined) row.fecha_notificacion     = h.fechaNotificacion   ?? null;
  if (h.fechaFirmeza        !== undefined) row.fecha_firmeza          = h.fechaFirmeza        ?? null;
  if (h.fechaCobro          !== undefined) row.fecha_cobro            = h.fechaCobro          ?? null;
  if (h.apeladoPor          !== undefined) row.apelado_por            = h.apeladoPor          ?? null;
  if (h.notas               !== undefined) row.notas                  = h.notas               ?? null;
  if (h.createdBy           !== undefined) row.created_by             = h.createdBy           ?? null;
  return row;
};

export const fetchHonorariosRegulados = async (): Promise<HonorarioRegulado[]> => {
  const { data, error } = await supabase
    .from('honorarios_regulados')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []).map(toHonorario);
};

export const createHonorarioRegulado = async (
  h: Omit<HonorarioRegulado, 'id' | 'createdAt' | 'updatedAt'>,
): Promise<HonorarioRegulado> => {
  const { data, error } = await supabase
    .from('honorarios_regulados')
    .insert(honorarioToRow(h))
    .select()
    .single();
  if (error) throw error;
  return toHonorario(data);
};

export const updateHonorarioRegulado = async (id: string, changes: Partial<HonorarioRegulado>): Promise<void> => {
  const { error } = await supabase
    .from('honorarios_regulados')
    .update(honorarioToRow(changes))
    .eq('id', id);
  if (error) throw error;
};

export const deleteHonorarioRegulado = async (id: string): Promise<void> => {
  const { error } = await supabase
    .from('honorarios_regulados')
    .delete()
    .eq('id', id);
  if (error) throw error;
};

// ── Cédulas + Intentos (GAP 7) ────────────────────────────────────

const toCedula = (r: any): Cedula => ({
  id:            r.id,
  matterId:      r.matter_id,
  tipo:          r.tipo,
  destinatario:  r.destinatario,
  domicilio:     r.domicilio,
  objeto:        r.objeto         ?? undefined,
  fechaEmision:  r.fecha_emision  ?? undefined,
  estadoManual:  r.estado_manual  ?? undefined,
  notas:         r.notas          ?? undefined,
  createdBy:     r.created_by     ?? undefined,
  createdAt:     r.created_at,
  updatedAt:     r.updated_at,
});

const cedulaToRow = (c: Partial<Cedula>): Record<string, unknown> => {
  const row: Record<string, unknown> = {};
  if (c.matterId      !== undefined) row.matter_id      = c.matterId;
  if (c.tipo          !== undefined) row.tipo           = c.tipo;
  if (c.destinatario  !== undefined) row.destinatario   = c.destinatario;
  if (c.domicilio     !== undefined) row.domicilio      = c.domicilio;
  if (c.objeto        !== undefined) row.objeto         = c.objeto        ?? null;
  if (c.fechaEmision  !== undefined) row.fecha_emision  = c.fechaEmision  ?? null;
  if (c.estadoManual  !== undefined) row.estado_manual  = c.estadoManual  ?? null;
  if (c.notas         !== undefined) row.notas          = c.notas         ?? null;
  if (c.createdBy     !== undefined) row.created_by     = c.createdBy     ?? null;
  return row;
};

const toCedulaIntento = (r: any): CedulaIntento => ({
  id:        r.id,
  cedulaId:  r.cedula_id,
  fecha:     r.fecha,
  resultado: r.resultado,
  hora:      r.hora       ?? undefined,
  notas:     r.notas      ?? undefined,
  createdBy: r.created_by ?? undefined,
  createdAt: r.created_at,
});

const cedulaIntentoToRow = (i: Partial<CedulaIntento>): Record<string, unknown> => {
  const row: Record<string, unknown> = {};
  if (i.cedulaId  !== undefined) row.cedula_id  = i.cedulaId;
  if (i.fecha     !== undefined) row.fecha      = i.fecha;
  if (i.resultado !== undefined) row.resultado  = i.resultado;
  if (i.hora      !== undefined) row.hora       = i.hora      ?? null;
  if (i.notas     !== undefined) row.notas      = i.notas     ?? null;
  if (i.createdBy !== undefined) row.created_by = i.createdBy ?? null;
  return row;
};

export const fetchCedulas = async (): Promise<Cedula[]> => {
  const { data, error } = await supabase
    .from('cedulas')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []).map(toCedula);
};

export const fetchCedulaIntentos = async (): Promise<CedulaIntento[]> => {
  const { data, error } = await supabase
    .from('cedula_intentos')
    .select('*')
    .order('fecha', { ascending: false });
  if (error) throw error;
  return (data ?? []).map(toCedulaIntento);
};

export const createCedula = async (
  c: Omit<Cedula, 'id' | 'createdAt' | 'updatedAt'>,
): Promise<Cedula> => {
  const { data, error } = await supabase
    .from('cedulas')
    .insert(cedulaToRow(c))
    .select()
    .single();
  if (error) throw error;
  return toCedula(data);
};

export const updateCedula = async (id: string, changes: Partial<Cedula>): Promise<void> => {
  const { error } = await supabase
    .from('cedulas')
    .update(cedulaToRow(changes))
    .eq('id', id);
  if (error) throw error;
};

export const deleteCedula = async (id: string): Promise<void> => {
  const { error } = await supabase
    .from('cedulas')
    .delete()
    .eq('id', id);
  if (error) throw error;
};

export const createCedulaIntento = async (
  i: Omit<CedulaIntento, 'id' | 'createdAt'>,
): Promise<CedulaIntento> => {
  const { data, error } = await supabase
    .from('cedula_intentos')
    .insert(cedulaIntentoToRow(i))
    .select()
    .single();
  if (error) throw error;
  return toCedulaIntento(data);
};

export const deleteCedulaIntento = async (id: string): Promise<void> => {
  const { error } = await supabase
    .from('cedula_intentos')
    .delete()
    .eq('id', id);
  if (error) throw error;
};

// ── Hijos del caso (migración 041) ────────────────────────────────

const toHijoCaso = (r: any): HijoCaso => ({
  id:                     r.id,
  matterId:               r.matter_id,
  nombre:                 r.nombre,
  dni:                    r.dni                     ?? undefined,
  fechaNacimiento:        r.fecha_nacimiento,
  escolaridad:            r.escolaridad             ?? undefined,
  establecimiento:        r.establecimiento         ?? undefined,
  tieneCud:               r.tiene_cud               ?? undefined,
  diagnostico:            r.diagnostico             ?? undefined,
  terapiasDesc:           r.terapias_desc           ?? undefined,
  acompananteTerapeutico: r.acompanante_terapeutico ?? undefined,
  coberturaEspecial:      r.cobertura_especial      ?? undefined,
  regimenCuidado:         r.regimen_cuidado         ?? undefined,
  residenciaPrincipal:    r.residencia_principal    ?? undefined,
  regimenComunicacion:    r.regimen_comunicacion    ?? undefined,
  motivoRegimenDistinto:  r.motivo_regimen_distinto ?? undefined,
  transicion18Gestionada: r.transicion_18_gestionada ?? false,
  orden:                  r.orden ?? 0,
  notas:                  r.notas      ?? undefined,
  createdBy:              r.created_by ?? undefined,
  createdAt:              r.created_at,
  updatedAt:              r.updated_at,
});

const hijoCasoToRow = (h: Partial<HijoCaso>): Record<string, unknown> => {
  const row: Record<string, unknown> = {};
  if (h.matterId               !== undefined) row.matter_id               = h.matterId;
  if (h.nombre                 !== undefined) row.nombre                  = h.nombre;
  if (h.dni                    !== undefined) row.dni                     = h.dni                    ?? null;
  if (h.fechaNacimiento        !== undefined) row.fecha_nacimiento        = h.fechaNacimiento;
  if (h.escolaridad            !== undefined) row.escolaridad             = h.escolaridad            ?? null;
  if (h.establecimiento        !== undefined) row.establecimiento         = h.establecimiento        ?? null;
  if (h.tieneCud               !== undefined) row.tiene_cud               = h.tieneCud               ?? null;
  if (h.diagnostico            !== undefined) row.diagnostico             = h.diagnostico            ?? null;
  if (h.terapiasDesc           !== undefined) row.terapias_desc           = h.terapiasDesc           ?? null;
  if (h.acompananteTerapeutico !== undefined) row.acompanante_terapeutico = h.acompananteTerapeutico ?? null;
  if (h.coberturaEspecial      !== undefined) row.cobertura_especial      = h.coberturaEspecial      ?? null;
  if (h.regimenCuidado         !== undefined) row.regimen_cuidado          = h.regimenCuidado         ?? null;
  if (h.residenciaPrincipal    !== undefined) row.residencia_principal     = h.residenciaPrincipal    ?? null;
  if (h.regimenComunicacion    !== undefined) row.regimen_comunicacion     = h.regimenComunicacion    ?? null;
  if (h.motivoRegimenDistinto  !== undefined) row.motivo_regimen_distinto  = h.motivoRegimenDistinto  ?? null;
  if (h.transicion18Gestionada !== undefined) row.transicion_18_gestionada = h.transicion18Gestionada;
  if (h.orden                  !== undefined) row.orden                    = h.orden;
  if (h.notas                  !== undefined) row.notas                   = h.notas      ?? null;
  if (h.createdBy              !== undefined) row.created_by              = h.createdBy  ?? null;
  return row;
};

export const fetchHijosCaso = async (): Promise<HijoCaso[]> => {
  const { data, error } = await supabase
    .from('hijos_caso')
    .select('*')
    .order('matter_id', { ascending: true })
    .order('orden',     { ascending: true });
  if (error) throw error;
  return (data ?? []).map(toHijoCaso);
};

export const createHijoCaso = async (
  h: Omit<HijoCaso, 'id' | 'createdAt' | 'updatedAt'>,
): Promise<HijoCaso> => {
  const { data, error } = await supabase
    .from('hijos_caso')
    .insert(hijoCasoToRow(h))
    .select()
    .single();
  if (error) throw error;
  return toHijoCaso(data);
};

export const updateHijoCaso = async (id: string, changes: Partial<HijoCaso>): Promise<void> => {
  const { error } = await supabase
    .from('hijos_caso')
    .update(hijoCasoToRow(changes))
    .eq('id', id);
  if (error) throw error;
};

export const deleteHijoCaso = async (id: string): Promise<void> => {
  const { error } = await supabase
    .from('hijos_caso')
    .delete()
    .eq('id', id);
  if (error) throw error;
};

// ── Reconvenciones (migración 043 — GAP R10) ───────────────────────

const toReconvencion = (r: any): Reconvencion => ({
  id:                   r.id,
  matterId:             r.matter_id,
  presentadaPor:        r.presentada_por as PresentadaPor,
  fechaPresentacion:    r.fecha_presentacion,
  fechaTrasladoCorrido: r.fecha_traslado_corrido ?? undefined,
  pretensiones:         (r.pretensiones ?? []) as PretensionReconvencion[],
  montoReclamado:       r.monto_reclamado        ?? undefined,
  pretensionDesc:       r.pretension_desc        ?? undefined,
  estado:               r.estado as EstadoReconvencion,
  eventoPresentacionId: r.evento_presentacion_id ?? undefined,
  eventoContestacionId: r.evento_contestacion_id ?? undefined,
  notas:                r.notas      ?? undefined,
  createdBy:            r.created_by ?? undefined,
  createdAt:            r.created_at,
  updatedAt:            r.updated_at,
});

const reconvencionToRow = (r: Partial<Reconvencion>): Record<string, unknown> => {
  const row: Record<string, unknown> = {};
  if (r.matterId             !== undefined) row.matter_id                = r.matterId;
  if (r.presentadaPor        !== undefined) row.presentada_por           = r.presentadaPor;
  if (r.fechaPresentacion    !== undefined) row.fecha_presentacion       = r.fechaPresentacion;
  if (r.fechaTrasladoCorrido !== undefined) row.fecha_traslado_corrido   = r.fechaTrasladoCorrido ?? null;
  if (r.pretensiones         !== undefined) row.pretensiones             = r.pretensiones;
  if (r.montoReclamado       !== undefined) row.monto_reclamado          = r.montoReclamado       ?? null;
  if (r.pretensionDesc       !== undefined) row.pretension_desc          = r.pretensionDesc       ?? null;
  if (r.estado               !== undefined) row.estado                   = r.estado;
  if (r.eventoPresentacionId !== undefined) row.evento_presentacion_id   = r.eventoPresentacionId ?? null;
  if (r.eventoContestacionId !== undefined) row.evento_contestacion_id   = r.eventoContestacionId ?? null;
  if (r.notas                !== undefined) row.notas                    = r.notas      ?? null;
  if (r.createdBy            !== undefined) row.created_by               = r.createdBy  ?? null;
  return row;
};

export const fetchReconvenciones = async (): Promise<Reconvencion[]> => {
  const { data, error } = await supabase
    .from('reconvenciones')
    .select('*')
    .order('fecha_presentacion', { ascending: false });
  if (error) throw error;
  return (data ?? []).map(toReconvencion);
};

export const createReconvencion = async (
  r: Omit<Reconvencion, 'id' | 'createdAt' | 'updatedAt'>,
): Promise<Reconvencion> => {
  const { data, error } = await supabase
    .from('reconvenciones')
    .insert(reconvencionToRow(r))
    .select()
    .single();
  if (error) throw error;
  return toReconvencion(data);
};

export const updateReconvencion = async (id: string, changes: Partial<Reconvencion>): Promise<void> => {
  const { error } = await supabase
    .from('reconvenciones')
    .update(reconvencionToRow(changes))
    .eq('id', id);
  if (error) throw error;
};

export const deleteReconvencion = async (id: string): Promise<void> => {
  const { error } = await supabase
    .from('reconvenciones')
    .delete()
    .eq('id', id);
  if (error) throw error;
};

// ── Bienes / patrimonio (migración 045 — GAP R4 + R9 + R14) ───────

const toSociedadInterpuesta = (r: any): SociedadInterpuesta => ({
  id:               r.id,
  matterId:         r.matter_id,
  denominacion:     r.denominacion,
  tipoSocietario:   r.tipo_societario   ?? undefined,
  jurisdiccion:     r.jurisdiccion      ?? undefined,
  cuitOIdFiscal:    r.cuit_o_id_fiscal  ?? undefined,
  accionistasDesc:  r.accionistas_desc  ?? undefined,
  observaciones:    r.observaciones     ?? undefined,
  notas:            r.notas      ?? undefined,
  createdBy:        r.created_by ?? undefined,
  createdAt:        r.created_at,
  updatedAt:        r.updated_at,
});

const sociedadInterpuestaToRow = (s: Partial<SociedadInterpuesta>): Record<string, unknown> => {
  const row: Record<string, unknown> = {};
  if (s.matterId        !== undefined) row.matter_id        = s.matterId;
  if (s.denominacion    !== undefined) row.denominacion     = s.denominacion;
  if (s.tipoSocietario  !== undefined) row.tipo_societario  = s.tipoSocietario  ?? null;
  if (s.jurisdiccion    !== undefined) row.jurisdiccion     = s.jurisdiccion    ?? null;
  if (s.cuitOIdFiscal   !== undefined) row.cuit_o_id_fiscal = s.cuitOIdFiscal   ?? null;
  if (s.accionistasDesc !== undefined) row.accionistas_desc = s.accionistasDesc ?? null;
  if (s.observaciones   !== undefined) row.observaciones    = s.observaciones   ?? null;
  if (s.notas           !== undefined) row.notas            = s.notas      ?? null;
  if (s.createdBy       !== undefined) row.created_by       = s.createdBy  ?? null;
  return row;
};

const toBien = (r: any): Bien => ({
  id:                    r.id,
  matterId:              r.matter_id,
  naturaleza:            r.naturaleza as BienNaturaleza,
  tipo:                  r.tipo       as BienTipo,
  descripcion:           r.descripcion,
  pais:                  r.pais                     ?? undefined,
  titularRol:            r.titular_rol               as TitularRol,
  titularDetalle:        r.titular_detalle          ?? undefined,
  valorActual:           r.valor_actual != null ? Number(r.valor_actual) : undefined,
  monedaActual:          r.moneda_actual            ?? undefined,
  fechaValuacionActual:  r.fecha_valuacion_actual   ?? undefined,
  sociedadInterpuestaId: r.sociedad_interpuesta_id  ?? undefined,
  caracter:              r.caracter                 ?? undefined,
  motivoCaracter:        r.motivo_caracter          ?? undefined,
  observaciones:         r.observaciones            ?? undefined,
  notas:                 r.notas      ?? undefined,
  createdBy:             r.created_by ?? undefined,
  createdAt:             r.created_at,
  updatedAt:             r.updated_at,
});

const bienToRow = (b: Partial<Bien>): Record<string, unknown> => {
  const row: Record<string, unknown> = {};
  if (b.matterId              !== undefined) row.matter_id                = b.matterId;
  if (b.naturaleza            !== undefined) row.naturaleza               = b.naturaleza;
  if (b.tipo                  !== undefined) row.tipo                     = b.tipo;
  if (b.descripcion           !== undefined) row.descripcion              = b.descripcion;
  if (b.pais                  !== undefined) row.pais                     = b.pais                  ?? null;
  if (b.titularRol            !== undefined) row.titular_rol              = b.titularRol;
  if (b.titularDetalle        !== undefined) row.titular_detalle          = b.titularDetalle        ?? null;
  if (b.valorActual           !== undefined) row.valor_actual             = b.valorActual           ?? null;
  if (b.monedaActual          !== undefined) row.moneda_actual            = b.monedaActual          ?? null;
  if (b.fechaValuacionActual  !== undefined) row.fecha_valuacion_actual   = b.fechaValuacionActual  ?? null;
  if (b.sociedadInterpuestaId !== undefined) row.sociedad_interpuesta_id  = b.sociedadInterpuestaId ?? null;
  if (b.caracter              !== undefined) row.caracter                 = b.caracter              ?? null;
  if (b.motivoCaracter        !== undefined) row.motivo_caracter          = b.motivoCaracter        ?? null;
  if (b.observaciones         !== undefined) row.observaciones            = b.observaciones         ?? null;
  if (b.notas                 !== undefined) row.notas                    = b.notas      ?? null;
  if (b.createdBy             !== undefined) row.created_by               = b.createdBy  ?? null;
  return row;
};

const toBienValuacion = (r: any): BienValuacion => ({
  id:        r.id,
  bienId:    r.bien_id,
  fecha:     r.fecha,
  valor:     Number(r.valor),
  moneda:    r.moneda,
  fuente:    r.fuente     ?? undefined,
  notas:     r.notas      ?? undefined,
  createdBy: r.created_by ?? undefined,
  createdAt: r.created_at,
});

const bienValuacionToRow = (v: Partial<BienValuacion>): Record<string, unknown> => {
  const row: Record<string, unknown> = {};
  if (v.bienId    !== undefined) row.bien_id    = v.bienId;
  if (v.fecha     !== undefined) row.fecha      = v.fecha;
  if (v.valor     !== undefined) row.valor      = v.valor;
  if (v.moneda    !== undefined) row.moneda     = v.moneda;
  if (v.fuente    !== undefined) row.fuente     = v.fuente     ?? null;
  if (v.notas     !== undefined) row.notas      = v.notas      ?? null;
  if (v.createdBy !== undefined) row.created_by = v.createdBy  ?? null;
  return row;
};

// — Sociedades interpuestas
export const fetchSociedadesInterpuestas = async (): Promise<SociedadInterpuesta[]> => {
  const { data, error } = await supabase
    .from('sociedades_interpuestas')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []).map(toSociedadInterpuesta);
};

export const createSociedadInterpuesta = async (
  s: Omit<SociedadInterpuesta, 'id' | 'createdAt' | 'updatedAt'>,
): Promise<SociedadInterpuesta> => {
  const { data, error } = await supabase
    .from('sociedades_interpuestas')
    .insert(sociedadInterpuestaToRow(s))
    .select()
    .single();
  if (error) throw error;
  return toSociedadInterpuesta(data);
};

export const updateSociedadInterpuesta = async (id: string, changes: Partial<SociedadInterpuesta>): Promise<void> => {
  const { error } = await supabase
    .from('sociedades_interpuestas')
    .update(sociedadInterpuestaToRow(changes))
    .eq('id', id);
  if (error) throw error;
};

export const deleteSociedadInterpuesta = async (id: string): Promise<void> => {
  const { error } = await supabase
    .from('sociedades_interpuestas')
    .delete()
    .eq('id', id);
  if (error) throw error;
};

// — Bienes
export const fetchBienes = async (): Promise<Bien[]> => {
  const { data, error } = await supabase
    .from('bienes')
    .select('*')
    .order('matter_id', { ascending: true })
    .order('naturaleza', { ascending: true })
    .order('created_at', { ascending: true });
  if (error) throw error;
  return (data ?? []).map(toBien);
};

export const createBien = async (
  b: Omit<Bien, 'id' | 'createdAt' | 'updatedAt'>,
): Promise<Bien> => {
  const { data, error } = await supabase
    .from('bienes')
    .insert(bienToRow(b))
    .select()
    .single();
  if (error) throw error;
  return toBien(data);
};

export const updateBien = async (id: string, changes: Partial<Bien>): Promise<void> => {
  const { error } = await supabase
    .from('bienes')
    .update(bienToRow(changes))
    .eq('id', id);
  if (error) throw error;
};

export const deleteBien = async (id: string): Promise<void> => {
  const { error } = await supabase
    .from('bienes')
    .delete()
    .eq('id', id);
  if (error) throw error;
};

// — Valuaciones (snapshots temporales)
export const fetchBienValuaciones = async (): Promise<BienValuacion[]> => {
  const { data, error } = await supabase
    .from('bien_valuaciones')
    .select('*')
    .order('fecha', { ascending: false });
  if (error) throw error;
  return (data ?? []).map(toBienValuacion);
};

export const createBienValuacion = async (
  v: Omit<BienValuacion, 'id' | 'createdAt'>,
): Promise<BienValuacion> => {
  const { data, error } = await supabase
    .from('bien_valuaciones')
    .insert(bienValuacionToRow(v))
    .select()
    .single();
  if (error) throw error;
  return toBienValuacion(data);
};

export const deleteBienValuacion = async (id: string): Promise<void> => {
  const { error } = await supabase
    .from('bien_valuaciones')
    .delete()
    .eq('id', id);
  if (error) throw error;
};

// ── Causas relacionadas (migración 046 — GAP R12) ─────────────────

const toCausaRelacionada = (r: any): CausaRelacionada => ({
  id:                     r.id,
  matterId:               r.matter_id,
  vinculacion:            r.vinculacion as VinculacionCausa,
  matterRelacionadaId:    r.matter_relacionada_id ?? undefined,
  tipoCausa:              r.tipo_causa as TipoCausaRelacionada,
  caratula:               r.caratula                ?? undefined,
  fuero:                  r.fuero                   ?? undefined,
  juzgado:                r.juzgado                 ?? undefined,
  expedienteNumero:       r.expediente_numero       ?? undefined,
  jurisdiccion:           r.jurisdiccion            ?? undefined,
  abogadoExternoNombre:   r.abogado_externo_nombre  ?? undefined,
  abogadoExternoContacto: r.abogado_externo_contacto ?? undefined,
  estadoExterno:          r.estado_externo          ?? undefined,
  descripcion:            r.descripcion             ?? undefined,
  impacto:                r.impacto                 ?? undefined,
  fechaInicio:            r.fecha_inicio            ?? undefined,
  fechaUltimoMovimiento:  r.fecha_ultimo_movimiento ?? undefined,
  notas:                  r.notas      ?? undefined,
  createdBy:              r.created_by ?? undefined,
  createdAt:              r.created_at,
  updatedAt:              r.updated_at,
});

const causaRelacionadaToRow = (c: Partial<CausaRelacionada>): Record<string, unknown> => {
  const row: Record<string, unknown> = {};
  if (c.matterId               !== undefined) row.matter_id                 = c.matterId;
  if (c.vinculacion            !== undefined) row.vinculacion               = c.vinculacion;
  if (c.matterRelacionadaId    !== undefined) row.matter_relacionada_id     = c.matterRelacionadaId    ?? null;
  if (c.tipoCausa              !== undefined) row.tipo_causa                = c.tipoCausa;
  if (c.caratula               !== undefined) row.caratula                  = c.caratula               ?? null;
  if (c.fuero                  !== undefined) row.fuero                     = c.fuero                  ?? null;
  if (c.juzgado                !== undefined) row.juzgado                   = c.juzgado                ?? null;
  if (c.expedienteNumero       !== undefined) row.expediente_numero         = c.expedienteNumero       ?? null;
  if (c.jurisdiccion           !== undefined) row.jurisdiccion              = c.jurisdiccion           ?? null;
  if (c.abogadoExternoNombre   !== undefined) row.abogado_externo_nombre    = c.abogadoExternoNombre   ?? null;
  if (c.abogadoExternoContacto !== undefined) row.abogado_externo_contacto  = c.abogadoExternoContacto ?? null;
  if (c.estadoExterno          !== undefined) row.estado_externo            = c.estadoExterno          ?? null;
  if (c.descripcion            !== undefined) row.descripcion               = c.descripcion            ?? null;
  if (c.impacto                !== undefined) row.impacto                   = c.impacto                ?? null;
  if (c.fechaInicio            !== undefined) row.fecha_inicio              = c.fechaInicio            ?? null;
  if (c.fechaUltimoMovimiento  !== undefined) row.fecha_ultimo_movimiento   = c.fechaUltimoMovimiento  ?? null;
  if (c.notas                  !== undefined) row.notas                     = c.notas      ?? null;
  if (c.createdBy              !== undefined) row.created_by                = c.createdBy  ?? null;
  return row;
};

export const fetchCausasRelacionadas = async (): Promise<CausaRelacionada[]> => {
  const { data, error } = await supabase
    .from('causas_relacionadas')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []).map(toCausaRelacionada);
};

export const createCausaRelacionada = async (
  c: Omit<CausaRelacionada, 'id' | 'createdAt' | 'updatedAt'>,
): Promise<CausaRelacionada> => {
  const { data, error } = await supabase
    .from('causas_relacionadas')
    .insert(causaRelacionadaToRow(c))
    .select()
    .single();
  if (error) throw error;
  return toCausaRelacionada(data);
};

export const updateCausaRelacionada = async (id: string, changes: Partial<CausaRelacionada>): Promise<void> => {
  const { error } = await supabase
    .from('causas_relacionadas')
    .update(causaRelacionadaToRow(changes))
    .eq('id', id);
  if (error) throw error;
};

export const deleteCausaRelacionada = async (id: string): Promise<void> => {
  const { error } = await supabase
    .from('causas_relacionadas')
    .delete()
    .eq('id', id);
  if (error) throw error;
};

// ── Cautelares + Veedores (migración 047 — GAP R15) ───────────────

const toCautelar = (r: any): Cautelar => ({
  id:                        r.id,
  matterId:                  r.matter_id,
  tipo:                      r.tipo                        as TipoCautelar,
  contraRol:                 r.contra_rol                  as TitularRol,
  contraDetalle:             r.contra_detalle              ?? undefined,
  bienId:                    r.bien_id                     ?? undefined,
  sociedadInterpuestaId:     r.sociedad_interpuesta_id     ?? undefined,
  alcance:                   r.alcance                     ?? undefined,
  estado:                    r.estado                      as EstadoCautelar,
  fechaSolicitud:            r.fecha_solicitud             ?? undefined,
  fechaResolucion:           r.fecha_resolucion            ?? undefined,
  fechaTraba:                r.fecha_traba                 ?? undefined,
  fechaLevantamientoParcial: r.fecha_levantamiento_parcial ?? undefined,
  fechaLevantamientoTotal:   r.fecha_levantamiento_total   ?? undefined,
  fechaRechazo:              r.fecha_rechazo               ?? undefined,
  registroInscripcion:       r.registro_inscripcion        ?? undefined,
  caucionTipo:               r.caucion_tipo                ?? undefined,
  caucionMontoDesc:          r.caucion_monto_desc          ?? undefined,
  observaciones:             r.observaciones               ?? undefined,
  notas:                     r.notas      ?? undefined,
  createdBy:                 r.created_by ?? undefined,
  createdAt:                 r.created_at,
  updatedAt:                 r.updated_at,
});

const cautelarToRow = (c: Partial<Cautelar>): Record<string, unknown> => {
  const row: Record<string, unknown> = {};
  if (c.matterId                  !== undefined) row.matter_id                    = c.matterId;
  if (c.tipo                      !== undefined) row.tipo                         = c.tipo;
  if (c.contraRol                 !== undefined) row.contra_rol                   = c.contraRol;
  if (c.contraDetalle             !== undefined) row.contra_detalle               = c.contraDetalle             ?? null;
  if (c.bienId                    !== undefined) row.bien_id                      = c.bienId                    ?? null;
  if (c.sociedadInterpuestaId     !== undefined) row.sociedad_interpuesta_id      = c.sociedadInterpuestaId     ?? null;
  if (c.alcance                   !== undefined) row.alcance                      = c.alcance                   ?? null;
  if (c.estado                    !== undefined) row.estado                       = c.estado;
  if (c.fechaSolicitud            !== undefined) row.fecha_solicitud              = c.fechaSolicitud            ?? null;
  if (c.fechaResolucion           !== undefined) row.fecha_resolucion             = c.fechaResolucion           ?? null;
  if (c.fechaTraba                !== undefined) row.fecha_traba                  = c.fechaTraba                ?? null;
  if (c.fechaLevantamientoParcial !== undefined) row.fecha_levantamiento_parcial  = c.fechaLevantamientoParcial ?? null;
  if (c.fechaLevantamientoTotal   !== undefined) row.fecha_levantamiento_total    = c.fechaLevantamientoTotal   ?? null;
  if (c.fechaRechazo              !== undefined) row.fecha_rechazo                = c.fechaRechazo              ?? null;
  if (c.registroInscripcion       !== undefined) row.registro_inscripcion         = c.registroInscripcion       ?? null;
  if (c.caucionTipo               !== undefined) row.caucion_tipo                 = c.caucionTipo               ?? null;
  if (c.caucionMontoDesc          !== undefined) row.caucion_monto_desc           = c.caucionMontoDesc          ?? null;
  if (c.observaciones             !== undefined) row.observaciones                = c.observaciones             ?? null;
  if (c.notas                     !== undefined) row.notas                        = c.notas      ?? null;
  if (c.createdBy                 !== undefined) row.created_by                   = c.createdBy  ?? null;
  return row;
};

const toVeedor = (r: any): Veedor => ({
  id:                  r.id,
  matterId:            r.matter_id,
  cautelarId:          r.cautelar_id          ?? undefined,
  nombre:              r.nombre,
  especialidad:        r.especialidad         ?? undefined,
  matricula:           r.matricula            ?? undefined,
  email:               r.email                ?? undefined,
  telefono:            r.telefono             ?? undefined,
  estado:              r.estado               as EstadoVeedor,
  alcance:             r.alcance              ?? undefined,
  frecuenciaInformes:  r.frecuencia_informes  ?? undefined,
  fechaDesignacion:    r.fecha_designacion    ?? undefined,
  fechaAceptacion:     r.fecha_aceptacion     ?? undefined,
  fechaCese:           r.fecha_cese           ?? undefined,
  honorariosDesc:      r.honorarios_desc      ?? undefined,
  observaciones:       r.observaciones        ?? undefined,
  notas:               r.notas      ?? undefined,
  createdBy:           r.created_by ?? undefined,
  createdAt:           r.created_at,
  updatedAt:           r.updated_at,
});

const veedorToRow = (v: Partial<Veedor>): Record<string, unknown> => {
  const row: Record<string, unknown> = {};
  if (v.matterId           !== undefined) row.matter_id            = v.matterId;
  if (v.cautelarId         !== undefined) row.cautelar_id          = v.cautelarId         ?? null;
  if (v.nombre             !== undefined) row.nombre               = v.nombre;
  if (v.especialidad       !== undefined) row.especialidad         = v.especialidad       ?? null;
  if (v.matricula          !== undefined) row.matricula            = v.matricula          ?? null;
  if (v.email              !== undefined) row.email                = v.email              ?? null;
  if (v.telefono           !== undefined) row.telefono             = v.telefono           ?? null;
  if (v.estado             !== undefined) row.estado               = v.estado;
  if (v.alcance            !== undefined) row.alcance              = v.alcance            ?? null;
  if (v.frecuenciaInformes !== undefined) row.frecuencia_informes  = v.frecuenciaInformes ?? null;
  if (v.fechaDesignacion   !== undefined) row.fecha_designacion    = v.fechaDesignacion   ?? null;
  if (v.fechaAceptacion    !== undefined) row.fecha_aceptacion     = v.fechaAceptacion    ?? null;
  if (v.fechaCese          !== undefined) row.fecha_cese           = v.fechaCese          ?? null;
  if (v.honorariosDesc     !== undefined) row.honorarios_desc      = v.honorariosDesc     ?? null;
  if (v.observaciones      !== undefined) row.observaciones        = v.observaciones      ?? null;
  if (v.notas              !== undefined) row.notas                = v.notas      ?? null;
  if (v.createdBy          !== undefined) row.created_by           = v.createdBy  ?? null;
  return row;
};

export const fetchCautelares = async (): Promise<Cautelar[]> => {
  const { data, error } = await supabase
    .from('cautelares')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []).map(toCautelar);
};

export const createCautelar = async (
  c: Omit<Cautelar, 'id' | 'createdAt' | 'updatedAt'>,
): Promise<Cautelar> => {
  const { data, error } = await supabase.from('cautelares').insert(cautelarToRow(c)).select().single();
  if (error) throw error;
  return toCautelar(data);
};

export const updateCautelar = async (id: string, changes: Partial<Cautelar>): Promise<void> => {
  const { error } = await supabase.from('cautelares').update(cautelarToRow(changes)).eq('id', id);
  if (error) throw error;
};

export const deleteCautelar = async (id: string): Promise<void> => {
  const { error } = await supabase.from('cautelares').delete().eq('id', id);
  if (error) throw error;
};

export const fetchVeedores = async (): Promise<Veedor[]> => {
  const { data, error } = await supabase.from('veedores').select('*').order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []).map(toVeedor);
};

export const createVeedor = async (
  v: Omit<Veedor, 'id' | 'createdAt' | 'updatedAt'>,
): Promise<Veedor> => {
  const { data, error } = await supabase.from('veedores').insert(veedorToRow(v)).select().single();
  if (error) throw error;
  return toVeedor(data);
};

export const updateVeedor = async (id: string, changes: Partial<Veedor>): Promise<void> => {
  const { error } = await supabase.from('veedores').update(veedorToRow(changes)).eq('id', id);
  if (error) throw error;
};

export const deleteVeedor = async (id: string): Promise<void> => {
  const { error } = await supabase.from('veedores').delete().eq('id', id);
  if (error) throw error;
};

// ── Cuotas alimentarias + conceptos en especie (migración 048 — GAP R13)

const toCuotaAlimentaria = (r: any): CuotaAlimentaria => ({
  id:                  r.id,
  matterId:            r.matter_id,
  estado:              r.estado            as EstadoCuotaAlimentaria,
  obligadoRol:         r.obligado_rol      as TitularRol,
  obligadoDetalle:     r.obligado_detalle  ?? undefined,
  alcance:             r.alcance           as AlcanceCuota,
  hijosCubiertos:      (r.hijos_cubiertos ?? []) as string[],
  montoEfectivo:       r.monto_efectivo != null ? Number(r.monto_efectivo) : undefined,
  moneda:              r.moneda            ?? undefined,
  frecuencia:          r.frecuencia        as FrecuenciaCuotaAlim,
  ajuste:              r.ajuste            ?? undefined,
  ajusteDesc:          r.ajuste_desc       ?? undefined,
  fechaVigenciaDesde:  r.fecha_vigencia_desde ?? undefined,
  fechaVigenciaHasta:  r.fecha_vigencia_hasta ?? undefined,
  fundamento:          r.fundamento        ?? undefined,
  eventoOrigenId:      r.evento_origen_id  ?? undefined,
  notas:               r.notas      ?? undefined,
  createdBy:           r.created_by ?? undefined,
  createdAt:           r.created_at,
  updatedAt:           r.updated_at,
});

const cuotaAlimentariaToRow = (c: Partial<CuotaAlimentaria>): Record<string, unknown> => {
  const row: Record<string, unknown> = {};
  if (c.matterId           !== undefined) row.matter_id            = c.matterId;
  if (c.estado             !== undefined) row.estado               = c.estado;
  if (c.obligadoRol        !== undefined) row.obligado_rol         = c.obligadoRol;
  if (c.obligadoDetalle    !== undefined) row.obligado_detalle     = c.obligadoDetalle    ?? null;
  if (c.alcance            !== undefined) row.alcance              = c.alcance;
  if (c.hijosCubiertos     !== undefined) row.hijos_cubiertos      = c.hijosCubiertos;
  if (c.montoEfectivo      !== undefined) row.monto_efectivo       = c.montoEfectivo      ?? null;
  if (c.moneda             !== undefined) row.moneda               = c.moneda             ?? null;
  if (c.frecuencia         !== undefined) row.frecuencia           = c.frecuencia;
  if (c.ajuste             !== undefined) row.ajuste               = c.ajuste             ?? null;
  if (c.ajusteDesc         !== undefined) row.ajuste_desc          = c.ajusteDesc         ?? null;
  if (c.fechaVigenciaDesde !== undefined) row.fecha_vigencia_desde = c.fechaVigenciaDesde ?? null;
  if (c.fechaVigenciaHasta !== undefined) row.fecha_vigencia_hasta = c.fechaVigenciaHasta ?? null;
  if (c.fundamento         !== undefined) row.fundamento           = c.fundamento         ?? null;
  if (c.eventoOrigenId     !== undefined) row.evento_origen_id     = c.eventoOrigenId     ?? null;
  if (c.notas              !== undefined) row.notas                = c.notas      ?? null;
  if (c.createdBy          !== undefined) row.created_by           = c.createdBy  ?? null;
  return row;
};

const toCuotaConceptoEspecie = (r: any): CuotaConceptoEspecie => ({
  id:                  r.id,
  cuotaAlimentariaId:  r.cuota_alimentaria_id,
  categoria:           r.categoria          as CategoriaConceptoEspecie,
  concepto:            r.concepto,
  prestador:           r.prestador          ?? undefined,
  montoEstimado:       r.monto_estimado != null ? Number(r.monto_estimado) : undefined,
  moneda:              r.moneda             ?? undefined,
  frecuencia:          r.frecuencia         as FrecuenciaCuotaAlim,
  pagador:             r.pagador            as PagadorConcepto,
  pagadorDetalle:      r.pagador_detalle    ?? undefined,
  hijoId:              r.hijo_id            ?? undefined,
  notas:               r.notas      ?? undefined,
  createdBy:           r.created_by ?? undefined,
  createdAt:           r.created_at,
  updatedAt:           r.updated_at,
});

const cuotaConceptoToRow = (c: Partial<CuotaConceptoEspecie>): Record<string, unknown> => {
  const row: Record<string, unknown> = {};
  if (c.cuotaAlimentariaId !== undefined) row.cuota_alimentaria_id = c.cuotaAlimentariaId;
  if (c.categoria          !== undefined) row.categoria            = c.categoria;
  if (c.concepto           !== undefined) row.concepto             = c.concepto;
  if (c.prestador          !== undefined) row.prestador            = c.prestador          ?? null;
  if (c.montoEstimado      !== undefined) row.monto_estimado       = c.montoEstimado      ?? null;
  if (c.moneda             !== undefined) row.moneda               = c.moneda             ?? null;
  if (c.frecuencia         !== undefined) row.frecuencia           = c.frecuencia;
  if (c.pagador            !== undefined) row.pagador              = c.pagador;
  if (c.pagadorDetalle     !== undefined) row.pagador_detalle      = c.pagadorDetalle     ?? null;
  if (c.hijoId             !== undefined) row.hijo_id              = c.hijoId             ?? null;
  if (c.notas              !== undefined) row.notas                = c.notas      ?? null;
  if (c.createdBy          !== undefined) row.created_by           = c.createdBy  ?? null;
  return row;
};

export const fetchCuotasAlimentarias = async (): Promise<CuotaAlimentaria[]> => {
  const { data, error } = await supabase
    .from('cuotas_alimentarias')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []).map(toCuotaAlimentaria);
};

export const createCuotaAlimentaria = async (
  c: Omit<CuotaAlimentaria, 'id' | 'createdAt' | 'updatedAt'>,
): Promise<CuotaAlimentaria> => {
  const { data, error } = await supabase.from('cuotas_alimentarias').insert(cuotaAlimentariaToRow(c)).select().single();
  if (error) throw error;
  return toCuotaAlimentaria(data);
};

export const updateCuotaAlimentaria = async (id: string, changes: Partial<CuotaAlimentaria>): Promise<void> => {
  const { error } = await supabase.from('cuotas_alimentarias').update(cuotaAlimentariaToRow(changes)).eq('id', id);
  if (error) throw error;
};

export const deleteCuotaAlimentaria = async (id: string): Promise<void> => {
  const { error } = await supabase.from('cuotas_alimentarias').delete().eq('id', id);
  if (error) throw error;
};

export const fetchCuotaConceptosEspecie = async (): Promise<CuotaConceptoEspecie[]> => {
  const { data, error } = await supabase
    .from('cuota_conceptos_especie')
    .select('*')
    .order('created_at', { ascending: true });
  if (error) throw error;
  return (data ?? []).map(toCuotaConceptoEspecie);
};

export const createCuotaConceptoEspecie = async (
  c: Omit<CuotaConceptoEspecie, 'id' | 'createdAt' | 'updatedAt'>,
): Promise<CuotaConceptoEspecie> => {
  const { data, error } = await supabase.from('cuota_conceptos_especie').insert(cuotaConceptoToRow(c)).select().single();
  if (error) throw error;
  return toCuotaConceptoEspecie(data);
};

export const updateCuotaConceptoEspecie = async (id: string, changes: Partial<CuotaConceptoEspecie>): Promise<void> => {
  const { error } = await supabase.from('cuota_conceptos_especie').update(cuotaConceptoToRow(changes)).eq('id', id);
  if (error) throw error;
};

export const deleteCuotaConceptoEspecie = async (id: string): Promise<void> => {
  const { error } = await supabase.from('cuota_conceptos_especie').delete().eq('id', id);
  if (error) throw error;
};

// ── Controversias del caso (migración 055 — GAP UX-33) ───────

const toControversia = (r: any): Controversia => ({
  id:                  r.id,
  matterId:            r.matter_id,
  categoria:           r.categoria             as CategoriaControversia,
  titulo:              r.titulo,
  fechaHecho:          r.fecha_hecho,
  descripcion:         r.descripcion           ?? undefined,
  posicionCliente:     r.posicion_cliente      ?? undefined,
  posicionContraparte: r.posicion_contraparte  ?? undefined,
  plazoCritico:        r.plazo_critico         ?? undefined,
  estado:              r.estado                as EstadoControversia,
  subprocesoId:        r.subproceso_id         ?? undefined,
  eventoOrigenId:      r.evento_origen_id      ?? undefined,
  documentosUrls:      Array.isArray(r.documentos_urls) ? r.documentos_urls : [],
  notas:               r.notas                 ?? undefined,
  createdBy:           r.created_by            ?? undefined,
  createdAt:           r.created_at,
  updatedAt:           r.updated_at,
});

const controversiaToRow = (c: Partial<Controversia>): Record<string, unknown> => {
  const row: Record<string, unknown> = {};
  if (c.matterId            !== undefined) row.matter_id            = c.matterId;
  if (c.categoria           !== undefined) row.categoria            = c.categoria;
  if (c.titulo              !== undefined) row.titulo               = c.titulo;
  if (c.fechaHecho          !== undefined) row.fecha_hecho          = c.fechaHecho;
  if (c.descripcion         !== undefined) row.descripcion          = c.descripcion          ?? null;
  if (c.posicionCliente     !== undefined) row.posicion_cliente     = c.posicionCliente      ?? null;
  if (c.posicionContraparte !== undefined) row.posicion_contraparte = c.posicionContraparte  ?? null;
  if (c.plazoCritico        !== undefined) row.plazo_critico        = c.plazoCritico         ?? null;
  if (c.estado              !== undefined) row.estado               = c.estado;
  if (c.subprocesoId        !== undefined) row.subproceso_id        = c.subprocesoId         ?? null;
  if (c.eventoOrigenId      !== undefined) row.evento_origen_id     = c.eventoOrigenId       ?? null;
  if (c.documentosUrls      !== undefined) row.documentos_urls      = c.documentosUrls;
  if (c.notas               !== undefined) row.notas                = c.notas               ?? null;
  if (c.createdBy           !== undefined) row.created_by           = c.createdBy           ?? null;
  return row;
};

export const fetchControversias = async (): Promise<Controversia[]> => {
  const { data, error } = await supabase
    .from('controversias_caso')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []).map(toControversia);
};

export const createControversia = async (
  c: Omit<Controversia, 'id' | 'createdAt' | 'updatedAt'>,
): Promise<Controversia> => {
  const { data, error } = await supabase.from('controversias_caso').insert(controversiaToRow(c)).select().single();
  if (error) throw error;
  return toControversia(data);
};

export const updateControversia = async (id: string, changes: Partial<Controversia>): Promise<void> => {
  const { error } = await supabase.from('controversias_caso').update(controversiaToRow(changes)).eq('id', id);
  if (error) throw error;
};

export const deleteControversia = async (id: string): Promise<void> => {
  const { error } = await supabase.from('controversias_caso').delete().eq('id', id);
  if (error) throw error;
};
