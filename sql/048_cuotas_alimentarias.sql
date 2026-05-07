-- 048 · Cuotas alimentarias con desglose efectivo / especie (GAP R13)
-- Ejecutar en: Supabase Dashboard → SQL Editor → New query
--
-- Hoy la cuota se describe como "$X/mes" en caseData (cuota_porcentaje +
-- cuota_gastos_compartidos textarea). En la práctica la cuota tiene
-- componente en efectivo Y pagos directos a prestadores (colegio,
-- prepaga, terapias, AT). Sin desglose, no se puede:
--   • saber qué se paga por concepto,
--   • diferenciar incumplimientos parciales (paga efectivo pero no OSDE),
--   • justificar pedidos de aumento sobre conceptos puntuales.
--
-- Caso real (Ruiz/Colombo, 2026-2027):
--   • 05/06/2026 — cuota provisoria $2.800.000:
--       $2.000.000 efectivo + $800.000 terapias directo (TO + fono + AT, Olivia).
--   • 20/02/2027 — cuota definitiva $3.200.000 + colegios + OSDE 410
--       + terapias Olivia.
--
-- Modelo:
--   • cuotas_alimentarias — un régimen por matter (puede haber varios
--     en el tiempo: provisoria → definitiva → modificada por incidente).
--   • cuota_conceptos_especie — N por cuota, desglose de pagos directos
--     con categoría enum, monto estimado, prestador y vínculo opcional
--     a un hijo (terapias de Olivia, no de los hermanos).
--
-- Dependencias: 028 (matters.kind), 033 (firm_id), 041 (hijos_caso para
-- FK opcional desde concepto a hijo). Helpers public.set_firm_id_from_profile
-- y public.touch_updated_at.
--
-- ⚠️ Idempotente.

-- ══════════════════════════════════════════════════════════════
-- 1. TABLA cuotas_alimentarias
-- ══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS cuotas_alimentarias (
  id                       UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  matter_id                UUID         NOT NULL REFERENCES matters(id) ON DELETE CASCADE,
  firm_id                  UUID         NOT NULL REFERENCES firms(id),

  -- Estado del régimen.
  --   provisoria  — fijada por incidente o medida cautelar mientras dura el juicio.
  --   definitiva  — fijada por sentencia.
  --   modificada  — surge de un incidente de aumento/reducción posterior.
  --   extinguida  — ya no rige (hijo cumplió 25, falleció obligado, etc.).
  estado                   TEXT         NOT NULL DEFAULT 'provisoria' CHECK (estado IN (
    'provisoria', 'definitiva', 'modificada', 'extinguida'
  )),

  -- Quién paga. Reusa enum genérico (cliente/contraparte/ambos/tercero).
  obligado_rol             TEXT         NOT NULL DEFAULT 'contraparte' CHECK (obligado_rol IN ('cliente', 'contraparte', 'ambos', 'tercero')),
  obligado_detalle         TEXT,                                  -- libre, ej. "Sebastián Ruiz"

  -- Alcance: a todos los hijos o a hijos específicos del caso.
  --   todos_los_hijos       — la cuota es global, no se reparte por hijo.
  --   hijos_especificos     — la cuota cubre los hijos listados en hijos_cubiertos[].
  --   conyuge               — alimentos al cónyuge (no a hijos), ART. 432 CCyCN.
  --   pariente              — alimentos a otros parientes (ascendiente, etc.).
  alcance                  TEXT         NOT NULL DEFAULT 'todos_los_hijos' CHECK (alcance IN (
    'todos_los_hijos', 'hijos_especificos', 'conyuge', 'pariente'
  )),

  -- IDs de hijos cubiertos cuando alcance='hijos_especificos'. Array de
  -- UUIDs de hijos_caso. Vacío en otros alcances.
  hijos_cubiertos          UUID[]       NOT NULL DEFAULT ARRAY[]::UUID[],

  -- Componente en efectivo.
  monto_efectivo           NUMERIC(14,2) CHECK (monto_efectivo IS NULL OR monto_efectivo >= 0),
  moneda                   TEXT         CHECK (moneda IS NULL OR moneda IN ('ARS', 'USD', 'EUR')),
  frecuencia               TEXT         NOT NULL DEFAULT 'mensual' CHECK (frecuencia IN (
    'mensual', 'quincenal', 'bimestral', 'trimestral', 'semestral', 'anual', 'unica', 'a_demanda'
  )),

  -- Mecanismo de ajuste / actualización.
  ajuste                   TEXT         CHECK (ajuste IS NULL OR ajuste IN (
    'sin_ajuste', 'ipc', 'salarios_sec', 'rIPC_y_sentencia', 'mixto', 'otro'
  )),
  ajuste_desc              TEXT,                                  -- detalle libre del mecanismo

  -- Vigencia. fecha_hasta NULL = vigente.
  fecha_vigencia_desde     DATE,
  fecha_vigencia_hasta     DATE,

  -- Origen documental. Suele apuntar a un evento del expediente
  -- (resolución de cuota provisoria, sentencia, modificación).
  fundamento               TEXT,                                  -- libre, ej. "Sentencia 20/02/2027 fs. 142"
  evento_origen_id         UUID         REFERENCES eventos_expediente(id) ON DELETE SET NULL,

  notas                    TEXT,
  created_by               UUID         REFERENCES auth.users(id),
  created_at               TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at               TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- Coherencia: hijos_cubiertos solo tiene sentido cuando alcance='hijos_especificos'.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'cuotas_alimentarias_alcance_check'
  ) THEN
    ALTER TABLE cuotas_alimentarias
      ADD CONSTRAINT cuotas_alimentarias_alcance_check
      CHECK (
        (alcance = 'hijos_especificos' AND array_length(hijos_cubiertos, 1) >= 1)
        OR
        (alcance <> 'hijos_especificos')
      );
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_cuotas_alimentarias_matter ON cuotas_alimentarias(matter_id);
CREATE INDEX IF NOT EXISTS idx_cuotas_alimentarias_firm   ON cuotas_alimentarias(firm_id);
CREATE INDEX IF NOT EXISTS idx_cuotas_alimentarias_estado ON cuotas_alimentarias(matter_id, estado)
  WHERE estado IN ('provisoria', 'definitiva', 'modificada');

DROP TRIGGER IF EXISTS trg_set_firm_id ON cuotas_alimentarias;
CREATE TRIGGER trg_set_firm_id
  BEFORE INSERT ON cuotas_alimentarias
  FOR EACH ROW EXECUTE FUNCTION public.set_firm_id_from_profile();

DROP TRIGGER IF EXISTS trg_cuotas_alimentarias_updated ON cuotas_alimentarias;
CREATE TRIGGER trg_cuotas_alimentarias_updated
  BEFORE UPDATE ON cuotas_alimentarias
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

ALTER TABLE cuotas_alimentarias ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "cuotas_alimentarias_select" ON cuotas_alimentarias;
CREATE POLICY "cuotas_alimentarias_select" ON cuotas_alimentarias FOR SELECT USING (
  public.user_is_active() AND public.can_see_matter(matter_id)
);
DROP POLICY IF EXISTS "cuotas_alimentarias_insert" ON cuotas_alimentarias;
CREATE POLICY "cuotas_alimentarias_insert" ON cuotas_alimentarias FOR INSERT WITH CHECK (
  public.user_is_active() AND public.can_see_matter(matter_id)
);
DROP POLICY IF EXISTS "cuotas_alimentarias_update" ON cuotas_alimentarias;
CREATE POLICY "cuotas_alimentarias_update" ON cuotas_alimentarias FOR UPDATE USING (
  public.user_is_active() AND public.can_see_matter(matter_id)
);
DROP POLICY IF EXISTS "cuotas_alimentarias_delete" ON cuotas_alimentarias;
CREATE POLICY "cuotas_alimentarias_delete" ON cuotas_alimentarias FOR DELETE USING (
  public.user_is_active() AND public.can_see_matter(matter_id)
);

-- ══════════════════════════════════════════════════════════════
-- 2. TABLA cuota_conceptos_especie
-- ══════════════════════════════════════════════════════════════
-- Cada concepto que se paga directamente al prestador (en lugar de en
-- efectivo al beneficiario). Categoría tipificada para análisis +
-- prestador libre + vínculo opcional al hijo cuando aplica.

CREATE TABLE IF NOT EXISTS cuota_conceptos_especie (
  id                      UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  cuota_alimentaria_id    UUID         NOT NULL REFERENCES cuotas_alimentarias(id) ON DELETE CASCADE,
  firm_id                 UUID         NOT NULL REFERENCES firms(id),

  categoria               TEXT         NOT NULL CHECK (categoria IN (
    'colegio',
    'prepaga',
    'terapia',
    'acompanante_terapeutico',
    'extracurricular',
    'transporte',
    'gastos_medicos',
    'medicamentos',
    'vestimenta',
    'otro'
  )),
  concepto                TEXT         NOT NULL,                  -- ej. "Colegio Northlands", "OSDE 410", "TO Lic. Pérez"
  prestador               TEXT,                                   -- nombre del proveedor

  monto_estimado          NUMERIC(14,2) CHECK (monto_estimado IS NULL OR monto_estimado >= 0),
  moneda                  TEXT         CHECK (moneda IS NULL OR moneda IN ('ARS', 'USD', 'EUR')),
  frecuencia              TEXT         NOT NULL DEFAULT 'mensual' CHECK (frecuencia IN (
    'mensual', 'quincenal', 'bimestral', 'trimestral', 'semestral', 'anual', 'unica', 'a_demanda'
  )),

  -- Quién paga el concepto. 'obligado_directo' = el obligado paga al
  -- prestador (no al beneficiario). 'reembolso' = el beneficiario paga
  -- y el obligado le reembolsa con comprobante. 'compartido' = se reparte.
  pagador                 TEXT         NOT NULL DEFAULT 'obligado_directo' CHECK (pagador IN (
    'obligado_directo', 'reembolso', 'compartido_50_50', 'compartido_otro'
  )),
  pagador_detalle         TEXT,                                   -- libre, ej. "70/30 obligado/beneficiario"

  -- Vínculo opcional al hijo. NULL = aplica a todos los hijos cubiertos.
  hijo_id                 UUID         REFERENCES hijos_caso(id) ON DELETE SET NULL,

  notas                   TEXT,
  created_by              UUID         REFERENCES auth.users(id),
  created_at              TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at              TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_cuota_conceptos_cuota ON cuota_conceptos_especie(cuota_alimentaria_id);
CREATE INDEX IF NOT EXISTS idx_cuota_conceptos_firm  ON cuota_conceptos_especie(firm_id);
CREATE INDEX IF NOT EXISTS idx_cuota_conceptos_hijo  ON cuota_conceptos_especie(hijo_id) WHERE hijo_id IS NOT NULL;

DROP TRIGGER IF EXISTS trg_set_firm_id ON cuota_conceptos_especie;
CREATE TRIGGER trg_set_firm_id
  BEFORE INSERT ON cuota_conceptos_especie
  FOR EACH ROW EXECUTE FUNCTION public.set_firm_id_from_profile();

DROP TRIGGER IF EXISTS trg_cuota_conceptos_updated ON cuota_conceptos_especie;
CREATE TRIGGER trg_cuota_conceptos_updated
  BEFORE UPDATE ON cuota_conceptos_especie
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

ALTER TABLE cuota_conceptos_especie ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "cuota_conceptos_select" ON cuota_conceptos_especie;
CREATE POLICY "cuota_conceptos_select" ON cuota_conceptos_especie FOR SELECT USING (
  public.user_is_active() AND EXISTS (
    SELECT 1 FROM cuotas_alimentarias c
    WHERE c.id = cuota_conceptos_especie.cuota_alimentaria_id
      AND public.can_see_matter(c.matter_id)
  )
);
DROP POLICY IF EXISTS "cuota_conceptos_insert" ON cuota_conceptos_especie;
CREATE POLICY "cuota_conceptos_insert" ON cuota_conceptos_especie FOR INSERT WITH CHECK (
  public.user_is_active() AND EXISTS (
    SELECT 1 FROM cuotas_alimentarias c
    WHERE c.id = cuota_conceptos_especie.cuota_alimentaria_id
      AND public.can_see_matter(c.matter_id)
  )
);
DROP POLICY IF EXISTS "cuota_conceptos_update" ON cuota_conceptos_especie;
CREATE POLICY "cuota_conceptos_update" ON cuota_conceptos_especie FOR UPDATE USING (
  public.user_is_active() AND EXISTS (
    SELECT 1 FROM cuotas_alimentarias c
    WHERE c.id = cuota_conceptos_especie.cuota_alimentaria_id
      AND public.can_see_matter(c.matter_id)
  )
);
DROP POLICY IF EXISTS "cuota_conceptos_delete" ON cuota_conceptos_especie;
CREATE POLICY "cuota_conceptos_delete" ON cuota_conceptos_especie FOR DELETE USING (
  public.user_is_active() AND EXISTS (
    SELECT 1 FROM cuotas_alimentarias c
    WHERE c.id = cuota_conceptos_especie.cuota_alimentaria_id
      AND public.can_see_matter(c.matter_id)
  )
);

-- ══════════════════════════════════════════════════════════════
-- 3. Diagnóstico
-- ══════════════════════════════════════════════════════════════

SELECT 'cuotas_alimentarias filas' AS metrica, COUNT(*)::TEXT AS valor FROM cuotas_alimentarias
UNION ALL
SELECT 'cuotas vigentes (provisoria/definitiva/modificada)',
       COUNT(*)::TEXT FROM cuotas_alimentarias WHERE estado IN ('provisoria', 'definitiva', 'modificada')
UNION ALL
SELECT 'cuota_conceptos_especie filas', COUNT(*)::TEXT FROM cuota_conceptos_especie;
