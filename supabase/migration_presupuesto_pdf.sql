-- ================================================================
-- LAWSTREAM — MIGRACIÓN: MÓDULO PRESUPUESTO PDF
-- Ejecutar en: Supabase Dashboard → SQL Editor → New query
-- ================================================================

-- ── EXTENSIONES A presupuestos ────────────────────────────────────

ALTER TABLE presupuestos
  ADD COLUMN IF NOT EXISTS numero          TEXT,
  ADD COLUMN IF NOT EXISTS descuento_porcentaje NUMERIC(5,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS approved_at     TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS approved_by     TEXT,
  ADD COLUMN IF NOT EXISTS created_by      TEXT;

-- Secuencia para numeración PRE-001, PRE-002...
CREATE SEQUENCE IF NOT EXISTS presupuesto_numero_seq START WITH 1;

-- ── EXTENSIONES A presupuesto_items ──────────────────────────────

ALTER TABLE presupuesto_items
  ADD COLUMN IF NOT EXISTS fiscal_porcentaje       NUMERIC(5,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS descuento_item_porcentaje NUMERIC(5,2) NOT NULL DEFAULT 0;

-- ── PERFIL DEL ESTUDIO (para encabezado del presupuesto PDF) ─────

CREATE TABLE IF NOT EXISTS estudio_perfil (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre           TEXT        NOT NULL DEFAULT 'Mi Estudio Jurídico',
  cuit             TEXT,
  email            TEXT,
  telefono         TEXT,
  direccion        TEXT,
  logo_url         TEXT,        -- URL pública (Supabase Storage)
  cbu              TEXT,
  alias_cbu        TEXT,
  banco            TEXT,
  titular_cuenta   TEXT,
  firma_url        TEXT,        -- URL de imagen de firma PNG
  footer_text      TEXT,        -- Texto de pie de presupuesto
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Fila única de configuración del estudio
INSERT INTO estudio_perfil (nombre)
VALUES ('Mi Estudio Jurídico')
ON CONFLICT DO NOTHING;

-- RLS
ALTER TABLE estudio_perfil ENABLE ROW LEVEL SECURITY;
CREATE POLICY "acceso_total" ON estudio_perfil FOR ALL USING (true) WITH CHECK (true);

-- ── BUCKET EN STORAGE (ejecutar solo si no existe) ───────────────
-- Crear en Supabase Dashboard > Storage > New bucket:
--   Nombre: estudio-assets
--   Public: true
-- O vía SQL si tienes acceso a storage:
-- INSERT INTO storage.buckets (id, name, public) VALUES ('estudio-assets', 'estudio-assets', true)
-- ON CONFLICT DO NOTHING;
