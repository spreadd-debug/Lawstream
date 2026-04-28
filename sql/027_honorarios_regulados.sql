-- 027 · Honorarios regulados (GAP 12)
-- Ejecutar en: Supabase Dashboard → SQL Editor → New query
--
-- Los honorarios regulados son los que el juez fija al cerrar el juicio
-- (típicamente al imponer costas). Distintos del PRESUPUESTO inicial
-- que el estudio acuerda con su cliente.
--
-- Ciclo procesal típico:
--   regulado por el juez → notificado → firme (5 días para apelar)
--                       → ejecutable → cobrado
--
-- Casos comunes: sentencia con costas a la contraparte, regulación
-- de pericia, regulación a mediador, regulación al letrado propio
-- por costas a la contraria.
--
-- Modelo:
--   • Una fila por cada regulación. Un caso puede tener varias
--     (mi letrado, perito A, perito B, mediador, etc.).
--   • Cantidad y unidad — JUS / UMA, reusa el tipo del GAP 11.
--   • Snapshot del valor de la unidad al regular (los regulados se
--     cobran al valor de la regulación, no al actual).

-- ══════════════════════════════════════════════════════════════
-- 1. TABLA honorarios_regulados
-- ══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS honorarios_regulados (
  id                       UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  matter_id                UUID         NOT NULL REFERENCES matters(id) ON DELETE CASCADE,
  profesional              TEXT         NOT NULL,                  -- nombre del beneficiario
  tipo                     TEXT         NOT NULL DEFAULT 'letrado_propio' CHECK (tipo IN (
    'letrado_propio',       -- yo / colega del estudio
    'letrado_contrario',    -- letrado de la otra parte
    'perito',
    'mediador',
    'otro'
  )),
  cantidad_unidades        NUMERIC(10,2) NOT NULL CHECK (cantidad_unidades > 0),
  unidad                   TEXT         NOT NULL DEFAULT 'JUS' CHECK (unidad IN ('JUS', 'UMA')),
  valor_unidad_snapshot    NUMERIC(14,2) NOT NULL CHECK (valor_unidad_snapshot >= 0),
  monto_pesos              NUMERIC(14,2) NOT NULL CHECK (monto_pesos >= 0),
  estado                   TEXT         NOT NULL DEFAULT 'regulado' CHECK (estado IN (
    'regulado',             -- el juez lo reguló
    'apelado',              -- alguna parte lo apeló
    'firme',                -- quedó firme (sin apelación o apelación resuelta)
    'en_ejecucion',         -- se inició ejecución de honorarios
    'cobrado',              -- pagado
    'incobrable'            -- baja por incobrable
  )),
  obligado_a_pagar         TEXT,                                   -- quién paga (contraparte, mi cliente, etc.)
  fecha_regulacion         DATE,
  fecha_notificacion       DATE,
  fecha_firmeza            DATE,
  fecha_cobro              DATE,
  apelado_por              TEXT,
  notas                    TEXT,
  created_by               UUID         REFERENCES auth.users(id),
  created_at               TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at               TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_honorarios_matter ON honorarios_regulados(matter_id);
CREATE INDEX IF NOT EXISTS idx_honorarios_estado ON honorarios_regulados(estado)
  WHERE estado IN ('regulado', 'apelado', 'firme', 'en_ejecucion');

-- ══════════════════════════════════════════════════════════════
-- 2. TRIGGER updated_at
-- ══════════════════════════════════════════════════════════════

DROP TRIGGER IF EXISTS trg_honorarios_updated ON honorarios_regulados;
CREATE TRIGGER trg_honorarios_updated
  BEFORE UPDATE ON honorarios_regulados
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- ══════════════════════════════════════════════════════════════
-- 3. RLS — hereda visibilidad del matter
-- ══════════════════════════════════════════════════════════════

ALTER TABLE honorarios_regulados ENABLE ROW LEVEL SECURITY;

CREATE POLICY "honorarios_select" ON honorarios_regulados FOR SELECT USING (
  public.user_is_active() AND public.can_see_matter(matter_id)
);
CREATE POLICY "honorarios_insert" ON honorarios_regulados FOR INSERT WITH CHECK (
  public.user_is_active() AND public.can_see_matter(matter_id)
);
CREATE POLICY "honorarios_update" ON honorarios_regulados FOR UPDATE USING (
  public.user_is_active() AND public.can_see_matter(matter_id)
);
CREATE POLICY "honorarios_delete" ON honorarios_regulados FOR DELETE USING (
  public.user_is_active() AND public.can_see_matter(matter_id)
);

-- ══════════════════════════════════════════════════════════════
-- 4. Diagnóstico
-- ══════════════════════════════════════════════════════════════

SELECT 'honorarios_regulados' AS tabla, COUNT(*) AS filas FROM honorarios_regulados;
