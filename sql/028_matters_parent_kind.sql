-- 028 · Sub-procesos (incidentes y apelaciones) — GAP 1
-- Ejecutar en: Supabase Dashboard → SQL Editor → New query
--
-- Un caso (matter) puede tener tramitaciones paralelas que corren en
-- "cuerda separada" dentro del mismo expediente:
--   • incidentes (alimentos provisorios, tenencia cautelar, exclusión
--     de hogar, autorización de viaje, etc.)
--   • apelaciones que abren una segunda instancia con su propio ciclo
--
-- En lugar de duplicar timeline/plazos/documentos creando una tabla
-- aparte, modelamos los sub-procesos como matters hijos:
--   • columna parent_matter_id → padre (NULL para casos principales)
--   • columna kind = 'principal' | 'incidente' | 'apelacion'
--   • columna incidente_tipo (sólo cuando kind='incidente') tipifica
--     el incidente (alimentos, tenencia, etc.)
--
-- Ventajas:
--   • Reusan TODA la infra existente: eventos, plazos, documentos,
--     comunicaciones, audit_log, RLS por can_see_matter().
--   • Filtramos kind='principal' en el listado principal de casos.
--   • Cámara (GAP 4) entra natural como kind='apelacion'.
--   • Parcialmente firme (GAP 5) se resuelve mirando hijos del padre.
--
-- ⚠️ ON DELETE: si se borra el padre, los hijos quedan huérfanos
-- (parent_matter_id pasa a NULL) en lugar de borrarlos en cascada.
-- Borrar un caso es una acción rara y queremos no perder los hijos
-- por accidente — el usuario los puede archivar manualmente.

-- ══════════════════════════════════════════════════════════════
-- 1. Columnas
-- ══════════════════════════════════════════════════════════════

ALTER TABLE matters ADD COLUMN IF NOT EXISTS parent_matter_id UUID
  REFERENCES matters(id) ON DELETE SET NULL;

ALTER TABLE matters ADD COLUMN IF NOT EXISTS kind TEXT;

ALTER TABLE matters ADD COLUMN IF NOT EXISTS incidente_tipo TEXT;

-- ══════════════════════════════════════════════════════════════
-- 2. Constraints
-- ══════════════════════════════════════════════════════════════

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'matters_kind_check'
  ) THEN
    ALTER TABLE matters
      ADD CONSTRAINT matters_kind_check
      CHECK (kind IS NULL OR kind IN ('principal', 'incidente', 'apelacion'));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'matters_incidente_tipo_check'
  ) THEN
    ALTER TABLE matters
      ADD CONSTRAINT matters_incidente_tipo_check
      CHECK (incidente_tipo IS NULL OR incidente_tipo IN (
        'alimentos_provisorios',
        'tenencia_cautelar',
        'exclusion_hogar',
        'autorizacion_viaje',
        'medida_cautelar',
        'beneficio_litigar_sin_gastos',
        'otro'
      ));
  END IF;
END $$;

-- Coherencia: solo los incidentes pueden tener incidente_tipo.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'matters_incidente_tipo_kind_check'
  ) THEN
    ALTER TABLE matters
      ADD CONSTRAINT matters_incidente_tipo_kind_check
      CHECK (
        incidente_tipo IS NULL
        OR kind = 'incidente'
      );
  END IF;
END $$;

-- Coherencia: un sub-proceso necesita parent (y un principal NO debería tener parent).
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'matters_parent_kind_coherence_check'
  ) THEN
    ALTER TABLE matters
      ADD CONSTRAINT matters_parent_kind_coherence_check
      CHECK (
        (kind IS NULL OR kind = 'principal') AND parent_matter_id IS NULL
        OR
        kind IN ('incidente', 'apelacion') AND parent_matter_id IS NOT NULL
      );
  END IF;
END $$;

-- ══════════════════════════════════════════════════════════════
-- 3. Índices
-- ══════════════════════════════════════════════════════════════

CREATE INDEX IF NOT EXISTS idx_matters_parent ON matters(parent_matter_id)
  WHERE parent_matter_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_matters_kind ON matters(kind);

-- ══════════════════════════════════════════════════════════════
-- 4. Backfill — todos los casos existentes son principales
-- ══════════════════════════════════════════════════════════════

UPDATE matters SET kind = 'principal' WHERE kind IS NULL;

-- ══════════════════════════════════════════════════════════════
-- 5. Diagnóstico
-- ══════════════════════════════════════════════════════════════

SELECT kind, COUNT(*) AS total
FROM matters
GROUP BY kind
ORDER BY kind;
