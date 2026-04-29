-- 035 · Multi-tenant Etapa 3 — RLS por firm (RESTRICTIVE policies)
-- Ejecutar en: Supabase Dashboard → SQL Editor → New query
--
-- Objetivo:
--   Hacer que cada user solo pueda leer/escribir filas de su propio firm.
--
-- Estrategia:
--   En vez de reescribir las policies existentes (que ya manejan rol +
--   asignaciones), agregamos una RESTRICTIVE policy llamada `firm_isolation`
--   a cada tabla con firm_id. Las RESTRICTIVE se AND-ean con las
--   PERMISSIVE existentes:
--
--     visible = (existing_permissive_policy) AND firm_id = current_firm_id()
--
--   Esto preserva toda la lógica actual (Socio ve todos los matters del
--   firm, Abogado ve solo sus matters asignados, etc.) y le suma el
--   filtro de firm como restricción dura.
--
-- Tablas afectadas: las 37 que ganaron firm_id en 032/033/034.
--
-- NO afecta:
--   • firms — ya tiene policies firm-aware desde 032.
--   • feriados, version_normativa — globales, sin firm_id.
--
-- Dependencias: 032/033/034 (firm_id ya presente en todas las tablas).
--
-- ⚠️ Idempotente: se puede correr varias veces.
-- ⚠️ Después de esta migración, queries con anon key SIN sesión van a
--    devolver 0 filas para tablas con firm_id. Eso es lo correcto. El
--    código de app ya usa sesiones autenticadas.

-- ══════════════════════════════════════════════════════════════
-- 1. Helper procedural
-- ══════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public._mt_apply_firm_isolation(tbl TEXT)
RETURNS VOID AS $$
BEGIN
  EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', tbl);

  EXECUTE format('DROP POLICY IF EXISTS "firm_isolation" ON %I', tbl);

  EXECUTE format(
    'CREATE POLICY "firm_isolation" ON %I AS RESTRICTIVE FOR ALL '
    'USING (firm_id = public.current_firm_id()) '
    'WITH CHECK (firm_id = public.current_firm_id())',
    tbl
  );
END;
$$ LANGUAGE plpgsql;

-- ══════════════════════════════════════════════════════════════
-- 2. Aplicar a todas las tablas con firm_id
-- ══════════════════════════════════════════════════════════════

-- profiles (de 032)
SELECT public._mt_apply_firm_isolation('profiles');

-- Tablas raíz (de 033)
SELECT public._mt_apply_firm_isolation('matters');
SELECT public._mt_apply_firm_isolation('clients');
SELECT public._mt_apply_firm_isolation('consultations');
SELECT public._mt_apply_firm_isolation('expedientes');
SELECT public._mt_apply_firm_isolation('presupuestos');
SELECT public._mt_apply_firm_isolation('audit_log');
SELECT public._mt_apply_firm_isolation('chat_messages');

-- Tablas hijas (de 033)
SELECT public._mt_apply_firm_isolation('documents');
SELECT public._mt_apply_firm_isolation('tasks');
SELECT public._mt_apply_firm_isolation('timeline');
SELECT public._mt_apply_firm_isolation('matter_assignments');
SELECT public._mt_apply_firm_isolation('presupuesto_items');
SELECT public._mt_apply_firm_isolation('expediente_estados_log');

-- Singletons (de 033)
SELECT public._mt_apply_firm_isolation('estudio_perfil');
SELECT public._mt_apply_firm_isolation('studio_config');

-- Onboarding / comm / milestones (de 034)
SELECT public._mt_apply_firm_isolation('onboarding_items');
SELECT public._mt_apply_firm_isolation('communications');
SELECT public._mt_apply_firm_isolation('matter_milestones');

-- Módulo laboral (de 034)
SELECT public._mt_apply_firm_isolation('casos_laborales');
SELECT public._mt_apply_firm_isolation('encuadres_laborales');
SELECT public._mt_apply_firm_isolation('telegramas');
SELECT public._mt_apply_firm_isolation('seclo_tramites');
SELECT public._mt_apply_firm_isolation('liquidaciones_laborales');
SELECT public._mt_apply_firm_isolation('expedientes_laborales');

-- Conversations (de 034)
SELECT public._mt_apply_firm_isolation('conversations');
SELECT public._mt_apply_firm_isolation('conversation_members');
SELECT public._mt_apply_firm_isolation('conversation_messages');

-- Eventos / plazos (de 034)
SELECT public._mt_apply_firm_isolation('eventos_expediente');
SELECT public._mt_apply_firm_isolation('plazos');

-- Otras (de 034)
SELECT public._mt_apply_firm_isolation('peritos');
SELECT public._mt_apply_firm_isolation('letrados_parte');
SELECT public._mt_apply_firm_isolation('hilos_prueba');
SELECT public._mt_apply_firm_isolation('compensaciones');
SELECT public._mt_apply_firm_isolation('cuotas_compensacion');
SELECT public._mt_apply_firm_isolation('honorarios_regulados');
SELECT public._mt_apply_firm_isolation('cedulas');
SELECT public._mt_apply_firm_isolation('cedula_intentos');

-- ══════════════════════════════════════════════════════════════
-- 3. Limpieza
-- ══════════════════════════════════════════════════════════════

DROP FUNCTION public._mt_apply_firm_isolation(TEXT);

-- ══════════════════════════════════════════════════════════════
-- 4. Diagnóstico
-- ══════════════════════════════════════════════════════════════
-- Lista todas las tablas con la policy firm_isolation y muestra si
-- es RESTRICTIVE (debería serlo).

SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  cmd
FROM pg_policies
WHERE policyname = 'firm_isolation'
  AND schemaname = 'public'
ORDER BY tablename;

-- Cuenta de tablas con firm_isolation aplicada (esperamos 37).
SELECT COUNT(*) AS tablas_con_firm_isolation
FROM pg_policies
WHERE policyname = 'firm_isolation' AND schemaname = 'public';

-- Sanity check: tablas con firm_id que NO tienen firm_isolation (debería ser 0).
SELECT c.table_name
FROM information_schema.columns c
WHERE c.table_schema = 'public'
  AND c.column_name = 'firm_id'
  AND c.table_name <> 'firms'
  AND NOT EXISTS (
    SELECT 1 FROM pg_policies p
    WHERE p.tablename = c.table_name
      AND p.policyname = 'firm_isolation'
      AND p.schemaname = 'public'
  )
ORDER BY c.table_name;
