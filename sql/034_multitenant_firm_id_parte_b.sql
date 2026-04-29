-- 034 · Multi-tenant Etapa 2 (parte B) — firm_id en tablas restantes
-- Ejecutar en: Supabase Dashboard → SQL Editor → New query
--
-- Objetivo:
--   Cerrar Etapa 2 agregando firm_id a las 22 tablas que faltaron en 033:
--   onboarding, comunicaciones, milestones, módulo laboral, conversations,
--   eventos/plazos, peritos, hilos_prueba, compensaciones, letrados_parte,
--   honorarios, cédulas.
--
-- Tablas afectadas (22):
--   Onboarding/comm:   onboarding_items, communications, matter_milestones
--   Laboral:           casos_laborales, encuadres_laborales, telegramas,
--                      seclo_tramites, liquidaciones_laborales,
--                      expedientes_laborales
--   Conversations:     conversations, conversation_members,
--                      conversation_messages
--   Eventos/plazos:    eventos_expediente, plazos
--   Otras:             peritos, letrados_parte, hilos_prueba,
--                      compensaciones, cuotas_compensacion,
--                      honorarios_regulados, cedulas, cedula_intentos
--
-- Tablas que QUEDAN GLOBALES (sin firm_id, a propósito):
--   • feriados          — ferias judiciales nacionales, compartidas.
--   • version_normativa — legislación (LCT, leyes nacionales), compartida.
--   Si en el futuro un estudio quiere customizar feriados propios, se
--   puede agregar firm_id NULL = global, NOT NULL = propio. Por ahora
--   las dejamos solo lectura para todos los users autenticados.
--
-- Dependencias: 033_multitenant_firm_id_parte_a.sql (función
-- set_firm_id_from_profile ya existe).
--
-- ⚠️ Idempotente: se puede correr varias veces.

-- ══════════════════════════════════════════════════════════════
-- 1. Recrear helper procedural (igual que en 033)
-- ══════════════════════════════════════════════════════════════

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
-- 2. Onboarding / comunicaciones / milestones
-- ══════════════════════════════════════════════════════════════

SELECT public._mt_add_firm_id('onboarding_items');
SELECT public._mt_add_firm_id('communications');
SELECT public._mt_add_firm_id('matter_milestones');

-- ══════════════════════════════════════════════════════════════
-- 3. Módulo laboral
-- ══════════════════════════════════════════════════════════════

SELECT public._mt_add_firm_id('casos_laborales');
SELECT public._mt_add_firm_id('encuadres_laborales');
SELECT public._mt_add_firm_id('telegramas');
SELECT public._mt_add_firm_id('seclo_tramites');
SELECT public._mt_add_firm_id('liquidaciones_laborales');
SELECT public._mt_add_firm_id('expedientes_laborales');

-- ══════════════════════════════════════════════════════════════
-- 4. Conversations (chat por hilos)
-- ══════════════════════════════════════════════════════════════

SELECT public._mt_add_firm_id('conversations');
SELECT public._mt_add_firm_id('conversation_members');
SELECT public._mt_add_firm_id('conversation_messages');

-- ══════════════════════════════════════════════════════════════
-- 5. Eventos y plazos del expediente
-- ══════════════════════════════════════════════════════════════

SELECT public._mt_add_firm_id('eventos_expediente');
SELECT public._mt_add_firm_id('plazos');

-- ══════════════════════════════════════════════════════════════
-- 6. Otras (registros y módulos varios)
-- ══════════════════════════════════════════════════════════════

SELECT public._mt_add_firm_id('peritos');
SELECT public._mt_add_firm_id('letrados_parte');
SELECT public._mt_add_firm_id('hilos_prueba');
SELECT public._mt_add_firm_id('compensaciones');
SELECT public._mt_add_firm_id('cuotas_compensacion');
SELECT public._mt_add_firm_id('honorarios_regulados');
SELECT public._mt_add_firm_id('cedulas');
SELECT public._mt_add_firm_id('cedula_intentos');

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
  ('onboarding_items'), ('communications'), ('matter_milestones'),
  ('casos_laborales'), ('encuadres_laborales'), ('telegramas'),
  ('seclo_tramites'), ('liquidaciones_laborales'), ('expedientes_laborales'),
  ('conversations'), ('conversation_members'), ('conversation_messages'),
  ('eventos_expediente'), ('plazos'),
  ('peritos'), ('letrados_parte'), ('hilos_prueba'),
  ('compensaciones'), ('cuotas_compensacion'), ('honorarios_regulados'),
  ('cedulas'), ('cedula_intentos')
) AS t(table_name)
ORDER BY t.table_name;

-- Conteo de filas con firm_id default por tabla.
SELECT 'onboarding_items'        AS tabla, COUNT(*) AS total,
       COUNT(*) FILTER (WHERE firm_id = '00000000-0000-0000-0000-000000000001'::uuid) AS en_firm_default
FROM onboarding_items
UNION ALL SELECT 'communications',          COUNT(*), COUNT(*) FILTER (WHERE firm_id = '00000000-0000-0000-0000-000000000001'::uuid) FROM communications
UNION ALL SELECT 'matter_milestones',       COUNT(*), COUNT(*) FILTER (WHERE firm_id = '00000000-0000-0000-0000-000000000001'::uuid) FROM matter_milestones
UNION ALL SELECT 'casos_laborales',         COUNT(*), COUNT(*) FILTER (WHERE firm_id = '00000000-0000-0000-0000-000000000001'::uuid) FROM casos_laborales
UNION ALL SELECT 'encuadres_laborales',     COUNT(*), COUNT(*) FILTER (WHERE firm_id = '00000000-0000-0000-0000-000000000001'::uuid) FROM encuadres_laborales
UNION ALL SELECT 'telegramas',              COUNT(*), COUNT(*) FILTER (WHERE firm_id = '00000000-0000-0000-0000-000000000001'::uuid) FROM telegramas
UNION ALL SELECT 'seclo_tramites',          COUNT(*), COUNT(*) FILTER (WHERE firm_id = '00000000-0000-0000-0000-000000000001'::uuid) FROM seclo_tramites
UNION ALL SELECT 'liquidaciones_laborales', COUNT(*), COUNT(*) FILTER (WHERE firm_id = '00000000-0000-0000-0000-000000000001'::uuid) FROM liquidaciones_laborales
UNION ALL SELECT 'expedientes_laborales',   COUNT(*), COUNT(*) FILTER (WHERE firm_id = '00000000-0000-0000-0000-000000000001'::uuid) FROM expedientes_laborales
UNION ALL SELECT 'conversations',           COUNT(*), COUNT(*) FILTER (WHERE firm_id = '00000000-0000-0000-0000-000000000001'::uuid) FROM conversations
UNION ALL SELECT 'conversation_members',    COUNT(*), COUNT(*) FILTER (WHERE firm_id = '00000000-0000-0000-0000-000000000001'::uuid) FROM conversation_members
UNION ALL SELECT 'conversation_messages',   COUNT(*), COUNT(*) FILTER (WHERE firm_id = '00000000-0000-0000-0000-000000000001'::uuid) FROM conversation_messages
UNION ALL SELECT 'eventos_expediente',      COUNT(*), COUNT(*) FILTER (WHERE firm_id = '00000000-0000-0000-0000-000000000001'::uuid) FROM eventos_expediente
UNION ALL SELECT 'plazos',                  COUNT(*), COUNT(*) FILTER (WHERE firm_id = '00000000-0000-0000-0000-000000000001'::uuid) FROM plazos
UNION ALL SELECT 'peritos',                 COUNT(*), COUNT(*) FILTER (WHERE firm_id = '00000000-0000-0000-0000-000000000001'::uuid) FROM peritos
UNION ALL SELECT 'letrados_parte',          COUNT(*), COUNT(*) FILTER (WHERE firm_id = '00000000-0000-0000-0000-000000000001'::uuid) FROM letrados_parte
UNION ALL SELECT 'hilos_prueba',            COUNT(*), COUNT(*) FILTER (WHERE firm_id = '00000000-0000-0000-0000-000000000001'::uuid) FROM hilos_prueba
UNION ALL SELECT 'compensaciones',          COUNT(*), COUNT(*) FILTER (WHERE firm_id = '00000000-0000-0000-0000-000000000001'::uuid) FROM compensaciones
UNION ALL SELECT 'cuotas_compensacion',     COUNT(*), COUNT(*) FILTER (WHERE firm_id = '00000000-0000-0000-0000-000000000001'::uuid) FROM cuotas_compensacion
UNION ALL SELECT 'honorarios_regulados',    COUNT(*), COUNT(*) FILTER (WHERE firm_id = '00000000-0000-0000-0000-000000000001'::uuid) FROM honorarios_regulados
UNION ALL SELECT 'cedulas',                 COUNT(*), COUNT(*) FILTER (WHERE firm_id = '00000000-0000-0000-0000-000000000001'::uuid) FROM cedulas
UNION ALL SELECT 'cedula_intentos',         COUNT(*), COUNT(*) FILTER (WHERE firm_id = '00000000-0000-0000-0000-000000000001'::uuid) FROM cedula_intentos
ORDER BY tabla;

-- Verificación: tablas que quedan globales (no deben tener firm_id).
SELECT
  'feriados' AS tabla_global,
  EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'feriados' AND column_name = 'firm_id'
  ) AS tiene_firm_id_NO_DEBERIA
UNION ALL SELECT
  'version_normativa',
  EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'version_normativa' AND column_name = 'firm_id'
  );
