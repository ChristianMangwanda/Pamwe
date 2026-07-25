-- App Review demo couple (guideline 2.1: reviewers must reach the full app,
-- and the core loop needs a partner). Creates two pre-paired accounts on the
-- Gospel of John plan with two revealed days behind them and the partner's
-- day-3 reflection already in, so a reviewer can read, journal, submit and
-- see the reveal fire in one sitting.
--
--   grace@review.pamwe.app   (partner A, the account reviewers sign in with)
--   daniel@review.pamwe.app  (partner B, pre-filled)
--   password for both: Pamwe-Review-2026
--
-- The sign-in screen shows a password field for @review.pamwe.app emails
-- (no magic link needed). Run on the HOSTED project via MCP execute_sql,
-- AFTER the b14 migrations. Idempotent: guarded on the auth.users emails.
-- Uses fixed UUIDs in the dev-seed style; the couple's invite code is spent
-- (paired), so these accounts can't pair with anyone real.

DO $$
DECLARE
  v_grace  UUID := 'dddddddd-dddd-dddd-dddd-ddddddddddd1';
  v_daniel UUID := 'dddddddd-dddd-dddd-dddd-ddddddddddd2';
  v_couple UUID := 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeee1';
  v_cp     UUID := 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeee2';
  v_john   UUID := 'b1b2c3d4-e5f6-7890-abcd-ef1234567891'; -- Gospel of John, 21 days
  v_pw     TEXT := 'Pamwe-Review-2026';
BEGIN
  IF EXISTS (SELECT 1 FROM auth.users WHERE email = 'grace@review.pamwe.app') THEN
    RAISE NOTICE 'Review accounts already seeded; nothing to do.';
    RETURN;
  END IF;

  -- Auth users. The empty-string token columns matter: GoTrue errors on NULLs
  -- there when it scans users. handle_new_user mirrors each into public.users.
  INSERT INTO auth.users (instance_id, id, aud, role, email, encrypted_password,
    email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
    confirmation_token, recovery_token, email_change, email_change_token_new, email_change_token_current)
  VALUES
    ('00000000-0000-0000-0000-000000000000', v_grace, 'authenticated', 'authenticated',
     'grace@review.pamwe.app', extensions.crypt(v_pw, extensions.gen_salt('bf')),
     now(), '{"provider":"email","providers":["email"]}', '{"full_name":"Grace"}', now(), now(),
     '', '', '', '', ''),
    ('00000000-0000-0000-0000-000000000000', v_daniel, 'authenticated', 'authenticated',
     'daniel@review.pamwe.app', extensions.crypt(v_pw, extensions.gen_salt('bf')),
     now(), '{"provider":"email","providers":["email"]}', '{"full_name":"Daniel"}', now(), now(),
     '', '', '', '', '');

  INSERT INTO auth.identities (id, user_id, provider_id, identity_data, provider,
    last_sign_in_at, created_at, updated_at)
  VALUES
    (gen_random_uuid(), v_grace, v_grace::text,
     jsonb_build_object('sub', v_grace::text, 'email', 'grace@review.pamwe.app', 'email_verified', true),
     'email', now(), now(), now()),
    (gen_random_uuid(), v_daniel, v_daniel::text,
     jsonb_build_object('sub', v_daniel::text, 'email', 'daniel@review.pamwe.app', 'email_verified', true),
     'email', now(), now(), now());

  UPDATE public.users SET display_name = 'Grace',  avatar_initial = 'G' WHERE id = v_grace;
  UPDATE public.users SET display_name = 'Daniel', avatar_initial = 'D' WHERE id = v_daniel;

  -- Paired couple, three days into a streak.
  INSERT INTO public.couples (id, invite_code, invite_expires_at, partner_a_id, partner_b_id,
    paired_at, timezone, streak_count, streak_last_date)
  VALUES (v_couple, 'REVIEW', now() - interval '3 days', v_grace, v_daniel,
    now() - interval '4 days', 'America/Los_Angeles', 2, (now() AT TIME ZONE 'America/Los_Angeles')::date - 1);

  UPDATE public.users SET couple_id = v_couple WHERE id IN (v_grace, v_daniel);

  INSERT INTO public.couple_plans (id, couple_id, plan_id, start_date, current_day, status)
  VALUES (v_cp, v_couple, v_john, CURRENT_DATE - 2, 3, 'active');

  -- Days 1 and 2: both submitted (revealed history for the Reflect tab).
  -- Day 3: only Daniel, so the reviewer's own submit triggers the reveal.
  INSERT INTO public.entries (couple_plan_id, day_number, user_id, entry_type, text_content, submitted_at)
  VALUES
    (v_cp, 1, v_grace, 'text',
     'The Word became flesh and lived among us. I keep thinking about how God did not stay distant. He moved into the neighborhood. I want our home to feel like that, a place where grace and truth actually live.',
     now() - interval '2 days'),
    (v_cp, 1, v_daniel, 'text',
     'John the Baptist knew exactly who he was not, and that freed him to point at who Jesus is. I want that kind of clarity for us, less about being impressive and more about pointing somewhere true.',
     now() - interval '2 days'),
    (v_cp, 2, v_grace, 'text',
     'Jesus''s first sign was saving a wedding celebration. Of all the places to start. It makes me feel like our marriage matters to Him, not just the spiritual parts but the party too.',
     now() - interval '1 day'),
    (v_cp, 2, v_daniel, 'text',
     'Mary just says, do whatever he tells you. No plan, no backup. I am learning that obedience usually looks like filling water jars before you know what the water is for.',
     now() - interval '1 day'),
    (v_cp, 3, v_daniel, 'text',
     'Born again is such a strange phrase until you need one. Nicodemus came at night with his questions and Jesus did not shame him for asking. I hope we stay a couple that asks the night questions out loud.',
     now() - interval '2 hours');

  -- A lived-in Prayers tab: one active from each, one answered.
  INSERT INTO public.prayers (couple_id, author_id, text, category, status, answered_at, answer_note, created_at)
  VALUES
    (v_couple, v_grace, 'For patience with the busy season at work, and to keep our evenings for each other.', 'work', 'active', NULL, NULL, now() - interval '2 days'),
    (v_couple, v_daniel, 'For my mom''s health as she waits on the test results.', 'health', 'active', NULL, NULL, now() - interval '1 day'),
    (v_couple, v_grace, 'That we would find a church home in the new city.', 'guidance', 'answered', now() - interval '12 hours', 'We visited Grace Chapel on Sunday and both felt at home.', now() - interval '6 days');

  -- Shared study layer on the reader (John 3:16).
  INSERT INTO public.verse_highlights (couple_id, user_id, book, chapter, verse, color)
  VALUES (v_couple, v_daniel, 'John', 3, 16, 'amber');

  INSERT INTO public.verse_notes (couple_id, user_id, book, chapter, verse, text)
  VALUES (v_couple, v_daniel, 'John', 3, 16, 'The whole gospel in one sentence. Reading it slowly tonight.');

  RAISE NOTICE 'Review couple ready: Grace + Daniel, John day 3, reveal armed.';
END $$;
