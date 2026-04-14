-- 014: Fix conversation RLS — creator can't add members because they can't
-- see their own conversation yet (conv_select requires membership).
--
-- Fix 1: conv_select also allows the creator to see the conversation.
-- Fix 2: SECURITY DEFINER function to check creator (bypasses RLS).
-- Fix 3: cm_insert uses that function instead of a raw subquery.

-- ── Fix conv_select: creator can see their own conversation ──
DROP POLICY IF EXISTS conv_select ON conversations;
CREATE POLICY conv_select ON conversations
  FOR SELECT USING (
    public.is_conversation_member(id) OR created_by = auth.uid()
  );

-- ── Helper: check if user created the conversation (bypasses RLS) ──
CREATE OR REPLACE FUNCTION public.is_conversation_creator(conv_uuid UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.conversations
    WHERE id = conv_uuid AND created_by = auth.uid()
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- ── Fix cm_insert: creator can add members ──
DROP POLICY IF EXISTS cm_insert ON conversation_members;
CREATE POLICY cm_insert ON conversation_members
  FOR INSERT WITH CHECK (
    auth.uid() IS NOT NULL
    AND (
      public.is_conversation_member(conversation_id)
      OR public.is_conversation_creator(conversation_id)
    )
  );
