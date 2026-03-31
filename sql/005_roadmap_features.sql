-- ============================================================
-- Lawstream — Roadmap Features Migration
-- Run this in Supabase SQL Editor
-- ============================================================

-- ── 1. Tasks: campos bloqueante + auto-generación ───────────
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS bloqueante boolean DEFAULT false;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS generada_automaticamente boolean DEFAULT false;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS trigger_estado text;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS consultation_id uuid REFERENCES consultations(id);
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS completed_at timestamptz;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS completed_by text;

-- ── 2. Consultations: campos enriquecidos ───────────────────
ALTER TABLE consultations ADD COLUMN IF NOT EXISTS diagnostico text;
ALTER TABLE consultations ADD COLUMN IF NOT EXISTS solucion_propuesta text;
ALTER TABLE consultations ADD COLUMN IF NOT EXISTS atendido_por text;

-- ── 3. Onboarding checklist items ───────────────────────────
CREATE TABLE IF NOT EXISTS onboarding_items (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  consultation_id uuid NOT NULL REFERENCES consultations(id) ON DELETE CASCADE,
  label text NOT NULL,
  completed boolean DEFAULT false,
  completed_at timestamptz,
  completed_by text,
  orden int DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_onboarding_consultation ON onboarding_items(consultation_id);

-- ── 4. Communications log ───────────────────────────────────
CREATE TABLE IF NOT EXISTS communications (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  matter_id uuid REFERENCES matters(id) ON DELETE CASCADE,
  client_id uuid REFERENCES clients(id) ON DELETE SET NULL,
  consultation_id uuid REFERENCES consultations(id) ON DELETE SET NULL,
  canal text NOT NULL CHECK (canal IN ('WhatsApp', 'Email', 'Teléfono', 'Presencial', 'Interno')),
  contenido text NOT NULL,
  enviado_por text NOT NULL,
  visible_para_cliente boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_comms_matter ON communications(matter_id);
CREATE INDEX IF NOT EXISTS idx_comms_client ON communications(client_id);

-- ── 5. Matters: campos adicionales ──────────────────────────
ALTER TABLE matters ADD COLUMN IF NOT EXISTS tipo_causa text;
ALTER TABLE matters ADD COLUMN IF NOT EXISTS abogado_responsable_id uuid REFERENCES profiles(id);

-- ── 6. Document approval workflow ───────────────────────────
ALTER TABLE documents ADD COLUMN IF NOT EXISTS aprobado_por text;
ALTER TABLE documents ADD COLUMN IF NOT EXISTS aprobado_at timestamptz;
ALTER TABLE documents ADD COLUMN IF NOT EXISTS requiere_aprobacion boolean DEFAULT false;

-- ── 7. RLS policies for new tables ──────────────────────────
ALTER TABLE onboarding_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users full access" ON onboarding_items
  FOR ALL USING (auth.role() = 'authenticated');

ALTER TABLE communications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users full access" ON communications
  FOR ALL USING (auth.role() = 'authenticated');
