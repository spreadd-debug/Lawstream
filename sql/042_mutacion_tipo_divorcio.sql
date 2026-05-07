-- 042 · Mutación de tipo de divorcio (GAP R6)
-- Ejecutar en: Supabase Dashboard → SQL Editor → New query
--
-- Un divorcio puede iniciarse "De común acuerdo" y mutar a "Unilateral"
-- (o viceversa) si una parte retira la conformidad. Hoy el template tiene
-- 9+ tareas con `condition: { tipo_divorcio, equals: 'X' }`. Cuando muta
-- el flag, las tareas pendientes de la rama vieja quedan "huérfanas" sin
-- forma de marcarlas como obsoletas.
--
-- Esta migración:
--   • amplía `tasks.status` para admitir 'Cancelada',
--   • agrega `cancelada_motivo` y `cancelada_at` para auditar el porqué.
--
-- Una tarea cancelada por mutación queda con motivo legible
-- ("Mutación a 'Unilateral' el 2026-04-08: Valentina retiró conformidad")
-- y se preserva la fila para historia. Tareas YA Completadas no se tocan
-- — siguen siendo válidas (ej. "Se firmó la presentación conjunta" SÍ
-- ocurrió, aunque después se rompiera el acuerdo).
--
-- El evento `mutacion_tipo_divorcio` que dispara todo esto se registra
-- en `eventos_expediente` con el TipoEvento estándar (no requiere tabla
-- nueva — la categoría se agrega solo en TS/templates de plazos).
--
-- ⚠️ Idempotente.

-- ══════════════════════════════════════════════════════════════
-- 1. Ampliar CHECK de tasks.status
-- ══════════════════════════════════════════════════════════════
-- El CHECK original viene de supabase/schema.sql con nombre auto-generado
-- (típicamente tasks_status_check). Lo dropeamos por nombre y recreamos
-- con valor adicional. Si el nombre fuera otro, ajustar acá.

DO $$
DECLARE
  v_constraint_name TEXT;
BEGIN
  SELECT conname INTO v_constraint_name
  FROM pg_constraint
  WHERE conrelid = 'public.tasks'::regclass
    AND contype = 'c'
    AND pg_get_constraintdef(oid) ILIKE '%status%';

  IF v_constraint_name IS NOT NULL THEN
    EXECUTE format('ALTER TABLE public.tasks DROP CONSTRAINT %I', v_constraint_name);
    RAISE NOTICE '[042] CHECK previo de status dropeado: %', v_constraint_name;
  END IF;

  ALTER TABLE public.tasks
    ADD CONSTRAINT tasks_status_check
    CHECK (status IN ('Pendiente', 'Completada', 'En revisión', 'Cancelada'));
END $$;

-- ══════════════════════════════════════════════════════════════
-- 2. Columnas de cancelación
-- ══════════════════════════════════════════════════════════════

ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS cancelada_motivo TEXT;
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS cancelada_at     TIMESTAMPTZ;

-- ══════════════════════════════════════════════════════════════
-- 3. Diagnóstico
-- ══════════════════════════════════════════════════════════════

SELECT
  'tasks status values'    AS metrica,
  string_agg(DISTINCT status, ', ' ORDER BY status) AS valor
FROM public.tasks
UNION ALL
SELECT
  'tasks canceladas existentes',
  COUNT(*)::TEXT
FROM public.tasks
WHERE status = 'Cancelada';
