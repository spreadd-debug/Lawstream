-- 021 · Plazos suspendidos y reanudados
-- Ejecutar en: Supabase Dashboard → SQL Editor → New query
--
-- Agrega estado 'suspendido' al enum de plazos y los campos para
-- registrar la suspensión y poder reanudar correctamente:
--
--   1. El abogado suspende el plazo (motivo: incidente, licencia,
--      acordada de feria extraordinaria, acuerdo de partes, etc).
--   2. Lawstream calcula los días hábiles transcurridos entre el
--      inicio y la fecha de suspensión.
--   3. Al reanudar, computa los días restantes (total - transcurridos)
--      y recalcula la fecha de vencimiento desde la fecha de reanudación.
--
-- Nota: el cómputo automático de feriados/feria judicial ya está en
-- `calcularVencimiento` (saltea esos días al sumar). La suspensión
-- manual es para casos donde un juez ordena pausar el plazo (no
-- automático por calendario).

-- ══════════════════════════════════════════════════════════════
-- 1. Reemplazar el CHECK de estado para aceptar 'suspendido'
-- ══════════════════════════════════════════════════════════════

ALTER TABLE plazos DROP CONSTRAINT IF EXISTS plazos_estado_check;
ALTER TABLE plazos ADD CONSTRAINT plazos_estado_check
  CHECK (estado IN ('activo', 'suspendido', 'cumplido', 'vencido', 'cancelado'));

-- ══════════════════════════════════════════════════════════════
-- 2. Columnas para tracking de suspensión
-- ══════════════════════════════════════════════════════════════
-- suspendido_desde:                 fecha en que se suspendió (DATE).
-- motivo_suspension:                texto libre — "feria extraordinaria",
--                                   "licencia médica del perito", etc.
-- dias_transcurridos_al_suspender:  días hábiles ya consumidos al momento
--                                   de la suspensión. Se preserva al
--                                   reanudar para no recalcular desde cero.
-- reanudado_at / fecha_reanudacion: histórico — cuándo se levantó la
--                                   suspensión y desde qué fecha empezó
--                                   a correr de nuevo.

ALTER TABLE plazos
  ADD COLUMN IF NOT EXISTS suspendido_desde                DATE,
  ADD COLUMN IF NOT EXISTS motivo_suspension               TEXT,
  ADD COLUMN IF NOT EXISTS dias_transcurridos_al_suspender INTEGER,
  ADD COLUMN IF NOT EXISTS fecha_reanudacion               DATE,
  ADD COLUMN IF NOT EXISTS reanudado_at                    TIMESTAMPTZ;

-- ══════════════════════════════════════════════════════════════
-- 3. Diagnóstico
-- ══════════════════════════════════════════════════════════════

SELECT
  estado,
  COUNT(*) AS cantidad
FROM plazos
GROUP BY estado
ORDER BY cantidad DESC;
