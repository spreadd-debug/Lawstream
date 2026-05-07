-- 043 · Demanda reconvencional (GAP R10)
-- Ejecutar en: Supabase Dashboard → SQL Editor → New query
--
-- La reconvención es una contrademanda planteada por el demandado en el
-- mismo escrito de contestación. NO es sub-proceso (no tramita en cuerda
-- separada): tramita JUNTO con la demanda principal en el mismo expediente
-- y la sentencia se pronuncia sobre ambas en un acto. Pero tiene su propio
-- ciclo (presentada → traslado → contestación → resolución) y pretensiones
-- propias.
--
-- Modelo:
--   • reconvenciones — 1 fila por reconvención presentada en el matter.
--                       Pueden ser múltiples (raro: reconvención mutua).
--   • Eventos demanda_reconvencional / contestacion_reconvencion viven
--     en eventos_expediente con TipoEvento estándar — la migración solo
--     crea la tabla; los tipos se agregan en TS.
--
-- Dependencias: 028 (matters.kind), 033 (firm_id), helpers
-- public.set_firm_id_from_profile y public.touch_updated_at.
--
-- ⚠️ Idempotente.

-- ══════════════════════════════════════════════════════════════
-- 1. TABLA reconvenciones
-- ══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS reconvenciones (
  id                       UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  matter_id                UUID         NOT NULL REFERENCES matters(id) ON DELETE CASCADE,
  firm_id                  UUID         NOT NULL REFERENCES firms(id),

  -- Quién la presentó. 'cliente' = el cliente del estudio reconvino contra
  -- la contraparte (poco común). 'contraparte' = la contraparte reconvino
  -- contra nuestro cliente (caso típico).
  presentada_por           TEXT         NOT NULL CHECK (presentada_por IN ('cliente', 'contraparte')),

  -- Fecha en que se presentó (con la contestación de demanda).
  fecha_presentacion       DATE         NOT NULL,

  -- Pretensiones reclamadas — array de tags predefinidos. Usamos los
  -- mismos valores que AspectoApelado del matter para consistencia, más
  -- algunos extra propios de la fase de demanda.
  pretensiones             TEXT[]       NOT NULL DEFAULT ARRAY[]::TEXT[]
    CHECK (pretensiones <@ ARRAY[
      'compensacion_economica',
      'atribucion_vivienda',
      'cuota_alimentaria',
      'regimen_comunicacion',
      'tenencia',
      'costas',
      'honorarios',
      'danos_perjuicios',
      'nulidad',
      'otra'
    ]::TEXT[]),

  -- Monto y descripción libre (no normalizamos por pretensión —
  -- típicamente el escrito tiene un único monto global).
  monto_reclamado          TEXT,
  pretension_desc          TEXT,

  -- Ciclo de la reconvención.
  --   pendiente_traslado    — recién presentada, juzgado todavía no corrió traslado.
  --   traslado_corrido      — el juzgado corrió traslado, plazo para contestar abierto.
  --   contestada            — fue contestada por la contraparte (de la reconvención).
  --   resuelta_por_sentencia — la sentencia se pronunció.
  --   desistida             — el reconviniente desistió.
  estado                   TEXT         NOT NULL DEFAULT 'pendiente_traslado' CHECK (estado IN (
    'pendiente_traslado',
    'traslado_corrido',
    'contestada',
    'resuelta_por_sentencia',
    'desistida'
  )),

  -- Vínculos a eventos relevantes (opcionales, para navegación).
  evento_presentacion_id   UUID         REFERENCES eventos_expediente(id) ON DELETE SET NULL,
  evento_contestacion_id   UUID         REFERENCES eventos_expediente(id) ON DELETE SET NULL,

  notas                    TEXT,
  created_by               UUID         REFERENCES auth.users(id),
  created_at               TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at               TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_reconvenciones_matter ON reconvenciones(matter_id);
CREATE INDEX IF NOT EXISTS idx_reconvenciones_firm   ON reconvenciones(firm_id);
CREATE INDEX IF NOT EXISTS idx_reconvenciones_estado ON reconvenciones(estado)
  WHERE estado IN ('pendiente_traslado', 'traslado_corrido');

-- ══════════════════════════════════════════════════════════════
-- 2. Trigger firm_id (multi-tenant)
-- ══════════════════════════════════════════════════════════════

DROP TRIGGER IF EXISTS trg_set_firm_id ON reconvenciones;
CREATE TRIGGER trg_set_firm_id
  BEFORE INSERT ON reconvenciones
  FOR EACH ROW EXECUTE FUNCTION public.set_firm_id_from_profile();

-- ══════════════════════════════════════════════════════════════
-- 3. Trigger updated_at
-- ══════════════════════════════════════════════════════════════

DROP TRIGGER IF EXISTS trg_reconvenciones_updated ON reconvenciones;
CREATE TRIGGER trg_reconvenciones_updated
  BEFORE UPDATE ON reconvenciones
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- ══════════════════════════════════════════════════════════════
-- 4. RLS — hereda visibilidad del matter
-- ══════════════════════════════════════════════════════════════

ALTER TABLE reconvenciones ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "reconvenciones_select" ON reconvenciones;
CREATE POLICY "reconvenciones_select" ON reconvenciones FOR SELECT USING (
  public.user_is_active() AND public.can_see_matter(matter_id)
);

DROP POLICY IF EXISTS "reconvenciones_insert" ON reconvenciones;
CREATE POLICY "reconvenciones_insert" ON reconvenciones FOR INSERT WITH CHECK (
  public.user_is_active() AND public.can_see_matter(matter_id)
);

DROP POLICY IF EXISTS "reconvenciones_update" ON reconvenciones;
CREATE POLICY "reconvenciones_update" ON reconvenciones FOR UPDATE USING (
  public.user_is_active() AND public.can_see_matter(matter_id)
);

DROP POLICY IF EXISTS "reconvenciones_delete" ON reconvenciones;
CREATE POLICY "reconvenciones_delete" ON reconvenciones FOR DELETE USING (
  public.user_is_active() AND public.can_see_matter(matter_id)
);

-- ══════════════════════════════════════════════════════════════
-- 5. Diagnóstico
-- ══════════════════════════════════════════════════════════════

SELECT
  'reconvenciones filas' AS metrica,
  COUNT(*)::TEXT         AS valor
FROM reconvenciones
UNION ALL
SELECT
  'reconvenciones pendientes (pendiente_traslado o traslado_corrido)',
  COUNT(*)::TEXT
FROM reconvenciones
WHERE estado IN ('pendiente_traslado', 'traslado_corrido');
