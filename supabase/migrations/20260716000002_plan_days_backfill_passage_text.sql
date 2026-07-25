-- #23 (debug-tour): custom-plan days store passage_text = NULL and the app
-- live-fetches from bible-api.com on every open, which collapses under that
-- API's ~15-request budget. Let couple members write the fetched text back
-- into their own custom plan's days, so each passage is fetched once ever.
-- Curated plans stay untouchable (is_curated = false in both clauses).

create policy plan_days_update_custom on public.plan_days
  for update
  to authenticated
  using (
    plan_id in (
      select id from public.plans
      where is_curated = false
        and couple_id = public.current_user_couple_id()
    )
  )
  with check (
    plan_id in (
      select id from public.plans
      where is_curated = false
        and couple_id = public.current_user_couple_id()
    )
  );
