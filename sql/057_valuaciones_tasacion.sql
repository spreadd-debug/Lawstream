-- 057 · bien_valuaciones — datos estructurados de la tasación (prueba)
-- Ejecutar en: Supabase Dashboard → SQL Editor → New query
--
-- Hasta hoy el origen de una valuación vive en `fuente` (texto libre), ej.
-- "informe Tasadora Marina Piluso, Mat. CPI 3421". Eso alcanza como nota,
-- pero la tasación es PRUEBA: cuando la contraparte impugna el valor en una
-- liquidación de comunidad, importa quién tasó, con qué matrícula, qué tipo
-- de tasación (judicial vs. privada vs. estimada) y la fecha del dictamen.
--
-- Estructuramos esos datos para poder citarlos limpio en un escrito y
-- distinguir el peso probatorio de cada valuación.
--
-- `fuente` se mantiene (para notas de origen que no encajen en los campos).
--
-- ⚠️ Idempotente. Solo agrega columnas si no existen.

ALTER TABLE bien_valuaciones
  ADD COLUMN IF NOT EXISTS tasador_nombre    TEXT,
  ADD COLUMN IF NOT EXISTS tasador_matricula TEXT,
  ADD COLUMN IF NOT EXISTS tipo_tasacion     TEXT,
  ADD COLUMN IF NOT EXISTS fecha_informe     DATE;

COMMENT ON COLUMN bien_valuaciones.tasador_nombre IS
  'Nombre del tasador / perito que realizó la valuación.';
COMMENT ON COLUMN bien_valuaciones.tasador_matricula IS
  'Matrícula profesional del tasador. Ej: "CPI 3421", "CUCICBA 1234".';
COMMENT ON COLUMN bien_valuaciones.tipo_tasacion IS
  'Origen de la tasación: judicial (perito designado) | privada | estimada. '
  'Determina el peso probatorio.';
COMMENT ON COLUMN bien_valuaciones.fecha_informe IS
  'Fecha del informe/dictamen de tasación (puede diferir de fecha, que es '
  'la fecha de valor).';

-- Diagnóstico
SELECT
  'valuaciones con tasador estructurado' AS metrica,
  COUNT(*)::TEXT                         AS valor
FROM bien_valuaciones
WHERE tasador_nombre IS NOT NULL
  AND TRIM(tasador_nombre) <> '';
