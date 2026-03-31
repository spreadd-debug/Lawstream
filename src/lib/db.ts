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
} from '../types';

// ── Profiles ──────────────────────────────────────────────────────

const toProfile = (r: any): UserProfile => ({
  id:       r.id,
  fullName: r.full_name,
  email:    r.email,
  role:     r.role,
  initials: r.initials,
  isActive: r.is_active,
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
  if (changes.isActive !== undefined) row.is_active = changes.isActive;
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
      .update({ role, initials: fullName.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2) })
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
});

const toClient = (r: any): Client => ({
  id:            r.id,
  name:          r.name,
  email:         r.email         ?? '',
  phone:         r.phone         ?? '',
  type:          r.type,
  lastActivity:  r.last_activity,
  notes:         r.notes         ?? undefined,
  activeMatters: 0, // calculado en el front desde la lista de matters
  closedMatters: 0,
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
});

const clientToRow = (c: Partial<Client>) => ({
  ...(c.name         !== undefined && { name:          c.name }),
  ...(c.email        !== undefined && { email:         c.email }),
  ...(c.phone        !== undefined && { phone:         c.phone }),
  ...(c.type         !== undefined && { type:          c.type }),
  ...(c.lastActivity !== undefined && { last_activity: c.lastActivity }),
  ...(c.notes        !== undefined && { notes:         c.notes }),
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
});

// ── Fetches ───────────────────────────────────────────────────────

export const fetchMatters = async (): Promise<Matter[]> => {
  const { data, error } = await supabase
    .from('matters')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []).map(toMatter);
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
  const { data, error } = await supabase
    .from('studio_config')
    .select('*')
    .eq('key', key)
    .single();
  if (error) return null;
  return toStudioConfig(data);
};

export const upsertStudioConfig = async (key: string, value: Record<string, unknown>, updatedBy?: string): Promise<void> => {
  const { error } = await supabase
    .from('studio_config')
    .upsert({ key, value, updated_at: new Date().toISOString(), updated_by: updatedBy ?? null }, { onConflict: 'key' });
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

export const fetchEstudioPerfil = async (): Promise<EstudioPerfil> => {
  const { data } = await supabase.from('estudio_perfil').select('*').limit(1).single();
  return data ? toEstudioPerfil(data) : { nombre: 'Mi Estudio Jurídico' };
};

export const upsertEstudioPerfil = async (perfil: Partial<EstudioPerfil>): Promise<void> => {
  const existing = await supabase.from('estudio_perfil').select('id').limit(1).single();
  const row: any = { updated_at: new Date().toISOString() };
  if (perfil.nombre         !== undefined) row.nombre          = perfil.nombre;
  if (perfil.cuit           !== undefined) row.cuit            = perfil.cuit;
  if (perfil.email          !== undefined) row.email           = perfil.email;
  if (perfil.telefono       !== undefined) row.telefono        = perfil.telefono;
  if (perfil.direccion      !== undefined) row.direccion       = perfil.direccion;
  if (perfil.logoUrl        !== undefined) row.logo_url        = perfil.logoUrl;
  if (perfil.cbu            !== undefined) row.cbu             = perfil.cbu;
  if (perfil.aliasCbu       !== undefined) row.alias_cbu       = perfil.aliasCbu;
  if (perfil.banco          !== undefined) row.banco           = perfil.banco;
  if (perfil.titularCuenta  !== undefined) row.titular_cuenta  = perfil.titularCuenta;
  if (perfil.firmaUrl       !== undefined) row.firma_url       = perfil.firmaUrl;
  if (perfil.footerText     !== undefined) row.footer_text     = perfil.footerText;

  if (existing.data?.id) {
    await supabase.from('estudio_perfil').update(row).eq('id', existing.data.id);
  } else {
    await supabase.from('estudio_perfil').insert(row);
  }
};

/** Upload logo or firma to Supabase Storage and return public URL */
export const uploadEstudioAsset = async (file: File, path: 'logo' | 'firma'): Promise<string> => {
  const ext = file.name.split('.').pop();
  const filePath = `${path}/${Date.now()}.${ext}`;
  const { error } = await supabase.storage.from('estudio-assets').upload(filePath, file, { upsert: true });
  if (error) throw error;
  const { data } = supabase.storage.from('estudio-assets').getPublicUrl(filePath);
  return data.publicUrl;
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
    })
    .select()
    .single();
  if (error) throw error;
  return toTask(data);
};

export const updateTask = async (id: string, changes: Partial<Task>): Promise<void> => {
  const row: any = {};
  if (changes.status      !== undefined) row.status       = changes.status;
  if (changes.title       !== undefined) row.title        = changes.title;
  if (changes.dueDate     !== undefined) row.due_date     = changes.dueDate || null;
  if (changes.priority    !== undefined) row.priority     = changes.priority;
  if (changes.completedAt !== undefined) row.completed_at = changes.completedAt;
  if (changes.completedBy !== undefined) row.completed_by = changes.completedBy;
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
