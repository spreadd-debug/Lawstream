-- 022 · Plazo común vs individual
-- Ejecutar en: Supabase Dashboard → SQL Editor → New query
--
-- Distingue dos tipos de plazo según el modo de cómputo procesal:
--
--   • 'individual' — corre desde la notificación a CADA parte por
--                    separado. Cada parte tiene su propio vencimiento.
--                    Es el caso por defecto y el más común
--                    (apelación, contestar traslado, impugnar pericia).
--
--   • 'comun'      — corre desde la ÚLTIMA notificación. Si una parte
--                    es notificada después que la otra, el plazo
--                    recalcula para todas. Casos típicos:
--                      · Alegatos (art. 482 CPCCN / 480 CPCC PBA)
--                      · Traslados con litisconsorcio múltiple
--                      · Algunos plazos en juicios con varios demandados
--
-- Cuando el plazo es común y entra una nueva notificación más tarde,
-- el abogado registra la fecha desde el plazo y Lawstream recalcula
-- el vencimiento desde ahí.
--
-- Backfill: todos los plazos legados se marcan 'individual' (default
-- seguro — la app NO recalcula automáticamente, sigue funcionando).

-- ══════════════════════════════════════════════════════════════
-- 1. Columnas nuevas
-- ══════════════════════════════════════════════════════════════

ALTER TABLE plazos
  ADD COLUMN IF NOT EXISTS tipo_plazo                 TEXT,
  ADD COLUMN IF NOT EXISTS fecha_ultima_notificacion  DATE;

-- Backfill conservador
UPDATE plazos SET tipo_plazo = 'individual' WHERE tipo_plazo IS NULL;

-- CHECK constraint idempotente
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'plazos_tipo_plazo_check'
  ) THEN
    ALTER TABLE plazos
      ADD CONSTRAINT plazos_tipo_plazo_check
      CHECK (tipo_plazo IN ('individual', 'comun'));
  END IF;
END $$;

-- Hacer NOT NULL ahora que está backfilleada
ALTER TABLE plazos ALTER COLUMN tipo_plazo SET NOT NULL;
ALTER TABLE plazos ALTER COLUMN tipo_plazo SET DEFAULT 'individual';

-- ══════════════════════════════════════════════════════════════
-- 2. Diagnóstico
-- ══════════════════════════════════════════════════════════════

SELECT
  tipo_plazo,
  estado,
  COUNT(*) AS cantidad
FROM plazos
GROUP BY tipo_plazo, estado
ORDER BY tipo_plazo, estado;
