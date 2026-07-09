-- Phase 8 (Prayers upgrade): author-only DELETE on prayers.
--
-- The table shipped with INSERT/SELECT/UPDATE policies but no DELETE policy, so
-- deleting a prayer was blocked by RLS. Add author-only delete: you can remove
-- your own prayer request, never your partner's.
--
-- UPDATE deliberately stays couple-scoped (unchanged) so either partner can mark a
-- shared prayer answered, matching the design. Editing a prayer's text/category is
-- gated to the author in the app UI (the edit flow only opens for own prayers).

CREATE POLICY prayers_delete ON public.prayers
  FOR DELETE TO authenticated
  USING (author_id = (SELECT auth.uid()));
