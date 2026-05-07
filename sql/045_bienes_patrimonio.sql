-- 045 · Bienes / patrimonio como entidad (GAP R4 + R9 + R14)
-- Ejecutar en: Supabase Dashboard → SQL Editor → New query
--
-- Hasta hoy bienes y deudas viven como arrays JSON en case_data.bienes y
-- case_data.deudas (solo en templates de divorcio). Sin consumers reales,
-- sin valuaciones temporales, sin país, sin sociedad interpuesta.
--
-- El audit identifica tres gaps relacionados que se resuelven juntos:
--   • R4  — bienes en jurisdicción extranjera (Punta del Este, Italia, etc.)
--   • R9  — sociedad interpuesta que titulariza un bien (Playa Serena S.A.)
--   • R14 — valuación variable en el tiempo (Bull Market 42k → 28k)
--
-- Modelo genérico desde el principio (no atado a divorcio):
--   • bienes — activos y pasivos del matter, con titular_rol agnóstico
--     ('cliente'|'contraparte'|'ambos'|'tercero'). Sirve igual para
--     sucesiones (cliente=heredero solicitante, tercero=causante),
--     comercial (deudor/acreedor), daños (víctima/responsable).
--   • sociedades_interpuestas — N por matter, FK opcional desde bienes.
--   • bien_valuaciones — snapshots con fecha, para detectar vaciamiento
--     o evolución patrimonial.
--
-- Backfill: migra case_data.bienes y case_data.deudas a la nueva tabla y
-- limpia el JSONB.
--
-- Dependencias: 028 (matters.kind), 033 (firm_id), helpers
-- public.set_firm_id_from_profile y public.touch_updated_at.
--
-- ⚠️ Idempotente.

-- ══════════════════════════════════════════════════════════════
-- 1. TABLA sociedades_interpuestas
-- ══════════════════════════════════════════════════════════════
-- La creamos primero porque bienes.sociedad_interpuesta_id la referencia.

CREATE TABLE IF NOT EXISTS sociedades_interpuestas (
  id                  UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  matter_id           UUID         NOT NULL REFERENCES matters(id) ON DELETE CASCADE,
  firm_id             UUID         NOT NULL REFERENCES firms(id),

  denominacion        TEXT         NOT NULL,
  tipo_societario     TEXT,                                       -- 'SA', 'SRL', 'LLC', etc.
  jurisdiccion        TEXT,                                       -- 'Uruguay', 'Argentina', 'Estados Unidos', etc.
  cuit_o_id_fiscal    TEXT,
  accionistas_desc    TEXT,                                       -- ej. "Único accionista: Sebastián Ruiz"
  observaciones       TEXT,
  notas               TEXT,
  created_by          UUID         REFERENCES auth.users(id),
  created_at          TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sociedades_interpuestas_matter ON sociedades_interpuestas(matter_id);
CREATE INDEX IF NOT EXISTS idx_sociedades_interpuestas_firm   ON sociedades_interpuestas(firm_id);

DROP TRIGGER IF EXISTS trg_set_firm_id ON sociedades_interpuestas;
CREATE TRIGGER trg_set_firm_id
  BEFORE INSERT ON sociedades_interpuestas
  FOR EACH ROW EXECUTE FUNCTION public.set_firm_id_from_profile();

DROP TRIGGER IF EXISTS trg_sociedades_interpuestas_updated ON sociedades_interpuestas;
CREATE TRIGGER trg_sociedades_interpuestas_updated
  BEFORE UPDATE ON sociedades_interpuestas
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

ALTER TABLE sociedades_interpuestas ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "sociedades_interpuestas_select" ON sociedades_interpuestas;
CREATE POLICY "sociedades_interpuestas_select" ON sociedades_interpuestas FOR SELECT USING (
  public.user_is_active() AND public.can_see_matter(matter_id)
);
DROP POLICY IF EXISTS "sociedades_interpuestas_insert" ON sociedades_interpuestas;
CREATE POLICY "sociedades_interpuestas_insert" ON sociedades_interpuestas FOR INSERT WITH CHECK (
  public.user_is_active() AND public.can_see_matter(matter_id)
);
DROP POLICY IF EXISTS "sociedades_interpuestas_update" ON sociedades_interpuestas;
CREATE POLICY "sociedades_interpuestas_update" ON sociedades_interpuestas FOR UPDATE USING (
  public.user_is_active() AND public.can_see_matter(matter_id)
);
DROP POLICY IF EXISTS "sociedades_interpuestas_delete" ON sociedades_interpuestas;
CREATE POLICY "sociedades_interpuestas_delete" ON sociedades_interpuestas FOR DELETE USING (
  public.user_is_active() AND public.can_see_matter(matter_id)
);

-- ══════════════════════════════════════════════════════════════
-- 2. TABLA bienes
-- ══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS bienes (
  id                       UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  matter_id                UUID         NOT NULL REFERENCES matters(id) ON DELETE CASCADE,
  firm_id                  UUID         NOT NULL REFERENCES firms(id),

  -- naturaleza distingue activos (bienes) de pasivos (deudas) en la misma tabla.
  naturaleza               TEXT         NOT NULL DEFAULT 'activo' CHECK (naturaleza IN ('activo', 'pasivo')),

  -- tipo cubre activos y pasivos. Lista cerrada para análisis posterior.
  tipo                     TEXT         NOT NULL CHECK (tipo IN (
    'inmueble',
    'vehiculo',
    'cuenta_bancaria',
    'inversion_financiera',
    'sociedad',
    'mobiliario',
    'credito',
    'tarjeta_credito',
    'prestamo_personal',
    'prestamo_prendario',
    'hipoteca',
    'moratoria_fiscal',
    'otro'
  )),

  descripcion              TEXT         NOT NULL,
  pais                     TEXT,                                  -- 'Argentina', 'Uruguay', 'Italia', etc.

  -- Titular agnóstico al fuero. En divorcio: cliente=cónyuge1, contraparte=cónyuge2.
  -- En sucesiones: cliente=heredero solicitante, tercero=causante.
  -- En comercial: cliente=deudor/acreedor según contexto.
  titular_rol              TEXT         NOT NULL DEFAULT 'cliente' CHECK (titular_rol IN ('cliente', 'contraparte', 'ambos', 'tercero')),
  titular_detalle          TEXT,                                  -- libre, ej "Tercero: hermano del causante" o "Acreedor: Banco Nación"

  -- Valuación "actual" — el histórico vive en bien_valuaciones.
  valor_actual             NUMERIC(18,2),
  moneda_actual            TEXT         CHECK (moneda_actual IS NULL OR moneda_actual IN ('ARS', 'USD', 'EUR')),
  fecha_valuacion_actual   DATE,

  -- Sociedad que titulariza el bien (caso típico: bien en exterior a nombre de SA).
  sociedad_interpuesta_id  UUID         REFERENCES sociedades_interpuestas(id) ON DELETE SET NULL,

  -- Específico de divorcio pero opcional. NULL en otros fueros.
  caracter                 TEXT         CHECK (caracter IS NULL OR caracter IN ('propio', 'ganancial', 'comun', 'no_aplica')),

  observaciones            TEXT,
  notas                    TEXT,
  created_by               UUID         REFERENCES auth.users(id),
  created_at               TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at               TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_bienes_matter      ON bienes(matter_id);
CREATE INDEX IF NOT EXISTS idx_bienes_firm        ON bienes(firm_id);
CREATE INDEX IF NOT EXISTS idx_bienes_naturaleza  ON bienes(matter_id, naturaleza);
CREATE INDEX IF NOT EXISTS idx_bienes_sociedad    ON bienes(sociedad_interpuesta_id) WHERE sociedad_interpuesta_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_bienes_pais        ON bienes(pais) WHERE pais IS NOT NULL;

DROP TRIGGER IF EXISTS trg_set_firm_id ON bienes;
CREATE TRIGGER trg_set_firm_id
  BEFORE INSERT ON bienes
  FOR EACH ROW EXECUTE FUNCTION public.set_firm_id_from_profile();

DROP TRIGGER IF EXISTS trg_bienes_updated ON bienes;
CREATE TRIGGER trg_bienes_updated
  BEFORE UPDATE ON bienes
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

ALTER TABLE bienes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "bienes_select" ON bienes;
CREATE POLICY "bienes_select" ON bienes FOR SELECT USING (
  public.user_is_active() AND public.can_see_matter(matter_id)
);
DROP POLICY IF EXISTS "bienes_insert" ON bienes;
CREATE POLICY "bienes_insert" ON bienes FOR INSERT WITH CHECK (
  public.user_is_active() AND public.can_see_matter(matter_id)
);
DROP POLICY IF EXISTS "bienes_update" ON bienes;
CREATE POLICY "bienes_update" ON bienes FOR UPDATE USING (
  public.user_is_active() AND public.can_see_matter(matter_id)
);
DROP POLICY IF EXISTS "bienes_delete" ON bienes;
CREATE POLICY "bienes_delete" ON bienes FOR DELETE USING (
  public.user_is_active() AND public.can_see_matter(matter_id)
);

-- ══════════════════════════════════════════════════════════════
-- 3. TABLA bien_valuaciones (R14 — snapshots temporales)
-- ══════════════════════════════════════════════════════════════
-- Cada vez que se conoce un valor nuevo del bien (tasación, informe
-- bancario, balance societario), se inserta una fila. Permite ver la
-- evolución y detectar vaciamiento patrimonial.

CREATE TABLE IF NOT EXISTS bien_valuaciones (
  id           UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  bien_id      UUID         NOT NULL REFERENCES bienes(id) ON DELETE CASCADE,
  firm_id      UUID         NOT NULL REFERENCES firms(id),
  fecha        DATE         NOT NULL,
  valor        NUMERIC(18,2) NOT NULL CHECK (valor >= 0),
  moneda       TEXT         NOT NULL CHECK (moneda IN ('ARS', 'USD', 'EUR')),
  fuente       TEXT,                                              -- 'Tasación Arq. Díaz', 'HSBC informa', 'Bull Market 30/09'
  notas        TEXT,
  created_by   UUID         REFERENCES auth.users(id),
  created_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_bien_valuaciones_bien  ON bien_valuaciones(bien_id, fecha DESC);
CREATE INDEX IF NOT EXISTS idx_bien_valuaciones_firm  ON bien_valuaciones(firm_id);

DROP TRIGGER IF EXISTS trg_set_firm_id ON bien_valuaciones;
CREATE TRIGGER trg_set_firm_id
  BEFORE INSERT ON bien_valuaciones
  FOR EACH ROW EXECUTE FUNCTION public.set_firm_id_from_profile();

ALTER TABLE bien_valuaciones ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "bien_valuaciones_select" ON bien_valuaciones;
CREATE POLICY "bien_valuaciones_select" ON bien_valuaciones FOR SELECT USING (
  public.user_is_active() AND EXISTS (
    SELECT 1 FROM bienes b WHERE b.id = bien_valuaciones.bien_id AND public.can_see_matter(b.matter_id)
  )
);
DROP POLICY IF EXISTS "bien_valuaciones_insert" ON bien_valuaciones;
CREATE POLICY "bien_valuaciones_insert" ON bien_valuaciones FOR INSERT WITH CHECK (
  public.user_is_active() AND EXISTS (
    SELECT 1 FROM bienes b WHERE b.id = bien_valuaciones.bien_id AND public.can_see_matter(b.matter_id)
  )
);
DROP POLICY IF EXISTS "bien_valuaciones_update" ON bien_valuaciones;
CREATE POLICY "bien_valuaciones_update" ON bien_valuaciones FOR UPDATE USING (
  public.user_is_active() AND EXISTS (
    SELECT 1 FROM bienes b WHERE b.id = bien_valuaciones.bien_id AND public.can_see_matter(b.matter_id)
  )
);
DROP POLICY IF EXISTS "bien_valuaciones_delete" ON bien_valuaciones;
CREATE POLICY "bien_valuaciones_delete" ON bien_valuaciones FOR DELETE USING (
  public.user_is_active() AND EXISTS (
    SELECT 1 FROM bienes b WHERE b.id = bien_valuaciones.bien_id AND public.can_see_matter(b.matter_id)
  )
);

-- ══════════════════════════════════════════════════════════════
-- 4. Backfill desde case_data.bienes y case_data.deudas
-- ══════════════════════════════════════════════════════════════
-- Mismo patrón que migración 041 (hijos): el array vive como JSONB
-- string (JSON.stringify de StageFicha) o como array nativo. Manejamos
-- ambos casos. Saltamos items sin descripción (campo NOT NULL) con
-- RAISE NOTICE.
--
-- Mapping legacy → nuevo:
--   tipos:    'Inmueble' → 'inmueble', 'Vehículo' → 'vehiculo', etc.
--   titular:  'Cónyuge 1' → 'cliente', 'Cónyuge 2' → 'contraparte',
--             'Ambos' → 'ambos', 'Tercero' → 'tercero'.
--   valor:    valor_estimado es string libre ("US$ 230.000 o $18.000.000").
--             No se puede parsear cleanly: lo guardamos en notas con
--             prefijo "Valor original (legacy): ..." y dejamos
--             valor_actual NULL para que el usuario reformatee al ver.
--
-- Idempotencia: si la tabla bienes ya tiene filas, asumimos backfill
-- corrido y salteamos.

-- 4.1 Helper de mapping (función auxiliar)
CREATE OR REPLACE FUNCTION public._mt_map_tipo_bien(legacy TEXT, naturaleza TEXT)
RETURNS TEXT AS $$
BEGIN
  IF naturaleza = 'pasivo' THEN
    CASE legacy
      WHEN 'Hipoteca' THEN RETURN 'hipoteca';
      WHEN 'Tarjeta de crédito' THEN RETURN 'tarjeta_credito';
      WHEN 'Préstamo personal' THEN RETURN 'prestamo_personal';
      WHEN 'Préstamo prendario' THEN RETURN 'prestamo_prendario';
      ELSE RETURN 'otro';
    END CASE;
  ELSE
    CASE legacy
      WHEN 'Inmueble' THEN RETURN 'inmueble';
      WHEN 'Vehículo' THEN RETURN 'vehiculo';
      WHEN 'Cuenta bancaria' THEN RETURN 'cuenta_bancaria';
      WHEN 'Plazo fijo / Inversión' THEN RETURN 'inversion_financiera';
      WHEN 'Mobiliario / Electrodomésticos' THEN RETURN 'mobiliario';
      WHEN 'Emprendimiento / Negocio' THEN RETURN 'sociedad';
      ELSE RETURN 'otro';
    END CASE;
  END IF;
END $$ LANGUAGE plpgsql IMMUTABLE;

CREATE OR REPLACE FUNCTION public._mt_map_titular(legacy TEXT)
RETURNS TEXT AS $$
BEGIN
  CASE legacy
    WHEN 'Cónyuge 1' THEN RETURN 'cliente';
    WHEN 'Cónyuge 2' THEN RETURN 'contraparte';
    WHEN 'Ambos'     THEN RETURN 'ambos';
    WHEN 'Tercero'   THEN RETURN 'tercero';
    ELSE             RETURN 'cliente';
  END CASE;
END $$ LANGUAGE plpgsql IMMUTABLE;

-- 4.2 Backfill bienes (activos)
DO $$
DECLARE
  v_matter         RECORD;
  v_arr_jsonb      JSONB;
  v_item           JSONB;
  v_total          INT := 0;
  v_skipped_sin_desc INT := 0;
  v_skipped_no_parse INT := 0;
BEGIN
  IF (SELECT COUNT(*) FROM bienes) > 0 THEN
    RAISE NOTICE '[045] bienes ya tiene filas — backfill salteado (idempotente).';
    RETURN;
  END IF;

  FOR v_matter IN
    SELECT id, firm_id, case_data
    FROM matters
    WHERE case_data ? 'bienes' OR case_data ? 'deudas'
  LOOP
    -- Activos (case_data.bienes)
    IF v_matter.case_data ? 'bienes' THEN
      BEGIN
        IF jsonb_typeof(v_matter.case_data->'bienes') = 'array' THEN
          v_arr_jsonb := v_matter.case_data->'bienes';
        ELSIF jsonb_typeof(v_matter.case_data->'bienes') = 'string' THEN
          v_arr_jsonb := (v_matter.case_data->>'bienes')::JSONB;
        ELSE
          v_arr_jsonb := NULL;
        END IF;
      EXCEPTION WHEN OTHERS THEN
        v_skipped_no_parse := v_skipped_no_parse + 1;
        RAISE NOTICE '[045] Matter %: case_data.bienes no parseable — saltado.', v_matter.id;
        v_arr_jsonb := NULL;
      END;

      IF v_arr_jsonb IS NOT NULL AND jsonb_typeof(v_arr_jsonb) = 'array' THEN
        FOR v_item IN SELECT * FROM jsonb_array_elements(v_arr_jsonb)
        LOOP
          IF NULLIF(v_item->>'descripcion', '') IS NULL THEN
            v_skipped_sin_desc := v_skipped_sin_desc + 1;
            CONTINUE;
          END IF;

          INSERT INTO bienes (
            matter_id, firm_id, naturaleza, tipo, descripcion,
            titular_rol, observaciones, notas
          ) VALUES (
            v_matter.id,
            v_matter.firm_id,
            'activo',
            public._mt_map_tipo_bien(NULLIF(v_item->>'tipo', ''), 'activo'),
            v_item->>'descripcion',
            public._mt_map_titular(NULLIF(v_item->>'titular', '')),
            NULLIF(v_item->>'observaciones', ''),
            CASE WHEN NULLIF(v_item->>'valor_estimado', '') IS NOT NULL
                 THEN 'Valor original (legacy): ' || (v_item->>'valor_estimado')
                 ELSE NULL END
          );
          v_total := v_total + 1;
        END LOOP;
      END IF;
    END IF;

    -- Pasivos (case_data.deudas)
    IF v_matter.case_data ? 'deudas' THEN
      BEGIN
        IF jsonb_typeof(v_matter.case_data->'deudas') = 'array' THEN
          v_arr_jsonb := v_matter.case_data->'deudas';
        ELSIF jsonb_typeof(v_matter.case_data->'deudas') = 'string' THEN
          v_arr_jsonb := (v_matter.case_data->>'deudas')::JSONB;
        ELSE
          v_arr_jsonb := NULL;
        END IF;
      EXCEPTION WHEN OTHERS THEN
        v_skipped_no_parse := v_skipped_no_parse + 1;
        RAISE NOTICE '[045] Matter %: case_data.deudas no parseable — saltado.', v_matter.id;
        v_arr_jsonb := NULL;
      END;

      IF v_arr_jsonb IS NOT NULL AND jsonb_typeof(v_arr_jsonb) = 'array' THEN
        FOR v_item IN SELECT * FROM jsonb_array_elements(v_arr_jsonb)
        LOOP
          -- En deudas el campo descriptivo en legacy es 'acreedor'+'observaciones'.
          -- Construimos descripcion combinando ambos.
          IF NULLIF(v_item->>'acreedor', '') IS NULL AND NULLIF(v_item->>'observaciones', '') IS NULL THEN
            v_skipped_sin_desc := v_skipped_sin_desc + 1;
            CONTINUE;
          END IF;

          INSERT INTO bienes (
            matter_id, firm_id, naturaleza, tipo, descripcion,
            titular_rol, titular_detalle, observaciones, notas
          ) VALUES (
            v_matter.id,
            v_matter.firm_id,
            'pasivo',
            public._mt_map_tipo_bien(NULLIF(v_item->>'tipo', ''), 'pasivo'),
            COALESCE(NULLIF(v_item->>'observaciones', ''), 'Deuda con ' || COALESCE(v_item->>'acreedor', 'acreedor sin especificar')),
            public._mt_map_titular(NULLIF(v_item->>'titular', '')),
            CASE WHEN NULLIF(v_item->>'acreedor', '') IS NOT NULL
                 THEN 'Acreedor: ' || (v_item->>'acreedor')
                 ELSE NULL END,
            NULLIF(v_item->>'observaciones', ''),
            CASE WHEN NULLIF(v_item->>'monto', '') IS NOT NULL
                 THEN 'Monto original (legacy): ' || (v_item->>'monto')
                 ELSE NULL END
          );
          v_total := v_total + 1;
        END LOOP;
      END IF;
    END IF;
  END LOOP;

  RAISE NOTICE '[045] Backfill bienes/deudas completo: % filas creadas. Saltados: % sin descripción, % no parseables.',
               v_total, v_skipped_sin_desc, v_skipped_no_parse;
END $$;

-- 4.3 Limpiar case_data.bienes y case_data.deudas
UPDATE matters
SET case_data = case_data - 'bienes' - 'deudas'
WHERE case_data ? 'bienes' OR case_data ? 'deudas';

-- ══════════════════════════════════════════════════════════════
-- 5. Diagnóstico
-- ══════════════════════════════════════════════════════════════

SELECT 'sociedades_interpuestas filas' AS metrica, COUNT(*)::TEXT AS valor FROM sociedades_interpuestas
UNION ALL
SELECT 'bienes activos',                COUNT(*)::TEXT FROM bienes WHERE naturaleza = 'activo'
UNION ALL
SELECT 'bienes pasivos',                COUNT(*)::TEXT FROM bienes WHERE naturaleza = 'pasivo'
UNION ALL
SELECT 'bien_valuaciones',              COUNT(*)::TEXT FROM bien_valuaciones
UNION ALL
SELECT 'matters con case_data.bienes restantes', COUNT(*)::TEXT FROM matters WHERE case_data ? 'bienes'
UNION ALL
SELECT 'matters con case_data.deudas restantes', COUNT(*)::TEXT FROM matters WHERE case_data ? 'deudas';
