-- Checklist de relevamiento: datos capturados durante la entrevista
ALTER TABLE consultations ADD COLUMN IF NOT EXISTS checklist_data jsonb DEFAULT '{}';
