-- Phase 1.3 — Plan browse/detail metadata + couple-private custom plans.
-- Curated plans stay publicly readable; builder-created plans are couple-scoped.
-- Custom plan_days carry passage_reference with NULL passage_text (live-fetched).

ALTER TABLE public.plans
  ADD COLUMN tagline TEXT,
  ADD COLUMN about TEXT,
  ADD COLUMN explore TEXT[],
  ADD COLUMN gain TEXT[],
  ADD COLUMN minutes_label TEXT,
  ADD COLUMN rhythm_label TEXT,
  ADD COLUMN book_label TEXT,
  ADD COLUMN couple_id UUID REFERENCES public.couples(id) ON DELETE CASCADE;

ALTER TABLE public.plan_days ALTER COLUMN passage_text DROP NOT NULL;

-- Tighten plan visibility: curated plans public, custom plans couple-private.
DROP POLICY "plans_select_all" ON public.plans;
CREATE POLICY "plans_select" ON public.plans
  FOR SELECT TO authenticated USING (
    is_curated = true
    OR couple_id IN (
      SELECT c.id FROM public.couples c
      WHERE c.partner_a_id = (SELECT auth.uid()) OR c.partner_b_id = (SELECT auth.uid())
    )
  );

CREATE POLICY "plans_insert_custom" ON public.plans
  FOR INSERT TO authenticated WITH CHECK (
    created_by = (SELECT auth.uid())
    AND is_curated = false
    AND couple_id IN (
      SELECT c.id FROM public.couples c
      WHERE c.partner_a_id = (SELECT auth.uid()) OR c.partner_b_id = (SELECT auth.uid())
    )
  );

-- plan_days visibility follows plans RLS via the subquery.
DROP POLICY "plan_days_select_all" ON public.plan_days;
CREATE POLICY "plan_days_select" ON public.plan_days
  FOR SELECT TO authenticated USING (
    plan_id IN (SELECT id FROM public.plans)
  );

CREATE POLICY "plan_days_insert_custom" ON public.plan_days
  FOR INSERT TO authenticated WITH CHECK (
    plan_id IN (
      SELECT id FROM public.plans
      WHERE created_by = (SELECT auth.uid()) AND is_curated = false
    )
  );

-- NOTE: curated-plan browse copy is *content*, applied to the plan rows in
-- supabase/seeds/plan_metadata.sql (which runs after seed.sql inserts the rows).
-- On the hosted project, where the rows already exist, run that same file's
-- UPDATEs once via MCP.
