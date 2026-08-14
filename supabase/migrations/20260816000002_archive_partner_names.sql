-- An archive that cannot say whose words are whose.
--
-- leave_couple() (20260814000002) nulls couple_id on BOTH partners, on purpose:
-- the one who was left is free immediately. users_select_partner keys on that
-- same column, so the moment it clears, neither ex-partner can read the other's
-- users row ever again. getProfile() returns null, archive.tsx falls back to the
-- literal "Your partner", and so does the exported keepsake, which is a plain
-- text file somebody keeps for years.
--
-- That migration gave couples, entries and couple_plans archive policies built
-- on my_couple_ids() and simply missed users. This is the missing one. It fails
-- closed exactly as before for everyone else: my_couple_ids() reads
-- couples.partner_a_id / partner_b_id, which leave_couple deliberately does NOT
-- clear (that row is the record that the two of them were a couple), so it
-- reaches the people who were actually in a couple with the caller and nobody
-- else. A stranger gains nothing.

drop policy if exists users_select_archived_partner on public.users;
create policy users_select_archived_partner on public.users
  for select to authenticated
  using (
    exists (
      select 1
        from public.couples c
       where c.id in (select public.my_couple_ids())
         and (c.partner_a_id = users.id or c.partner_b_id = users.id)
    )
  );
