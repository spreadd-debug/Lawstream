-- 019 · Hilos de prueba — agrupación de eventos durante la etapa probatoria
-- Ejecutar en: Supabase Dashboard → SQL Editor → New query
--
-- Un "hilo de prueba" es una línea independiente de producción de prueba
-- dentro de la etapa probatoria. Ejemplos en un divorcio contencioso:
--   • Hilo "Pericia contable de la SRL X"      (tipo: pericial)
--   • Hilo "Tasación inmueble de calle Y"      (tipo: pericial)
--   • Hilo "Testimoniales de la actora"        (tipo: testimonial)
--   • Hilo "Oficios informativos a AFIP"       (tipo: informativa)
--   • Hilo "Pericia psicológica al menor"      (tipo: pericial)
--
-- Cada hilo tiene su propio ciclo (ofrecido → admitido/rechazado →
-- en producción → producido) y agrupa los eventos del expediente que
-- corresponden a esa línea, para que el abogado pueda seguir el
-- avance por hilo sin que se mezclen en el timeline general.
--
-- Sin esta tabla, todos los eventos viven sueltos cronológicamente y
-- no hay forma de filtrar "ver todos los movimientos de la pericia
-- contable" o "estado de la testimonial".

-- ══════════════════════════════════════════════════════════════
-- 1. TABLA hilos_prueba
-- ══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS hilos_prueba (
  id              UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  matter_id       UUID         NOT NULL REFERENCES matters(id) ON DELETE CASCADE,
  nombre          TEXT         NOT NULL,
  tipo            TEXT         NOT NULL CHECK (tipo IN (
    'pericial', 'testimonial', 'informativa', 'documental', 'confesional', 'otra'
  )),
  ofrecido_por    TEXT         NOT NULL DEFAULT 'propio' CHECK (ofrecido_por IN (
    'propio', 'contraria'
  )),
  estado          TEXT         NOT NULL DEFAULT 'ofrecido' CHECK (estado IN (
    'ofrecido', 'admitido', 'rechazado', 'en_produccion', 'producido', 'desistido'
  )),
  fecha_ofrecido   DATE,
  fecha_resolucion DATE,
  fecha_producido  DATE,
  descripcion     TEXT,
  created_by      UUID         REFERENCES auth.users(id),
  created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_hilos_matter  ON hilos_prueba(matter_id);
CREATE INDEX IF NOT EXISTS idx_hilos_estado  ON hilos_prueba(estado) WHERE estado IN ('ofrecido', 'admitido', 'en_produccion');

-- ══════════════════════════════════════════════════════════════
-- 2. FK opcional desde eventos_expediente
-- ══════════════════════════════════════════════════════════════
-- Cada evento del expediente puede pertenecer (opcionalmente) a un hilo.
-- Eventos que no son parte de la etapa probatoria (traslado, sentencia,
-- etc.) quedan con hilo_id NULL.

ALTER TABLE eventos_expediente
  ADD COLUMN IF NOT EXISTS hilo_id UUID REFERENCES hilos_prueba(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_eventos_hilo ON eventos_expediente(hilo_id) WHERE hilo_id IS NOT NULL;

-- ══════════════════════════════════════════════════════════════
-- 3. TRIGGER updated_at — reusa la función ya creada en 016
-- ══════════════════════════════════════════════════════════════

DROP TRIGGER IF EXISTS trg_hilos_updated ON hilos_prueba;
CREATE TRIGGER trg_hilos_updated
  BEFORE UPDATE ON hilos_prueba
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- ══════════════════════════════════════════════════════════════
-- 4. RLS — hereda visibilidad del matter
-- ══════════════════════════════════════════════════════════════

ALTER TABLE hilos_prueba ENABLE ROW LEVEL SECURITY;

CREATE POLICY "hilos_select" ON hilos_prueba FOR SELECT USING (
  public.user_is_active() AND public.can_see_matter(matter_id)
);
CREATE POLICY "hilos_insert" ON hilos_prueba FOR INSERT WITH CHECK (
  public.user_is_active() AND public.can_see_matter(matter_id)
);
CREATE POLICY "hilos_update" ON hilos_prueba FOR UPDATE USING (
  public.user_is_active() AND public.can_see_matter(matter_id)
);
CREATE POLICY "hilos_delete" ON hilos_prueba FOR DELETE USING (
  public.user_is_active() AND public.can_see_matter(matter_id)
);

-- ══════════════════════════════════════════════════════════════
-- 5. Diagnóstico post-migración
-- ══════════════════════════════════════════════════════════════
-- Ejecutar manualmente para confirmar:

SELECT
  'hilos_prueba' AS tabla,
  COUNT(*) AS filas
FROM hilos_prueba
UNION ALL
SELECT
  'eventos con hilo' AS tabla,
  COUNT(*) AS filas
FROM eventos_expediente WHERE hilo_id IS NOT NULL;
