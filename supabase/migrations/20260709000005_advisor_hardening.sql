-- Clear the Supabase security advisors on the fresh hosted project.

-- pg_net belongs in the extensions schema, not public. Its callable API lives
-- in the `net` schema either way, so the trigger functions are unaffected.
drop extension if exists pg_net;
create extension pg_net with schema extensions;

-- Function EXECUTE hygiene: Postgres grants EXECUTE to PUBLIC by default, which
-- made the parity migration's `REVOKE ... FROM anon` ineffective (anon inherits
-- via PUBLIC). Trigger functions need no caller EXECUTE at all; the RLS helpers
-- need only authenticated (they run as the querying role inside policies).
revoke execute on function public.handle_new_user() from public, anon, authenticated;
revoke execute on function public.notify_on_entry_submit() from public, anon, authenticated;
revoke execute on function public.notify_on_new_prayer() from public, anon, authenticated;
revoke execute on function public.advance_plan_day_if_mutual_submit() from public, anon, authenticated;
revoke execute on function public.update_streak_on_mutual_submit() from public, anon, authenticated;

revoke execute on function public.current_user_couple_id() from public, anon;
revoke execute on function public.has_user_submitted_entry(uuid, int, uuid) from public, anon;
revoke execute on function public.can_view_partner_audio(uuid, int, uuid) from public, anon;
grant execute on function public.current_user_couple_id() to authenticated;
grant execute on function public.has_user_submitted_entry(uuid, int, uuid) to authenticated;
grant execute on function public.can_view_partner_audio(uuid, int, uuid) to authenticated;

-- (public.rls_auto_enable is platform-added on new hosted projects; left alone.)
