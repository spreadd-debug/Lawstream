-- 011 · Asignación múltiple de abogados + visibilidad por rol
-- Ejecutar en: Supabase Dashboard → SQL Editor → New query

-- ══════════════════════════════════════════════════════════════
-- 1. TABLA matter_assignments
-- ══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS matter_assignments (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  matter_id   UUID        NOT NULL REFERENCES matters(id) ON DELETE CASCADE,
  profile_id  UUID        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  role        TEXT        NOT NULL DEFAULT 'assigned' CHECK (role IN ('lead', 'assigned')),
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  assigned_by UUID        REFERENCES profiles(id),
  UNIQUE(matter_id, profile_id)
);

CREATE INDEX IF NOT EXISTS idx_ma_profile ON matter_assignments(profile_id);
CREATE INDEX IF NOT EXISTS idx_ma_matter  ON matter_assignments(matter_id);
CREATE INDEX IF NOT EXISTS idx_ma_profile_matter ON matter_assignments(profile_id, matter_id);

-- ══════════════════════════════════════════════════════════════
-- 2. BACKFILL: migrar `responsible` existente → matter_assignments
-- ══════════════════════════════════════════════════════════════

INSERT INTO matter_assignments (matter_id, profile_id, role)
SELECT m.id, p.id, 'lead'
FROM matters m
JOIN profiles p ON p.full_name = m.responsible
WHERE m.responsible IS NOT NULL
  AND m.responsible != ''
ON CONFLICT (matter_id, profile_id) DO NOTHING;

-- ══════════════════════════════════════════════════════════════
-- 3. COLUMNA must_change_password en profiles
-- ══════════════════════════════════════════════════════════════

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS must_change_password BOOLEAN NOT NULL DEFAULT FALSE;

-- ══════════════════════════════════════════════════════════════
-- 4. FUNCIONES HELPER para RLS
-- ══════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.user_role()
RETURNS TEXT AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION public.user_is_active()
RETURNS BOOLEAN AS $$
  SELECT COALESCE(
    (SELECT is_active FROM public.profiles WHERE id = auth.uid()),
    false
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION public.can_see_matter(matter_uuid UUID)
RETURNS BOOLEAN AS $$
  SELECT
    public.user_role() IN ('Socio', 'Secretario')
    OR EXISTS (
      SELECT 1 FROM public.matter_assignments
      WHERE matter_id = matter_uuid AND profile_id = auth.uid()
    );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- ══════════════════════════════════════════════════════════════
-- 5. RLS — MATTERS (reemplaza policy anterior)
-- ══════════════════════════════════════════════════════════════

DROP POLICY IF EXISTS "auth_all"      ON matters;
DROP POLICY IF EXISTS "acceso_total"  ON matters;

CREATE POLICY "matters_select" ON matters FOR SELECT USING (
  public.user_is_active() AND (
    public.user_role() IN ('Socio', 'Secretario')
    OR EXISTS (
      SELECT 1 FROM matter_assignments
      WHERE matter_id = id AND profile_id = auth.uid()
    )
  )
);

CREATE POLICY "matters_insert" ON matters FOR INSERT WITH CHECK (
  public.user_is_active()
);

CREATE POLICY "matters_update" ON matters FOR UPDATE USING (
  public.user_is_active() AND (
    public.user_role() IN ('Socio', 'Secretario')
    OR EXISTS (
      SELECT 1 FROM matter_assignments
      WHERE matter_id = id AND profile_id = auth.uid()
    )
  )
);

CREATE POLICY "matters_delete" ON matters FOR DELETE USING (
  public.user_is_active() AND public.user_role() = 'Socio'
);

-- ══════════════════════════════════════════════════════════════
-- 6. RLS — DOCUMENTS (hereda visibilidad del matter)
-- ══════════════════════════════════════════════════════════════

DROP POLICY IF EXISTS "auth_all"      ON documents;
DROP POLICY IF EXISTS "acceso_total"  ON documents;

CREATE POLICY "documents_select" ON documents FOR SELECT USING (
  public.user_is_active() AND public.can_see_matter(matter_id)
);

CREATE POLICY "documents_insert" ON documents FOR INSERT WITH CHECK (
  public.user_is_active() AND public.can_see_matter(matter_id)
);

CREATE POLICY "documents_update" ON documents FOR UPDATE USING (
  public.user_is_active() AND public.can_see_matter(matter_id)
);

CREATE POLICY "documents_delete" ON documents FOR DELETE USING (
  public.user_is_active() AND public.user_role() = 'Socio'
);

-- ══════════════════════════════════════════════════════════════
-- 7. RLS — TASKS (hereda visibilidad del matter; sin matter = abierto)
-- ══════════════════════════════════════════════════════════════

DROP POLICY IF EXISTS "auth_all"      ON tasks;
DROP POLICY IF EXISTS "acceso_total"  ON tasks;

CREATE POLICY "tasks_select" ON tasks FOR SELECT USING (
  public.user_is_active() AND (
    matter_id IS NULL
    OR public.can_see_matter(matter_id)
  )
);

CREATE POLICY "tasks_insert" ON tasks FOR INSERT WITH CHECK (
  public.user_is_active() AND (
    matter_id IS NULL
    OR public.can_see_matter(matter_id)
  )
);

CREATE POLICY "tasks_update" ON tasks FOR UPDATE USING (
  public.user_is_active() AND (
    matter_id IS NULL
    OR public.can_see_matter(matter_id)
  )
);

CREATE POLICY "tasks_delete" ON tasks FOR DELETE USING (
  public.user_is_active() AND public.user_role() = 'Socio'
);

-- ══════════════════════════════════════════════════════════════
-- 8. RLS — TIMELINE (hereda visibilidad del matter)
-- ══════════════════════════════════════════════════════════════

DROP POLICY IF EXISTS "auth_all"      ON timeline;
DROP POLICY IF EXISTS "acceso_total"  ON timeline;

CREATE POLICY "timeline_select" ON timeline FOR SELECT USING (
  public.user_is_active() AND public.can_see_matter(matter_id)
);

CREATE POLICY "timeline_insert" ON timeline FOR INSERT WITH CHECK (
  public.user_is_active() AND public.can_see_matter(matter_id)
);

CREATE POLICY "timeline_update" ON timeline FOR UPDATE USING (
  public.user_is_active() AND public.can_see_matter(matter_id)
);

-- ══════════════════════════════════════════════════════════════
-- 9. RLS — CLIENTS & CONSULTATIONS (abierto para autenticados activos)
-- ══════════════════════════════════════════════════════════════

DROP POLICY IF EXISTS "auth_all"      ON clients;
DROP POLICY IF EXISTS "acceso_total"  ON clients;

CREATE POLICY "clients_all" ON clients FOR ALL
  USING (public.user_is_active())
  WITH CHECK (public.user_is_active());

DROP POLICY IF EXISTS "auth_all"      ON consultations;
DROP POLICY IF EXISTS "acceso_total"  ON consultations;

CREATE POLICY "consultations_all" ON consultations FOR ALL
  USING (public.user_is_active())
  WITH CHECK (public.user_is_active());

-- ══════════════════════════════════════════════════════════════
-- 10. RLS — MATTER_ASSIGNMENTS
-- ══════════════════════════════════════════════════════════════

ALTER TABLE matter_assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ma_select" ON matter_assignments FOR SELECT USING (
  public.user_is_active()
);

CREATE POLICY "ma_insert" ON matter_assignments FOR INSERT WITH CHECK (
  public.user_is_active() AND public.user_role() = 'Socio'
);

CREATE POLICY "ma_update" ON matter_assignments FOR UPDATE USING (
  public.user_is_active() AND public.user_role() = 'Socio'
);

CREATE POLICY "ma_delete" ON matter_assignments FOR DELETE USING (
  public.user_is_active() AND public.user_role() = 'Socio'
);
