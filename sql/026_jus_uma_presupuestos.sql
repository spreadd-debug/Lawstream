-- 026 · JUS vs UMA en presupuestos (GAP 11)
-- Ejecutar en: Supabase Dashboard → SQL Editor → New query
--
-- En Argentina, los honorarios profesionales se cuantifican según la
-- jurisdicción del fuero:
--
--   • JUS  — Ley 27.423 — Justicia Nacional / CABA (fuero federal y nacional).
--   • UMA  — Ley 14.967 — Provincia de Buenos Aires (fueros provinciales).
--
-- Hasta ahora la app solo manejaba "IUS" (terminología incorrecta — debería
-- ser JUS) sin distinguir UMA. Los presupuestos para casos en PBA quedaban
-- mal denominados.
--
-- Este cambio:
--   • Agrega columna `unidad` a presupuestos: 'JUS' | 'UMA'. Default 'JUS'.
--   • La columna `ius_valor_snapshot` (legacy) se mantiene como está; ahora
--     conceptualmente es "valor de la unidad arancelaria al momento del
--     snapshot" (sea JUS o UMA según la columna `unidad`).
--   • El valor de UMA se almacena en studio_config con key 'uma_valor'
--     (paralelo al existente 'ius_valor' que sigue siendo el valor del JUS).
--     No requiere migración — studio_config es key/value flex.

-- ══════════════════════════════════════════════════════════════
-- 1. Columna `unidad` en presupuestos
-- ══════════════════════════════════════════════════════════════

ALTER TABLE presupuestos
  ADD COLUMN IF NOT EXISTS unidad TEXT;

-- Backfill conservador: los presupuestos legados se asumen JUS
-- (el valor histórico del estudio era 'ius_valor', equivalente JUS).
UPDATE presupuestos SET unidad = 'JUS' WHERE unidad IS NULL;

-- CHECK constraint idempotente
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'presupuestos_unidad_check'
  ) THEN
    ALTER TABLE presupuestos
      ADD CONSTRAINT presupuestos_unidad_check
      CHECK (unidad IN ('JUS', 'UMA'));
  END IF;
END $$;

ALTER TABLE presupuestos ALTER COLUMN unidad SET NOT NULL;
ALTER TABLE presupuestos ALTER COLUMN unidad SET DEFAULT 'JUS';

-- ══════════════════════════════════════════════════════════════
-- 2. Diagnóstico
-- ══════════════════════════════════════════════════════════════

SELECT unidad, COUNT(*) AS cantidad
FROM presupuestos
GROUP BY unidad
ORDER BY cantidad DESC;

-- Para configurar el valor del UMA en producción, ejecutar manualmente
-- desde el SQL Editor (o desde la UI cuando esté disponible):
--
--   INSERT INTO studio_config (key, value, updated_at)
--   VALUES ('uma_valor', '{"pesos": 25000}'::jsonb, NOW())
--   ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW();
