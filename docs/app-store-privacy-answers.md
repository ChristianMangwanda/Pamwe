# App Store privacy questionnaire: Pamwe's answers

These are the answers to give in App Store Connect, under **App Privacy**. They come from the codebase audit of 2 August 2026 and match [privacy-policy.md](privacy-policy.md) exactly. If you change one, change the other.

Apple checks the label against the policy. A mismatch is a rejection.

---

## The two questions at the top

**"Do you or your third-party partners collect data from this app?"**
**Yes.**

**"Is any of this data used to track you?"**
**No.** Nothing in Pamwe tracks users. There is no advertising SDK, no attribution SDK, no advertising identifier, and no data goes to a data broker. Nothing is combined with data from other companies' apps or websites.

Because tracking is No across every data type, Pamwe does not need an App Tracking Transparency prompt.

---

## Data types to declare as collected

Eight types. Everything else is Not Collected.

| Apple data type | Collected | Linked to identity | Used for tracking | Purpose |
|---|---|---|---|---|
| Contact Info: **Email Address** | Yes | **Yes** | No | App Functionality |
| Contact Info: **Name** | Yes | **Yes** | No | App Functionality |
| Sensitive Info: **Sensitive Info** | Yes | **Yes** | No | App Functionality |
| User Content: **Audio Data** | Yes | **Yes** | No | App Functionality |
| User Content: **Other User Content** | Yes | **Yes** | No | App Functionality |
| Identifiers: **User ID** | Yes | **Yes** | No | App Functionality |
| Identifiers: **Device ID** | Yes | **Yes** | No | App Functionality |
| Diagnostics: **Crash Data** | Yes | **No** | No | App Functionality |

App Functionality is the only purpose to tick anywhere. Do not tick Analytics, Product Personalization, Developer's Advertising or Marketing, or Third-Party Advertising for any type.

### Why each one

**Email Address.** Every account has one, in `public.users.email` and in Supabase Auth. It arrives by magic link, Sign in with Apple, or Sign in with Google. Linked to identity, because it is the identity.

**Name.** The display name your partner sees, plus the name Apple or Google passes at sign-in. Stored in `public.users.display_name`. It also appears in some push notification titles.

**Sensitive Info.** This is the one people miss, and it is unambiguous here. Apple's definition of Sensitive Info includes religious or philosophical beliefs. Pamwe's entire content layer is devotional: reflections on Scripture, prayers, dreams, and notes on verses. This is the same content the privacy policy covers in its "Religious and devotional content" section as a special category under UK and EU law. Declare it.

**Audio Data.** Voice reflections. The recording is uploaded to a private Supabase Storage bucket. Note that transcription itself happens on the device, so the audio is not sent anywhere to be transcribed, but the recording is stored, so this is collected.

**Other User Content.** Everything else the couple writes: written reflections, transcripts of voice reflections, replies and kept lines, prayers and answer notes, dreams, verse highlights, verse notes, and reading plans they build. Also the sentence typed when asking for a plan to be generated, which is sent to OpenAI to service that request.

**User ID.** Each account has a UUID used throughout the database, and rows are keyed to it.

**Device ID.** The Expo push notification token, stored in `users.expo_push_token`. See the judgment call below.

**Crash Data.** Sentry, enabled in release builds through `EXPO_PUBLIC_SENTRY_DSN`. Marked **not linked to identity**, and that is verified rather than assumed: `Sentry.init` is called with `sendDefaultPii: false`, and the codebase never calls `Sentry.setUser`, `setContext` or `setTag`, so no account identifier is ever attached to a crash report.

---

## Data types to mark as Not Collected

| Category | Answer and why |
|---|---|
| Contact Info: Phone Number, Physical Address, Other User Contact Info | Never asked for. |
| Health and Fitness | No health data is collected. A prayer might mention someone's illness, but that is free text the user chose to write, not a health data collection, and it is covered by Other User Content and Sensitive Info. |
| Financial Info | The app is free with no purchases of any kind. No payment details exist. |
| Location | No location permission is requested and no location API is used. |
| Contacts | No contacts permission and no contacts API. |
| User Content: Photos or Videos | No photo access. The App Store listing carries `NSPhotoLibraryUsageDescription` only because a transitive dependency references the API. The app never asks for or reads photos. |
| User Content: Emails or Text Messages, Gameplay Content, Customer Support | None of these exist in the app. |
| Browsing History | No web browsing happens in the app. |
| Search History | See the judgment call below. |
| Purchases | No purchases, no purchase history. |
| Usage Data: Product Interaction, Advertising Data, Other Usage Data | There is no analytics SDK in the app. `package.json` has no Firebase Analytics, Amplitude, PostHog, Segment, or any ad network. |
| Diagnostics: Performance Data | Sentry's performance monitoring is off. `Sentry.init` sets no `tracesSampleRate`, so it defaults to disabled. |
| Diagnostics: Other Diagnostic Data | Nothing beyond crash reports. |
| Surroundings, Body | No such APIs are used. |
| Other Data Types | Nothing left over. |

---

## Two judgment calls, flagged rather than buried

**1. Device ID: I recommend declaring Yes.**

Apple's examples for Device ID are the IDFA and IDFV, and Pamwe uses neither. But Apple's definition is broad: any identifier that relates to a device. The Expo push token is a device-level identifier, we store it against the user's row, and it is what lets a message reach one specific phone.

Some developers do not declare push tokens here. Declaring it costs nothing, since the answer to tracking is still No, and it is the honest reading. Under-declaring is what gets apps rejected. If you disagree, the alternative is defensible, but change the policy to match.

**2. Search History: I recommend No.**

The search field in Plans filters plans that are already on the device. `searchPlans` and `filterPlans` are pure local functions over a loaded array, so typing in that box transmits nothing.

Text only leaves the device when you deliberately ask for a plan to be generated, and that is a request you made, not a record of your searching. It is declared under Other User Content instead, which is where the policy puts it too. We store no search history at all.

---

## Also required in App Store Connect

**Privacy Policy URL.** Paste the GitHub Pages URL once Pages is on. This field is mandatory and Apple does open it.

**Account deletion, guideline 5.1.1(v).** Apple requires an in-app path to delete an account, not just an email address to write to. Pamwe has one, at **You, then Settings, then Delete account**, which calls the `delete-account` edge function.

This path was broken until today. Three foreign keys meant that anyone who had built a plan or highlighted a single verse got a server error instead of a deletion. It is fixed on the hosted project and verified. If a reviewer tests deletion, it now works. Do not submit a build made before that fix without testing deletion yourself first.

**Sign in with Apple.** The app offers Sign in with Google, so Apple's equivalent is required, and it is implemented and live. Verified against the hosted project: email, Apple and Google identities all exist in `auth.identities`.

---

## Cross-check against the policy

Every row above appears in [privacy-policy.md](privacy-policy.md):

- Email and name are in "Your account".
- Sensitive Info is the whole "Religious and devotional content" section.
- Audio Data and Other User Content are in "What the two of you write".
- User ID and Device ID are in "Your device", and the push token is described again in "Notifications can show what your partner wrote".
- Crash Data is the Sentry row in "Who else handles your data", where the policy states it receives no reflections, prayers, dreams or notes.
- The Not Collected list matches the policy's "What Pamwe does not collect" and "What Pamwe does not do".

If you edit either document, re-read this list.
