-- Enrolling in a plan becomes an authorization decision.
--
-- couple_plans_insert (20260525232605) checked that couple_id belonged to the
-- caller and never looked at plan_id at all. plans_select grants read access to
-- any plan a couple is enrolled in, which closed a loop: post
-- {couple_id: <yours>, plan_id: <any uuid>} to /rest/v1/couple_plans and that
-- plan, and every one of its plan_days, became readable. A custom plan another
-- couple wrote and never shared was one guessed uuid away, straight past the
-- share_token / is_public gate that exists to make sharing a decision.
--
-- switch_plan() (20260810000002) needs no change and gets none: it is SECURITY
-- INVOKER precisely so that RLS stays the single guard, and its own comment
-- says so. Fixing the policy fixes the RPC with it.
--
-- The check lives in a SECURITY DEFINER helper rather than inline in the policy
-- because an inline `select ... from plans` inside a policy is itself filtered
-- by plans_select, whose enrollment branch is the very thing being closed. That
-- is circular reasoning written as SQL. The definer helper reads the plans row
-- directly and answers about the plan's own columns, which is the question
-- actually being asked. current_user_couple_id(), my_couple_ids() and
-- has_user_submitted_entry() all exist for the same reason.

create or replace function public.plan_is_enrollable(p_plan uuid, p_couple uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1
      from public.plans p
     where p.id = p_plan
       and (
         p.is_curated
         or p.is_public
         or p.couple_id = p_couple
         -- A plan that has been shared at all stays enrollable by anyone
         -- holding its id. That is deliberate and it is what keeps
         -- pamwe://plan/<token> working: the preview screen resolves the plan
         -- through get_shared_plan (SECURITY DEFINER, by token) and then enrols
         -- through this path, so a stricter test here would break sharing
         -- rather than secure it. What closes is the real gap: a private plan
         -- that was never shared with anybody is now unenrollable.
         --
         -- Threading the token itself through switch_plan would be tighter
         -- still, and is the version to reach for if share links ever start
         -- circulating beyond the couple they were sent to.
         or p.share_token is not null
       )
  );
$$;

revoke execute on function public.plan_is_enrollable(uuid, uuid) from public, anon;
grant execute on function public.plan_is_enrollable(uuid, uuid) to authenticated;

-- The couple_id term is unchanged; the plan_id term is the new half.
alter policy couple_plans_insert on public.couple_plans
  with check (
    couple_id in (
      select c.id
        from public.couples c
       where c.partner_a_id = (select auth.uid())
          or c.partner_b_id = (select auth.uid())
    )
    and public.plan_is_enrollable(plan_id, couple_id)
  );
