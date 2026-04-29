-- 040 · Audit feed para superadmin + enforcement de subscription_status
-- Ejecutar en: Supabase Dashboard → SQL Editor → New query
--
-- Objetivos:
--   • admin_audit_feed: el superadmin ve actividad cruzada de todos los
--     firms (logins, edits, etc.) sin tener que ir a cada uno.
--   • current_firm_status: helper para que la app rechace logins de
--     estudios suspendidos/inactivos.
--
-- Dependencias: 032 (firms), 036 (is_super_admin).
--
-- ⚠️ Idempotente.

-- ══════════════════════════════════════════════════════════════
-- 1. admin_audit_feed
-- ══════════════════════════════════════════════════════════════
-- Devuelve audit_log con join a firms. Filtros opcionales por firm_id.
-- SECURITY DEFINER bypasea RLS; el WHERE final asegura que solo un
-- superadmin obtenga resultados.

CREATE OR REPLACE FUNCTION public.admin_audit_feed(
  p_firm_id UUID DEFAULT NULL,
  p_limit   INT  DEFAULT 100
)
RETURNS TABLE (
  id            UUID,
  created_at    TIMESTAMPTZ,
  firm_id       UUID,
  firm_nombre   TEXT,
  actor_name    TEXT,
  action        TEXT,
  entity_type   TEXT,
  entity_label  TEXT
)
SECURITY DEFINER LANGUAGE sql STABLE AS $$
  SELECT
    a.id,
    a.created_at,
    a.firm_id,
    f.nombre,
    a.actor_name,
    a.action,
    a.entity_type,
    a.entity_label
  FROM public.audit_log a
  LEFT JOIN public.firms f ON f.id = a.firm_id
  WHERE public.is_super_admin()
    AND (p_firm_id IS NULL OR a.firm_id = p_firm_id)
  ORDER BY a.created_at DESC
  LIMIT GREATEST(1, LEAST(p_limit, 500));
$$;

-- ══════════════════════════════════════════════════════════════
-- 2. current_firm_status
-- ══════════════════════════════════════════════════════════════
-- Devuelve el subscription_status del firm del user logueado.
-- SECURITY DEFINER porque profiles tiene RLS (firm_isolation) — pero
-- igual el user puede leer su propio profile vía esa policy. Aún así,
-- usar SECURITY DEFINER hace el helper independiente de la RLS de firms,
-- y es consistente con current_firm_id.

CREATE OR REPLACE FUNCTION public.current_firm_status()
RETURNS TEXT AS $$
  SELECT f.subscription_status
  FROM public.firms f
  JOIN public.profiles p ON p.firm_id = f.id
  WHERE p.id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- ══════════════════════════════════════════════════════════════
-- 3. Diagnóstico
-- ══════════════════════════════════════════════════════════════

SELECT
  EXISTS (SELECT 1 FROM information_schema.routines
          WHERE routine_schema = 'public' AND routine_name = 'admin_audit_feed') AS fn_audit,
  EXISTS (SELECT 1 FROM information_schema.routines
          WHERE routine_schema = 'public' AND routine_name = 'current_firm_status') AS fn_status;
