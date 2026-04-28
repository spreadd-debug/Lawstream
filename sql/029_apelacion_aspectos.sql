-- 029 · Aspectos apelados (GAP 5 - parcialmente firme)
-- Ejecutar en: Supabase Dashboard → SQL Editor → New query
--
-- Cuando un caso recibe sentencia y luego se apela parcialmente, parte
-- queda firme y parte sigue en Cámara. Hoy modelamos la apelación como
-- matter hijo (kind='apelacion'). Para saber QUÉ se apeló, este campo
-- guarda los items específicos:
--   - compensacion_economica
--   - cuota_alimentaria
--   - atribucion_vivienda
--   - regimen_comunicacion
--   - costas
--   - honorarios
--   - tenencia
--   - otro
--
-- "Parcialmente firme" NO es un MatterStatus separado: es un estado
-- DERIVADO. Si un caso principal tiene al menos una apelación-hijo con
-- estado != Cerrado, se considera parcialmente firme. La UI muestra un
-- banner listando los aspectos apelados de cada apelación abierta.
--
-- Modelo: array TEXT[] (no FK a tabla aspectos porque son tags
-- predefinidos, no entidades).

-- ══════════════════════════════════════════════════════════════
-- 1. Columna aspectos_apelados
-- ══════════════════════════════════════════════════════════════

ALTER TABLE matters ADD COLUMN IF NOT EXISTS aspectos_apelados TEXT[];

-- ══════════════════════════════════════════════════════════════
-- 2. Constraint — solo apelaciones pueden tener aspectos
-- ══════════════════════════════════════════════════════════════

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'matters_aspectos_apelados_kind_check'
  ) THEN
    ALTER TABLE matters
      ADD CONSTRAINT matters_aspectos_apelados_kind_check
      CHECK (
        aspectos_apelados IS NULL
        OR kind = 'apelacion'
      );
  END IF;
END $$;

-- ══════════════════════════════════════════════════════════════
-- 3. Constraint — valores válidos en el array
-- ══════════════════════════════════════════════════════════════

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'matters_aspectos_apelados_values_check'
  ) THEN
    ALTER TABLE matters
      ADD CONSTRAINT matters_aspectos_apelados_values_check
      CHECK (
        aspectos_apelados IS NULL
        OR aspectos_apelados <@ ARRAY[
          'compensacion_economica',
          'cuota_alimentaria',
          'atribucion_vivienda',
          'regimen_comunicacion',
          'tenencia',
          'costas',
          'honorarios',
          'otro'
        ]::TEXT[]
      );
  END IF;
END $$;

-- ══════════════════════════════════════════════════════════════
-- 4. Diagnóstico
-- ══════════════════════════════════════════════════════════════

SELECT
  kind,
  COUNT(*) AS total,
  COUNT(aspectos_apelados) AS con_aspectos
FROM matters
WHERE kind = 'apelacion'
GROUP BY kind;
