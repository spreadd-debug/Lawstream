-- 024 · Letrados de la contraparte (y otras partes) con historial
-- Ejecutar en: Supabase Dashboard → SQL Editor → New query
--
-- Modela los letrados que representan a la contraparte (o terceros,
-- fiscalía, defensoría) con datos estructurados y registro histórico
-- de cambios. Antes vivían como strings en `matter.caseData`
-- (`conyuge2_abogado`, `conyuge2_abogado_matricula`) — sobrescribirlos
-- al cambiar de letrado borraba el dato anterior.
--
-- Patrón de uso:
--   • Al inicio del caso se carga el letrado de la contraparte (estado
--     'vigente').
--   • Si renuncia o lo sustituyen, se cambia su estado a 'sustituido'
--     o 'renunciante' y se carga el nuevo con estado 'vigente'.
--   • Solo UNO debe estar 'vigente' por (matter_id, representa_a) en
--     un momento dado, pero la app no fuerza eso a nivel DB
--     (el form lo controla).

-- ══════════════════════════════════════════════════════════════
-- 1. TABLA letrados_parte
-- ══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS letrados_parte (
  id                    UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  matter_id             UUID         NOT NULL REFERENCES matters(id) ON DELETE CASCADE,
  nombre                TEXT         NOT NULL,
  matricula             TEXT,                   -- ej: 'T° 45 F° 234'
  colegio               TEXT,                   -- ej: 'CASI', 'CPACF', 'CALP'
  email                 TEXT,
  telefono              TEXT,
  domicilio_legal       TEXT,
  domicilio_electronico TEXT,                   -- CUIT/CUIL para PJN/MEV
  representa_a          TEXT         NOT NULL DEFAULT 'contraparte' CHECK (representa_a IN (
    'contraparte', 'tercero', 'fiscalia', 'defensoria', 'otra'
  )),
  estado                TEXT         NOT NULL DEFAULT 'vigente' CHECK (estado IN (
    'vigente', 'renunciante', 'cesado', 'sustituido'
  )),
  fecha_designacion     DATE,
  fecha_cese            DATE,
  motivo_cese           TEXT,
  notas                 TEXT,
  created_by            UUID         REFERENCES auth.users(id),
  created_at            TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_letrados_matter      ON letrados_parte(matter_id);
CREATE INDEX IF NOT EXISTS idx_letrados_vigentes    ON letrados_parte(matter_id, representa_a)
  WHERE estado = 'vigente';

-- ══════════════════════════════════════════════════════════════
-- 2. TRIGGER updated_at
-- ══════════════════════════════════════════════════════════════

DROP TRIGGER IF EXISTS trg_letrados_updated ON letrados_parte;
CREATE TRIGGER trg_letrados_updated
  BEFORE UPDATE ON letrados_parte
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- ══════════════════════════════════════════════════════════════
-- 3. RLS — hereda visibilidad del matter
-- ══════════════════════════════════════════════════════════════

ALTER TABLE letrados_parte ENABLE ROW LEVEL SECURITY;

CREATE POLICY "letrados_select" ON letrados_parte FOR SELECT USING (
  public.user_is_active() AND public.can_see_matter(matter_id)
);
CREATE POLICY "letrados_insert" ON letrados_parte FOR INSERT WITH CHECK (
  public.user_is_active() AND public.can_see_matter(matter_id)
);
CREATE POLICY "letrados_update" ON letrados_parte FOR UPDATE USING (
  public.user_is_active() AND public.can_see_matter(matter_id)
);
CREATE POLICY "letrados_delete" ON letrados_parte FOR DELETE USING (
  public.user_is_active() AND public.can_see_matter(matter_id)
);

-- ══════════════════════════════════════════════════════════════
-- 4. Diagnóstico
-- ══════════════════════════════════════════════════════════════

SELECT 'letrados_parte' AS tabla, COUNT(*) AS filas FROM letrados_parte;
