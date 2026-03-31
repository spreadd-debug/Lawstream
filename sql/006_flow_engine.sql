-- ============================================================
-- Lawstream — Flow Engine Migration
-- Run this in Supabase SQL Editor
-- ============================================================

-- ── 1. Tasks: campo etapa para vincular tarea a etapa del flujo ──
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS etapa text;

-- ── 2. Matter Milestones: hitos instanciados por asunto ─────────
CREATE TABLE IF NOT EXISTS matter_milestones (
  id         uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  matter_id  uuid NOT NULL REFERENCES matters(id) ON DELETE CASCADE,
  label      text NOT NULL,
  etapa      text,
  orden      int DEFAULT 0,
  status     text DEFAULT 'Pendiente' CHECK (status IN ('Pendiente', 'En curso', 'Completado')),
  target_date timestamptz,
  completed_at timestamptz,
  completed_by text,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_milestones_matter ON matter_milestones(matter_id);

-- ── 3. Matters: campo para template y etapa actual ──────────────
ALTER TABLE matters ADD COLUMN IF NOT EXISTS flow_template_id text;
ALTER TABLE matters ADD COLUMN IF NOT EXISTS current_stage text;
