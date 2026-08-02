-- A couple can now save a built plan without starting it, so they need a way
-- to prune the shelf. Delete is couple-wide rather than author-only: the plan
-- is shared between them, like every other write path here.
--
-- Curated plans are excluded, and history is safe regardless of this policy:
-- plan_days cascades, but couple_plans.plan_id has no ON DELETE action, so any
-- plan either of you has ever enrolled in refuses to delete. That FK, not the
-- UI, is what guarantees a finished plan can never be removed.
CREATE POLICY "plans_delete_custom" ON public.plans
  FOR DELETE TO authenticated USING (
    is_curated = false
    AND couple_id IN (
      SELECT c.id FROM public.couples c
      WHERE c.partner_a_id = (SELECT auth.uid()) OR c.partner_b_id = (SELECT auth.uid())
    )
  );

-- plan_days rows are deleted by the FK cascade, which bypasses RLS, so no
-- delete policy is needed there.
