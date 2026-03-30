-- ================================================================
-- MIGRACIÓN: Tabla de perfiles de usuario
-- Ejecutar en: Supabase Dashboard → SQL Editor → New query
-- ================================================================

-- ── PERFILES DE USUARIO ────────────────────────────────────────
-- Vinculada a auth.users de Supabase Auth.
-- Cada usuario que se registra o es invitado tiene un perfil.

CREATE TABLE IF NOT EXISTS profiles (
  id         UUID        PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name  TEXT        NOT NULL,
  email      TEXT        NOT NULL,
  role       TEXT        NOT NULL DEFAULT 'Abogado' CHECK (role IN ('Socio', 'Abogado', 'Pasante', 'Secretario')),
  initials   TEXT        NOT NULL DEFAULT '',
  is_active  BOOLEAN     NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Índice para búsquedas por rol
CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);

-- RLS: cada usuario puede leer todos los perfiles (necesario para asignaciones)
-- pero solo puede editar el suyo propio
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Todos los usuarios autenticados pueden ver perfiles
CREATE POLICY "profiles_select" ON profiles
  FOR SELECT USING (auth.role() = 'authenticated');

-- Cada usuario puede actualizar su propio perfil
CREATE POLICY "profiles_update_own" ON profiles
  FOR UPDATE USING (auth.uid() = id);

-- Solo socios pueden insertar (invitar usuarios) y eliminar
CREATE POLICY "profiles_insert_socio" ON profiles
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'Socio')
  );

CREATE POLICY "profiles_delete_socio" ON profiles
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'Socio')
  );

-- ── TRIGGER: crear perfil automáticamente al registrarse ───────

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email, initials)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    NEW.email,
    UPPER(LEFT(COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email), 2))
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger que se dispara cuando se crea un usuario en auth.users
CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ── ACTUALIZAR POLÍTICAS EXISTENTES ────────────────────────────
-- Reemplazar las políticas "acceso_total" por políticas basadas en auth

-- Primero eliminar las políticas temporales
DROP POLICY IF EXISTS "acceso_total" ON clients;
DROP POLICY IF EXISTS "acceso_total" ON matters;
DROP POLICY IF EXISTS "acceso_total" ON consultations;
DROP POLICY IF EXISTS "acceso_total" ON documents;
DROP POLICY IF EXISTS "acceso_total" ON tasks;
DROP POLICY IF EXISTS "acceso_total" ON timeline;

-- Políticas: usuarios autenticados tienen acceso completo
-- (en una segunda fase se puede restringir por rol/asignación)
CREATE POLICY "auth_all" ON clients       FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "auth_all" ON matters       FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "auth_all" ON consultations FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "auth_all" ON documents     FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "auth_all" ON tasks         FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "auth_all" ON timeline      FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');
