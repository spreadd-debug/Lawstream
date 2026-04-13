-- 013: Sistema de mensajería — conversaciones 1:1 y grupos
-- Reemplaza el chat global (chat_messages) por un modelo completo.

-- ── Tablas primero (sin RLS) ────────────────────────────────────────

-- Conversaciones
CREATE TABLE IF NOT EXISTS conversations (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  type        TEXT        NOT NULL CHECK (type IN ('direct', 'group')),
  name        TEXT,       -- NULL para direct, nombre legible para grupos
  created_by  UUID        REFERENCES profiles(id),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Miembros
CREATE TABLE IF NOT EXISTS conversation_members (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID        NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  profile_id      UUID        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  joined_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(conversation_id, profile_id)
);

CREATE INDEX idx_cm_profile ON conversation_members(profile_id);
CREATE INDEX idx_cm_conversation ON conversation_members(conversation_id);

-- ── Helper function (ahora la tabla ya existe) ──────────────────────
CREATE OR REPLACE FUNCTION public.is_conversation_member(conv_uuid UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.conversation_members
    WHERE conversation_id = conv_uuid AND profile_id = auth.uid()
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- ── RLS: Conversaciones ─────────────────────────────────────────────
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;

CREATE POLICY conv_select ON conversations
  FOR SELECT USING (public.is_conversation_member(id));

CREATE POLICY conv_insert ON conversations
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- ── RLS: Miembros ───────────────────────────────────────────────────
ALTER TABLE conversation_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY cm_select ON conversation_members
  FOR SELECT USING (public.is_conversation_member(conversation_id));

CREATE POLICY cm_insert ON conversation_members
  FOR INSERT WITH CHECK (
    auth.uid() IS NOT NULL
    AND public.is_conversation_member(conversation_id)
  );

CREATE POLICY cm_delete ON conversation_members
  FOR DELETE USING (
    profile_id = auth.uid()  -- solo puede salirse a sí mismo
  );

-- ── Mensajes ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS conversation_messages (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID        NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  sender_id       UUID        NOT NULL REFERENCES profiles(id),
  content         TEXT        NOT NULL CHECK (char_length(content) > 0),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_cmsg_conv_created ON conversation_messages(conversation_id, created_at DESC);
CREATE INDEX idx_cmsg_created ON conversation_messages(created_at DESC);

ALTER TABLE conversation_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY cmsg_select ON conversation_messages
  FOR SELECT USING (public.is_conversation_member(conversation_id));

CREATE POLICY cmsg_insert ON conversation_messages
  FOR INSERT WITH CHECK (
    sender_id = auth.uid()
    AND public.is_conversation_member(conversation_id)
  );

-- ── Realtime ────────────────────────────────────────────────────────
ALTER PUBLICATION supabase_realtime ADD TABLE conversation_messages;

-- ── Migración del chat global existente ─────────────────────────────

-- 1. Crear conversación "General" como grupo
INSERT INTO conversations (id, type, name, created_by)
SELECT
  '00000000-0000-0000-0000-000000000001'::UUID,
  'group',
  'General',
  (SELECT id FROM profiles WHERE role = 'Socio' LIMIT 1)
WHERE NOT EXISTS (
  SELECT 1 FROM conversations WHERE id = '00000000-0000-0000-0000-000000000001'
);

-- 2. Agregar todos los profiles activos como miembros
INSERT INTO conversation_members (conversation_id, profile_id)
SELECT '00000000-0000-0000-0000-000000000001'::UUID, id
FROM profiles
WHERE is_active = true
ON CONFLICT (conversation_id, profile_id) DO NOTHING;

-- 3. Migrar mensajes del chat viejo
INSERT INTO conversation_messages (id, conversation_id, sender_id, content, created_at)
SELECT id, '00000000-0000-0000-0000-000000000001'::UUID, sender_id, content, created_at
FROM chat_messages
ON CONFLICT (id) DO NOTHING;

-- La tabla chat_messages se mantiene intacta por seguridad.
-- Se puede eliminar manualmente más adelante con: DROP TABLE chat_messages;
