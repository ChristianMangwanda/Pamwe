-- rls_auto_enable() is a hosted-side event-trigger helper that enables RLS on
-- any new table created in public. Event triggers do not check the caller's
-- EXECUTE privilege, but a SECURITY DEFINER function in an exposed schema is
-- callable through PostgREST by default, and the security advisors flag
-- exactly that (lints 0028/0029: anon and authenticated could invoke it via
-- /rest/v1/rpc). Nothing client-side calls it, so nothing should be able to.
--
-- Guarded because the function exists only on hosted: the local stack never
-- had it, and this migration must apply cleanly to both.
do $$
begin
  if exists (
    select 1 from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname = 'rls_auto_enable'
  ) then
    revoke execute on function public.rls_auto_enable() from public, anon, authenticated;
  end if;
end $$;
