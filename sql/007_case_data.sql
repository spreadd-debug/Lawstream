-- 007: Add case_data JSONB column to store materia-specific wizard fields
ALTER TABLE matters ADD COLUMN IF NOT EXISTS case_data jsonb DEFAULT '{}';
