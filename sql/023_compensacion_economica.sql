-- 023 · Compensación económica con calendario de cuotas
-- Ejecutar en: Supabase Dashboard → SQL Editor → New query
--
-- Modela las compensaciones económicas que se pagan en cuotas
-- post-sentencia (típicamente en divorcio con patrimonio relevante,
-- art. 441 CCyCN). Hasta ahora la propuesta reguladora capturaba
-- monto/plazo en `caseData` JSONB pero sin tabla de cuotas, sin
-- calendario, sin tracking de pagos. El caso seguía "vivo" pero
-- la app lo cerraba en sentencia.
--
-- Modelo:
--   • compensaciones        — un registro por compensación pactada
--                             (puede haber más de una por caso si se
--                             renegocia).
--   • cuotas_compensacion   — N filas, una por cuota del calendario.
--                             Se generan automáticamente al crear
--                             la compensación.

-- ══════════════════════════════════════════════════════════════
-- 1. TABLA compensaciones
-- ══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS compensaciones (
  id                  UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  matter_id           UUID         NOT NULL REFERENCES matters(id) ON DELETE CASCADE,
  monto_total         NUMERIC(14,2) NOT NULL CHECK (monto_total > 0),
  moneda              TEXT         NOT NULL DEFAULT 'ARS' CHECK (moneda IN ('ARS', 'USD', 'EUR')),
  cantidad_cuotas     INTEGER      NOT NULL CHECK (cantidad_cuotas >= 1),
  frecuencia          TEXT         NOT NULL DEFAULT 'mensual' CHECK (frecuencia IN (
    'mensual', 'bimestral', 'trimestral', 'semestral', 'anual', 'unica'
  )),
  fecha_primera_cuota DATE         NOT NULL,
  tasa_interes_anual  NUMERIC(6,3),     -- ej: 4.500 = 4.5% anual; null si no hay
  estado              TEXT         NOT NULL DEFAULT 'vigente' CHECK (estado IN (
    'vigente', 'cumplida', 'incumplida', 'renegociada'
  )),
  notas               TEXT,
  created_by          UUID         REFERENCES auth.users(id),
  created_at          TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_compensaciones_matter ON compensaciones(matter_id);
CREATE INDEX IF NOT EXISTS idx_compensaciones_estado ON compensaciones(estado)
  WHERE estado IN ('vigente', 'incumplida');

-- ══════════════════════════════════════════════════════════════
-- 2. TABLA cuotas_compensacion
-- ══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS cuotas_compensacion (
  id                UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  compensacion_id   UUID         NOT NULL REFERENCES compensaciones(id) ON DELETE CASCADE,
  numero            INTEGER      NOT NULL CHECK (numero >= 1),
  fecha_vencimiento DATE         NOT NULL,
  monto             NUMERIC(14,2) NOT NULL CHECK (monto > 0),
  estado            TEXT         NOT NULL DEFAULT 'pendiente' CHECK (estado IN (
    'pendiente', 'pagada', 'parcial', 'mora'
  )),
  fecha_pago        DATE,
  monto_pagado      NUMERIC(14,2),
  comprobante_url   TEXT,
  notas             TEXT,
  created_at        TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  UNIQUE (compensacion_id, numero)
);

CREATE INDEX IF NOT EXISTS idx_cuotas_compensacion ON cuotas_compensacion(compensacion_id);
CREATE INDEX IF NOT EXISTS idx_cuotas_vencimiento  ON cuotas_compensacion(fecha_vencimiento)
  WHERE estado IN ('pendiente', 'parcial', 'mora');

-- ══════════════════════════════════════════════════════════════
-- 3. TRIGGERS updated_at
-- ══════════════════════════════════════════════════════════════

DROP TRIGGER IF EXISTS trg_compensaciones_updated ON compensaciones;
CREATE TRIGGER trg_compensaciones_updated
  BEFORE UPDATE ON compensaciones
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

DROP TRIGGER IF EXISTS trg_cuotas_updated ON cuotas_compensacion;
CREATE TRIGGER trg_cuotas_updated
  BEFORE UPDATE ON cuotas_compensacion
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- ══════════════════════════════════════════════════════════════
-- 4. RLS — heredan visibilidad del matter
-- ══════════════════════════════════════════════════════════════

ALTER TABLE compensaciones      ENABLE ROW LEVEL SECURITY;
ALTER TABLE cuotas_compensacion ENABLE ROW LEVEL SECURITY;

CREATE POLICY "compensaciones_select" ON compensaciones FOR SELECT USING (
  public.user_is_active() AND public.can_see_matter(matter_id)
);
CREATE POLICY "compensaciones_insert" ON compensaciones FOR INSERT WITH CHECK (
  public.user_is_active() AND public.can_see_matter(matter_id)
);
CREATE POLICY "compensaciones_update" ON compensaciones FOR UPDATE USING (
  public.user_is_active() AND public.can_see_matter(matter_id)
);
CREATE POLICY "compensaciones_delete" ON compensaciones FOR DELETE USING (
  public.user_is_active() AND public.can_see_matter(matter_id)
);

-- Las cuotas se filtran por la compensación a la que pertenecen.
CREATE POLICY "cuotas_select" ON cuotas_compensacion FOR SELECT USING (
  public.user_is_active() AND EXISTS (
    SELECT 1 FROM compensaciones c
    WHERE c.id = cuotas_compensacion.compensacion_id
      AND public.can_see_matter(c.matter_id)
  )
);
CREATE POLICY "cuotas_insert" ON cuotas_compensacion FOR INSERT WITH CHECK (
  public.user_is_active() AND EXISTS (
    SELECT 1 FROM compensaciones c
    WHERE c.id = cuotas_compensacion.compensacion_id
      AND public.can_see_matter(c.matter_id)
  )
);
CREATE POLICY "cuotas_update" ON cuotas_compensacion FOR UPDATE USING (
  public.user_is_active() AND EXISTS (
    SELECT 1 FROM compensaciones c
    WHERE c.id = cuotas_compensacion.compensacion_id
      AND public.can_see_matter(c.matter_id)
  )
);
CREATE POLICY "cuotas_delete" ON cuotas_compensacion FOR DELETE USING (
  public.user_is_active() AND EXISTS (
    SELECT 1 FROM compensaciones c
    WHERE c.id = cuotas_compensacion.compensacion_id
      AND public.can_see_matter(c.matter_id)
  )
);

-- ══════════════════════════════════════════════════════════════
-- 5. Diagnóstico
-- ══════════════════════════════════════════════════════════════

SELECT
  'compensaciones' AS tabla, COUNT(*) AS filas FROM compensaciones
UNION ALL
SELECT 'cuotas_compensacion', COUNT(*) FROM cuotas_compensacion;
