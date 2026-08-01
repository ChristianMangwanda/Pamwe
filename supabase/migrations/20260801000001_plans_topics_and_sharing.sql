-- Plans overhaul: browse by topic, and plans that can travel between couples.
--
-- Three things, all in service of the same idea: a plan a couple builds for
-- themselves should be able to reach another couple, and the library should
-- grow from what people actually read rather than only from what we seed.

-- 1. TOPICS -----------------------------------------------------------------
-- Browse gets two axes, topic and length. Length is already duration_days.
alter table public.plans
  add column if not exists topics text[] not null default '{}';

create index if not exists plans_topics_idx on public.plans using gin (topics);

-- Topics for the four curated plans. Metadata only: no reading, prompt or
-- pull quote is touched, per the rule about the seeded plan content.
update public.plans set topics = array['gospels','jesus','faith']      where id = 'b1b2c3d4-e5f6-7890-abcd-ef1234567891';
update public.plans set topics = array['marriage','together','faith']  where id = 'd1b2c3d4-e5f6-7890-abcd-ef1234567893';
update public.plans set topics = array['comfort','grief','waiting']    where id = 'c1b2c3d4-e5f6-7890-abcd-ef1234567892';
update public.plans set topics = array['whole-bible','discipline']     where id = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890';

-- 2. SHARING ----------------------------------------------------------------
-- share_token is minted when a couple shares a plan they built. is_public is
-- the separate, deliberate step of offering it in Browse: a token means "I
-- sent this to friends", not "publish my private compilation to strangers".
-- Graduating a plan stays a decision, never an automatic consequence of a
-- popularity count.
alter table public.plans
  add column if not exists share_token uuid,
  add column if not exists is_public boolean not null default false;

create unique index if not exists plans_share_token_key
  on public.plans (share_token) where share_token is not null;

-- Reading a plan you were given. The old policy was curated-or-mine, so a
-- couple who accepted a shared plan could enrol in it and then not be able to
-- read it back, which would have shown an empty plan with no days.
--
-- Deliberately a strict superset of the old policy: the ownership branch keeps
-- the original couples subquery rather than switching to current_user_couple_id(),
-- which reads users.couple_id. Those two can disagree (one is the pairing, the
-- other is a column the app writes), and swapping them here could quietly cut a
-- couple off from plans they built. Only the two new OR branches are new.
--
-- The couple_plans subquery is safe from the recursion documented in
-- trial-and-error.md: couple_plans_select filters on couples only and never
-- references plans, so there is no cycle back into this policy.
drop policy if exists plans_select on public.plans;
create policy plans_select on public.plans
  for select using (
    is_curated = true
    or is_public = true
    or couple_id in (
      select c.id from couples c
      where c.partner_a_id = (select auth.uid())
         or c.partner_b_id = (select auth.uid())
    )
    or id in (
      select cp.plan_id from couple_plans cp
      where cp.couple_id in (
        select c.id from couples c
        where c.partner_a_id = (select auth.uid())
           or c.partner_b_id = (select auth.uid())
      )
    )
  );

-- Mint (or reuse) a share token for a plan this couple built. Idempotent, so
-- tapping Share twice hands out the same link rather than orphaning the first.
create or replace function public.share_plan(p_plan_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare v_token uuid;
begin
  select share_token into v_token
  from plans
  where id = p_plan_id
    and is_curated = false
    and couple_id = current_user_couple_id();

  if not found then
    raise exception 'not your plan to share';
  end if;

  if v_token is null then
    v_token := gen_random_uuid();
    update plans set share_token = v_token where id = p_plan_id;
  end if;

  return v_token;
end;
$$;

-- Read a shared plan from its token, for the accept screen. SECURITY DEFINER
-- because the recipient cannot see the row yet: that is the whole point of the
-- link. Returns description only, never the readings, so a leaked token cannot
-- be used to strip-mine plan content without enrolling.
create or replace function public.get_shared_plan(p_token uuid)
returns table (
  id uuid,
  title text,
  subtitle text,
  tagline text,
  duration_days int,
  topics text[],
  couples int
)
language sql
security definer
set search_path = public
as $$
  select p.id, p.title, p.subtitle, p.tagline, p.duration_days, p.topics,
         (select count(distinct cp.couple_id)::int from couple_plans cp where cp.plan_id = p.id)
  from plans p
  where p.share_token = p_token
  limit 1;
$$;

-- 3. HOW MANY COUPLES READ IT ----------------------------------------------
-- couple_plans is readable only for your own couple, so the client cannot count
-- other couples' enrolments. Restricted to plans that are actually offered
-- publicly, so this can never be used to probe how many couples hold a private
-- plan.
create or replace function public.plan_reader_counts(p_plan_ids uuid[])
returns table (plan_id uuid, couples int)
language sql
security definer
set search_path = public
as $$
  select cp.plan_id, count(distinct cp.couple_id)::int
  from couple_plans cp
  join plans p on p.id = cp.plan_id
  where cp.plan_id = any(p_plan_ids)
    and (p.is_curated = true or p.is_public = true)
  group by cp.plan_id;
$$;

revoke execute on function public.share_plan(uuid)            from public, anon;
revoke execute on function public.get_shared_plan(uuid)       from public, anon;
revoke execute on function public.plan_reader_counts(uuid[])  from public, anon;
grant  execute on function public.share_plan(uuid)            to authenticated;
grant  execute on function public.get_shared_plan(uuid)       to authenticated;
grant  execute on function public.plan_reader_counts(uuid[])  to authenticated;
