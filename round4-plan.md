# Round 4 — Feature buildout (overnight run, started 2026-07-10 night)

Christian's directive: build all 10 suggested features, the green-list items, and the
Ask Pamwe rework. Improve daily, get Ammy's feedback. Wide-launch track comes later.

**Ask Pamwe product line (Christian, 2026-07-10): "Pamwe points, never preaches."**
It must be quiet, benign, easily accessible everywhere, and it must NOT interpret
Scripture (no AI exegesis, no doctrinal authority). It helps with: using the app,
finding what to read, plan recommendations, and pointing to passages (references
only). Interpretation questions get a gentle deflection toward reading together and
their church community. No chat tab, no message bubbles, no "AI" labels, no memory.

## Execution rules for the overnight run

- One feature at a time, in the order below. After each: `npx tsc --noEmit` +
  `npx jest` green, then commit to main (Christian's standing pattern).
- Schema changes are checked-in migrations applied to the LOCAL stack only and
  RLS-tested with the dev users. Hosted applies wait for Christian (morning list).
- Edge-function changes are committed; hosted deploys wait for Christian.
- No em dashes in any user-facing copy. All new UI themes via useTheme(). Screens go
  through src/lib. Surgical diffs.
- Native-module work (transcription, widget) goes LAST and timeboxed; if not green,
  revert/branch and leave notes rather than block the run.

## Build order

### Phase 1 — Guardrails before reach (Ask Pamwe server)
1. **ask-pamwe v7 (code only, deploy in morning):** add `mode: 'plans' | 'help'`.
   Help mode returns `{answer, references[], off_topic}` (short, pointing only).
   Both modes: hardened system prompt (user text is a request, never instructions;
   never reveal rules; no persona change; NO Scripture interpretation, deflect
   gently; harmful-dressed-as-Bible questions refused), `off_topic` gate baked into
   the schema, existing 300-char cap kept.
2. **Rate limit:** `ask_pamwe_usage` table migration (user_id, day, count) + atomic
   RPC; function checks ~20/day, 5/min before calling Anthropic. Gentle cap copy.

### Phase 2 — The flagship core-loop features
3. **Respond to your partner's reflection** (`entry_responses` migration: heart /
   amen / reply / quote-of-their-line, RLS mirrors locked-reveal, author sees
   responses on their entry). UI on reveal + reflect detail. Includes the
   "what stuck with me" quote kind (features #1 + #2 in one schema).
4. **Faithfulness timeline** (answered-prayers chronological view; existing data).
5. **Per-prayer reminders** (local notifications, prayer sheet toggle + time;
   AsyncStorage, no schema).
6. **Catch-up flow + grace-day visibility** (Today banner when behind vs
   start_date, surface existing freeze allowance; investigate streak fields first;
   UI only, server still owns advancement).
7. **Nudge partner** (green list): Today button when partner hasn't submitted;
   new `notify-nudge` edge function (verify_jwt=true, pushes to partner, 1/hour
   cooldown tracked server-side). Code committed, deploy in morning.

### Phase 3 — Ask Pamwe made quietly present
8. **AskPamweSheet** (bottom sheet, app-voiced, renders structured answers as
   cards). Entry points: (a) inline card on Plans ("Not sure what to read next?"),
   (b) a small floral floating button, bottom-right, on Plans/Bible/Prayers/
   Reflect/You, never on Today or inside the reading/journal/reveal ritual.
   Positioned as one constant so Christian can re-tune placement in the morning.
   Builder keeps its existing ask step. Discoverability green-list item = done.

### Phase 4 — Breadth
9. **Search the shared layer** (highlights + notes + revealed reflections).
10. **Offline-first Today + reader** (AsyncStorage cache for today's plan day and
    recently read chapters).
11. **More translations** (green list): add ASV/YLT/Darby to lib/bible; reader
    picker becomes a small sheet (6 options outgrow the segmented pill).
12. **Plan artwork pass** (green list): per-plan striped-banner palettes (client
    map, tasteful variation). Flag for Christian's taste review.
13. **Tree-growth streak** (green list): simple elegant SVG growth stages
    (seed/sprout/stem/bloom) tied to streak thresholds, offered alongside the
    7-dot strip on Today. Taste review in the morning.
14. **Whole-app copywriting pass** (green list): warmth + consistency sweep of all
    user-facing strings ("sounds like AI" complaint), zero em dashes, scripture
    untouched. Done late so it sweeps the new features too.

### Phase 5 — Native, timeboxed, last
15. **Voice transcription** (`entries.transcript` migration; on-device speech
    recognition; transcripts feed Reflect snippets + search). Needs pod install;
    device validation in the morning.
16. **Home-screen widget** (WidgetKit target; day's pull quote + two status dots).
    Highest build risk; attempted only if everything above is green. If it breaks
    the xcodeproj, revert and leave notes.

## Morning checklist (needs Christian)

1. Apply new migrations to hosted (jcyhhxgomhopkoqesbkb) via MCP: say
   "apply the round 4 migrations to hosted".
2. Deploy ask-pamwe v7 + notify-nudge: say "deploy the edge functions to hosted".
3. "Resolve the three Sentry issues" (b7 crashes, still open).
4. b9: bump + archive + "upload build 9 to TestFlight".
5. Taste review: floating flower placement, plan palettes, tree streak visual,
   copywriting diffs.
6. On-device: transcription mic flow, nudge push banner, widget (if built).
7. Optionally "push" (main is ~18 commits ahead of GitHub).

## Progress log

Overnight run 2026-07-11 (all committed to main, tsc clean + full Jest green after each):
- ✅ Ask Pamwe rework (7c7c481): v7 server (help mode, off_topic gate, hardened
  no-interpretation prompt, rate limit via ask_pamwe_usage RPC), AskPamweSheet,
  floral FAB on non-ritual tabs, Plans inline card. 5 new tests.
- ✅ Reflection responses (45ba4d6): entry_responses table + RLS (4 behaviors
  tested), hearts/amens/replies/saved-lines on reveal + reflect detail.
- ✅ Faithfulness timeline (085b001): prayers/timeline route over answered prayers.
- ✅ Per-prayer reminders (81ee2fd): on-device daily local notifications.
- ✅ Catch-up nudge (34e11be): Today banner when behind pace. lib/catchup.ts + 7 tests.
  NOTE: grace-day (freeze) VISIBILITY was deliberately deferred — the exact server
  freeze allowance constant isn't mirrored client-side, and I chose not to show a
  possibly-wrong "N grace days left". The always-correct catch-up banner shipped.
- ✅ Partner nudge (49191ad): notify-nudge edge fn + partner_nudges cooldown table
  + Today "nudge gently" action.

Migrations added locally (need hosted apply): ask_pamwe_usage, entry_responses,
partner_nudges. Edge functions changed (need deploy): ask-pamwe v7, notify-nudge.

Remaining: #9 search, #10 offline caches, #11 translations, #12 palettes,
#13 tree streak, #14 copy pass, #15 transcription (native), #16 widget (native).
