-- 015: Ampliar datos de clientes, perfiles y expedientes
-- Necesario para capturar datos completos en casos de familia (divorcio, alimentos, etc.)

-- ═══════════════════════════════════════════════════════════
-- 1. CLIENTS: agregar DNI, domicilio, profesion, situacion laboral, ingresos
-- ════��══════════════════════════════════════════════════════
ALTER TABLE clients ADD COLUMN IF NOT EXISTS dni TEXT DEFAULT '';
ALTER TABLE clients ADD COLUMN IF NOT EXISTS domicilio TEXT DEFAULT '';
ALTER TABLE clients ADD COLUMN IF NOT EXISTS fecha_nacimiento DATE;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS nacionalidad TEXT DEFAULT '';
ALTER TABLE clients ADD COLUMN IF NOT EXISTS profesion TEXT DEFAULT '';
ALTER TABLE clients ADD COLUMN IF NOT EXISTS situacion_laboral TEXT DEFAULT '';
ALTER TABLE clients ADD COLUMN IF NOT EXISTS empleador TEXT DEFAULT '';
ALTER TABLE clients ADD COLUMN IF NOT EXISTS ingresos_estimados TEXT DEFAULT '';

-- ══════��════════════════════���═══════════════════════════════
-- 2. PROFILES: agregar matricula profesional
-- ════════════════════════════════��══════════════════════��═══
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS matricula TEXT DEFAULT '';

-- ═══════��═══════════════════════════════════════════════════
-- 3. EXPEDIENTES: agregar secretaria
-- ═════════════════════════════════���═══════════════════��═════
ALTER TABLE expedientes ADD COLUMN IF NOT EXISTS secretaria TEXT DEFAULT '';
