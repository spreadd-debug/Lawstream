-- 046 · Causas relacionadas (GAP R12 — vínculo cross-fuero)
-- Ejecutar en: Supabase Dashboard → SQL Editor → New query
--
-- Un matter puede tener causas paralelas que impactan en su trámite pero
-- viven en otro fuero. Caso típico: divorcio + causa penal por
-- vaciamiento patrimonial (Ruiz/Colombo, art. 173 CP).
--
-- Modelo:
--   • causas_relacionadas — N por matter, en dos modos:
--       'externa'  — la lleva otro estudio. Solo referenciamos.
--       'interna'  — el estudio toma la causa también; vincula a otro
--                    matter del sistema vía matter_relacionada_id.
--
-- Vinculación bidireccional: la fila vive con un matter_id (origen),
-- pero queries del panel filtran por (matter_id = X OR matter_relacionada_id = X)
-- para que ambos matters vean la relación.
--
-- Dependencias: 028 (matters.kind), 033 (firm_id), helpers
-- public.set_firm_id_from_profile y public.touch_updated_at.
--
-- ⚠️ Idempotente.

-- ══════════════════════════════════════════════════════════════
-- 1. TABLA causas_relacionadas
-- ══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS causas_relacionadas (
  id                       UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  matter_id                UUID         NOT NULL REFERENCES matters(id) ON DELETE CASCADE,
  firm_id                  UUID         NOT NULL REFERENCES firms(id),

  -- Vinculación: externa (otro estudio) o interna (matter en el sistema).
  vinculacion              TEXT         NOT NULL CHECK (vinculacion IN ('externa', 'interna')),

  -- Solo para vinculacion='interna'. Apunta a otro matter del sistema.
  -- ON DELETE SET NULL: si el matter relacionado se borra, la fila queda
  -- huérfana pero no la perdemos (podría haber datos descriptivos útiles).
  matter_relacionada_id    UUID         REFERENCES matters(id) ON DELETE SET NULL,

  -- Tipo de causa relacionada. 'penal' es el caso dominante; admitimos
  -- otros para flexibilidad (cuando aparezcan se documentarán acá).
  tipo_causa               TEXT         NOT NULL CHECK (tipo_causa IN (
    'penal',
    'administrativa',
    'civil_paralela',
    'laboral_paralela',
    'concursal',
    'otra'
  )),

  -- Datos del expediente externo. Para vinculacion='interna' suelen ser
  -- redundantes (los hereda del matter relacionado) pero los dejamos
  -- editables para casos donde el matter no exista todavía.
  caratula                 TEXT,
  fuero                    TEXT,                                  -- ej. "Penal Económico", "Contencioso Administrativo Federal"
  juzgado                  TEXT,
  expediente_numero        TEXT,
  jurisdiccion             TEXT,                                  -- 'CABA', 'PBA', 'Federal', 'Uruguay', etc. — libre

  -- Abogado externo (cuando vinculacion='externa').
  abogado_externo_nombre   TEXT,
  abogado_externo_contacto TEXT,                                  -- email/teléfono libre

  -- Estado de la causa externa. Para 'interna', el estado real está en
  -- el matter relacionado; este campo queda NULL.
  estado_externo           TEXT         CHECK (estado_externo IS NULL OR estado_externo IN (
    'en_instruccion',
    'elevada_a_juicio',
    'en_juicio',
    'sentencia',
    'sentencia_firme',
    'archivada',
    'en_apelacion',
    'desconocido'
  )),

  -- Descripción del vínculo y cómo impacta al matter principal.
  descripcion              TEXT,                                  -- ej. "Denuncia penal por vaciamiento de la SRL (art. 173 CP)"
  impacto                  TEXT,                                  -- ej. "Lo que se pruebe acá afecta la valuación de la participación societaria del divorcio."

  -- Fechas relevantes.
  fecha_inicio             DATE,                                  -- inicio de la causa relacionada
  fecha_ultimo_movimiento  DATE,

  notas                    TEXT,
  created_by               UUID         REFERENCES auth.users(id),
  created_at               TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at               TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- Coherencia: si vinculacion='interna' debe haber matter_relacionada_id;
-- si es 'externa' NO debe haber FK al sistema (puede haber datos libres).
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'causas_relacionadas_vinculacion_check'
  ) THEN
    ALTER TABLE causas_relacionadas
      ADD CONSTRAINT causas_relacionadas_vinculacion_check
      CHECK (
        (vinculacion = 'interna' AND matter_relacionada_id IS NOT NULL)
        OR
        (vinculacion = 'externa' AND matter_relacionada_id IS NULL)
      );
  END IF;
END $$;

-- Coherencia: una causa no se vincula a sí misma.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'causas_relacionadas_no_self_check'
  ) THEN
    ALTER TABLE causas_relacionadas
      ADD CONSTRAINT causas_relacionadas_no_self_check
      CHECK (matter_relacionada_id IS NULL OR matter_relacionada_id <> matter_id);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_causas_relacionadas_matter      ON causas_relacionadas(matter_id);
CREATE INDEX IF NOT EXISTS idx_causas_relacionadas_relacionada ON causas_relacionadas(matter_relacionada_id) WHERE matter_relacionada_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_causas_relacionadas_firm        ON causas_relacionadas(firm_id);

DROP TRIGGER IF EXISTS trg_set_firm_id ON causas_relacionadas;
CREATE TRIGGER trg_set_firm_id
  BEFORE INSERT ON causas_relacionadas
  FOR EACH ROW EXECUTE FUNCTION public.set_firm_id_from_profile();

DROP TRIGGER IF EXISTS trg_causas_relacionadas_updated ON causas_relacionadas;
CREATE TRIGGER trg_causas_relacionadas_updated
  BEFORE UPDATE ON causas_relacionadas
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- ══════════════════════════════════════════════════════════════
-- 2. RLS — visible si el user puede ver CUALQUIERA de los dos matters
-- ══════════════════════════════════════════════════════════════
-- La vinculación es bidireccional: si A↔B, los users que ven A ven la
-- relación, y los que ven B también. Lo logramos en RLS chequeando
-- ambos matter_id y matter_relacionada_id.

ALTER TABLE causas_relacionadas ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "causas_relacionadas_select" ON causas_relacionadas;
CREATE POLICY "causas_relacionadas_select" ON causas_relacionadas FOR SELECT USING (
  public.user_is_active() AND (
    public.can_see_matter(matter_id)
    OR (matter_relacionada_id IS NOT NULL AND public.can_see_matter(matter_relacionada_id))
  )
);

-- INSERT/UPDATE/DELETE solo desde el matter "origen" (matter_id) — quien
-- creó la vinculación es quien puede modificarla. Esto evita conflictos
-- cuando dos firms distintos comparten visibilidad (caso edge multi-firm).
DROP POLICY IF EXISTS "causas_relacionadas_insert" ON causas_relacionadas;
CREATE POLICY "causas_relacionadas_insert" ON causas_relacionadas FOR INSERT WITH CHECK (
  public.user_is_active() AND public.can_see_matter(matter_id)
);
DROP POLICY IF EXISTS "causas_relacionadas_update" ON causas_relacionadas;
CREATE POLICY "causas_relacionadas_update" ON causas_relacionadas FOR UPDATE USING (
  public.user_is_active() AND public.can_see_matter(matter_id)
);
DROP POLICY IF EXISTS "causas_relacionadas_delete" ON causas_relacionadas;
CREATE POLICY "causas_relacionadas_delete" ON causas_relacionadas FOR DELETE USING (
  public.user_is_active() AND public.can_see_matter(matter_id)
);

-- ══════════════════════════════════════════════════════════════
-- 3. Diagnóstico
-- ══════════════════════════════════════════════════════════════

SELECT
  'causas_relacionadas filas'                  AS metrica,
  COUNT(*)::TEXT                                AS valor
FROM causas_relacionadas
UNION ALL
SELECT 'externas', COUNT(*)::TEXT FROM causas_relacionadas WHERE vinculacion = 'externa'
UNION ALL
SELECT 'internas', COUNT(*)::TEXT FROM causas_relacionadas WHERE vinculacion = 'interna';
