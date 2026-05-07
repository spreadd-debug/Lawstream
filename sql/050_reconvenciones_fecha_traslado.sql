-- 050 · Reconvenciones — fecha del traslado corrido (GAP UX-28)
-- Ejecutar en: Supabase Dashboard → SQL Editor → New query
--
-- El banner de "reconvención abierta" en MatterDetail decía solo el estado
-- ('pendiente_traslado' / 'traslado_corrido') pero no mostraba la fecha
-- límite de contestación. Plazo: 15 días hábiles desde que el juzgado
-- corrió el traslado (art. 357 + 338 CPCCN / 356 + 337 CPCC PBA).
--
-- Para mostrarlo necesitamos la fecha en que el traslado fue corrido —
-- distinta de fecha_presentacion (cuando se presentó la reconvención).
-- La fecha de presentación es un dato que la parte controla; la del
-- traslado depende del juzgado y suele ser días o semanas después.
--
-- ⚠️ Idempotente. Solo agrega columna si no existe.

ALTER TABLE reconvenciones
  ADD COLUMN IF NOT EXISTS fecha_traslado_corrido DATE;

COMMENT ON COLUMN reconvenciones.fecha_traslado_corrido IS
  'Fecha en que el juzgado corrió el traslado de la reconvención (GAP UX-28). '
  'Se usa para calcular el vencimiento del plazo de contestación (15 días '
  'hábiles desde esta fecha). Solo aplica cuando estado = traslado_corrido.';

-- Diagnóstico
SELECT
  'reconvenciones con traslado corrido sin fecha cargada' AS metrica,
  COUNT(*)::TEXT                                           AS valor
FROM reconvenciones
WHERE estado = 'traslado_corrido'
  AND fecha_traslado_corrido IS NULL;
