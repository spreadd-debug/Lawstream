-- 047 · Cautelares patrimoniales + Veedores (GAP R15)
-- Ejecutar en: Supabase Dashboard → SQL Editor → New query
--
-- Caso real (Ruiz/Colombo, 2026):
--   • 28/02 — Valentina pide inhibición general de bienes contra
--     Sebastián + intervención judicial de la SRL con designación
--     de veedor.
--   • 05/03 — Concedidas. La inhibición se levanta parcialmente al
--     ejecutarse la 1ª cuota; la intervención se mantiene hasta cobro
--     total.
--
-- Hoy IncidenteTipo tiene 'medida_cautelar' genérico pero sin campos
-- estructurados para fechas, alcance, levantamientos parciales ni
-- registro de inscripción. El veedor judicial no encaja en Perito (rol
-- distinto: vigilancia continua + informes periódicos vs. dictamen único).
--
-- Modelo:
--   • cautelares — N por matter, con tipo enum y FK opcional a bien o
--     sociedad afectada. Vida útil: solicitada → concedida → trabada →
--     levantada total/parcialmente. Soporta levantamiento parcial vía
--     fecha_levantamiento_parcial separada de la total.
--   • veedores — N por matter, ciclo independiente (designado, aceptado,
--     informe periódico, cesado). FK opcional a cautelar cuando la
--     designación surge de una intervención judicial.
--
-- Dependencias: 028 (matters.kind), 033 (firm_id), 045 (bienes y
-- sociedades_interpuestas para FKs), helpers
-- public.set_firm_id_from_profile y public.touch_updated_at.
--
-- ⚠️ Idempotente.

-- ══════════════════════════════════════════════════════════════
-- 1. TABLA cautelares
-- ══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS cautelares (
  id                          UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  matter_id                   UUID         NOT NULL REFERENCES matters(id) ON DELETE CASCADE,
  firm_id                     UUID         NOT NULL REFERENCES firms(id),

  tipo                        TEXT         NOT NULL CHECK (tipo IN (
    'inhibicion_general',
    'embargo',
    'intervencion_judicial',
    'secuestro',
    'anotacion_litis',
    'prohibicion_innovar',
    'prohibicion_contratar',
    'otra'
  )),

  -- Contra quién se traba. Reusa el enum genérico.
  contra_rol                  TEXT         NOT NULL DEFAULT 'contraparte' CHECK (contra_rol IN ('cliente', 'contraparte', 'ambos', 'tercero')),
  contra_detalle              TEXT,                                  -- ej. "Sebastián Ruiz, DNI 25.890.123"

  -- Vínculos opcionales al patrimonio afectado. Si la cautelar es
  -- general (sobre todos los bienes registrables del titular), se dejan
  -- en NULL y se describe en `alcance`.
  bien_id                     UUID         REFERENCES bienes(id) ON DELETE SET NULL,
  sociedad_interpuesta_id     UUID         REFERENCES sociedades_interpuestas(id) ON DELETE SET NULL,

  alcance                     TEXT,                                  -- ej. "Sobre todos los bienes registrables del demandado" / "Cuenta HSBC U$S 85.000"

  -- Ciclo procesal.
  --   solicitada            — pedida pero aún no resuelta.
  --   concedida             — el juez concede pero todavía no se trabó/inscribió.
  --   trabada               — efectivamente trabada e inscripta donde corresponda.
  --   parcialmente_levantada — se levantó sobre algunos bienes pero sigue vigente.
  --   levantada             — se levantó por completo.
  --   rechazada             — el juez rechazó la solicitud.
  estado                      TEXT         NOT NULL DEFAULT 'solicitada' CHECK (estado IN (
    'solicitada',
    'concedida',
    'trabada',
    'parcialmente_levantada',
    'levantada',
    'rechazada'
  )),

  -- Fechas del ciclo. NULL hasta que ocurran.
  fecha_solicitud             DATE,
  fecha_resolucion            DATE,                                  -- fecha en que el juez decide
  fecha_traba                 DATE,                                  -- inscripción registral / efectividad
  fecha_levantamiento_parcial DATE,
  fecha_levantamiento_total   DATE,
  fecha_rechazo               DATE,

  -- Inscripción registral (Reg. Propiedad Inmueble, DNRPA, IGJ, etc.)
  registro_inscripcion        TEXT,                                  -- ej. "Reg. Inhibiciones CABA, fol. 234"

  -- Contracautela (caución real, juratoria, fianza).
  caucion_tipo                TEXT,                                  -- 'real', 'juratoria', 'fianza', 'no_corresponde'
  caucion_monto_desc          TEXT,                                  -- libre — puede ser ARS o USD

  observaciones               TEXT,
  notas                       TEXT,
  created_by                  UUID         REFERENCES auth.users(id),
  created_at                  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at                  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_cautelares_matter   ON cautelares(matter_id);
CREATE INDEX IF NOT EXISTS idx_cautelares_firm     ON cautelares(firm_id);
CREATE INDEX IF NOT EXISTS idx_cautelares_estado   ON cautelares(matter_id, estado)
  WHERE estado IN ('solicitada', 'concedida', 'trabada', 'parcialmente_levantada');
CREATE INDEX IF NOT EXISTS idx_cautelares_bien     ON cautelares(bien_id) WHERE bien_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_cautelares_sociedad ON cautelares(sociedad_interpuesta_id) WHERE sociedad_interpuesta_id IS NOT NULL;

DROP TRIGGER IF EXISTS trg_set_firm_id ON cautelares;
CREATE TRIGGER trg_set_firm_id
  BEFORE INSERT ON cautelares
  FOR EACH ROW EXECUTE FUNCTION public.set_firm_id_from_profile();

DROP TRIGGER IF EXISTS trg_cautelares_updated ON cautelares;
CREATE TRIGGER trg_cautelares_updated
  BEFORE UPDATE ON cautelares
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

ALTER TABLE cautelares ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "cautelares_select" ON cautelares;
CREATE POLICY "cautelares_select" ON cautelares FOR SELECT USING (
  public.user_is_active() AND public.can_see_matter(matter_id)
);
DROP POLICY IF EXISTS "cautelares_insert" ON cautelares;
CREATE POLICY "cautelares_insert" ON cautelares FOR INSERT WITH CHECK (
  public.user_is_active() AND public.can_see_matter(matter_id)
);
DROP POLICY IF EXISTS "cautelares_update" ON cautelares;
CREATE POLICY "cautelares_update" ON cautelares FOR UPDATE USING (
  public.user_is_active() AND public.can_see_matter(matter_id)
);
DROP POLICY IF EXISTS "cautelares_delete" ON cautelares;
CREATE POLICY "cautelares_delete" ON cautelares FOR DELETE USING (
  public.user_is_active() AND public.can_see_matter(matter_id)
);

-- ══════════════════════════════════════════════════════════════
-- 2. TABLA veedores
-- ══════════════════════════════════════════════════════════════
-- El veedor judicial vigila una sociedad / actividad mientras dure la
-- intervención. NO es perito (rol y ciclo distinto): emite informes
-- periódicos, su honorario se regula aparte, su designación cesa cuando
-- se levanta la intervención.

CREATE TABLE IF NOT EXISTS veedores (
  id                       UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  matter_id                UUID         NOT NULL REFERENCES matters(id) ON DELETE CASCADE,
  firm_id                  UUID         NOT NULL REFERENCES firms(id),

  -- Cautelar de origen (típicamente intervención judicial). Opcional —
  -- a veces el veedor se designa directamente sin cautelar previa
  -- registrada en el sistema.
  cautelar_id              UUID         REFERENCES cautelares(id) ON DELETE SET NULL,

  nombre                   TEXT         NOT NULL,
  especialidad             TEXT,                                    -- 'contador', 'abogado', 'ingeniero', etc.
  matricula                TEXT,
  email                    TEXT,
  telefono                 TEXT,

  estado                   TEXT         NOT NULL DEFAULT 'designado' CHECK (estado IN (
    'designado',
    'aceptado',
    'rechazado',
    'recusado',
    'sustituido',
    'cesado'
  )),

  alcance                  TEXT,                                    -- ej. "Vigilar todas las operaciones de Centro Cardiovascular S.R.L."

  frecuencia_informes      TEXT         CHECK (frecuencia_informes IS NULL OR frecuencia_informes IN (
    'mensual', 'bimestral', 'trimestral', 'semestral', 'a_requerimiento'
  )),

  fecha_designacion        DATE,
  fecha_aceptacion         DATE,
  fecha_cese               DATE,

  honorarios_desc          TEXT,                                    -- libre: "Regulados al 5% del activo intervenido", etc.

  observaciones            TEXT,
  notas                    TEXT,
  created_by               UUID         REFERENCES auth.users(id),
  created_at               TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at               TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_veedores_matter   ON veedores(matter_id);
CREATE INDEX IF NOT EXISTS idx_veedores_firm     ON veedores(firm_id);
CREATE INDEX IF NOT EXISTS idx_veedores_cautelar ON veedores(cautelar_id) WHERE cautelar_id IS NOT NULL;

DROP TRIGGER IF EXISTS trg_set_firm_id ON veedores;
CREATE TRIGGER trg_set_firm_id
  BEFORE INSERT ON veedores
  FOR EACH ROW EXECUTE FUNCTION public.set_firm_id_from_profile();

DROP TRIGGER IF EXISTS trg_veedores_updated ON veedores;
CREATE TRIGGER trg_veedores_updated
  BEFORE UPDATE ON veedores
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

ALTER TABLE veedores ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "veedores_select" ON veedores;
CREATE POLICY "veedores_select" ON veedores FOR SELECT USING (
  public.user_is_active() AND public.can_see_matter(matter_id)
);
DROP POLICY IF EXISTS "veedores_insert" ON veedores;
CREATE POLICY "veedores_insert" ON veedores FOR INSERT WITH CHECK (
  public.user_is_active() AND public.can_see_matter(matter_id)
);
DROP POLICY IF EXISTS "veedores_update" ON veedores;
CREATE POLICY "veedores_update" ON veedores FOR UPDATE USING (
  public.user_is_active() AND public.can_see_matter(matter_id)
);
DROP POLICY IF EXISTS "veedores_delete" ON veedores;
CREATE POLICY "veedores_delete" ON veedores FOR DELETE USING (
  public.user_is_active() AND public.can_see_matter(matter_id)
);

-- ══════════════════════════════════════════════════════════════
-- 3. Diagnóstico
-- ══════════════════════════════════════════════════════════════

SELECT 'cautelares filas'                       AS metrica, COUNT(*)::TEXT AS valor FROM cautelares
UNION ALL
SELECT 'cautelares vigentes (no levantadas/rechazadas)',
       COUNT(*)::TEXT FROM cautelares WHERE estado IN ('solicitada', 'concedida', 'trabada', 'parcialmente_levantada')
UNION ALL
SELECT 'veedores filas',                       COUNT(*)::TEXT FROM veedores
UNION ALL
SELECT 'veedores activos',                      COUNT(*)::TEXT FROM veedores WHERE estado IN ('designado', 'aceptado');
