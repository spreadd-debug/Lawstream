-- ════════════════════════════════════════════════════════════════
-- SEED — Firm aislado para Playwright + profile del user de testing
-- ════════════════════════════════════════════════════════════════
-- Crea un firm dedicado a tests E2E y vincula el user
-- 'playwright@lawstream.test' (creado previamente via Dashboard) a ese
-- firm. Todo lo que cree el test E2E queda aislado por RLS — invisible
-- para el firm real del estudio.
--
-- Pre-requisitos:
--   1. Migraciones 032+ corridas (firms + profiles + RLS multi-tenant).
--   2. User creado desde Supabase Dashboard:
--      • Email:    playwright@lawstream.test
--      • Password: Playwright2026!
--      • Auto-confirm: ✅
--
-- ⚠️ Idempotente — corrérlo varias veces no rompe nada.

DO $$
DECLARE
  v_user_id        UUID;
  v_firm_id        UUID;
  v_firm_creado    BOOLEAN := FALSE;
  v_profile_creado BOOLEAN := FALSE;
BEGIN
  -- ────────────────────────────────────────────────────────────
  -- 1. Buscar el user creado en Authentication
  -- ────────────────────────────────────────────────────────────
  SELECT id INTO v_user_id
  FROM auth.users
  WHERE email = 'playwright@lawstream.test'
  LIMIT 1;

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION '[seed] User playwright@lawstream.test no encontrado en auth.users. Creálo primero desde Supabase Dashboard → Authentication → Users → Add user (con password Playwright2026! y Auto Confirm).';
  END IF;

  RAISE NOTICE '[seed] User encontrado: %', v_user_id;

  -- ────────────────────────────────────────────────────────────
  -- 2. Crear o reutilizar el firm de testing
  -- ────────────────────────────────────────────────────────────
  SELECT id INTO v_firm_id
  FROM firms
  WHERE nombre = 'Playwright Testing'
  LIMIT 1;

  IF v_firm_id IS NULL THEN
    INSERT INTO firms (nombre, slug, subscription_status)
    VALUES ('Playwright Testing', 'playwright-testing', 'active')
    RETURNING id INTO v_firm_id;
    v_firm_creado := TRUE;
    RAISE NOTICE '[seed] Firm "Playwright Testing" creado: %', v_firm_id;
  ELSE
    RAISE NOTICE '[seed] Firm "Playwright Testing" ya existía: %', v_firm_id;
  END IF;

  -- ────────────────────────────────────────────────────────────
  -- 3. Crear o actualizar el profile del user, vinculado al firm de testing
  -- ────────────────────────────────────────────────────────────
  IF NOT EXISTS (SELECT 1 FROM profiles WHERE id = v_user_id) THEN
    INSERT INTO profiles (id, full_name, email, role, initials, is_active, firm_id)
    VALUES (
      v_user_id,
      'Playwright Testing',
      'playwright@lawstream.test',
      'Socio',                           -- rol Socio para que pueda hacer todo durante el test
      'PT',
      TRUE,
      v_firm_id
    );
    v_profile_creado := TRUE;
    RAISE NOTICE '[seed] Profile creado para Playwright user.';
  ELSE
    -- Si el profile ya existe (porque el trigger lo creó en otro firm),
    -- lo movemos al firm de testing y nos aseguramos que esté activo.
    UPDATE profiles
    SET firm_id   = v_firm_id,
        is_active = TRUE,
        role      = 'Socio',
        full_name = 'Playwright Testing',
        initials  = 'PT'
    WHERE id = v_user_id;
    RAISE NOTICE '[seed] Profile existente movido al firm de testing.';
  END IF;

  -- ────────────────────────────────────────────────────────────
  -- 4. Resumen final
  -- ────────────────────────────────────────────────────────────
  RAISE NOTICE '════════════════════════════════════════';
  RAISE NOTICE '[seed] Setup completo:';
  RAISE NOTICE '  user_id : %', v_user_id;
  RAISE NOTICE '  firm_id : %', v_firm_id;
  RAISE NOTICE '  profile : ok';
  RAISE NOTICE '════════════════════════════════════════';
END $$;

-- Diagnóstico
SELECT
  p.id           AS user_id,
  p.full_name,
  p.email,
  p.role,
  p.is_active,
  f.nombre       AS firm,
  f.id           AS firm_id
FROM profiles p
JOIN firms f ON f.id = p.firm_id
WHERE p.email = 'playwright@lawstream.test';
