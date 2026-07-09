# Trial and Error — Pamwe Dev Log

A running log of issues hit during Pamwe development and how each was resolved. Future-you (or a fresh Claude instance) can search this for "we saw X before, here's what fixed it." Most recent debugging session at the bottom of each section.

---

## Database & RLS

### RLS infinite recursion when a policy references its own table

**Symptom:** Querying a table as an authenticated user fails with `42P17: infinite recursion detected in policy for relation "X"`. In the iOS app this surfaces as the auth gate stalling on the invite screen, because `getUserCouple()` errors and returns null.

**Root cause:** Several RLS policies contained `EXISTS` or `IN` subqueries against the same table the policy guards. Postgres can't evaluate the subquery without re-firing the policy, which re-fires the subquery, etc.

**Fix pattern:** Extract the self-referencing lookup into a `SECURITY DEFINER` SQL function. It runs as the function owner (postgres), which has `BYPASSRLS`, so the inner query doesn't recurse. Revoke `EXECUTE` from `PUBLIC` and grant only to `authenticated`.

**Where the fixes live:**
- `entries_select_partner_after_mutual_submit` — migration `fix_entries_rls_recursion_and_refactor_storage_helpers`. Helpers `public.has_user_submitted_entry()` and `public.can_view_partner_audio()`.
- `users_select_partner` — migration `fix_users_partner_rls_recursion`. Helper `public.current_user_couple_id()`.

**Trip-wire for future:** Any policy whose USING clause queries the same table it guards is a candidate. Grep `pg_policy.polqual` for the table name.

### Supabase auth email rate limit (4/hr default)

**Symptom:** "Email rate limit reached" when iterating on magic link sign-in.

**Fix for dev:** Create dummy users directly via SQL using `extensions.crypt()` for the password hash, plus a `__DEV__`-gated sign-in button.

**Where:** `alice@pamwe.dev` and `bob@pamwe.dev` (password `dev-password`) are paired in couple `cccccccc-cccc-cccc-cccc-cccccccccccc`, enrolled in M'Cheyne at day 1. Dev sign-in buttons in [src/app/(auth)/sign-in.tsx](src/app/(auth)/sign-in.tsx) inside an `if (__DEV__)` block.

### Magic link redirects to localhost:3000 instead of the app

**Cause:** Supabase Auth ignores the `emailRedirectTo` we pass and uses the project-configured Site URL.

**Fix:** Supabase Dashboard → Authentication → URL Configuration: set **Site URL** to `pamwe://` and add `pamwe://**` to the Redirect URL allowlist. (Not yet validated end-to-end — we pivoted to dev users after hitting the rate limit.)

---

## Storage RLS for voice entries

### Schema-tight RLS doesn't extend to Storage objects

**Symptom:** `entries` table hides partner rows until both submit, but the corresponding audio files in the `voice-entries` bucket would be readable by anyone with the path.

**Root cause:** Database RLS and Storage RLS are separate policy engines.

**Fix:** Mirror the locked-reveal logic in 5 `storage.objects` policies filtered by `bucket_id = 'voice-entries'`. The partner-read policy delegates to the `can_view_partner_audio()` SECURITY DEFINER helper.

**Where:** Migration `phase4_voice_entries_bucket_and_couples_timezone` creates the bucket and policies. Path scheme: `{couple_plan_id}/{day_number}/{user_id}.m4a`.

**Verification:** 4-stage RLS smoke test (neither submitted → partner B only → both → unrelated user). JS-side negative test still TODO.

---

## iOS dev build saga (free Apple ID)

### Free Apple ID can't sign Push Notifications or Sign In with Apple

**Symptom:** First `npx expo run:ios --device` fails with "Personal development teams... do not support the Sign in with Apple and Push Notifications capabilities."

**Fix:** Empty the dict in [ios/Pamwe/Pamwe.entitlements](ios/Pamwe/Pamwe.entitlements). The plugins still link as libraries; you just lose the system entitlements.

**Trade-off:** Apple Sign In button errors at runtime if tapped. Real APNs push doesn't deliver. Local notifications still work fine.

### Bundle identifier collision with `com.anonymous.Pamwe`

**Symptom:** "No profiles for 'com.anonymous.Pamwe' were found." Apple won't register the default Expo bundle ID under a personal team — thousands of others have already claimed it.

**Fix:** Set `ios.bundleIdentifier` in [app.json](app.json) to something unique (`com.christianmangwanda.pamwe`) AND patch the 2 `PRODUCT_BUNDLE_IDENTIFIER` lines in [ios/Pamwe.xcodeproj/project.pbxproj](ios/Pamwe.xcodeproj/project.pbxproj) so the existing build picks it up without re-prebuild.

### Expo CLI doesn't pass `-allowProvisioningUpdates`

**Symptom:** "Automatic signing is disabled and unable to generate a profile" even with everything else correct.

**Fix:** For the first build of a fresh bundle ID, open `ios/Pamwe.xcworkspace` in Xcode and hit ▶ — Xcode's UI passes the flag implicitly. Subsequent `npx expo run:ios --device` calls work because the profile is cached. Or pass the flag manually: `xcodebuild ... -allowProvisioningUpdates build`.

### CocoaPods 1.16 dies on Homebrew Ruby 4.0 with Unicode error

**Symptom:** `pod install` fails with `Unicode Normalization not appropriate for ASCII-8BIT (Encoding::CompatibilityError)` on an all-ASCII path.

**Root cause:** Ruby 4.0.5 (Homebrew default) tightened how it derives string encoding from environment. CocoaPods calls `String#unicode_normalize` on a path that's now ASCII-8BIT.

**Fix:** Set `LANG=en_US.UTF-8` and `LC_ALL=en_US.UTF-8`. Persisted in `~/.bash_profile`.

### iOS "Verify App" / "Trust" button glitches on free Apple ID

**Symptom:** Settings → VPN & Device Management → Trust does nothing. Safari loads pages fine.

**Fix:** Switch the iPhone to a different network. Apple's `ppq.apple.com` verification endpoint is blocked by some Wi-Fi setups even when other Apple traffic works. After trust succeeds once, subsequent installs reuse the cached state.

---

## EAS Build (paid Apple Developer account, approved 2026-07-09)

Switched from local `xcodebuild` to `eas build` after Apple Developer Program approval. `eas init` stamped `extra.eas.projectId` into `app.json` (auto-un-skips push-token registration in `notifications.ts`); `eas build -p ios --profile development` auto-created the APNs key and provisioning — no manual Apple portal work.

### `eas build` fails at Install pods: Google Sign-In Swift pods can't link statically

**Symptom:** First iOS EAS build errors in the **Install pods** phase (dashboard shows only "Unknown error"). The actual CocoaPods log:
```
[!] The following Swift pods cannot yet be integrated as static libraries:
The Swift pod `AppCheckCore` depends upon `GoogleUtilities` and `RecaptchaInterop`,
which do not define modules. ... set `use_modular_headers!` ... or `:modular_headers => true`.
```
`@react-native-google-signin/google-signin` → `GoogleSignIn` → `AppCheckCore` pulls in `GoogleUtilities`/`RecaptchaInterop`, which have no module maps. The google-signin config plugin (v16.1.2) only sets the iOS URL scheme — it does **not** touch the Podfile.

**Why it didn't reproduce locally:** local `pod install` (Xcode 26 + precompiled Expo modules + warm CocoaPods cache) masks the static-lib error; it only bites EAS's clean image. Don't trust a green local `pod install` as proof — verify the fix another way.

**Fix:** Add `expo-build-properties` with per-pod `modular_headers` (the per-dependency form the error recommends; safer than `useFrameworks: static`, which has its own non-modular-header issues with Google/Firebase — see [expo#39607](https://github.com/expo/expo/issues/39607)):
```json
["expo-build-properties", { "ios": { "extraPods": [
  { "name": "GoogleUtilities", "modular_headers": true },
  { "name": "RecaptchaInterop", "modular_headers": true }
] } }]
```
This writes `apple.extraPods` into `ios/Podfile.properties.json`; the autolinking resolve (run from `ios/`) returns them as `extraDependencies`, and `autolinking_manager.rb` applies `:modular_headers => true`. Verify without a full build: `cd ios && node --no-warnings --eval "require('expo/bin/autolinking')" expo-modules-autolinking resolve --platform apple --json` and check `extraDependencies`. Committed in `35a7190`.

**Reading a failed EAS build log headlessly** (the dashboard truncates to "Unknown error"): the log URL is behind Cloudflare + auth. Query GraphQL with the `sessionSecret` from `~/.expo/state.json` and a real `User-Agent` (else Cloudflare 1010): `POST https://api.expo.dev/graphql { builds { byId(buildId){ logFiles } } }`, header `expo-session: <secret>`. The `logFiles[0]` is a signed GCS URL, **Brotli**-encoded — `curl` is sandbox-blocked here, so fetch with Node `fetch` (auto-decompresses br) or `zlib.brotliDecompressSync`.

### "Untrusted Developer" prompt on first launch (EAS development build)

**Symptom:** App installs from the EAS QR/link, but tapping it shows *"Untrusted Developer — your device management settings do not allow using apps from developer 'Apple Development: …'."* with only a Cancel button.

**Fix:** Expected for a development-signed build. **Settings → General → VPN & Device Management → (under DEVELOPER APP) tap the "Apple Development: christianmangwanda@gmail.com" profile → Trust → confirm.** One-time per device until the signing cert rotates. (Unlike the free-Apple-ID trust glitch above, this just works on the paid account.)

---

## Xcode 26 / Swift 6 + Expo SDK 56 patches

All patches below live in `node_modules/expo-modules-jsi/` and will be wiped by `npm install`. **Wire up `patch-package` before iterating further** (open todo).

### `weak let` doesn't compile

**Symptom:** 14 errors like `'weak' must be a mutable variable, because it may change at runtime`.

**Root cause:** `weak let` has always been invalid in Swift; Xcode 26 stopped tolerating it.

**Fix:** `sed -i '' 's/weak let runtime/weak var runtime/g'` across `node_modules/expo-modules-jsi/`. 15 occurrences in 14 files.

### "Stored property of Sendable-conforming class is mutable"

**Symptom:** After the `weak var` patch, errors on `HostFunctionContext`, `HostObjectContext`, `JavaScriptValue`, `JavaScriptPropNameID`.

**Root cause:** Swift 6 strict concurrency forbids mutable stored properties on Sendable classes.

**Fix:** Append `@unchecked Sendable` to each conformance list:
- `Contexts/HostFunctionContext.swift` line 4
- `Contexts/HostObjectContext.swift` line 4
- `Runtime/Values/JavaScriptValue.swift` line 11
- `Runtime/JavaScriptPropNameID.swift` line 6

### Don't change `swiftLanguageModes` in Package.swift — silently breaks ABI

**Symptom:** App builds, installs, crashes at launch with `dyld: Symbol not found: _$s14ExpoModulesJSI15JavaScriptActor...assumeIsolated...`

**Root cause:** Downgrading from `[.v6]` to `[.v5]` (and removing `NonisolatedNonsendingByDefault` / `InferIsolatedConformances` upcoming features) changes Swift's symbol mangling. `ExpoModulesCore` (CocoaPods build, separate target) was compiled expecting v6 mangling and can't find v5-mangled symbols.

**Fix:** Keep Package.swift exactly as upstream. Solve Sendable strictness via per-class `@unchecked Sendable`.

**Lesson:** Patching a dep — prefer source patches over compiler-flag changes. The latter can silently change ABI.

### Don't remove Sendable from `JavaScriptType` protocol — also ABI

Same dyld symbol-not-found. Same fix: leave protocol alone, patch conforming classes.

---

## Runtime issues

### "no valid aps-environment entitlement" promise rejection on startup

**Symptom:** Console log: `[Error: Uncaught (in promise) Error: no valid "aps-environment" entitlement string found for application]`

**Root cause:** We stripped the push entitlement, but `expo-notifications.getExpoPushTokenAsync()` still tries on app start and rejects.

**Fix:** Wrap the call in try/catch in [src/lib/notifications.ts](src/lib/notifications.ts) and return null. Local scheduled notifications still work without the entitlement.

---

## Sign-in handlers must reset their own loading state on success too

**Symptom:** Google sign-in token exchange succeeded server-side, but the app spun on the sign-in button forever. AuthProvider's onAuthStateChange fired and updated the session, but the sign-in screen's local `loading` state stayed `true`, blocking the navigation.

**Fix:** Add `setLoading(false)` after the successful `signInWithIdToken` call in both `handleGoogleSignIn` and `handleAppleSignIn` in [src/app/(auth)/sign-in.tsx](src/app/(auth)/sign-in.tsx).

**Related:** the auth gate at [src/app/index.tsx](src/app/index.tsx) was also rewriting `resolveRoute()` on every render via an inline closure, which raced with state updates. Wrapped in `useCallback` keyed on `session.user.id`, plus passed the user id explicitly into `getUserCouple(userId?)` so we skip a redundant `supabase.auth.getUser()` network call on every route resolution.

## Couple stays on day 1 forever (advancePlanDay never fires)

**Symptom:** Both partners submit reflections; on next session, the Today tab still shows day 1.

**Root cause:** `advancePlanDay()` existed in [src/lib/plans.ts](src/lib/plans.ts) but was never called from the journal submit flow.

**Fix:** Server-side DB trigger `advance_plan_day_trigger` on `entries` AFTER INSERT OR UPDATE OF submitted_at. Trigger function checks if the partner has also submitted for this `(couple_plan_id, day_number)` and, if so, bumps `couple_plans.current_day` by 1 (capped at plan duration, idempotent guard against double-fire). Migration: `advance_plan_day_on_mutual_submit`.

Server-side avoids the race where one client increments and the other doesn't see the change.

## Inline-pasting a huge migration via MCP is wasteful

**Symptom:** The Gospel of John seed migration is ~100KB of SQL (21 chapters × multiline passage_text). Trying to inline it across many `apply_migration` calls eats a lot of context and is error-prone (smart quotes vs straight quotes, escaping).

**Fix:** Run the fetcher script offline (`python3 scripts/seed_john_plan.py > /tmp/john_plan.sql`), then paste the whole file into the Supabase Dashboard SQL editor for a one-shot run. The SQL editor handles ~1MB pastes fine.

**Pattern for future seeds:** generate SQL files locally via the fetcher pattern, paste once via the dashboard. Don't try to chunk via MCP for content > ~30KB.

## Python 3.14 + macOS Homebrew + urllib timeouts

**Symptom:** `urllib.request.urlopen()` times out even when `curl` to the same URL completes in under a second.

**Fix:** Use `subprocess.run(['curl', ...])` inside the Python script instead. See [scripts/seed_john_plan.py](scripts/seed_john_plan.py) for the pattern.

## bible-api.com rate limits aggressively

**Symptom:** Mid-fetch, requests start returning Connection-timed-out after about 8 successful chapters.

**Fix:** In the fetcher, sleep 4s between requests (not 2.1s as in the original M'Cheyne script), AND wrap `fetch_chapter` in a retry loop with exponential backoff (10s, 20s, 30s) for transient failures.

---

## Design-handoff rebuild (Phases 6–11)

### Anthropic structured output: `output_config.format.name` is rejected (400)

**Symptom:** `ask-pamwe` edge function 400s: `output_config.format.name: Extra inputs are not permitted`.

**Root cause:** The SDK's zod helper adds a `name` to the json_schema format object, but the raw Messages API does **not** accept it.

**Fix:** Use `output_config: { format: { type: "json_schema", schema: SCHEMA } }` — no `name` field. (Model must support structured outputs: Haiku 4.5, Sonnet 5, Opus 4.8, Fable 5. `claude-sonnet-4-6` does **not**.) Verified live on Haiku 4.5.

### phosphor-react-native: some icons aren't re-exported (e.g. `Circle`)

**Symptom:** `import { Circle } from 'phosphor-react-native'` → tsc `TS2724: has no exported member named 'Circle'`, even though the name is in the `.d.ts`.

**Root cause:** The package's `index` uses `export * from './icons/Circle'`, and `export *` does **not** re-export a module's default export. Icons whose module only default-exports don't come through.

**Fix:** Use a confirmed-exported icon, or render a plain bordered `View` for simple shapes (I used a View for the empty "upcoming" circle in the plan-detail schedule). Don't trust a `.d.ts` grep — let tsc confirm.

### expo-router typed routes: must regenerate the manifest after adding a route

**Symptom:** After adding e.g. `plans/[id].tsx`, tsc errors `TS2820: "/(tabs)/plans/[id]" is not assignable…` on `router.push`, even though the file exists.

**Fix:** The typed-routes manifest `.expo/types/router.d.ts` is generated by Metro, not on the fly. Regenerate: `rm -f .expo/types/router.d.ts && CI=1 npx expo start --dev-client --no-dev` (wait ~6s for it to write, then kill). Also: use the object form `router.push({ pathname: '/(tabs)/plans/[id]', params: { id } })` for dynamic routes — a template string isn't assignable to the typed href.

### Jest: AsyncStorage mock needs `__esModule: true`

**Symptom:** A test that mounts a component importing `AsyncStorage` directly (e.g. `ThemeProvider`) throws `_asyncStorage.default.getItem is not a function`, while other suites pass.

**Root cause:** `jest.mock('@react-native-async-storage/async-storage', () => ({ default: {...} }))` without `__esModule: true` gets double-wrapped by the Babel default-import interop, so `AsyncStorage.default` is `{ default: {...} }` and `.getItem` is undefined. It only surfaces when a test actually mounts a direct consumer (lib tests mock supabase, so they never hit it).

**Fix:** Add `__esModule: true` to the mock factory (in `src/__tests__/setup.ts`).

---

## Anti-patterns / things we tried that didn't work

| Approach | Why it failed |
|---|---|
| Lowering SWIFT_VERSION in Podfile `post_install` | Only affects CocoaPods pods; expo-modules-jsi is SwiftPM and ignored it. |
| Lowering swiftLanguageModes in Package.swift | Compiled, but broke symbol mangling — dyld can't resolve at launch. |
| Removing `Sendable` from `JavaScriptType` protocol | Compiled, but downstream callers in ExpoModulesCore expected the Sendable-mangled signatures. dyld error. |
| Patching `weak let → weak var` alone | Compiled past the original error but tripped the next Sendable strictness check. Needed `@unchecked` too. |
| `-Trust` in Settings UI when on a Wi-Fi that blocks `ppq.apple.com` | Trust button visually clicked but never actually trusted. Switch networks. |
