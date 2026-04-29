-- 031 · Consolidar matters.expediente en tabla expedientes (GAP 14)
-- Ejecutar en: Supabase Dashboard → SQL Editor → New query
--
-- Histórica deuda técnica:
--   • Columna legacy `matters.expediente` (TEXT)
--   • Tabla `expedientes` con campos estructurados
--   ↓ Dos fuentes de verdad → riesgo de divergencia
--
-- Esta migración:
--   1. Diagnóstico inicial — qué hay hoy.
--   2. BACKFILL: para cada matter con `matter.expediente` no vacío que NO
--      tenga expediente vinculado, crea uno nuevo heredando el número
--      como `nro_juzgado`. La carátula se setea con el title del matter
--      (mejor que dejarla vacía, el usuario la edita después).
--   3. Para los que YA tienen expediente vinculado y `matter.expediente`
--      coincide con `nro_juzgado` o `nro_receptoria` → simplemente
--      vaciamos la columna legacy (no hay info perdida).
--   4. Para los que ya tienen expediente PERO `matter.expediente` tiene
--      un número distinto (conflicto), preservamos el legacy en
--      `expedientes.notas` para que el usuario pueda revisar — y
--      también vaciamos la columna legacy.
--   5. Diagnóstico final.
--
-- ⚠️ La columna `matters.expediente` NO se borra en esta migración. Se
-- vacía pero queda. Una migración futura puede dropearla cuando estemos
-- seguros de que ningún consumidor la lee. Por ahora el código de UI
-- ya la trata como fallback (resolveExpedienteNumero).

-- ══════════════════════════════════════════════════════════════
-- 1. Diagnóstico inicial
-- ══════════════════════════════════════════════════════════════

SELECT
  COUNT(*)                                                AS total_matters,
  COUNT(*) FILTER (WHERE m.expediente IS NOT NULL
                    AND TRIM(m.expediente) <> '')         AS con_legacy_expediente,
  COUNT(e.id)                                             AS con_expediente_vinculado,
  COUNT(*) FILTER (WHERE (m.expediente IS NOT NULL
                          AND TRIM(m.expediente) <> '')
                    AND e.id IS NULL)                     AS necesitan_backfill,
  COUNT(*) FILTER (WHERE e.id IS NOT NULL
                    AND m.expediente IS NOT NULL
                    AND TRIM(m.expediente) <> ''
                    AND TRIM(m.expediente) <> COALESCE(e.nro_juzgado, '')
                    AND TRIM(m.expediente) <> COALESCE(e.nro_receptoria, '')) AS conflicto
FROM matters m
LEFT JOIN expedientes e ON e.matter_id = m.id;

-- ══════════════════════════════════════════════════════════════
-- 2. Add columna `notas` a expedientes si no existe
-- ══════════════════════════════════════════════════════════════
-- (Para preservar el legacy en caso de conflicto.)

ALTER TABLE expedientes ADD COLUMN IF NOT EXISTS notas TEXT;

-- ══════════════════════════════════════════════════════════════
-- 3. BACKFILL — crear expediente para matters legacy sin uno
-- ══════════════════════════════════════════════════════════════

INSERT INTO expedientes (matter_id, caratula, fuero, nro_juzgado, estado_troncal, estado_desde, mev_presentado, notas)
SELECT
  m.id,
  COALESCE(NULLIF(TRIM(m.title), ''), 'Caso sin carátula'),
  CASE
    WHEN m.type = 'Familia'     THEN 'Civil'
    WHEN m.type = 'Civil'       THEN 'Civil'
    WHEN m.type = 'Comercial'   THEN 'Comercial'
    WHEN m.type = 'Daños'       THEN 'Civil'
    WHEN m.type = 'Sucesiones'  THEN 'Civil'
    WHEN m.type = 'Laboral'     THEN 'Laboral'
    ELSE 'Civil'
  END,
  TRIM(m.expediente),
  'En trámite',
  CURRENT_DATE,
  FALSE,
  'Migrado desde matters.expediente (031_consolidar_expediente)'
FROM matters m
LEFT JOIN expedientes e ON e.matter_id = m.id
WHERE m.expediente IS NOT NULL
  AND TRIM(m.expediente) <> ''
  AND e.id IS NULL;

-- ══════════════════════════════════════════════════════════════
-- 4. CONFLICTO — preservar legacy en notas
-- ══════════════════════════════════════════════════════════════
-- Si hay expediente Y matter.expediente tiene un valor que no coincide
-- con nro_juzgado ni nro_receptoria, lo guardamos en notas para que
-- el usuario revise.

UPDATE expedientes e
SET notas = COALESCE(NULLIF(TRIM(e.notas), '') || E'\n', '')
            || 'Legacy matter.expediente: ' || TRIM(m.expediente)
FROM matters m
WHERE e.matter_id = m.id
  AND m.expediente IS NOT NULL
  AND TRIM(m.expediente) <> ''
  AND TRIM(m.expediente) <> COALESCE(e.nro_juzgado, '')
  AND TRIM(m.expediente) <> COALESCE(e.nro_receptoria, '');

-- ══════════════════════════════════════════════════════════════
-- 5. Vaciar columna legacy
-- ══════════════════════════════════════════════════════════════

UPDATE matters
SET expediente = NULL
WHERE expediente IS NOT NULL;

-- ══════════════════════════════════════════════════════════════
-- 6. Diagnóstico final
-- ══════════════════════════════════════════════════════════════

SELECT
  COUNT(*) FILTER (WHERE m.expediente IS NOT NULL
                    AND TRIM(m.expediente) <> '') AS con_legacy_restantes,
  COUNT(e.id)                                     AS total_expedientes,
  COUNT(*) FILTER (WHERE e.notas LIKE '%Legacy matter.expediente%') AS expedientes_con_conflicto_preservado
FROM matters m
LEFT JOIN expedientes e ON e.matter_id = m.id;
