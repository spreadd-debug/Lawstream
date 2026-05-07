-- 041 · Hijos como entidad de primera clase (R1 + R2 + R3)
-- Ejecutar en: Supabase Dashboard → SQL Editor → New query
--
-- Hasta hoy los hijos vivían como array JSON dentro de matter.case_data.hijos.
-- En el fuero de Familia los hijos son entidad central: pericial psicológica
-- por hijo, escucha del menor (art. 707 CCyCN), un hijo puede cumplir 18
-- mid-process, cuota desglosada por hijo, etc.
--
-- Esta migración:
--   • crea hijos_caso como tabla relacional con FK a matters,
--   • soporta R1 (discapacidad/terapias) y R2 (régimen propio del hijo),
--   • migra los datos existentes de case_data.hijos a la nueva tabla,
--   • limpia case_data.hijos para evitar doble fuente.
--
-- Dependencias: 028 (matters.kind), 033 (firm_id en matters), helpers
-- public.set_firm_id_from_profile y public.touch_updated_at.
--
-- ⚠️ Idempotente.

-- ══════════════════════════════════════════════════════════════
-- 1. TABLA hijos_caso
-- ══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS hijos_caso (
  id                       UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  matter_id                UUID         NOT NULL REFERENCES matters(id) ON DELETE CASCADE,
  firm_id                  UUID         NOT NULL REFERENCES firms(id),

  -- Datos básicos
  nombre                   TEXT         NOT NULL,
  dni                      TEXT,
  fecha_nacimiento         DATE         NOT NULL,
  escolaridad              TEXT,
  establecimiento          TEXT,

  -- R1: discapacidad / terapias
  tiene_cud                TEXT         CHECK (tiene_cud IS NULL OR tiene_cud IN ('si','no','en_tramite')),
  diagnostico              TEXT,
  terapias_desc            TEXT,
  acompanante_terapeutico  TEXT         CHECK (acompanante_terapeutico IS NULL OR acompanante_terapeutico IN ('escolar','domiciliario','no')),
  cobertura_especial       TEXT,

  -- R2: régimen propio del hijo (override opcional del global del matter)
  regimen_cuidado          TEXT,
  residencia_principal     TEXT,
  regimen_comunicacion     TEXT,
  motivo_regimen_distinto  TEXT,

  -- Orden y meta
  orden                    INT          NOT NULL DEFAULT 0,
  notas                    TEXT,
  created_by               UUID         REFERENCES auth.users(id),
  created_at               TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at               TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_hijos_caso_matter        ON hijos_caso(matter_id);
CREATE INDEX IF NOT EXISTS idx_hijos_caso_firm          ON hijos_caso(firm_id);
CREATE INDEX IF NOT EXISTS idx_hijos_caso_fecha_nac     ON hijos_caso(fecha_nacimiento);

-- ══════════════════════════════════════════════════════════════
-- 2. Trigger firm_id (multi-tenant)
-- ══════════════════════════════════════════════════════════════
-- INSERTs desde la app llegan con firm_id NULL → el trigger lo completa
-- desde public.current_firm_id() (perfil del usuario). El backfill de
-- esta misma migración pasa firm_id explícito (heredado del matter), y
-- en ese caso el trigger respeta el valor (set_firm_id_from_profile solo
-- actúa cuando NEW.firm_id IS NULL).

DROP TRIGGER IF EXISTS trg_set_firm_id ON hijos_caso;
CREATE TRIGGER trg_set_firm_id
  BEFORE INSERT ON hijos_caso
  FOR EACH ROW EXECUTE FUNCTION public.set_firm_id_from_profile();

-- ══════════════════════════════════════════════════════════════
-- 3. Trigger updated_at
-- ══════════════════════════════════════════════════════════════

DROP TRIGGER IF EXISTS trg_hijos_caso_updated ON hijos_caso;
CREATE TRIGGER trg_hijos_caso_updated
  BEFORE UPDATE ON hijos_caso
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- ══════════════════════════════════════════════════════════════
-- 4. RLS — hereda visibilidad del matter (idéntico a cedulas)
-- ══════════════════════════════════════════════════════════════

ALTER TABLE hijos_caso ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "hijos_caso_select" ON hijos_caso;
CREATE POLICY "hijos_caso_select" ON hijos_caso FOR SELECT USING (
  public.user_is_active() AND public.can_see_matter(matter_id)
);

DROP POLICY IF EXISTS "hijos_caso_insert" ON hijos_caso;
CREATE POLICY "hijos_caso_insert" ON hijos_caso FOR INSERT WITH CHECK (
  public.user_is_active() AND public.can_see_matter(matter_id)
);

DROP POLICY IF EXISTS "hijos_caso_update" ON hijos_caso;
CREATE POLICY "hijos_caso_update" ON hijos_caso FOR UPDATE USING (
  public.user_is_active() AND public.can_see_matter(matter_id)
);

DROP POLICY IF EXISTS "hijos_caso_delete" ON hijos_caso;
CREATE POLICY "hijos_caso_delete" ON hijos_caso FOR DELETE USING (
  public.user_is_active() AND public.can_see_matter(matter_id)
);

-- ══════════════════════════════════════════════════════════════
-- 5. Backfill desde matters.case_data.hijos
-- ══════════════════════════════════════════════════════════════
-- StageFicha persiste el array como JSON.stringify, entonces típicamente
-- case_data->'hijos' es JSONB string. Manejamos también el caso array
-- nativo por defensa. Saltamos hijos sin nombre o sin fecha_nacimiento
-- (campos NOT NULL) y emitimos NOTICE para auditoría manual posterior.
--
-- Idempotencia: si la tabla ya tiene filas, se asume backfill corrido y
-- no se re-procesa.

DO $$
DECLARE
  v_matter        RECORD;
  v_hijos_jsonb   JSONB;
  v_hijo          JSONB;
  v_idx           INT;
  v_total         INT := 0;
  v_total_matters INT := 0;
  v_skipped_sin_fecha   INT := 0;
  v_skipped_sin_nombre  INT := 0;
  v_skipped_no_parse    INT := 0;
BEGIN
  IF (SELECT COUNT(*) FROM hijos_caso) > 0 THEN
    RAISE NOTICE '[041] hijos_caso ya tiene filas — backfill salteado (idempotente).';
    RETURN;
  END IF;

  FOR v_matter IN
    SELECT id, firm_id, case_data
    FROM matters
    WHERE case_data ? 'hijos'
  LOOP
    -- Normalizar el JSONB: puede venir como string (caso típico de
    -- StageFicha + JSON.stringify) o como array nativo.
    BEGIN
      IF jsonb_typeof(v_matter.case_data->'hijos') = 'array' THEN
        v_hijos_jsonb := v_matter.case_data->'hijos';
      ELSIF jsonb_typeof(v_matter.case_data->'hijos') = 'string' THEN
        v_hijos_jsonb := (v_matter.case_data->>'hijos')::JSONB;
      ELSE
        CONTINUE;
      END IF;
    EXCEPTION WHEN OTHERS THEN
      v_skipped_no_parse := v_skipped_no_parse + 1;
      RAISE NOTICE '[041] Matter %: case_data.hijos no parseable — saltado.', v_matter.id;
      CONTINUE;
    END;

    IF jsonb_typeof(v_hijos_jsonb) <> 'array' THEN CONTINUE; END IF;

    v_total_matters := v_total_matters + 1;
    v_idx := 0;
    FOR v_hijo IN SELECT * FROM jsonb_array_elements(v_hijos_jsonb)
    LOOP
      IF NULLIF(v_hijo->>'nombre', '') IS NULL THEN
        v_skipped_sin_nombre := v_skipped_sin_nombre + 1;
        v_idx := v_idx + 1;
        CONTINUE;
      END IF;
      IF NULLIF(v_hijo->>'fecha_nacimiento', '') IS NULL THEN
        v_skipped_sin_fecha := v_skipped_sin_fecha + 1;
        RAISE NOTICE '[041] Matter % hijo "%": sin fecha_nacimiento — saltado.',
                     v_matter.id, v_hijo->>'nombre';
        v_idx := v_idx + 1;
        CONTINUE;
      END IF;

      INSERT INTO hijos_caso (
        matter_id, firm_id, nombre, dni, fecha_nacimiento,
        escolaridad, establecimiento, orden
      ) VALUES (
        v_matter.id,
        v_matter.firm_id,
        v_hijo->>'nombre',
        NULLIF(v_hijo->>'dni', ''),
        (v_hijo->>'fecha_nacimiento')::DATE,
        NULLIF(v_hijo->>'escolaridad', ''),
        NULLIF(v_hijo->>'establecimiento', ''),
        v_idx
      );
      v_total := v_total + 1;
      v_idx := v_idx + 1;
    END LOOP;
  END LOOP;

  RAISE NOTICE '[041] Backfill completo: % filas creadas desde % matters. Saltados: % sin fecha, % sin nombre, % no parseables.',
               v_total, v_total_matters, v_skipped_sin_fecha, v_skipped_sin_nombre, v_skipped_no_parse;
END $$;

-- ══════════════════════════════════════════════════════════════
-- 6. Limpiar case_data.hijos (la fuente de verdad ahora es la tabla)
-- ══════════════════════════════════════════════════════════════

UPDATE matters
SET case_data = case_data - 'hijos'
WHERE case_data ? 'hijos';

-- ══════════════════════════════════════════════════════════════
-- 7. Diagnóstico
-- ══════════════════════════════════════════════════════════════

SELECT 'hijos_caso filas'                       AS metrica, COUNT(*)::TEXT AS valor FROM hijos_caso
UNION ALL
SELECT 'matters con case_data.hijos restantes',         COUNT(*)::TEXT       FROM matters WHERE case_data ? 'hijos';
