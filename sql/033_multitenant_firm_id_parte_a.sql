-- 033 · Multi-tenant Etapa 2 (parte A) — firm_id en tablas centrales
-- Ejecutar en: Supabase Dashboard → SQL Editor → New query
--
-- Objetivo:
--   • Agregar columna firm_id a las tablas del core de la app.
--   • Backfill al firm default (00000000-...-001).
--   • Trigger BEFORE INSERT que setea firm_id automáticamente desde el
--     profile del user logueado → el código de app no se entera.
--   • Singletons (estudio_perfil, studio_config) quedan con UNIQUE(firm_id)
--     o UNIQUE(firm_id, key) para que cada estudio tenga su propia fila.
--
-- Tablas afectadas (15):
--   Raíz:       matters, clients, consultations, expedientes, presupuestos,
--               audit_log, chat_messages
--   Hijas:      documents, tasks, timeline, matter_assignments,
--               presupuesto_items, expediente_estados_log
--   Singletons: estudio_perfil, studio_config
--
-- Lo que NO hace:
--   • No modifica las RLS existentes (eso es Etapa 3 — 035).
--   • No toca tablas del módulo laboral, peritos, cédulas, eventos/plazos,
--     hilos_prueba, compensaciones, honorarios, conversations (eso es 034).
--   • No toca código de app — sigue funcionando idéntico.
--
-- Dependencias: 032_multitenant_firms.sql (tabla firms + helper current_firm_id).
--
-- ⚠️ Idempotente: se puede correr varias veces.

-- ══════════════════════════════════════════════════════════════
-- 1. Trigger function reutilizable
-- ══════════════════════════════════════════════════════════════
-- Si NEW.firm_id viene NULL (caso normal: el código no lo manda), lo
-- llenamos con el firm del user logueado. Si viene seteado (ej: backfill
-- o caso especial), respetamos el valor.

CREATE OR REPLACE FUNCTION public.set_firm_id_from_profile()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.firm_id IS NULL THEN
    NEW.firm_id := public.current_firm_id();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ══════════════════════════════════════════════════════════════
-- 2. Helper procedural: aplicar firm_id a una tabla
-- ══════════════════════════════════════════════════════════════
-- DRY: hace add column + backfill + verify + NOT NULL + index + trigger
-- en una sola llamada. Se borra al final de la migración.

CREATE OR REPLACE FUNCTION public._mt_add_firm_id(tbl TEXT)
RETURNS VOID AS $$
DECLARE
  v_huerfanos INT;
BEGIN
  EXECUTE format(
    'ALTER TABLE %I ADD COLUMN IF NOT EXISTS firm_id UUID REFERENCES firms(id)',
    tbl
  );

  EXECUTE format(
    'UPDATE %I SET firm_id = ''00000000-0000-0000-0000-000000000001''::uuid WHERE firm_id IS NULL',
    tbl
  );

  EXECUTE format('SELECT COUNT(*) FROM %I WHERE firm_id IS NULL', tbl)
    INTO v_huerfanos;
  IF v_huerfanos > 0 THEN
    RAISE EXCEPTION '%: % filas sin firm_id después del backfill', tbl, v_huerfanos;
  END IF;

  EXECUTE format('ALTER TABLE %I ALTER COLUMN firm_id SET NOT NULL', tbl);

  EXECUTE format(
    'CREATE INDEX IF NOT EXISTS %I ON %I(firm_id)',
    'idx_' || tbl || '_firm_id',
    tbl
  );

  EXECUTE format('DROP TRIGGER IF EXISTS trg_set_firm_id ON %I', tbl);
  EXECUTE format(
    'CREATE TRIGGER trg_set_firm_id BEFORE INSERT ON %I '
    'FOR EACH ROW EXECUTE FUNCTION public.set_firm_id_from_profile()',
    tbl
  );
END;
$$ LANGUAGE plpgsql;

-- ══════════════════════════════════════════════════════════════
-- 3. Tablas raíz
-- ══════════════════════════════════════════════════════════════

SELECT public._mt_add_firm_id('matters');
SELECT public._mt_add_firm_id('clients');
SELECT public._mt_add_firm_id('consultations');
SELECT public._mt_add_firm_id('expedientes');
SELECT public._mt_add_firm_id('presupuestos');
SELECT public._mt_add_firm_id('audit_log');
SELECT public._mt_add_firm_id('chat_messages');

-- ══════════════════════════════════════════════════════════════
-- 4. Tablas hijas
-- ══════════════════════════════════════════════════════════════
-- Hoy todas se backfillean al firm default (porque solo hay uno). El
-- trigger garantiza que las nuevas hereden el firm del user que las
-- crea, pero la consistencia parent↔child no se enforza vía constraint
-- — confiamos en RLS para eso (Etapa 3).

SELECT public._mt_add_firm_id('documents');
SELECT public._mt_add_firm_id('tasks');
SELECT public._mt_add_firm_id('timeline');
SELECT public._mt_add_firm_id('matter_assignments');
SELECT public._mt_add_firm_id('presupuesto_items');
SELECT public._mt_add_firm_id('expediente_estados_log');

-- ══════════════════════════════════════════════════════════════
-- 5. Singletons — estudio_perfil
-- ══════════════════════════════════════════════════════════════
-- Cada firm debe tener exactamente UNA fila en estudio_perfil.
-- Si hubiera más de una fila pre-existente (no debería), conservamos
-- solo la más reciente y borramos las otras antes de aplicar UNIQUE.

DO $$
DECLARE
  v_count INT;
BEGIN
  SELECT COUNT(*) INTO v_count FROM estudio_perfil;
  IF v_count > 1 THEN
    DELETE FROM estudio_perfil
    WHERE id NOT IN (
      SELECT id FROM estudio_perfil ORDER BY updated_at DESC LIMIT 1
    );
  END IF;
END $$;

SELECT public._mt_add_firm_id('estudio_perfil');

-- UNIQUE(firm_id) — un perfil por firm.
ALTER TABLE estudio_perfil
  DROP CONSTRAINT IF EXISTS estudio_perfil_firm_id_key;
ALTER TABLE estudio_perfil
  ADD CONSTRAINT estudio_perfil_firm_id_key UNIQUE (firm_id);

-- ══════════════════════════════════════════════════════════════
-- 6. Singletons — studio_config
-- ══════════════════════════════════════════════════════════════
-- studio_config tiene UNIQUE(key). Pasa a UNIQUE(firm_id, key) para que
-- cada firm tenga su propio key/value.

SELECT public._mt_add_firm_id('studio_config');

-- Buscar y dropear el UNIQUE viejo sobre (key) — Postgres le pone un
-- nombre auto-generado, así que lo encontramos vía pg_constraint.
DO $$
DECLARE
  v_conname TEXT;
BEGIN
  SELECT conname INTO v_conname
  FROM pg_constraint c
  JOIN pg_class t ON t.oid = c.conrelid
  JOIN pg_attribute a ON a.attrelid = t.oid AND a.attnum = ANY(c.conkey)
  WHERE t.relname = 'studio_config'
    AND c.contype = 'u'
    AND a.attname = 'key'
    AND array_length(c.conkey, 1) = 1
  LIMIT 1;

  IF v_conname IS NOT NULL THEN
    EXECUTE format('ALTER TABLE studio_config DROP CONSTRAINT %I', v_conname);
  END IF;
END $$;

ALTER TABLE studio_config
  DROP CONSTRAINT IF EXISTS studio_config_firm_id_key_key;
ALTER TABLE studio_config
  ADD CONSTRAINT studio_config_firm_id_key_key UNIQUE (firm_id, key);

-- ══════════════════════════════════════════════════════════════
-- 7. Limpieza
-- ══════════════════════════════════════════════════════════════

DROP FUNCTION public._mt_add_firm_id(TEXT);

-- ══════════════════════════════════════════════════════════════
-- 8. Diagnóstico final
-- ══════════════════════════════════════════════════════════════

SELECT
  t.table_name,
  EXISTS (
    SELECT 1 FROM information_schema.columns c
    WHERE c.table_name = t.table_name AND c.column_name = 'firm_id'
  ) AS tiene_firm_id,
  EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'trg_set_firm_id'
      AND tgrelid = ('public.' || t.table_name)::regclass
  ) AS tiene_trigger
FROM (VALUES
  ('matters'), ('clients'), ('consultations'), ('expedientes'),
  ('presupuestos'), ('audit_log'), ('chat_messages'),
  ('documents'), ('tasks'), ('timeline'), ('matter_assignments'),
  ('presupuesto_items'), ('expediente_estados_log'),
  ('estudio_perfil'), ('studio_config')
) AS t(table_name)
ORDER BY t.table_name;

-- Conteo por tabla — todas las filas deberían tener el firm default.
SELECT 'matters'                AS tabla, COUNT(*) AS total,
       COUNT(*) FILTER (WHERE firm_id = '00000000-0000-0000-0000-000000000001'::uuid) AS en_firm_default
FROM matters
UNION ALL SELECT 'clients',                COUNT(*), COUNT(*) FILTER (WHERE firm_id = '00000000-0000-0000-0000-000000000001'::uuid) FROM clients
UNION ALL SELECT 'consultations',          COUNT(*), COUNT(*) FILTER (WHERE firm_id = '00000000-0000-0000-0000-000000000001'::uuid) FROM consultations
UNION ALL SELECT 'expedientes',            COUNT(*), COUNT(*) FILTER (WHERE firm_id = '00000000-0000-0000-0000-000000000001'::uuid) FROM expedientes
UNION ALL SELECT 'presupuestos',           COUNT(*), COUNT(*) FILTER (WHERE firm_id = '00000000-0000-0000-0000-000000000001'::uuid) FROM presupuestos
UNION ALL SELECT 'audit_log',              COUNT(*), COUNT(*) FILTER (WHERE firm_id = '00000000-0000-0000-0000-000000000001'::uuid) FROM audit_log
UNION ALL SELECT 'chat_messages',          COUNT(*), COUNT(*) FILTER (WHERE firm_id = '00000000-0000-0000-0000-000000000001'::uuid) FROM chat_messages
UNION ALL SELECT 'documents',              COUNT(*), COUNT(*) FILTER (WHERE firm_id = '00000000-0000-0000-0000-000000000001'::uuid) FROM documents
UNION ALL SELECT 'tasks',                  COUNT(*), COUNT(*) FILTER (WHERE firm_id = '00000000-0000-0000-0000-000000000001'::uuid) FROM tasks
UNION ALL SELECT 'timeline',               COUNT(*), COUNT(*) FILTER (WHERE firm_id = '00000000-0000-0000-0000-000000000001'::uuid) FROM timeline
UNION ALL SELECT 'matter_assignments',     COUNT(*), COUNT(*) FILTER (WHERE firm_id = '00000000-0000-0000-0000-000000000001'::uuid) FROM matter_assignments
UNION ALL SELECT 'presupuesto_items',      COUNT(*), COUNT(*) FILTER (WHERE firm_id = '00000000-0000-0000-0000-000000000001'::uuid) FROM presupuesto_items
UNION ALL SELECT 'expediente_estados_log', COUNT(*), COUNT(*) FILTER (WHERE firm_id = '00000000-0000-0000-0000-000000000001'::uuid) FROM expediente_estados_log
UNION ALL SELECT 'estudio_perfil',         COUNT(*), COUNT(*) FILTER (WHERE firm_id = '00000000-0000-0000-0000-000000000001'::uuid) FROM estudio_perfil
UNION ALL SELECT 'studio_config',          COUNT(*), COUNT(*) FILTER (WHERE firm_id = '00000000-0000-0000-0000-000000000001'::uuid) FROM studio_config
ORDER BY tabla;
