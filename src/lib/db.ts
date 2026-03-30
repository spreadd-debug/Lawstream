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
  StudioConfig,
  EstudioPerfil,
  Expediente,
  ExpedienteEstadoLog,
  EstadoTroncal,
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
  consultationFeePaid:  r.consultation_fee_paid ?? false,
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
  id:        r.id,
  matterId:  r.matter_id,
  title:     r.title,
  dueDate:   r.due_date ?? '',
  status:    r.status,
  priority:  r.priority,
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
  if (changes.consultationFeePaid !== undefined) row.consultation_fee_paid = changes.consultationFeePaid;
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
      consultation_fee_paid: c.consultationFeePaid ?? false,
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
