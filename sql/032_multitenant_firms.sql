-- 032 · Multi-tenant Etapa 1 — tabla firms + scoping de profiles
-- Ejecutar en: Supabase Dashboard → SQL Editor → New query
--
-- Objetivo:
--   • Introducir la entidad `firms` (estudio).
--   • Crear el firm default y asignarle todos los profiles existentes.
--   • Helper `current_firm_id()` que lee del profile del usuario logueado.
--   • RLS sobre `firms`: cada user ve solo su propio estudio.
--
-- LO QUE NO HACE esta migración:
--   • No agrega firm_id a tablas de dominio (matters, clients, expedientes,
--     etc.) — eso es Etapa 2.
--   • No modifica RLS de tablas existentes — eso es Etapa 3.
--   • No toca código de app — sigue funcionando igual porque todo queda
--     scopeado al firm default.
--
-- Dependencias: 011_matter_assignments.sql (helpers user_role, user_is_active).
--
-- ⚠️ Idempotente: se puede correr varias veces sin efectos secundarios.

-- ══════════════════════════════════════════════════════════════
-- 1. Diagnóstico inicial
-- ══════════════════════════════════════════════════════════════

SELECT
  (SELECT COUNT(*) FROM profiles)                                AS total_profiles,
  (SELECT COUNT(*) FROM profiles WHERE is_active)                AS profiles_activos,
  EXISTS (SELECT 1 FROM information_schema.tables
          WHERE table_schema = 'public' AND table_name = 'firms') AS tabla_firms_existe;

-- ══════════════════════════════════════════════════════════════
-- 2. Tabla firms
-- ══════════════════════════════════════════════════════════════
-- Una fila por estudio. El slug es opcional (para URLs amigables) pero
-- útil como natural key entre migraciones.

CREATE TABLE IF NOT EXISTS firms (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre     TEXT        NOT NULL,
  slug       TEXT        NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ══════════════════════════════════════════════════════════════
-- 3. Firm default — para los datos existentes
-- ══════════════════════════════════════════════════════════════
-- UUID fijo para que las próximas migraciones (Etapa 2) puedan
-- referenciarlo sin lookup. Si estudio_perfil ya tiene un nombre cargado,
-- lo heredamos.

DO $$
DECLARE
  v_nombre TEXT := 'Estudio Original';
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'estudio_perfil'
  ) THEN
    EXECUTE 'SELECT COALESCE(NULLIF(TRIM(nombre), $1), $2) FROM estudio_perfil LIMIT 1'
      INTO v_nombre
      USING '', 'Estudio Original';
  END IF;

  INSERT INTO firms (id, nombre, slug)
  VALUES (
    '00000000-0000-0000-0000-000000000001'::uuid,
    COALESCE(v_nombre, 'Estudio Original'),
    'estudio-original'
  )
  ON CONFLICT (slug) DO NOTHING;
END $$;

-- ══════════════════════════════════════════════════════════════
-- 4. profiles.firm_id
-- ══════════════════════════════════════════════════════════════

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS firm_id UUID REFERENCES firms(id);

-- Backfill: todos los profiles existentes al firm default.
UPDATE profiles
SET firm_id = '00000000-0000-0000-0000-000000000001'::uuid
WHERE firm_id IS NULL;

-- Antes de SET NOT NULL, abortar si quedó algún huérfano.
DO $$
DECLARE
  v_huerfanos INT;
BEGIN
  SELECT COUNT(*) INTO v_huerfanos FROM profiles WHERE firm_id IS NULL;
  IF v_huerfanos > 0 THEN
    RAISE EXCEPTION
      'No se puede aplicar NOT NULL en profiles.firm_id: hay % filas sin firm_id', v_huerfanos;
  END IF;
END $$;

ALTER TABLE profiles ALTER COLUMN firm_id SET NOT NULL;

CREATE INDEX IF NOT EXISTS idx_profiles_firm_id ON profiles(firm_id);

-- ══════════════════════════════════════════════════════════════
-- 5. Helper current_firm_id()
-- ══════════════════════════════════════════════════════════════
-- SECURITY DEFINER para que pueda leer profiles aun cuando profiles tenga
-- RLS por firm (Etapa 3). STABLE porque el firm del user no cambia
-- dentro de una transacción.

CREATE OR REPLACE FUNCTION public.current_firm_id()
RETURNS UUID AS $$
  SELECT firm_id FROM public.profiles WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- ══════════════════════════════════════════════════════════════
-- 6. RLS sobre firms
-- ══════════════════════════════════════════════════════════════

ALTER TABLE firms ENABLE ROW LEVEL SECURITY;

-- SELECT: cada user ve solo su firm.
DROP POLICY IF EXISTS "firms_select" ON firms;
CREATE POLICY "firms_select" ON firms FOR SELECT USING (
  id = public.current_firm_id()
);

-- UPDATE: solo Socio del propio firm.
DROP POLICY IF EXISTS "firms_update" ON firms;
CREATE POLICY "firms_update" ON firms FOR UPDATE USING (
  id = public.current_firm_id()
  AND public.user_is_active()
  AND public.user_role() = 'Socio'
);

-- INSERT/DELETE: sin policy → denegado para clientes anon/authenticated.
-- La creación de nuevos estudios se hará vía Edge Function con
-- service_role en la Etapa 6 (provisionamiento).

-- ══════════════════════════════════════════════════════════════
-- 7. Diagnóstico final
-- ══════════════════════════════════════════════════════════════

SELECT
  (SELECT COUNT(*) FROM firms)                                            AS total_firms,
  (SELECT COUNT(*) FROM profiles)                                         AS total_profiles,
  (SELECT COUNT(*) FROM profiles WHERE firm_id IS NULL)                   AS profiles_sin_firm,
  (SELECT id     FROM firms WHERE slug = 'estudio-original')              AS firm_default_id,
  (SELECT nombre FROM firms WHERE slug = 'estudio-original')              AS firm_default_nombre;

-- Smoke test del helper. En SQL Editor sin sesión devuelve NULL: es esperado.
SELECT public.current_firm_id() AS current_firm_id_para_session_actual;
