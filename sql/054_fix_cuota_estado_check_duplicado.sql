-- 054 · Fix de check duplicado en cuotas_alimentarias.estado (corrige 052)
-- Ejecutar en: Supabase Dashboard → SQL Editor → New query
--
-- La migración 052 intentó dropear el CHECK viejo de estado buscándolo
-- con un patrón ILIKE '%estado%IN%provisoria%'. Pero PostgreSQL normaliza
-- internamente `estado IN (...)` a `estado = ANY(ARRAY[...])`, así que el
-- patrón nunca matcheaba y el constraint viejo se quedaba activo. El
-- script igual creaba el constraint nuevo `cuotas_alimentarias_estado_check`
-- con 'borrador' adentro, pero ahora la tabla tiene DOS checks sobre
-- estado: el viejo (sin 'borrador') y el nuevo (con 'borrador'). El INSERT
-- tiene que satisfacer ambos, entonces rebota con error 23514 al insertar
-- estado='borrador'.
--
-- Esta migración:
--   1. Lista TODOS los CHECK constraints de cuotas_alimentarias cuya
--      definición menciona la palabra 'provisoria' (sirve tanto si están
--      en formato `IN` como `= ANY(ARRAY)`).
--   2. Los dropea uno por uno.
--   3. Recrea uno solo con todos los estados válidos.
--
-- ⚠️ Idempotente. Si la 052 hubiera funcionado bien, esta migración
-- detecta solo el constraint nuevo y lo recrea con la misma definición.

DO $$
DECLARE
  v_cons RECORD;
  v_dropped INT := 0;
BEGIN
  FOR v_cons IN
    SELECT conname
    FROM pg_constraint
    WHERE conrelid = 'cuotas_alimentarias'::regclass
      AND contype = 'c'
      AND pg_get_constraintdef(oid) ILIKE '%provisoria%'
  LOOP
    EXECUTE format('ALTER TABLE cuotas_alimentarias DROP CONSTRAINT %I', v_cons.conname);
    RAISE NOTICE '[054] CHECK eliminado: %', v_cons.conname;
    v_dropped := v_dropped + 1;
  END LOOP;
  RAISE NOTICE '[054] Total CHECKs eliminados: %', v_dropped;
END $$;

-- Recrear el constraint con todos los estados (incluido 'borrador').
ALTER TABLE cuotas_alimentarias
  ADD CONSTRAINT cuotas_alimentarias_estado_check
  CHECK (estado IN ('borrador', 'provisoria', 'definitiva', 'modificada', 'extinguida'));

-- Diagnóstico — debería listar exactamente UN constraint sobre estado.
SELECT
  conname        AS constraint_name,
  pg_get_constraintdef(oid) AS definicion
FROM pg_constraint
WHERE conrelid = 'cuotas_alimentarias'::regclass
  AND contype = 'c'
  AND pg_get_constraintdef(oid) ILIKE '%provisoria%';
