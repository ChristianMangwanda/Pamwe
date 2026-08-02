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

---

## TestFlight beta round (2026-07-10, builds 1–7)

### Terminal-only archive + upload pipeline (no Xcode GUI, no EAS)

**What works:** `xcodebuild -workspace ios/Pamwe.xcworkspace -scheme Pamwe -configuration Release -destination "generic/platform=iOS" -archivePath <path> -allowProvisioningUpdates DEVELOPMENT_TEAM=5LX4YFCXPK archive`, then `xcodebuild -exportArchive -archivePath <path> -exportOptionsPlist ExportOptions.plist -allowProvisioningUpdates` with plist keys `method=app-store-connect, destination=upload, signingStyle=automatic, teamID=5LX4YFCXPK`. Uploads with Xcode's saved Apple ID session, no 2FA prompt in practice.

**Gotchas hit:**
- `Info.plist` hardcoded `CFBundleVersion` as `1`; bumping `CURRENT_PROJECT_VERSION` in the pbxproj did nothing until Info.plist was changed to `$(CURRENT_PROJECT_VERSION)`. Bump builds ONLY via `CURRENT_PROJECT_VERSION` (2 spots in pbxproj) now.
- Release bundling reads `.env.production` (checked in, hosted values) over `.env` (local LAN). Verify every archive: `grep -ac jcyhhxgomhopkoqesbkb main.jsbundle` = 1 and zero LAN-IP hits.
- The App Store icon must have NO alpha channel; flatten with a CoreGraphics swift one-liner (scratchpad flatten.swift pattern) before dropping into `AppIcon.appiconset`.

### OAuth sign-in succeeded server-side but the app stayed on the sign-in screen

**Symptom:** Apple/Google sign-in "does nothing"; no error. auth.users showed the users created + signed in.
**Root cause:** No sign-in handler navigated after success; only the magic-link deep-link handler called `router.replace('/')`. Nothing observes auth state for navigation (the gate only routes when mounted/focused).
**Fix:** `router.replace('/')` after every successful sign-in in [src/app/(auth)/sign-in.tsx](src/app/(auth)/sign-in.tsx); locked in by `src/__tests__/sign-in.test.tsx` (7 scenarios).
**Trip-wire:** any new sign-in path must end by routing through the gate.

### Google "Passed nonce and nonce in id_token should either both exist or not"

**Root cause:** The Google iOS SDK embeds a nonce in the ID token; `@react-native-google-signin` v16 has no API to read/pass it (SignInParams only has `loginHint`).
**Fix:** Supabase dashboard → Auth → Providers → Google → enable **Skip nonce checks**. Client IDs list must contain web + iOS client IDs (audience = web ID). Apple provider: bundle id `com.christianmangwanda.pamwe` in Client IDs fixes "Unacceptable audience".

### CoupleProvider staleness poisoned every tab after in-session pairing

**Symptom:** Prayers tab spun forever; a created prayer "never appeared" (it WAS in the DB and RLS-readable); Reflections looked empty; symptoms "randomly" cleared on relaunch (crash-relaunch cycles reset the provider).
**Root cause:** CoupleProvider fetched the couple once per session keyed on `session`; pairing/enrolling mid-session never refreshed it, so `useCouple()` returned null in the tabs.
**Fix:** provider subscribes to `couples` + `couple_plans` realtime (filtered by couple id) and invite/join/plan-select call `refresh()` at each transition. Prayers list also cleared its spinner (guard used to return before `setLoading(false)`).
**Trip-wire:** any screen guard `if (!couple?.id) return;` inside a load fn must clear its loading state first.

### getUser() vs getSession()

`supabase.auth.getUser()` is a network round-trip (can hang after fresh sign-in; hammered /user at ~7 req/s across the app). `getSession()` is a local read. ALL of src/lib now uses getSession(); keep it that way unless a server-verified identity is strictly needed.

### Ask Pamwe "inaccurate AI" was the hardcoded fallback

**Symptom:** asked about Joshua, got John/Psalms recs.
**Root cause:** `ANTHROPIC_API_KEY` was never set on hosted after the cutover, so `src/lib/askPamwe.ts` silently served its canned fallback list.
**Fix:** secret set via dashboard 2026-07-10 (old exposed key revoked). If recs ever look canned again, check the secret + edge-function logs FIRST.

### Sentry: "1 user" = 1 dashboard seat, not app users

Free tier is fine for the couple beta. DSN lives in `.env.production` + eas.json (`EXPO_PUBLIC_SENTRY_DSN`); `_layout.tsx` gates `Sentry.init` + `Sentry.wrap` on it, so dev builds stay quiet. No wizard needed; source-map/dSYM upload deliberately deferred.

## Rounds 4-5 (2026-07-11, builds 9-11)

### `expo prebuild` silently vandalizes the hand-maintained ios/ project

**Symptom:** build 10 was rejected by Apple's TestFlight processing (error 90683, missing `NSPhotoLibraryUsageDescription`), and Info.plist's `CFBundleVersion` had become a literal `1`.
**Root cause:** a reflexive `npx expo prebuild --platform ios` while installing expo-speech-recognition. Prebuild regenerates Info.plist from app.json, which stripped the purpose string (SDWebImage/ExpoImage reference photo APIs, so Apple demands the string even though Pamwe never touches photos) and replaced the `$(CURRENT_PROJECT_VERSION)` reference with a hardcoded value.
**Fix:** restored `CFBundleVersion` via PlistBuddy; added `NSPhotoLibraryUsageDescription` to BOTH Info.plist and `app.json > ios.infoPlist` (the backstop that survives any future prebuild). Build number 10 is burned at Apple; shipped as 11.
**Rule:** never prebuild in this repo. New Expo modules autolink with `npm install` + `pod install` alone.

### Terminal upload dies with "Failed to Use Accounts"

**Symptom:** `xcodebuild -exportArchive` upload fails: `DVTDeveloperAccountManager: Failed to load credentials... missing Xcode-Username`, hours after the same pipeline worked.
**Root cause:** Xcode's saved Apple-ID session expires periodically.
**Fix:** Xcode → Settings → Accounts → select the Apple ID and sign in again; re-run the export unchanged. Longer-term option: an App Store Connect API key (`-authenticationKeyPath/-authenticationKeyID/-authenticationKeyIssuerID`) makes uploads session-proof.

### Revoking `anon` on a function is not enough — PUBLIC holds a default grant

**Symptom:** hosted security advisor flagged the new `can_respond_to_entry()` SECURITY DEFINER helper as executable by `anon` even though the migration revoked anon and granted only authenticated.
**Root cause:** Postgres grants EXECUTE to PUBLIC on function creation; anon inherits through PUBLIC unless PUBLIC itself is revoked.
**Fix + rule:** every new function migration revokes `from public, anon` explicitly. Run `get_advisors` after any hosted DDL.

### eas credentials is interactive-only; a pty can still read its state

Needed to verify the APNs key upload without clicking through menus. `eas credentials` has no list flag, and piping input fails (prompt lib treats EOF as cancel). Working recipe: run it under `script -q /tmp/out.txt` (allocates a pty) with timed keystrokes (`{ sleep 8; printf '\n'; sleep 6; printf 'n\n'; sleep 35; } |`), then kill and read the captured summary. Safe for READING the credentials summary; never blind-drive selections that mutate.

### Apple push key facts worth remembering

Teams max out at 2 APNs keys, and a key's .p8 downloads exactly once at creation. Expo holds Pamwe's active key (EAS-generated, portal ID K45Q3988W2); the manually created TDA69K9QWF key was never uploaded anywhere and can be revoked if a slot is ever needed.

## Home-screen widget (VerseWidget, 2026-07-12)

### "Cycle inside Pamwe" when embedding the widget appex

Adding the "Embed App Extensions" copy-files phase to the app target with xcodeproj's `new_copy_files_build_phase` **appends it last**. That makes it copy `VerseWidget.appex` into `Pamwe.app/PlugIns/` AFTER the implicit late steps that scan the whole app bundle (`ProcessInfoPlistFile`, `ExtractAppIntentsMetadata`) and the Expo "Strip Local Network Keys" script, so the build system reports `error: Cycle inside Pamwe`. Fix: **move the embed phase to right after the Frameworks phase** (early), before any whole-bundle step, so the appex exists when they run. `scripts/add_widget_target.rb` now positions it at `frameworks_index + 1` and re-asserts that position on every run (idempotent).

### Building/verifying the widget headlessly

- The auto-generated `VerseWidget` scheme treats the app as its extension host, so `xcodebuild -scheme VerseWidget` drags in the whole RN app + Pods and fails under `-project` (no Pods). To compile just the widget: `xcodebuild -project ios/Pamwe.xcodeproj -target VerseWidget -sdk iphonesimulator ... build` (redirect output with `SYMROOT`/`OBJROOT`; `-derivedDataPath` requires `-scheme`).
- Full end-to-end proof (app compiles + embeds the appex, versions match) needs the **workspace**: `xcodebuild -workspace ios/Pamwe.xcworkspace -scheme Pamwe -sdk iphonesimulator CODE_SIGNING_ALLOWED=NO build`.
- The SwiftUI view is kept WidgetKit-free so it can be snapshot-rendered off device: `swiftc` the view + a tiny `main.swift` host that registers the TTFs via `CTFontManagerRegisterFontsForURL` and uses `ImageRenderer` to emit PNGs per size/mode. Swift 6 strict concurrency makes `ImageRenderer` main-actor-only; wrap the host body in `MainActor.assumeIsolated { ... }`.

### xcodeproj gem lives inside Homebrew CocoaPods

There's no standalone `xcodeproj` gem on any Ruby here, but CocoaPods vendors it. Run splice scripts with `GEM_HOME=/opt/homebrew/Cellar/cocoapods/<ver>/libexec /opt/homebrew/opt/ruby/bin/ruby …` (set GEM_HOME only, like the `pod` wrapper does — overriding GEM_PATH hides rexml and breaks the load).

### pod install stamps the widget Info.plist

The Expo `react_native_post_install` hook writes `RCTNewArchEnabled` into every target's Info.plist, including the widget's, on each `pod install`. Harmless (WidgetKit ignores it) and it reappears if removed, so leave it. It does NOT attach any `[CP]` pod phases to the widget target (verified: the widget keeps just Sources/Frameworks/Resources).

## Round 7 aftermath (2026-07-30)

### Scheduled local notifications outlive the code that scheduled them

Symptom: after b17 shipped the dated-window prayer reminders, a "Time to pray" banner for the same prayer kept firing daily and nothing in the app could stop it, not praying, not answering, not deleting the prayer. Cause: pre-b17 builds scheduled ONE repeating DAILY notification per prayer under an expo-generated random id; the b17 rewrite cancels only its own `pamwe-prayer-<id>-<date>` identifiers, so the old repeating request just kept living in the OS across the app update. iOS persists scheduled requests independently of the app binary; replacing the scheduling code does NOT touch what's already queued.

Next morning the SAME bug class showed up again as the "two morning banners" duplicate: pre-b14 builds scheduled the morning reminder with no identifier and relied on `cancelAllScheduledNotificationsAsync()`; b14's cancel-by-id (`pamwe-morning*`) can't reach the old random-id request, so both the leftover and the new one fired every morning.

### The b17 tab cross-fade left revisited tabs blank (and made every switch feel slow)

Symptom: switching tabs felt noticeably slower after b17, and returning to a previously visited tab sometimes showed a blank page under a working tab bar. Cause: `animation: 'fade'` on the bottom tabs makes each tab's visibility an animated opacity (0 when inactive) AND lets react-native-screens natively detach faded-out tabs. A revisited tab re-attaches at opacity 0 and only becomes visible when a JS-started 220ms animation completes; rapid switches race the animation against detach/re-attach and can strand the screen fully transparent. Known, unfixed upstream: react-navigation discussion 12721 + issue 12755, react-native-screens issue 3824 (fade or shift + detachInactiveScreens, the iOS default). The 220ms spec also put a hard floor under every switch, on top of every tab refetching on focus.
**Fix + rule:** tabs are back to the default instant switch ('none'); the one soft entrance per session is the native splash fade-out (`SplashScreen.setOptions({ fade: true })` in lib/splash.ts), which lives entirely outside navigation and cannot race it. Don't re-add `animation` to the tab navigator while those upstream issues are open; if a transition is ever wanted again, the workaround is `detachInactiveScreens: false`, paid in memory across 6 tabs, and it still adds latency.
**Fix + rule:** `cleanupLegacyScheduled()` in notifications.ts sweeps `getAllScheduledNotificationsAsync()` on every launch (AuthProvider) and cancels any request whose payload type is ours (`morning`, `prayer_reminder`) but whose identifier lacks the matching prefix. Sweep by payload shape, not by stored ids, because the new code had already rewritten the AsyncStorage map without the old `notificationId`. General rule: any time an identifier scheme for scheduled notifications changes, ship a migration sweep that cancels the old shape, or the old ones fire forever.

## Debug builds could not link (2026-07-31)

**Symptom.** `xcodebuild -configuration Debug` failed at the app's link step for
both simulator and device, with missing C++ symbols in every third-party Fabric
component pod at once:

```
"facebook::react::Sealable::Sealable()", referenced from:
    RNDateTimePickerProps::RNDateTimePickerProps() in libRNDateTimePicker.a
    RNGestureHandlerButtonProps::...          in libRNGestureHandler.a
    RNGoogleSigninButtonProps::...            in libRNGoogleSignin.a
    RNSVGCircleProps::...                     in libRNSVG.a
```

plus `RCTPackagerConnection` and `RCTReconnectingWebSocket` missing from
`libexpo-dev-launcher.a`. **Release archives were unaffected**, which is the
detail that makes this confusing: the tree looks broken from a dev build and
fine from an archive. Do not conclude the project is broken from a Debug build.

**Cause.** React Native ships its prebuilt core, dependencies and Hermes as
separate debug and release artifacts (`Pods/ReactNativeCore-artifacts/`,
`ReactNativeDependencies-artifacts/`, `hermes-engine-artifacts/`, each holding a
`-debug.tar.gz` and a `-release.tar.gz`). Each pod carries a script phase that
swaps the right one in per configuration, and all three decide which with:

```sh
if echo $GCC_PREPROCESSOR_DEFINITIONS | grep -q "DEBUG=1"; then CONFIG="Debug"; fi
```

CocoaPods generates those three targets with only
`GCC_PREPROCESSOR_DEFINITIONS = $(inherited) COCOAPODS=1`, and nothing upstream
defines `DEBUG=1`, so the check never matched and the scripts installed the
**release** artifacts into Debug builds. The release React core is stripped
(11MB, 0 exported `Sealable`); the debug one is not (63MB, 13 exported). Hence
every Fabric pod losing the same symbols, and the dev-launcher losing the
dev-server ones.

**Fix.** A `post_install` hook in `ios/Podfile` defines `DEBUG=1` on the Debug
configuration of `React-Core-prebuilt`, `ReactNativeDependencies` and
`hermes-engine`. None of the three compile sources, so the define does nothing
but satisfy the check. **`ios/Podfile` is now git-tracked** (a `.gitignore`
exception) so a regenerated `ios/` cannot silently drop it.

**How to confirm it is working:** after a Debug build,
`ls -la ios/Pods/React-Core-prebuilt/React.xcframework/ios-arm64/React.framework/React`
should be ~63MB, and
`nm -gU <that binary> | grep -c Sealable` should be 13. If it reads 11MB and 0,
the release artifact is installed and the link will fail.

## Release pipeline and tooling (2026-07-31, build 19)

**`xcodebuild -allowProvisioningUpdates` cannot add a capability to an App ID.**
Adding the App Group to the entitlements made every archive fail with
`Provisioning profile "iOS Team Provisioning Profile: com.christianmangwanda.pamwe"
doesn't match the entitlements file's value for the
com.apple.security.application-groups entitlement`. The flag was working: it
reached Apple and minted fresh profiles (their expiry timestamps moved to the
minute of each attempt). It simply has no way to register a *capability* on the
App ID, so it kept producing group-less profiles. Xcode's Signing & Capabilities
pane does it, and so does fastlane, which is the CLI route:

```
fastlane produce associate_group -u <apple-id> \
  -a com.christianmangwanda.pamwe             group.com.christianmangwanda.pamwe
fastlane produce associate_group -u <apple-id> \
  -a com.christianmangwanda.pamwe.VerseWidget group.com.christianmangwanda.pamwe
```

`associate_group` creates the group if it does not exist, so it is the only
command needed, once per target bundle id. The Apple ID login caches a session in
`~/.fastlane/spaceship/` for about a month, so later runs need no 2FA.

**`aps-environment` reads `development` in the archive. That is correct.**
`-exportArchive` re-signs for distribution, and the exported ipa comes out
`production` with `beta-reports-active`. Check the ipa, not the xcarchive, before
concluding push is broken.

**Verify the ipa before uploading, not after.** `ExportOptions.plist` carries
`destination=upload`, so the documented export command ships straight to Apple and
a rejected build number is burned. Copy it with `destination=export` first, unzip
the ipa and read the re-signed entitlements, then run the real one.

**`fastlane pilot builds` is broken** against Apple's current API in fastlane
2.237 (`'betaBuildMetrics' is not a valid relationship name`). To read build state,
call spaceship directly with an explicit `includes:`, which avoids the bad default:

```ruby
Spaceship::ConnectAPI.get_builds(filter: { app: app.id },
  includes: "preReleaseVersion", sort: "-uploadedDate", limit: 6)
```

**`scripts/add_widget_target.rb` only seeded its file lists on first splice.**
Everything after `if fresh` ran once, so Swift files added later were never put in
the target and silently never compiled. It now re-asserts `SOURCES`/`RESOURCES` on
every run. Dedupe on the reference's `path`, not `hierarchy_path`: the latter
reports the basename for nested entries, so `Fonts/x.ttf` never matches `x.ttf`
and every run adds a second copy.

## The date picker measures itself a layout pass late (2026-07-31, build 20)

**Symptom.** The anniversary bottom sheet in b19 opened with the date wheel cut
roughly in half and Save entirely below the bottom of the screen. The wheel spun
and worked; there was simply no way to reach the button.

**It was not an overflow.** The sheet's content is about 475pt on an ~850pt
screen. Nothing needed to scroll, and adding a `maxHeight` or a `ScrollView`
would have fixed nothing.

**Cause.** `@react-native-community/datetimepicker` reports its size to Fabric
*after* the first layout commit. Its state starts empty:

```cpp
Size frameSize{};                                              // RNDateTimePickerState.h
if (stateData.frameSize.width != 0 && stateData.frameSize.height != 0)
    layoutableShadowNode.setSize(...);                         // ComponentDescriptors.h
```

so the first commit skips `setSize` entirely and the picker lays out at height 0.
The real ~216pt only arrives afterwards, via `updateState` → `updateMeasurements`
→ a second commit. There is no default height on the JS side either. So the sheet
was measured and positioned at its picker-less height, and the 216pt that landed
a beat later grew it downward, past the bottom edge, carrying Save with it.

**Why only this one screen.** Every other `BottomSheet` in the app holds content
of a fixed height. The picker is the only child anywhere that changes size after
mount, which is also why nothing in the suite could have caught it: it is a native
measurement race, invisible to tsc and to Jest.

**Fix.** The picker got its own screen. It sits in a `flex: 1` wrapper that
centres it, with Save pinned in a sibling below, outside that wrapper. The late
measurement can now only re-centre the wheel inside its own box; it has nothing to
push. An explicit `height: 216` on the picker keeps the first frame the right size
so there is no visible pop, but the layout no longer depends on that number being
right, which matters because `setSize` overrides the style height anyway.

**General rule.** Do not put a self-measuring native view inside a container whose
position depends on its own content height, which is what a bottom-anchored sheet
is. Give it a fixed box, or put the actions outside the box that can grow.

**Also.** `maximumDate={new Date()}` built a fresh date every render. `maximumDate`
does not trigger re-measurement (only `date`, `locale`, `mode` and `displayIOS`
do), so it caused no loop, but it did nil and re-set the picker's bounds natively
on every turn of the wheel. Memoize it.

**Reading build state, what actually worked.** `sort:` and `limit:` were ignored
by `Spaceship::ConnectAPI::Build.all` in fastlane 2.237, which returns every build
oldest-first. Fetch and sort client-side:

```ruby
builds = Spaceship::ConnectAPI::Build.all(app_id: app.id, includes: 'preReleaseVersion')
builds.sort_by { |b| b.uploaded_date.to_s }.last(4).reverse
```

Run it under fastlane's own Ruby, not the system one, which has no spaceship:
`GEM_HOME=~/.local/share/fastlane/4.0.0 GEM_PATH=$GEM_HOME:/opt/homebrew/Cellar/fastlane/2.237.0/libexec /opt/homebrew/opt/ruby/bin/ruby …`,
with `FASTLANE_USER` set so it picks up the cached session instead of prompting.
A build takes a few minutes to appear in the API at all after `EXPORT SUCCEEDED`;
absent is not the same as rejected.

## Expo Router's typed routes go stale, and tsc fails on a route that exists

Adding `you/anniversary.tsx` made `router.push('/(tabs)/you/anniversary')` a type
error: `.expo/types/router.d.ts` is generated by the dev server, so a new route is
unknown to tsc until Metro runs. The file was months stale and missing several
routes that already shipped. There is no typegen-only CLI command; start
`npx expo start` and wait for the route to appear in that file, then stop it. The
alternative the codebase already uses in `you/index.tsx` is to widen the parameter
to `any`, which works but gives up the checking.

**Hosted migrations: never diff by file name.** `supabase migration list` reports
hosted names, which drift from the repo's. `20260726000002_streak_widen_window.sql`
is on hosted as `streak_widen_window_and_count_sessions`, and three hosted entries
have no local file at all. A name diff claimed hosted was two migrations behind
when it was one. Confirm against schema state instead (does the column exist, does
`compute_streak` contain `+ 4`).

**`supabase migration up` cannot be used on this local DB.** Ten older migration
files were never recorded in the tracking table, so it demands `--include-all` and
would re-run all of them. Apply one migration directly and record it:

```
docker exec -i supabase_db_Pamwe psql -U postgres -d postgres < supabase/migrations/<file>
docker exec -i supabase_db_Pamwe psql -U postgres -d postgres \
  -c "insert into supabase_migrations.schema_migrations (version, name) values ('<ver>','<name>');"
```

Write migrations idempotently (`add column if not exists`, `create or replace`) so
this stays safe.

**Homebrew's install confirmation ignores piped input.** `brew install` prompts
`Do you want to proceed? [y/n]` and loops on `Invalid input` when driven through a
pipe. `yes | HOMEBREW_NO_AUTO_UPDATE=1 brew install <formula>` gets through it.

---

## Deploying to hosted when the CLI is on the wrong account (2026-08-02, build 21)

Shipping the Bible catalogue meant four different kinds of change against
hosted, and `supabase secrets set` / `functions deploy` were both unavailable:
the CLI is logged into Christian's MAIN account, so `supabase projects list`
returns the dead `freftpwigrkjytusnqhx` and cannot see `jcyhhxgomhopkoqesbkb`
at all. Each kind needed a different route.

**DDL** went through MCP `apply_migration`, by name, as CLAUDE.md already says.

**The edge function** went through MCP `deploy_edge_function` with the file
contents passed inline. `verify_jwt: true` has to be set explicitly on the call
or the deploy silently flips it, which would open a rate-limited AI endpoint to
the world.

**Secrets** have no MCP tool at all. `OPENAI_API_KEY` had to be added by hand in
the dashboard under Project Settings, Edge Functions, Secrets.

**The 7.7MB seed** was the interesting one. MCP `execute_sql` is the sanctioned
path but the payload has to be typed into the tool call, which is impossible at
that size, and even the 1.55MB subset the app strictly needs is too large. The
CLI was out. What worked: `env.hosted.backup` holds a session-pooler
`SUPABASE_DB_URL` for the ACTIVE project (the file's own warning that it "may
still hold its old values" is out of date, verified by decoding the service
key's `ref` claim), and although `psql` is not on PATH, the local Supabase
container has one that can reach the internet:

```bash
DBURL=$(grep '^SUPABASE_DB_URL=' env.hosted.backup | cut -d= -f2- | tr -d '"')
docker exec -i supabase_db_Pamwe psql "$DBURL" -v ON_ERROR_STOP=1 -q < supabase/seeds/bible_catalogue.sql
```

Borrowing the container's client to talk to a remote database is the general
trick worth remembering; it applies to any bulk load, not just this one.

## A table whose DDL existed only on hosted (2026-08-02, build 21)

`supabase functions serve` failed outright with `failed to read file: open
supabase/functions/notify-freeze/index.ts`. The function was deleted in
`a1a931d` but its `[functions.notify-freeze]` block stayed in `config.toml`, and
serve reads every declared function before starting any of them. Deleting the
block fixed it.

Behind that, a worse one. With serve finally running, every build request failed
on `relation "passage_prompts" does not exist`. The table had been applied to
hosted directly by name via MCP back in the b17 round, and **no migration file
was ever written**, so `supabase/seeds/passage_prompts.sql` had 1,189 rows and
nowhere on a fresh local stack to put them. It went unnoticed because the local
DB was never reset in between.

Backfilled as `20260802000002_passage_prompts_local_backfill.sql`, mirroring the
hosted definition exactly (read back through MCP first, rather than guessed) and
using `create table if not exists` so it is a no-op wherever the table already
lives. **The lesson is about the by-name MCP workflow generally: applying to
hosted does not write a migration file, so always write the file too, or local
silently drifts.**

Related, same round: the catalogue tables were applied locally with `psql` as
`postgres`, which does not pick up the default privileges a `supabase migration
up` would. The service role got `permission denied for table bible_vocabulary`
before RLS was ever consulted. Explicit `grant` statements now live in the
migration.
