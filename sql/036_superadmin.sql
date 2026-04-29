-- 036 · Multi-tenant Etapa 6 — Superadmin + suscripciones + provisioning
-- Ejecutar en: Supabase Dashboard → SQL Editor → New query
--
-- Objetivo:
--   • Tabla super_admins (users que administran la plataforma, no
--     pertenecen a ningún firm).
--   • Columnas de suscripción en firms (status, fechas, contacto).
--   • Helper is_super_admin().
--   • RLS de firms actualizada: superadmins ven/gestionan todos los firms.
--   • Función admin_firm_metrics() — métricas agregadas por firm,
--     accesible solo a superadmins.
--   • Función admin_provision_firm() — alta atómica de firm + Socio.
--
-- Privacidad:
--   Los superadmins NO pueden leer matters, clients, expedientes ni
--   ningún dato de los estudios. Solo ven métricas agregadas (counts).
--   Si necesitan acceder a data específica, lo hacen vía service_role
--   con justificación documentada (no es algo de uso diario).
--
-- Cómo crear el primer superadmin (manual, una sola vez):
--   1. Supabase Dashboard → Auth → Add User → email + password
--   2. SQL: INSERT INTO super_admins (id, email, full_name)
--           VALUES ('<UUID_DEL_USER>', 'admin@lawstream.com', 'Mauro');
--
-- Dependencias: 032 (firms, current_firm_id).
--
-- ⚠️ Idempotente.

-- ══════════════════════════════════════════════════════════════
-- 1. Tabla super_admins
-- ══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS super_admins (
  id         UUID        PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email      TEXT        NOT NULL,
  full_name  TEXT,
  notes      TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE super_admins ENABLE ROW LEVEL SECURITY;

-- Solo otros superadmins pueden ver/gestionar la tabla. Un user normal
-- ni siquiera sabe que existe.
DROP POLICY IF EXISTS "super_admins_self" ON super_admins;
CREATE POLICY "super_admins_self" ON super_admins FOR ALL
  USING (id = auth.uid() OR EXISTS (SELECT 1 FROM super_admins WHERE id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM super_admins WHERE id = auth.uid()));

-- ══════════════════════════════════════════════════════════════
-- 2. Helper is_super_admin()
-- ══════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.super_admins WHERE id = auth.uid()
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- ══════════════════════════════════════════════════════════════
-- 3. Suscripciones en firms
-- ══════════════════════════════════════════════════════════════

ALTER TABLE firms
  ADD COLUMN IF NOT EXISTS subscription_status TEXT NOT NULL DEFAULT 'demo'
    CHECK (subscription_status IN ('demo', 'trial', 'active', 'suspended', 'inactive'));

ALTER TABLE firms ADD COLUMN IF NOT EXISTS subscription_started_at TIMESTAMPTZ;
ALTER TABLE firms ADD COLUMN IF NOT EXISTS subscription_ends_at    TIMESTAMPTZ;
ALTER TABLE firms ADD COLUMN IF NOT EXISTS contact_email            TEXT;
ALTER TABLE firms ADD COLUMN IF NOT EXISTS contact_phone            TEXT;
ALTER TABLE firms ADD COLUMN IF NOT EXISTS notes                    TEXT;
ALTER TABLE firms ADD COLUMN IF NOT EXISTS monthly_fee_pesos        NUMERIC(12,2);

-- El firm default queda como 'active' (es el tuyo).
UPDATE firms
SET subscription_status = 'active',
    subscription_started_at = COALESCE(subscription_started_at, created_at)
WHERE slug = 'estudio-original'
  AND subscription_status = 'demo';

-- ══════════════════════════════════════════════════════════════
-- 4. RLS de firms — superadmins ven todo
-- ══════════════════════════════════════════════════════════════

DROP POLICY IF EXISTS "firms_select" ON firms;
CREATE POLICY "firms_select" ON firms FOR SELECT USING (
  id = public.current_firm_id() OR public.is_super_admin()
);

DROP POLICY IF EXISTS "firms_update" ON firms;
CREATE POLICY "firms_update" ON firms FOR UPDATE USING (
  (id = public.current_firm_id()
   AND public.user_is_active()
   AND public.user_role() = 'Socio')
  OR public.is_super_admin()
);

-- INSERT y DELETE: solo superadmins.
DROP POLICY IF EXISTS "firms_insert_admin" ON firms;
CREATE POLICY "firms_insert_admin" ON firms FOR INSERT
  WITH CHECK (public.is_super_admin());

DROP POLICY IF EXISTS "firms_delete_admin" ON firms;
CREATE POLICY "firms_delete_admin" ON firms FOR DELETE
  USING (public.is_super_admin());

-- ══════════════════════════════════════════════════════════════
-- 5. Métricas por firm (solo superadmin)
-- ══════════════════════════════════════════════════════════════
-- SECURITY DEFINER bypassea RLS para contar; el WHERE final asegura
-- que solo un superadmin obtenga resultados.

CREATE OR REPLACE FUNCTION public.admin_firm_metrics()
RETURNS TABLE (
  firm_id              UUID,
  firm_nombre          TEXT,
  firm_slug            TEXT,
  subscription_status  TEXT,
  subscription_ends_at TIMESTAMPTZ,
  monthly_fee_pesos    NUMERIC(12,2),
  contact_email        TEXT,
  users_total          BIGINT,
  users_activos        BIGINT,
  matters_total        BIGINT,
  matters_activos      BIGINT,
  clients_total        BIGINT,
  consultas_total      BIGINT,
  ultimo_login_at      TIMESTAMPTZ,
  created_at           TIMESTAMPTZ
)
SECURITY DEFINER LANGUAGE sql STABLE AS $$
  SELECT
    f.id,
    f.nombre,
    f.slug,
    f.subscription_status,
    f.subscription_ends_at,
    f.monthly_fee_pesos,
    f.contact_email,
    (SELECT COUNT(*) FROM profiles p WHERE p.firm_id = f.id),
    (SELECT COUNT(*) FROM profiles p WHERE p.firm_id = f.id AND p.is_active),
    (SELECT COUNT(*) FROM matters m WHERE m.firm_id = f.id),
    (SELECT COUNT(*) FROM matters m WHERE m.firm_id = f.id AND m.status = 'Activo'),
    (SELECT COUNT(*) FROM clients c WHERE c.firm_id = f.id),
    (SELECT COUNT(*) FROM consultations co WHERE co.firm_id = f.id),
    (SELECT MAX(a.created_at) FROM audit_log a
       WHERE a.firm_id = f.id AND a.action = 'login'),
    f.created_at
  FROM firms f
  WHERE public.is_super_admin()
  ORDER BY f.created_at DESC;
$$;

-- ══════════════════════════════════════════════════════════════
-- 6. Métricas globales de la plataforma
-- ══════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.admin_platform_summary()
RETURNS TABLE (
  total_firms         BIGINT,
  firms_active        BIGINT,
  firms_demo          BIGINT,
  firms_trial         BIGINT,
  firms_suspended     BIGINT,
  firms_inactive      BIGINT,
  mrr_pesos           NUMERIC(14,2),
  total_users         BIGINT,
  total_matters       BIGINT
)
SECURITY DEFINER LANGUAGE sql STABLE AS $$
  SELECT
    COUNT(*),
    COUNT(*) FILTER (WHERE subscription_status = 'active'),
    COUNT(*) FILTER (WHERE subscription_status = 'demo'),
    COUNT(*) FILTER (WHERE subscription_status = 'trial'),
    COUNT(*) FILTER (WHERE subscription_status = 'suspended'),
    COUNT(*) FILTER (WHERE subscription_status = 'inactive'),
    COALESCE(SUM(monthly_fee_pesos) FILTER (WHERE subscription_status = 'active'), 0),
    (SELECT COUNT(*) FROM profiles),
    (SELECT COUNT(*) FROM matters)
  FROM firms
  WHERE public.is_super_admin();
$$;

-- ══════════════════════════════════════════════════════════════
-- 7. Provisionar un firm + Socio en una transacción
-- ══════════════════════════════════════════════════════════════
-- Inputs:
--   p_firm_nombre   — nombre del estudio
--   p_firm_slug     — slug único (ej: 'estudio-lopez')
--   p_socio_user_id — UUID del auth.user ya creado (vía Supabase Dashboard)
--   p_socio_nombre  — nombre completo del Socio
--   p_socio_email   — email del Socio
--   p_subscription  — 'demo' | 'trial' | 'active' (default 'demo')
--   p_monthly_fee   — opcional, monto mensual en pesos
--
-- Devuelve el UUID del firm creado.

CREATE OR REPLACE FUNCTION public.admin_provision_firm(
  p_firm_nombre   TEXT,
  p_firm_slug     TEXT,
  p_socio_user_id UUID,
  p_socio_nombre  TEXT,
  p_socio_email   TEXT,
  p_subscription  TEXT DEFAULT 'demo',
  p_monthly_fee   NUMERIC DEFAULT NULL
)
RETURNS UUID
SECURITY DEFINER LANGUAGE plpgsql AS $$
DECLARE
  v_firm_id UUID;
BEGIN
  -- Solo superadmins.
  IF NOT public.is_super_admin() THEN
    RAISE EXCEPTION 'Solo superadmins pueden provisionar firms';
  END IF;

  -- Validar que el auth.user existe.
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = p_socio_user_id) THEN
    RAISE EXCEPTION 'No existe auth.user con id %. Crealo primero en Supabase Auth.', p_socio_user_id;
  END IF;

  -- Validar que ese user no tenga ya un profile en otro firm.
  IF EXISTS (SELECT 1 FROM profiles WHERE id = p_socio_user_id) THEN
    RAISE EXCEPTION 'El user % ya tiene un profile asignado a otro firm.', p_socio_user_id;
  END IF;

  -- Crear firm.
  INSERT INTO firms (nombre, slug, subscription_status, monthly_fee_pesos, contact_email,
                     subscription_started_at)
  VALUES (p_firm_nombre, p_firm_slug, p_subscription, p_monthly_fee, p_socio_email, NOW())
  RETURNING id INTO v_firm_id;

  -- Crear profile del Socio (must_change_password=true → fuerza cambio en primer login).
  INSERT INTO profiles (id, full_name, email, role, initials, is_active,
                        must_change_password, firm_id)
  VALUES (
    p_socio_user_id,
    p_socio_nombre,
    p_socio_email,
    'Socio',
    UPPER(LEFT(p_socio_nombre, 1) ||
          COALESCE(SUBSTRING(p_socio_nombre FROM ' ([A-Za-z])'), '')),
    TRUE,
    TRUE,
    v_firm_id
  );

  RETURN v_firm_id;
END;
$$;

-- ══════════════════════════════════════════════════════════════
-- 8. Diagnóstico
-- ══════════════════════════════════════════════════════════════

-- Confirma que todo está en su lugar.
SELECT
  EXISTS (SELECT 1 FROM information_schema.tables
          WHERE table_schema = 'public' AND table_name = 'super_admins') AS tabla_super_admins,
  EXISTS (SELECT 1 FROM information_schema.routines
          WHERE routine_schema = 'public' AND routine_name = 'is_super_admin') AS helper_is_super_admin,
  EXISTS (SELECT 1 FROM information_schema.routines
          WHERE routine_schema = 'public' AND routine_name = 'admin_firm_metrics') AS fn_metrics,
  EXISTS (SELECT 1 FROM information_schema.routines
          WHERE routine_schema = 'public' AND routine_name = 'admin_provision_firm') AS fn_provision;

-- Estado de suscripciones por firm.
SELECT id, nombre, slug, subscription_status, subscription_started_at, monthly_fee_pesos
FROM firms
ORDER BY created_at DESC;

-- Total de superadmins.
SELECT COUNT(*) AS total_super_admins FROM super_admins;
