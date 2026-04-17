-- 017 · Jurisdicción del asunto (matter)
-- Ejecutar en: Supabase Dashboard → SQL Editor → New query
--
-- Agrega la columna `jurisdiccion` a `matters`. La jurisdicción es del CASO
-- (no del expediente): el abogado la conoce desde la consulta, independientemente
-- de si el caso ya está judicializado o no.
--
-- Valores válidos: 'caba' | 'pba' | 'nacional'.
--
-- La columna se crea NULLABLE para no romper los casos legados que no la tienen.
-- Esos casos quedarán marcados con banner en MatterDetail y el usuario los
-- completa manualmente desde "Editar Asunto". En una migración futura (018+),
-- cuando todos los matters tengan valor, se agregará NOT NULL.
--
-- ⚠️ IMPORTANTE: NO se setea un default silencioso 'nacional' para los casos
-- legados. Un default equivocado hace que el motor de plazos calcule
-- vencimientos con el calendario de feriados incorrecto y el abogado pierda
-- un plazo sin enterarse. Preferimos NULL + banner + completado manual.

-- ══════════════════════════════════════════════════════════════
-- 1. Agregar columna
-- ══════════════════════════════════════════════════════════════

ALTER TABLE matters ADD COLUMN IF NOT EXISTS jurisdiccion TEXT;

-- Check constraint (nullable por ahora)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'matters_jurisdiccion_check'
  ) THEN
    ALTER TABLE matters
      ADD CONSTRAINT matters_jurisdiccion_check
      CHECK (jurisdiccion IS NULL OR jurisdiccion IN ('caba', 'pba', 'nacional'));
  END IF;
END $$;

-- Índice para filtros frecuentes (listado por jurisdicción, recálculo masivo)
CREATE INDEX IF NOT EXISTS idx_matters_jurisdiccion ON matters(jurisdiccion);

-- ══════════════════════════════════════════════════════════════
-- 2. Backfill oportunista desde case_data
-- ══════════════════════════════════════════════════════════════
-- Si algún caso ya tiene `jurisdiccion` en su JSONB case_data (por ejemplo
-- cargado antes de esta migración), lo traemos al campo top-level.
-- Solo actualiza casos con valor válido — el resto queda NULL.

UPDATE matters
SET jurisdiccion = LOWER(case_data->>'jurisdiccion')
WHERE jurisdiccion IS NULL
  AND case_data->>'jurisdiccion' IS NOT NULL
  AND LOWER(case_data->>'jurisdiccion') IN ('caba', 'pba', 'nacional');

-- ══════════════════════════════════════════════════════════════
-- 3. Diagnóstico — casos que quedan sin jurisdicción
-- ══════════════════════════════════════════════════════════════
-- Ejecutar manualmente después del deploy para revisar.
-- Si son pocos: dejarlos NULL y el equipo los completa desde la UI.
-- Si son muchos: reevaluar si hay algún campo alternativo que se pueda mapear.

SELECT
  COUNT(*)                                 AS casos_sin_jurisdiccion,
  COALESCE(array_agg(id), ARRAY[]::uuid[]) AS ids_afectados,
  COALESCE(array_agg(title), ARRAY[]::text[]) AS titulos_afectados
FROM matters
WHERE jurisdiccion IS NULL;

-- Para ver el detalle individual:
-- SELECT id, title, client, type, created_at
-- FROM matters
-- WHERE jurisdiccion IS NULL
-- ORDER BY created_at DESC;
