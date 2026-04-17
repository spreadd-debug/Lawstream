-- 016 · Timeline de eventos + Motor de plazos procesales
-- Ejecutar en: Supabase Dashboard → SQL Editor → New query
--
-- Introduce 3 tablas nuevas:
--   • eventos_expediente — movimientos del expediente (traslados, resoluciones, etc.)
--   • plazos             — plazos procesales derivados (o manuales)
--   • feriados           — feriados nacionales, provinciales y ferias judiciales
--
-- RLS reutiliza la helper can_see_matter() ya definida en 011_matter_assignments.sql.
--
-- Los tipos de evento son un enum lógico del frontend — no se restringen en la DB
-- para permitir extensiones sin migración.

-- ══════════════════════════════════════════════════════════════
-- 1. TABLA eventos_expediente
-- ══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS eventos_expediente (
  id              UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  matter_id       UUID         NOT NULL REFERENCES matters(id) ON DELETE CASCADE,
  fecha           DATE         NOT NULL,
  tipo            TEXT         NOT NULL,
  titulo          TEXT         NOT NULL,
  descripcion     TEXT,
  origen          TEXT         NOT NULL DEFAULT 'manual' CHECK (origen IN ('manual', 'scraper_mev', 'scraper_pjn')),
  jurisdiccion    TEXT         CHECK (jurisdiccion IN ('caba', 'pba', 'nacional')),
  documentos_urls JSONB        NOT NULL DEFAULT '[]'::jsonb,
  metadata        JSONB        NOT NULL DEFAULT '{}'::jsonb,
  created_by      UUID         REFERENCES auth.users(id),
  created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_eventos_matter ON eventos_expediente(matter_id);
CREATE INDEX IF NOT EXISTS idx_eventos_fecha  ON eventos_expediente(fecha DESC);

-- ══════════════════════════════════════════════════════════════
-- 2. TABLA plazos
-- ══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS plazos (
  id                  UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  matter_id           UUID         NOT NULL REFERENCES matters(id) ON DELETE CASCADE,
  evento_origen_id    UUID         REFERENCES eventos_expediente(id) ON DELETE CASCADE,
  tipo                TEXT         NOT NULL,
  descripcion         TEXT,
  fecha_inicio        DATE         NOT NULL,
  dias                INTEGER      NOT NULL CHECK (dias > 0),
  dias_habiles        BOOLEAN      NOT NULL DEFAULT TRUE,
  jurisdiccion        TEXT         NOT NULL CHECK (jurisdiccion IN ('caba', 'pba', 'nacional')),
  fecha_vencimiento   DATE         NOT NULL,
  estado              TEXT         NOT NULL DEFAULT 'activo' CHECK (estado IN ('activo', 'cumplido', 'vencido', 'cancelado')),
  cumplido_at         TIMESTAMPTZ,
  tarea_id            UUID         REFERENCES tasks(id) ON DELETE SET NULL,
  created_at          TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_plazos_matter        ON plazos(matter_id);
CREATE INDEX IF NOT EXISTS idx_plazos_vencimiento   ON plazos(fecha_vencimiento) WHERE estado = 'activo';
CREATE INDEX IF NOT EXISTS idx_plazos_evento        ON plazos(evento_origen_id);

-- ══════════════════════════════════════════════════════════════
-- 3. TABLA feriados
-- ══════════════════════════════════════════════════════════════
-- Datos estáticos. Se siembran con seeds y se actualizan año a año
-- con las acordadas de CSJN (nacional) y SCBA (PBA).
--
-- jurisdiccion_aplica: 'todas' vale para cualquier juzgado (feriados nacionales
-- y ferias federales). 'caba' / 'pba' / 'nacional' se acumulan al filtrar.

CREATE TABLE IF NOT EXISTS feriados (
  id                   UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  fecha                DATE         NOT NULL,
  tipo                 TEXT         NOT NULL CHECK (tipo IN ('nacional', 'pba', 'caba', 'feria_judicial')),
  descripcion          TEXT         NOT NULL,
  jurisdiccion_aplica  TEXT         NOT NULL CHECK (jurisdiccion_aplica IN ('todas', 'caba', 'pba', 'nacional')),
  created_at           TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_feriado_fecha_jur ON feriados(fecha, jurisdiccion_aplica);
CREATE INDEX IF NOT EXISTS idx_feriado_jur ON feriados(jurisdiccion_aplica);

-- ══════════════════════════════════════════════════════════════
-- 4. TRIGGER updated_at
-- ══════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_eventos_updated ON eventos_expediente;
CREATE TRIGGER trg_eventos_updated
  BEFORE UPDATE ON eventos_expediente
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

DROP TRIGGER IF EXISTS trg_plazos_updated ON plazos;
CREATE TRIGGER trg_plazos_updated
  BEFORE UPDATE ON plazos
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- ══════════════════════════════════════════════════════════════
-- 5. RLS — hereda visibilidad del matter (can_see_matter helper)
-- ══════════════════════════════════════════════════════════════

ALTER TABLE eventos_expediente ENABLE ROW LEVEL SECURITY;
ALTER TABLE plazos             ENABLE ROW LEVEL SECURITY;
ALTER TABLE feriados           ENABLE ROW LEVEL SECURITY;

CREATE POLICY "eventos_select" ON eventos_expediente FOR SELECT USING (
  public.user_is_active() AND public.can_see_matter(matter_id)
);
CREATE POLICY "eventos_insert" ON eventos_expediente FOR INSERT WITH CHECK (
  public.user_is_active() AND public.can_see_matter(matter_id)
);
CREATE POLICY "eventos_update" ON eventos_expediente FOR UPDATE USING (
  public.user_is_active() AND public.can_see_matter(matter_id)
);
CREATE POLICY "eventos_delete" ON eventos_expediente FOR DELETE USING (
  public.user_is_active() AND public.can_see_matter(matter_id)
);

CREATE POLICY "plazos_select" ON plazos FOR SELECT USING (
  public.user_is_active() AND public.can_see_matter(matter_id)
);
CREATE POLICY "plazos_insert" ON plazos FOR INSERT WITH CHECK (
  public.user_is_active() AND public.can_see_matter(matter_id)
);
CREATE POLICY "plazos_update" ON plazos FOR UPDATE USING (
  public.user_is_active() AND public.can_see_matter(matter_id)
);
CREATE POLICY "plazos_delete" ON plazos FOR DELETE USING (
  public.user_is_active() AND public.can_see_matter(matter_id)
);

-- feriados: lectura global para cualquier usuario activo, escritura solo Socio
CREATE POLICY "feriados_select" ON feriados FOR SELECT USING (
  public.user_is_active()
);
CREATE POLICY "feriados_write" ON feriados FOR ALL
  USING (public.user_is_active() AND public.user_role() = 'Socio')
  WITH CHECK (public.user_is_active() AND public.user_role() = 'Socio');

-- ══════════════════════════════════════════════════════════════
-- 6. SEEDS — FERIADOS 2026 (nacional) + FERIAS JUDICIALES
-- ══════════════════════════════════════════════════════════════
-- Verificar fechas cada diciembre con las acordadas oficiales:
--   • CSJN (Corte Suprema) — feria nacional/federal
--   • SCBA (Suprema Corte Bs As) — feria PBA
--   • CABA — feria del fuero local

INSERT INTO feriados (fecha, tipo, descripcion, jurisdiccion_aplica) VALUES
-- ── 2026 — Feriados nacionales ────────────────────────────────
('2026-01-01', 'nacional', 'Año Nuevo',                                  'todas'),
('2026-02-16', 'nacional', 'Carnaval',                                   'todas'),
('2026-02-17', 'nacional', 'Carnaval',                                   'todas'),
('2026-03-24', 'nacional', 'Día de la Memoria',                          'todas'),
('2026-04-02', 'nacional', 'Día del Veterano y los Caídos en Malvinas',  'todas'),
('2026-04-03', 'nacional', 'Viernes Santo',                              'todas'),
('2026-05-01', 'nacional', 'Día del Trabajador',                         'todas'),
('2026-05-25', 'nacional', 'Día de la Revolución de Mayo',               'todas'),
('2026-06-15', 'nacional', 'Paso a la Inmortalidad de Güemes (trasladado)','todas'),
('2026-06-20', 'nacional', 'Día de la Bandera',                          'todas'),
('2026-07-09', 'nacional', 'Día de la Independencia',                    'todas'),
('2026-08-17', 'nacional', 'Paso a la Inmortalidad de San Martín',       'todas'),
('2026-10-12', 'nacional', 'Día del Respeto a la Diversidad Cultural',   'todas'),
('2026-11-23', 'nacional', 'Día de la Soberanía Nacional (trasladado)',  'todas'),
('2026-12-08', 'nacional', 'Inmaculada Concepción',                      'todas'),
('2026-12-25', 'nacional', 'Navidad',                                    'todas')
ON CONFLICT (fecha, jurisdiccion_aplica) DO NOTHING;

-- ── 2026 — Feria judicial de ENERO (todo el mes) ─────────────
-- Acordada CSJN: del 1 al 31 de enero inclusive (verificar cada año).
INSERT INTO feriados (fecha, tipo, descripcion, jurisdiccion_aplica)
SELECT d::date, 'feria_judicial', 'Feria judicial de enero', 'todas'
FROM generate_series('2026-01-01'::date, '2026-01-31'::date, '1 day') AS d
ON CONFLICT (fecha, jurisdiccion_aplica) DO NOTHING;

-- ── 2026 — Feria judicial de INVIERNO (2 semanas) ────────────
-- Usualmente mediados-fines de julio. Confirmar fechas con la acordada.
INSERT INTO feriados (fecha, tipo, descripcion, jurisdiccion_aplica)
SELECT d::date, 'feria_judicial', 'Feria judicial de invierno', 'todas'
FROM generate_series('2026-07-13'::date, '2026-07-24'::date, '1 day') AS d
ON CONFLICT (fecha, jurisdiccion_aplica) DO NOTHING;

-- ── 2027 — Feriados nacionales (tentativos) ───────────────────
INSERT INTO feriados (fecha, tipo, descripcion, jurisdiccion_aplica) VALUES
('2027-01-01', 'nacional', 'Año Nuevo',                                  'todas'),
('2027-02-08', 'nacional', 'Carnaval',                                   'todas'),
('2027-02-09', 'nacional', 'Carnaval',                                   'todas'),
('2027-03-24', 'nacional', 'Día de la Memoria',                          'todas'),
('2027-03-26', 'nacional', 'Viernes Santo',                              'todas'),
('2027-04-02', 'nacional', 'Día del Veterano y los Caídos en Malvinas',  'todas'),
('2027-05-01', 'nacional', 'Día del Trabajador',                         'todas'),
('2027-05-25', 'nacional', 'Día de la Revolución de Mayo',               'todas'),
('2027-06-21', 'nacional', 'Paso a la Inmortalidad de Güemes (trasladado)','todas'),
('2027-06-20', 'nacional', 'Día de la Bandera',                          'todas'),
('2027-07-09', 'nacional', 'Día de la Independencia',                    'todas'),
('2027-08-16', 'nacional', 'Paso a la Inmortalidad de San Martín',       'todas'),
('2027-10-11', 'nacional', 'Día del Respeto a la Diversidad Cultural',   'todas'),
('2027-11-22', 'nacional', 'Día de la Soberanía Nacional (trasladado)',  'todas'),
('2027-12-08', 'nacional', 'Inmaculada Concepción',                      'todas'),
('2027-12-25', 'nacional', 'Navidad',                                    'todas')
ON CONFLICT (fecha, jurisdiccion_aplica) DO NOTHING;

-- ── 2027 — Ferias judiciales (tentativas, confirmar acordada) ─
INSERT INTO feriados (fecha, tipo, descripcion, jurisdiccion_aplica)
SELECT d::date, 'feria_judicial', 'Feria judicial de enero', 'todas'
FROM generate_series('2027-01-01'::date, '2027-01-31'::date, '1 day') AS d
ON CONFLICT (fecha, jurisdiccion_aplica) DO NOTHING;

INSERT INTO feriados (fecha, tipo, descripcion, jurisdiccion_aplica)
SELECT d::date, 'feria_judicial', 'Feria judicial de invierno', 'todas'
FROM generate_series('2027-07-19'::date, '2027-07-30'::date, '1 day') AS d
ON CONFLICT (fecha, jurisdiccion_aplica) DO NOTHING;
