-- ================================================================
-- LIMPIEZA DE DATOS DE TEST
-- Ejecutar en: Supabase Dashboard > SQL Editor > New query
-- SOLO borra datos, NO toca estructura de tablas
-- ================================================================

-- Orden: primero tablas dependientes, luego principales

-- Timeline
TRUNCATE TABLE timeline CASCADE;

-- Tasks
TRUNCATE TABLE tasks CASCADE;

-- Documents
TRUNCATE TABLE documents CASCADE;

-- Matters (asuntos)
TRUNCATE TABLE matters CASCADE;

-- Consultations (consultas)
TRUNCATE TABLE consultations CASCADE;

-- Clients
TRUNCATE TABLE clients CASCADE;

-- Presupuestos
TRUNCATE TABLE presupuesto_items CASCADE;
TRUNCATE TABLE presupuestos CASCADE;

-- Expedientes
TRUNCATE TABLE expediente_estados_log CASCADE;
TRUNCATE TABLE expedientes CASCADE;

-- Casos laborales y relacionados
TRUNCATE TABLE liquidaciones_laborales CASCADE;
TRUNCATE TABLE expedientes_laborales CASCADE;
TRUNCATE TABLE seclo_tramites CASCADE;
TRUNCATE TABLE telegramas CASCADE;
TRUNCATE TABLE encuadres_laborales CASCADE;
TRUNCATE TABLE casos_laborales CASCADE;

-- Milestones y comunicaciones
TRUNCATE TABLE matter_milestones CASCADE;
TRUNCATE TABLE communications CASCADE;

-- NO se borran:
--   profiles         (usuarios reales de auth)
--   studio_config    (configuracion del estudio)
--   estudio_perfil   (datos del estudio)
--   version_normativa (legislacion de referencia)
--   onboarding_items (config del onboarding)
