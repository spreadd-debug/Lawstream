-- 018 · Tipo de proceso del asunto (matter)
-- Ejecutar en: Supabase Dashboard → SQL Editor → New query
--
-- Agrega la columna `tipo_proceso` a `matters`. El tipo de proceso es una
-- categoría procesal del CPCC que determina los plazos aplicables.
--
-- Valores válidos: 'ordinario' | 'sumario' | 'sumarisimo'.
--
-- Nota operativa:
--   • 'ordinario'   → juicio ordinario civil (default — el 99% de los casos).
--   • 'sumario'     → EXCLUSIVO de Provincia de Buenos Aires (CPCC art. 484+).
--                     Derogado en Nación por Ley 25.488 de 2002.
--                     La UI impide seleccionarlo si jurisdicción = 'caba' o 'nacional'.
--   • 'sumarisimo'  → aplicable en ambas jurisdicciones (CPCCN 498 / CPCC PBA 496).
--                     Plazos mucho más cortos: 5d contestar, 3d agravios.
--
-- Backfill: a diferencia de 017 (jurisdicción), acá SÍ seteamos un default
-- ('ordinario') porque:
--   1. Es el caso dominante real (>99%).
--   2. Los plazos ordinarios son los "default" del refactor del motor: si el
--      tipo está mal, el abogado ve los plazos estándar, no cero plazos.
--      No hay riesgo de perder un plazo por dato faltante.
--   3. El usuario puede cambiarlo desde "Editar Asunto" si el caso es sumario/
--      sumarísimo — ahí se recalculan los plazos activos automáticamente.

-- ══════════════════════════════════════════════════════════════
-- 1. Agregar columna
-- ══════════════════════════════════════════════════════════════

ALTER TABLE matters ADD COLUMN IF NOT EXISTS tipo_proceso TEXT;

-- Check constraint idempotente
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'matters_tipo_proceso_check'
  ) THEN
    ALTER TABLE matters
      ADD CONSTRAINT matters_tipo_proceso_check
      CHECK (tipo_proceso IS NULL OR tipo_proceso IN ('ordinario', 'sumario', 'sumarisimo'));
  END IF;
END $$;

-- Índice para filtros frecuentes (listado por tipo, recálculo masivo)
CREATE INDEX IF NOT EXISTS idx_matters_tipo_proceso ON matters(tipo_proceso);

-- ══════════════════════════════════════════════════════════════
-- 2. Backfill de casos legados a 'ordinario'
-- ══════════════════════════════════════════════════════════════

UPDATE matters
SET tipo_proceso = 'ordinario'
WHERE tipo_proceso IS NULL;

-- ══════════════════════════════════════════════════════════════
-- 3. Diagnóstico — distribución post-migración
-- ══════════════════════════════════════════════════════════════
-- Ejecutar manualmente después del deploy para confirmar que todos los casos
-- tienen valor. La columna queda NULLABLE intencionalmente — si en el futuro
-- agregamos NOT NULL, revisar antes con este SELECT.

SELECT
  tipo_proceso,
  COUNT(*) AS cantidad
FROM matters
GROUP BY tipo_proceso
ORDER BY cantidad DESC;

-- Para detectar inconsistencias (sumario con jurisdicción no-PBA):
-- SELECT id, title, jurisdiccion, tipo_proceso
-- FROM matters
-- WHERE tipo_proceso = 'sumario' AND jurisdiccion <> 'pba';
