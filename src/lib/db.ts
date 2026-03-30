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
  id:          r.id,
  name:        r.name,
  status:      r.status,
  date:        r.date,
  origin:      r.origin,
  nextStep:    r.next_step    ?? '',
  responsible: r.responsible  ?? undefined,
  type:        r.type         ?? undefined,
  description: r.description  ?? undefined,
  email:       r.email        ?? undefined,
  phone:       r.phone        ?? undefined,
  notes:       r.notes        ?? undefined,
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
