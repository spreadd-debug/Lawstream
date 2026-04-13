-- 012: Bitácora / Audit Log
-- Solo el Socio puede ver los registros de auditoría.

-- ── Tabla ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS audit_log (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id    UUID        NOT NULL REFERENCES auth.users(id),
  actor_name  TEXT        NOT NULL,             -- snapshot del nombre al momento del evento
  action      TEXT        NOT NULL,             -- verbo: 'crear_asunto', 'editar_asunto', etc.
  entity_type TEXT        NOT NULL,             -- 'matter', 'client', 'consultation', 'task', 'document', 'profile', 'assignment'
  entity_id   UUID,                             -- ID de la entidad afectada (nullable para acciones globales)
  entity_label TEXT,                            -- título/nombre legible de la entidad
  details     JSONB       DEFAULT '{}',         -- metadata adicional (cambios, valores previos, etc.)
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_log_created   ON audit_log (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_log_actor     ON audit_log (actor_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_entity    ON audit_log (entity_type, entity_id);

-- ── RLS ──────────────────────────────────────────────────────────────
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

-- Solo el Socio puede leer la bitácora
CREATE POLICY audit_log_select ON audit_log
  FOR SELECT USING (
    public.user_role() = 'Socio'
  );

-- Cualquier usuario autenticado puede insertar (la app loguea en su nombre)
CREATE POLICY audit_log_insert ON audit_log
  FOR INSERT WITH CHECK (
    auth.uid() IS NOT NULL
  );

-- Nadie puede actualizar ni borrar registros de auditoría
-- (no se crean policies de UPDATE/DELETE)
