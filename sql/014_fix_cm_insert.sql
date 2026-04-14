-- 014: Fix conversation_members INSERT policy
-- The original cm_insert required the user to already be a member,
-- which blocked the creator from adding themselves as the first member.

DROP POLICY IF EXISTS cm_insert ON conversation_members;

CREATE POLICY cm_insert ON conversation_members
  FOR INSERT WITH CHECK (
    auth.uid() IS NOT NULL
    AND (
      public.is_conversation_member(conversation_id)
      OR (SELECT created_by FROM conversations WHERE id = conversation_id) = auth.uid()
    )
  );
