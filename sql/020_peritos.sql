-- 020 · Peritos — datos persistentes y ciclo de vida del perito en el caso
-- Ejecutar en: Supabase Dashboard → SQL Editor → New query
--
-- Un perito designado por el juzgado tiene un ciclo procesal típico:
--
--   designado → aceptado → (visita/labor) → informe presentado
--                ↘ rechazado
--                ↘ recusado / sustituido (sale del caso)
--
-- Sin esta tabla, los datos del perito viven sueltos en metadata JSONB
-- de eventos sueltos (`pericia_designada`, `pericia_presentada`) y se
-- pierden al cambiar de evento. No hay forma de saber "estado actual
-- del perito X en este caso".
--
-- El perito vive a nivel matter. Si el mismo perito aparece en varios
-- casos, se carga una vez por caso (poco frecuente — los peritos del
-- listado oficial rotan por sorteo).
--
-- Vínculo opcional con hilo de prueba (de la migración 019): si el
-- caso tiene hilos cargados, el perito puede asociarse al hilo
-- pericial al que corresponde. Si no, queda suelto en el caso.

-- ══════════════════════════════════════════════════════════════
-- 1. TABLA peritos
-- ══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS peritos (
  id              UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  matter_id       UUID         NOT NULL REFERENCES matters(id) ON DELETE CASCADE,
  hilo_id         UUID         REFERENCES hilos_prueba(id) ON DELETE SET NULL,
  nombre          TEXT         NOT NULL,
  especialidad    TEXT         NOT NULL CHECK (especialidad IN (
    'contador', 'psicologo', 'medico', 'arquitecto', 'ingeniero',
    'tasador', 'asistente_social', 'caligrafo', 'traductor', 'otra'
  )),
  matricula       TEXT,
  email           TEXT,
  telefono        TEXT,
  estado          TEXT         NOT NULL DEFAULT 'designado' CHECK (estado IN (
    'designado', 'aceptado', 'rechazado', 'recusado',
    'informe_presentado', 'sustituido'
  )),
  fecha_designado  DATE,
  fecha_aceptado   DATE,
  fecha_informe    DATE,
  notas           TEXT,
  created_by      UUID         REFERENCES auth.users(id),
  created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_peritos_matter ON peritos(matter_id);
CREATE INDEX IF NOT EXISTS idx_peritos_hilo   ON peritos(hilo_id) WHERE hilo_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_peritos_estado ON peritos(estado)
  WHERE estado IN ('designado', 'aceptado');

-- ══════════════════════════════════════════════════════════════
-- 2. TRIGGER updated_at
-- ══════════════════════════════════════════════════════════════

DROP TRIGGER IF EXISTS trg_peritos_updated ON peritos;
CREATE TRIGGER trg_peritos_updated
  BEFORE UPDATE ON peritos
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- ══════════════════════════════════════════════════════════════
-- 3. RLS
-- ══════════════════════════════════════════════════════════════

ALTER TABLE peritos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "peritos_select" ON peritos FOR SELECT USING (
  public.user_is_active() AND public.can_see_matter(matter_id)
);
CREATE POLICY "peritos_insert" ON peritos FOR INSERT WITH CHECK (
  public.user_is_active() AND public.can_see_matter(matter_id)
);
CREATE POLICY "peritos_update" ON peritos FOR UPDATE USING (
  public.user_is_active() AND public.can_see_matter(matter_id)
);
CREATE POLICY "peritos_delete" ON peritos FOR DELETE USING (
  public.user_is_active() AND public.can_see_matter(matter_id)
);

-- ══════════════════════════════════════════════════════════════
-- 4. Diagnóstico post-migración
-- ══════════════════════════════════════════════════════════════

SELECT 'peritos' AS tabla, COUNT(*) AS filas FROM peritos;
