-- 053 · bienes — motivo del carácter propio (GAP UX-30)
-- Ejecutar en: Supabase Dashboard → SQL Editor → New query
--
-- Hoy `bienes.caracter` admite 'propio' / 'ganancial' / 'comun' pero no hay
-- forma de documentar POR QUÉ un bien es propio. Eso es crítico cuando la
-- contraparte impugna en la liquidación: el carácter propio se prueba con
-- (a) anterior al matrimonio, (b) donación recibida durante el matrimonio,
-- (c) herencia, (d) permuta o reinversión de un bien propio anterior.
-- Sin el motivo escrito al lado del bien, el dato es vulnerable.
--
-- Caso real (audit Camila / Nicolás): el Fiat Argo de Camila es propio
-- porque "regalo del padre antes del matrimonio". Sin un campo dedicado,
-- esa información se pierde o se mezcla en `notas`.
--
-- Agregamos `motivo_caracter` opcional. La UI exige completarlo cuando
-- el usuario marca el bien como propio (validación blanda — alerta en
-- la card si quedó vacío, no bloquea el guardado).
--
-- ⚠️ Idempotente. Solo agrega columna si no existe.

ALTER TABLE bienes
  ADD COLUMN IF NOT EXISTS motivo_caracter TEXT;

COMMENT ON COLUMN bienes.motivo_caracter IS
  'Justificación del carácter del bien — relevante sobre todo cuando '
  'caracter = propio (anterior al matrimonio / donación / herencia / '
  'permuta de bien propio). Texto libre. Ej: "Regalo del padre antes '
  'del matrimonio (15/03/2010), verificar acta de donación." GAP UX-30.';

-- Diagnóstico
SELECT
  'bienes propios sin motivo cargado' AS metrica,
  COUNT(*)::TEXT                       AS valor
FROM bienes
WHERE caracter = 'propio'
  AND (motivo_caracter IS NULL OR TRIM(motivo_caracter) = '');
