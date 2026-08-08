# Security round (2026-08-08) — plan and implementation record

An external review of the repo raised 13 findings. Three exploration passes
verified every one against the working tree before anything was changed: all 13
were real, two were worse than reported, and two were partly wrong in their
details. This is the record of what was true, what was done, and what is left for
Christian to do by hand.

Nothing here changes what the app feels like to use. One line of new copy on the
welcome screen is the only user-visible difference.

---

## What the review got right, and where it was off

| # | Finding | Verdict |
|---|---|---|
| 1 | Review credentials committed | **Worse.** Also in `store-package.md`, and the repo is public. |
| 2 | Couples enumerable + hijackable | Confirmed. The invite code was never an authorization factor: only a client-side filter. |
| 3 | Entries injectable into any plan | **Worse.** The draft UPDATE also allowed re-pointing an entry at another couple's plan and sealing it. |
| 4 | `users.couple_id` self-assignable | Confirmed. Three things trusted it. |
| 5 | Open notify webhooks | **Six functions, not five.** Two allow arbitrary lock-screen text; one also lets the caller choose whose name appears. |
| 6 | delete-account not atomic | Confirmed, both halves. |
| 7 | Response ids unbound | **Partly.** `entry_responses` does validate `entry_id` and the parent chain. What it never checked is `couple_plan_id`/`day_number`, which is what every read keys on. |
| 8 | Autocomplete disabled | Confirmed, but **deliberate and documented** (b24 gate). Not a defect. |
| 9 | Voice recordings persist in cache | Confirmed. Re-recording leaked a file too. |
| 10 | Consent claimed but never collected | Confirmed. |
| 11 | `npm run lint` unusable | Confirmed. No static analysis had ever run here. |
| 12 | Sentry version mismatch | Confirmed. |
| 13 | Tests never touch the database | Confirmed. This is how the RLS bug in `20260709000002` shipped. |

Two sub-claims were **refuted**: `notify-partner` resolves the recipient from
`couples` and pushes correctly (only the streak counting was forgeable), and the
`sign-in.tsx` dev-password path is `__DEV__`-only against accounts that exist on
the local stack alone.

---

## Migrations (all applied and replayed locally)

| File | What it closes |
|---|---|
| `20260808000001_pairing_rpcs.sql` | `create_couple` / `join_couple` / `regenerate_invite_code` as SECURITY DEFINER functions. Codes now come from `gen_random_bytes`, expiry is server-side, the join holds the row with `FOR UPDATE`, and unknown/spent/expired all answer identically. Drops all four writable couples policies and revokes INSERT/UPDATE on the table. |
| `20260808000002_users_column_update_grants.sql` | Column-level UPDATE grants on `users`, so `couple_id` is no longer client-writable. `share_plan()` and `plan_days_update_custom` re-authorized off the pairing. |
| `20260808000003_entries_couple_scope_and_streak.sql` | Both entries policies require the plan to be the caller's couple's. Streak functions count the couple's two partners, not any two users. |
| `20260808000004_response_integrity_fks.sql` | Composite foreign keys, so a response's duplicated ids must describe its parent. |
| `20260808000005_notify_webhook_secret.sql` | `notify_config()` gains a `secret`; all six triggers send `x-webhook-secret`. |
| `20260808000006_delete_account_rpc.sql` | The whole public-schema deletion as one transaction. |
| `20260808000007_resume_final_day_autocomplete.sql` | **HOLD. Do not apply to hosted until both phones are on build 24+.** Restores completion and backfills plans finished during the pause. |
| `20260808000008_users_accepted_terms.sql` | `users.accepted_terms_at`. |

## Edge functions

- New `_shared/webhook.ts`: 401 without the secret, 500 if the function has none
  configured. Refusing to start is deliberate; a silent open door is what this
  round exists to remove.
- `notify-new-prayer`, `notify-new-response`, `notify-new-note` now re-fetch their
  row from the database and ignore the request's copy, so a notification can only
  say what a real row says even if the secret were to leak.
- `delete-account`: storage first with a **checked** error, then the RPC, then the
  auth delete, then the partner push last (it used to announce a departure that a
  later failure could undo).

## Client

`src/lib/couples.ts` (three RPCs), `invite.tsx` (one argument),
`journal.tsx` + `VoiceRecorder.tsx` (delete the recording),
`welcome.tsx` + `AuthProvider` + `account.ts` (consent line and its record),
`reveal.tsx` (a stale comment).

## Tests

`scripts/rls_probe.sql` is new and is the point: it asks a real database, as a
real signed-in outsider, whether any of this is still possible. Verified to fail
against the old policies before being trusted against the new ones. The Jest
assertions it replaces (a 6-char code, a 7-day expiry) were only ever checking
that the client sent the right filters, never that the database honoured them.

---

## STATUS as of 2026-08-08 evening

Applied to hosted (project `jcyhhxgomhopkoqesbkb`), in this order, after the
data pre-check returned 0/0/0: `pairing_rpcs`, `users_column_update_grants`,
`entries_couple_scope_and_streak`, `response_integrity_fks`,
`notify_webhook_secret`, `delete_account_rpc`, `users_accepted_terms`.
**Build 25 archived and uploaded to TestFlight** (app and widget both at 25, the
bundle greps clean for the hosted project ref).

Christian had already created the Vault secret `notify_webhook_secret` (22:26 UTC).
Verified after applying: `notify_config()` is still REVOKEd from the API roles (the
drop-and-recreate could have silently reopened it), the three pairing RPCs are
callable by `authenticated` while `generate_invite_code` / `delete_account` /
`notify_config` are not, and every webhook delivery in the last three days is 200.

**Left to do: steps 5, 6 and 8 below.** Note step 6 is the urgent one, and step 5
has gained a precondition now that the Vault secret exists (see the warning on it).

## What Christian has to do by hand

The order matters. Steps 1 and 2 must both be done before step 4, or every
notification stops.

1. **Generate the webhook secret**: `openssl rand -hex 32`.
2. **Supabase dashboard → Edge Functions → Secrets**: add `NOTIFY_WEBHOOK_SECRET`
   with that value. Nothing checks it yet, so nothing breaks.
3. **Vault** (via MCP `execute_sql`, after confirming `get_project_url` is
   `jcyhhxgomhopkoqesbkb`):
   `select vault.create_secret('<the same value>', 'notify_webhook_secret');`
4. **Apply migrations 1 through 6 and 8** via MCP `apply_migration`, in order.
   Run the pre-check in `20260808000004`'s header first and stop if any count is
   nonzero. After this, pairing is broken on builds before 25, which is expected.
5. **Deploy the seven edge functions** via MCP `deploy_edge_function`:
   notify-partner first, then send yourself a prayer from the other phone to
   confirm the banner still arrives, then the rest, then delete-account.
6. **Rotate the review password**: new value into App Store Connect review notes,
   then via MCP `execute_sql`:
   ```sql
   update auth.users
      set encrypted_password = extensions.crypt('<new>', extensions.gen_salt('bf'))
    where email in ('grace@review.pamwe.app', 'daniel@review.pamwe.app');
   delete from auth.sessions       where user_id in ('dddddddd-dddd-dddd-dddd-ddddddddddd1','dddddddd-dddd-dddd-dddd-ddddddddddd2');
   delete from auth.refresh_tokens where user_id::uuid in ('dddddddd-dddd-dddd-dddd-ddddddddddd1','dddddddd-dddd-dddd-dddd-ddddddddddd2');
   ```
   The old password stays in git history and stays dead. That was the call: a
   history rewrite buys nothing once the credential no longer opens anything.
7. **Ship build 25.** Bump `CURRENT_PROJECT_VERSION` in all four spots, run
   `restore_ios_patches.rb --check`, archive, verify the bundle, upload. Build 25
   must land after step 4, since it is the build that calls the new RPCs.
8. **Later, once both phones are on 25**: apply
   `20260808000007_resume_final_day_autocomplete.sql`.

## Verified locally

`supabase db reset` replays all 55 migrations clean. `rls_probe.sql` passes and
was confirmed to fail against the old policies. `delete_account` demotes, keeps
the survivor, rotates the code, and is safe to call twice. The full webhook chain
(trigger, Vault, `net.http_post`, function) answers 200 with the right secret and
401 with a wrong one. 280 Jest tests and `tsc --noEmit` pass. A production bundle
builds against Sentry 7.11.0, points at the hosted project, and carries no trace
of the local stack.

**Not verified without a device or an archive**: the voice-file deletion on a real
phone, crash reporting on the downgraded Sentry, and the Release archive itself.
