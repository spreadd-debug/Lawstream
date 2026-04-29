-- 037 · Fix handle_new_user para multi-tenant
-- Ejecutar en: Supabase Dashboard → SQL Editor → New query
--
-- Problema:
--   El trigger on_auth_user_created (definido en migration_profiles.sql)
--   inserta automáticamente en `profiles` cuando se crea un auth.user.
--   Pero ahora `profiles.firm_id` es NOT NULL (desde 032), entonces ese
--   INSERT falla con NULL constraint, y por cascada falla la creación
--   del user en Auth.
--
--   Caso concreto: querer crear un superadmin via Supabase Dashboard →
--   "Failed to create user".
--
-- Solución:
--   El trigger pasa a leer current_firm_id():
--     • Si hay sesión activa (Socio invitando un Abogado a su estudio):
--       crea el profile en ese firm. Caso normal: la UI sigue funcionando.
--     • Si NO hay sesión (superadmin creando user desde dashboard, o
--       creación inicial sin contexto de firm): no crea profile, deja
--       que auth.users INSERT termine bien. El profile se crea después
--       de forma explícita (vía admin_provision_firm o INSERT manual
--       en super_admins).
--
-- Dependencias: 032 (current_firm_id helper).

-- ══════════════════════════════════════════════════════════════
-- 1. Reemplazar la función
-- ══════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  v_firm_id UUID;
BEGIN
  v_firm_id := public.current_firm_id();

  -- Sin contexto de firm → no creamos profile.
  -- Casos: superadmin creando user via dashboard, primera creación
  -- antes de provisionar el firm, etc. El profile lo crea después
  -- admin_provision_firm o un INSERT explícito.
  IF v_firm_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Con contexto de firm (un Socio logueado invitando a un Abogado):
  -- creamos el profile en el firm del invitador.
  INSERT INTO public.profiles (id, full_name, email, initials, firm_id)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    NEW.email,
    UPPER(LEFT(COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email), 2)),
    v_firm_id
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- El trigger on_auth_user_created sigue apuntando a esta función,
-- así que no hace falta recrearlo.

-- ══════════════════════════════════════════════════════════════
-- 2. Diagnóstico
-- ══════════════════════════════════════════════════════════════

SELECT
  tgname        AS trigger_name,
  tgrelid::regclass AS sobre_tabla,
  proname       AS funcion
FROM pg_trigger t
JOIN pg_proc p ON p.oid = t.tgfoid
WHERE tgname = 'on_auth_user_created';
