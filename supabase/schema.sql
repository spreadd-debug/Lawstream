-- ================================================================
-- LAWSTREAM — ESQUEMA DE BASE DE DATOS
-- Ejecutar completo en: Supabase Dashboard → SQL Editor → New query
-- ================================================================

-- ── CLIENTES ────────────────────────────────────────────────────
-- Mapa de campos:
--   id            ←→  Client.id
--   name          ←→  Client.name
--   email         ←→  Client.email
--   phone         ←→  Client.phone
--   type          ←→  Client.type          ('Persona' | 'Empresa')
--   last_activity ←→  Client.lastActivity
--   notes         ←→  Client.notes
--   (activeMatters y closedMatters se calculan desde la tabla matters)

CREATE TABLE IF NOT EXISTS clients (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  name          TEXT        NOT NULL,
  email         TEXT        NOT NULL DEFAULT '',
  phone         TEXT        NOT NULL DEFAULT '',
  type          TEXT        NOT NULL CHECK (type IN ('Persona', 'Empresa')),
  last_activity TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  notes         TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── ASUNTOS (MATTERS) ────────────────────────────────────────────
-- Mapa de campos:
--   id               ←→  Matter.id
--   title            ←→  Matter.title
--   client           ←→  Matter.client          (nombre del cliente, texto libre)
--   type             ←→  Matter.type            ('Laboral' | 'Familia' | 'Daños' | 'Comercial' | 'Sucesiones' | 'Civil')
--   status           ←→  Matter.status          ('Activo' | 'Suspendido' | 'Cerrado' | 'Pausado')
--   health           ←→  Matter.health          ('Sano' | 'Trabado' | 'Roto' | 'En espera')
--   responsible      ←→  Matter.responsible
--   next_action      ←→  Matter.nextAction
--   next_action_type ←→  Matter.nextActionType
--   next_action_date ←→  Matter.nextActionDate
--   priority         ←→  Matter.priority        ('Alta' | 'Media' | 'Baja')
--   last_activity    ←→  Matter.lastActivity
--   subtype          ←→  Matter.subtype
--   blockage         ←→  Matter.blockage
--   reason_for_queue ←→  Matter.reasonForQueue
--   expediente       ←→  Matter.expediente
--   description      ←→  Matter.description

CREATE TABLE IF NOT EXISTS matters (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  title            TEXT        NOT NULL,
  client           TEXT        NOT NULL,
  type             TEXT        NOT NULL CHECK (type IN ('Laboral', 'Familia', 'Daños', 'Comercial', 'Sucesiones', 'Civil')),
  status           TEXT        NOT NULL DEFAULT 'Activo' CHECK (status IN ('Activo', 'Suspendido', 'Cerrado', 'Pausado')),
  health           TEXT        NOT NULL DEFAULT 'Sano'   CHECK (health IN ('Sano', 'Trabado', 'Roto', 'En espera')),
  responsible      TEXT        NOT NULL,
  next_action      TEXT        NOT NULL DEFAULT '',
  next_action_type TEXT,
  next_action_date TIMESTAMPTZ,
  priority         TEXT        NOT NULL DEFAULT 'Media'  CHECK (priority IN ('Alta', 'Media', 'Baja')),
  last_activity    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  subtype          TEXT,
  blockage         TEXT,
  reason_for_queue TEXT,
  expediente       TEXT,
  description      TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── CONSULTAS (CONSULTATIONS) ────────────────────────────────────
-- Mapa de campos:
--   id          ←→  Consultation.id
--   name        ←→  Consultation.name
--   status      ←→  Consultation.status   ('Nueva' | 'Contactada' | 'Esperando info' | ...)
--   date        ←→  Consultation.date
--   origin      ←→  Consultation.origin   ('WhatsApp' | 'Web' | 'Referido' | 'Llamada' | 'Otro')
--   next_step   ←→  Consultation.nextStep
--   responsible ←→  Consultation.responsible
--   type        ←→  Consultation.type
--   description ←→  Consultation.description
--   email       ←→  Consultation.email
--   phone       ←→  Consultation.phone
--   notes       ←→  Consultation.notes    (array de strings)

CREATE TABLE IF NOT EXISTS consultations (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT        NOT NULL,
  status      TEXT        NOT NULL DEFAULT 'Nueva' CHECK (status IN ('Nueva', 'Contactada', 'Esperando info', 'Evaluando viabilidad', 'Presupuestada', 'Aceptada', 'Rechazada', 'Archivada')),
  date        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  origin      TEXT        CHECK (origin IN ('WhatsApp', 'Web', 'Referido', 'Llamada', 'Otro')),
  next_step   TEXT        NOT NULL DEFAULT '',
  responsible TEXT,
  type        TEXT,
  description TEXT,
  email       TEXT,
  phone       TEXT,
  notes       TEXT[],
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── DOCUMENTOS (DOCUMENTS) ───────────────────────────────────────
-- Mapa de campos:
--   id                ←→  LegalDocument.id
--   matter_id         ←→  LegalDocument.matterId
--   matter_title      ←→  LegalDocument.matterTitle   (desnormalizado)
--   client            ←→  LegalDocument.client        (desnormalizado)
--   responsible       ←→  LegalDocument.responsible   (desnormalizado)
--   name              ←→  LegalDocument.name
--   status            ←→  LegalDocument.status        ('Faltante' | 'Solicitado' | 'Recibido' | 'En revisión' | 'Aprobado' | 'Listo para presentar' | 'Presentado')
--   criticality       ←→  LegalDocument.criticality   ('Crítico' | 'Recomendado' | 'Opcional')
--   blocks_progress   ←→  LegalDocument.blocksProgress
--   updated_at        ←→  LegalDocument.updatedAt
--   associated_action ←→  LegalDocument.associatedAction
--   category          ←→  LegalDocument.category

CREATE TABLE IF NOT EXISTS documents (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  matter_id         UUID        NOT NULL REFERENCES matters(id) ON DELETE CASCADE,
  matter_title      TEXT,
  client            TEXT,
  responsible       TEXT,
  name              TEXT        NOT NULL,
  status            TEXT        NOT NULL DEFAULT 'Faltante'  CHECK (status IN ('Faltante', 'Solicitado', 'Recibido', 'En revisión', 'Aprobado', 'Listo para presentar', 'Presentado')),
  criticality       TEXT        NOT NULL DEFAULT 'Crítico'   CHECK (criticality IN ('Crítico', 'Recomendado', 'Opcional')),
  blocks_progress   BOOLEAN     NOT NULL DEFAULT FALSE,
  updated_at        TIMESTAMPTZ,
  associated_action TEXT,
  category          TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── TAREAS (TASKS) ───────────────────────────────────────────────
-- Mapa de campos:
--   id        ←→  Task.id
--   matter_id ←→  Task.matterId
--   title     ←→  Task.title
--   due_date  ←→  Task.dueDate
--   status    ←→  Task.status    ('Pendiente' | 'Completada' | 'En revisión')
--   priority  ←→  Task.priority  ('Alta' | 'Media' | 'Baja')

CREATE TABLE IF NOT EXISTS tasks (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  matter_id  UUID        NOT NULL REFERENCES matters(id) ON DELETE CASCADE,
  title      TEXT        NOT NULL,
  due_date   TIMESTAMPTZ,
  status     TEXT        NOT NULL DEFAULT 'Pendiente' CHECK (status IN ('Pendiente', 'Completada', 'En revisión')),
  priority   TEXT        NOT NULL DEFAULT 'Media'     CHECK (priority IN ('Alta', 'Media', 'Baja')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── TIMELINE ─────────────────────────────────────────────────────
-- Mapa de campos:
--   id          ←→  TimelineEvent.id
--   matter_id   ←→  TimelineEvent.matterId
--   type        ←→  TimelineEvent.type   ('creation' | 'call' | 'doc_received' | 'task_created' | 'deadline' | 'draft' | 'presentation' | 'note' | 'status_change')
--   title       ←→  TimelineEvent.title
--   description ←→  TimelineEvent.description
--   user_name   ←→  TimelineEvent.user   (renombrado: 'user' es palabra reservada en PostgreSQL)
--   date        ←→  TimelineEvent.date

CREATE TABLE IF NOT EXISTS timeline (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  matter_id   UUID        NOT NULL REFERENCES matters(id) ON DELETE CASCADE,
  type        TEXT        NOT NULL CHECK (type IN ('creation', 'call', 'doc_received', 'task_created', 'deadline', 'draft', 'presentation', 'note', 'status_change')),
  title       TEXT        NOT NULL,
  description TEXT,
  user_name   TEXT        NOT NULL,
  date        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ================================================================
-- ROW LEVEL SECURITY
-- ================================================================

ALTER TABLE clients       ENABLE ROW LEVEL SECURITY;
ALTER TABLE matters       ENABLE ROW LEVEL SECURITY;
ALTER TABLE consultations ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents     ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks         ENABLE ROW LEVEL SECURITY;
ALTER TABLE timeline      ENABLE ROW LEVEL SECURITY;

-- Política temporal: acceso total con anon key.
-- IMPORTANTE: antes de producción, reemplazar por políticas basadas en auth.uid()

CREATE POLICY "acceso_total" ON clients       FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "acceso_total" ON matters       FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "acceso_total" ON consultations FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "acceso_total" ON documents     FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "acceso_total" ON tasks         FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "acceso_total" ON timeline      FOR ALL USING (true) WITH CHECK (true);

-- ================================================================
-- ÍNDICES (performance)
-- ================================================================

CREATE INDEX IF NOT EXISTS idx_matters_status   ON matters(status);
CREATE INDEX IF NOT EXISTS idx_matters_client   ON matters(client);
CREATE INDEX IF NOT EXISTS idx_documents_matter ON documents(matter_id);
CREATE INDEX IF NOT EXISTS idx_tasks_matter     ON tasks(matter_id);
CREATE INDEX IF NOT EXISTS idx_timeline_matter  ON timeline(matter_id);
