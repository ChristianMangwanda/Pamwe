-- #18 (debug-tour): an expired invite code bricks the couple. The only UPDATE
-- policy on couples is couples_update_join, whose USING requires the invite to
-- be unexpired and whose WITH CHECK requires partner_b_id = auth.uid() — so
-- partner A can never refresh their own code once it lapses. Let the creator
-- regenerate the invite on their own still-unpaired couple. WITH CHECK keeps
-- partner_b_id NULL, so this path can't be used to pair anyone.
--
-- Safe to apply to hosted anytime (independent of the b14 release-order gate);
-- the client regenerate path just fails politely until it lands.

create policy couples_update_regenerate_invite on public.couples
  for update
  to authenticated
  using (
    partner_a_id = (select auth.uid())
    and partner_b_id is null
  )
  with check (
    partner_a_id = (select auth.uid())
    and partner_b_id is null
  );
