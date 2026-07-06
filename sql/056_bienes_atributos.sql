-- 056 · bienes — atributos estructurados por tipo ("activo vivo")
-- Ejecutar en: Supabase Dashboard → SQL Editor → New query
--
-- Hoy el bien guarda todo su detalle identificatorio en `descripcion`
-- (texto libre). No distingue entre un auto y un inmueble: no hay lugar
-- estructurado para patente, marca, modelo, matrícula, nomenclatura
-- catastral, CBU, etc.
--
-- Esos datos NO son decorativos: las plantillas de embargo ya los piden
-- ({{MATRICULA}}, {{NOMENCLATURA}}, {{INMUEBLE_UBICACION}}, vehículo =
-- marca/modelo/dominio) y hoy se tipean a mano en cada escrito. Con los
-- atributos estructurados en el bien, el oficio de embargo se auto-completa
-- desde el activo (ver BIEN_AUTOFILL_MAP en Plantillas.tsx).
--
-- Usamos una única columna JSONB `atributos` (sparse, sin esquema fijo):
-- una sola migración y agregar un campo nuevo por tipo después es solo
-- código (el mapa descriptor en BienesPanel), sin tocar la base. Los campos
-- son inherentemente condicionales por tipo — un vehículo nunca tiene
-- matrícula registral, un inmueble nunca tiene dominio — así que columnas
-- fijas dejarían ~20 columnas casi siempre NULL.
--
-- Shape esperado (todos opcionales, ver interface BienAtributos):
--   inmueble:             matricula, folio, nomenclaturaCatastral,
--                         partidaInmobiliaria, ubicacion, superficie
--   vehiculo:             marca, modelo, anio, dominio, nroMotor, nroChasis
--   cuenta_bancaria:      banco, cbu, nroCuenta, tipoCuenta
--   inversion_financiera: entidad, nroComitente
--   sociedad:             porcentajeParticipacion
--
-- ⚠️ Idempotente. Backward-safe: default '{}' → filas existentes quedan sin
-- atributos, sin backfill necesario.

ALTER TABLE bienes
  ADD COLUMN IF NOT EXISTS atributos JSONB NOT NULL DEFAULT '{}'::jsonb;

COMMENT ON COLUMN bienes.atributos IS
  'Atributos estructurados específicos por tipo de bien (sparse). Ej. auto: '
  '{"marca":"Fiat","modelo":"Argo","dominio":"AB123CD"}. Inmueble: '
  '{"matricula":"12345","nomenclaturaCatastral":"..."}. Se auto-completan '
  'en los oficios de embargo/cautelar. Ver BienAtributos en types.ts. GAP "activo vivo".';

-- Diagnóstico
SELECT
  'bienes con atributos cargados' AS metrica,
  COUNT(*)::TEXT                  AS valor
FROM bienes
WHERE atributos IS NOT NULL
  AND atributos <> '{}'::jsonb;
