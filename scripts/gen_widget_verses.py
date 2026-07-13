#!/usr/bin/env python3
"""
Generate ios/VerseWidget/verses.json for the "Verse of the Day" home-screen widget.

The widget is a self-contained daily-verse calendar: it bundles a CURATED set of
uplifting, standalone verses and picks one by calendar day-of-year (cycling if the
set is shorter than the year). This replaced the earlier M'Cheyne-pull-quote set,
which surfaced narrative fragments ("The lot came out for the children of Joseph...")
that mean little without their reading context.

Curation = the REFERENCES list below (edit freely; every entry should read well on
its own and encourage). Accuracy = the exact WEB text is fetched from bible-api.com
(the same public-domain translation the app uses in src/lib/bible.ts), so nothing
is hand-typed or paraphrased. `short` is a Small-widget convenience.

  python3 scripts/gen_widget_verses.py

Fetches are cached to the scratchpad so re-runs only hit new/failed references.
"""
import json
import re
import sys
import time
import urllib.request
import urllib.parse
from pathlib import Path

OUT = Path(__file__).resolve().parent.parent / "ios" / "VerseWidget" / "verses.json"
CACHE = Path("/private/tmp/claude-501/-Users-christianmangwanda-Desktop-Pamwe/"
             "757e427a-c0cd-4235-a8fd-410cabb826ae/scratchpad/verse_cache.json")
SHORT_MAX = 85     # character budget for the Small-widget line
FULL_MAX = 220     # drop anything longer than this (keeps the widget readable)
SHUFFLE_SEED = 7   # deterministic reorder so consecutive days vary in book/theme

# ---------------------------------------------------------------------------
# CURATED REFERENCES — grouped for readability; the day order is shuffled below.
# Each should be a standalone, uplifting verse (WEB). Edit to taste.
# ---------------------------------------------------------------------------
REFERENCES = [
    # --- God's faithfulness, promises, presence ---
    "Jeremiah 29:11", "Lamentations 3:22", "Lamentations 3:23", "Lamentations 3:25",
    "Deuteronomy 31:6", "Deuteronomy 31:8", "Deuteronomy 7:9", "Joshua 1:9",
    "Isaiah 41:10", "Isaiah 41:13", "Isaiah 43:2", "Isaiah 40:31", "Isaiah 40:29",
    "Isaiah 26:3", "Isaiah 54:10", "Isaiah 58:11", "Zephaniah 3:17", "Nahum 1:7",
    "Malachi 3:6", "Hebrews 13:5", "Hebrews 13:8", "Hebrews 10:23", "1 Thessalonians 5:24",
    "2 Thessalonians 3:3", "Philippians 1:6", "Psalm 46:1", "Psalm 46:10", "Psalm 91:1",
    "Psalm 91:2", "Psalm 91:4", "Psalm 9:9", "Psalm 62:1", "Psalm 62:5", "Psalm 73:26",
    "Psalm 121:2", "Psalm 121:7", "Psalm 121:8", "Psalm 145:18", "Psalm 34:18",
    "Isaiah 43:19", "Jeremiah 31:3", "Genesis 28:15",

    # --- strength & courage ---
    "Philippians 4:13", "Isaiah 12:2", "Exodus 14:14", "Exodus 15:2", "2 Timothy 1:7",
    "Ephesians 6:10", "Joshua 24:15", "Psalm 27:1", "Psalm 28:7", "Psalm 18:2",
    "Psalm 31:24", "Psalm 138:3", "Psalm 118:14", "Psalm 118:6", "1 Corinthians 16:13",
    "2 Corinthians 12:9", "2 Corinthians 12:10", "Deuteronomy 33:27", "Habakkuk 3:19",
    "Nehemiah 8:10", "1 Chronicles 16:11", "Psalm 29:11",

    # --- trust & guidance ---
    "Proverbs 3:5", "Proverbs 3:6", "Proverbs 16:3", "Proverbs 16:9", "Proverbs 19:21",
    "Psalm 32:8", "Psalm 37:5", "Psalm 37:4", "Psalm 37:7", "Psalm 37:23", "Psalm 25:4",
    "Psalm 25:5", "Psalm 143:8", "Psalm 143:10", "Psalm 16:8", "Psalm 16:11",
    "Psalm 40:1", "Psalm 55:22", "Psalm 56:3", "Psalm 130:5", "Isaiah 30:21",
    "Jeremiah 17:7", "Jeremiah 33:3", "Matthew 6:33", "Matthew 6:34", "Proverbs 2:6",
    "Proverbs 4:18",

    # --- peace & rest ---
    "Matthew 11:28", "Matthew 11:29", "John 14:27", "John 14:1", "Philippians 4:6",
    "Philippians 4:7", "Isaiah 32:17", "Psalm 4:8", "Psalm 23:1", "Psalm 23:4",
    "Psalm 3:3", "Colossians 3:15", "Romans 5:1", "Psalm 94:19", "Psalm 61:2",
    "Psalm 116:7", "2 Thessalonians 3:16",

    # --- hope & joy ---
    "Romans 15:13", "Romans 12:12", "Psalm 30:5", "Psalm 30:11", "Psalm 16:9",
    "Psalm 126:5", "Psalm 118:24", "Psalm 33:22", "Psalm 71:14", "Psalm 42:11",
    "Psalm 146:5", "Hebrews 6:19", "1 Peter 1:3", "Habakkuk 3:18", "Psalm 5:11",
    "Psalm 28:7", "Nehemiah 8:10", "Isaiah 35:10", "Isaiah 51:11", "Romans 8:18",

    # --- God's love & grace ---
    "John 3:16", "Romans 5:8", "Romans 8:38", "Ephesians 2:8",
    "Ephesians 2:4", "1 John 3:1", "1 John 4:16", "1 John 4:18", "1 John 4:19",
    "Psalm 103:8", "Psalm 103:11", "Psalm 103:12", "Psalm 136:1", "Psalm 86:15",
    "Psalm 145:8", "Psalm 145:9", "Titus 3:5", "Ephesians 3:18", "Romans 5:5",
    "Psalm 63:3", "Psalm 36:5", "Psalm 36:7",

    # --- love one another / togetherness (couples) ---
    "1 Corinthians 13:4", "1 Corinthians 13:7", "1 Corinthians 13:13", "1 Corinthians 16:14",
    "Colossians 3:14", "Ecclesiastes 4:9", "Ecclesiastes 4:10", "Ecclesiastes 4:12",
    "1 John 4:7", "1 John 4:12", "John 13:34", "John 15:12", "Romans 12:10",
    "1 Peter 4:8", "Ephesians 4:2", "Ephesians 4:32", "Colossians 3:13", "Colossians 3:12",
    "Song of Solomon 8:7", "Ruth 1:16", "Proverbs 17:17", "1 Thessalonians 5:11",
    "Galatians 6:2", "Hebrews 10:24", "Philippians 2:3", "Philippians 2:4",
    "Romans 15:7", "Psalm 133:1", "Matthew 18:20",

    # --- prayer, faith, God hears ---
    "Matthew 7:7", "Mark 11:24", "Philippians 4:19", "Hebrews 4:16", "Hebrews 11:1",
    "1 John 5:14", "James 1:5", "James 1:6", "Jeremiah 29:12", "Jeremiah 29:13",
    "Psalm 5:3", "Psalm 145:16", "Mark 9:23", "Mark 10:27", "Luke 1:37", "Matthew 19:26",
    "Ephesians 3:20", "1 Peter 5:7",

    # --- praise & gratitude ---
    "Psalm 100:4", "Psalm 100:5", "Psalm 118:1", "Psalm 107:1", "Psalm 34:1",
    "Psalm 34:8", "Psalm 103:1", "Psalm 103:2", "Psalm 95:1", "Psalm 92:1",
    "Psalm 96:1", "Psalm 98:1", "Psalm 150:6", "Psalm 145:3",
    "1 Thessalonians 5:16", "1 Thessalonians 5:18", "Psalm 116:1", "Psalm 116:2",
    "Psalm 89:1", "Psalm 147:1", "Psalm 9:1", "1 Chronicles 16:34", "Colossians 3:16",

    # --- living well / character / fruit ---
    "Galatians 5:22", "Galatians 5:23", "Galatians 6:9", "Micah 6:8", "Colossians 3:23",
    "Colossians 3:2", "Romans 12:2", "Romans 12:9", "Romans 12:21", "Philippians 4:8",
    "Philippians 4:4", "Ephesians 5:2", "2 Corinthians 5:7", "2 Corinthians 9:7",
    "Proverbs 4:23", "Proverbs 3:3", "Proverbs 11:25", "Proverbs 15:1", "Proverbs 16:24",
    "Proverbs 27:17", "Proverbs 31:25", "James 1:19", "James 1:22", "1 Peter 3:8",
    "1 Corinthians 15:58", "Hebrews 12:1", "Hebrews 12:2", "Matthew 5:9", "Matthew 5:14",
    "Matthew 5:16", "Luke 6:31", "Luke 6:38", "Micah 7:7",

    # --- new life, renewal, hope in Christ ---
    "2 Corinthians 5:17", "2 Corinthians 4:16", "2 Corinthians 4:18", "Romans 8:1",
    "Romans 8:28", "Romans 8:31", "Romans 8:37", "Isaiah 64:8", "Isaiah 40:8",
    "John 8:12", "John 8:32", "John 10:10", "John 11:25", "John 15:5", "John 16:33",
    "John 1:5", "Revelation 21:4", "Revelation 21:5", "Revelation 3:20",
    "Lamentations 3:24", "Ezekiel 36:26", "Psalm 51:10", "Philippians 3:13",
    "Philippians 3:14", "Jude 1:24",

    # --- comfort in hard times ---
    "Psalm 34:17", "Psalm 34:4", "Psalm 147:3", "2 Corinthians 1:3", "2 Corinthians 1:4",
    "Matthew 5:4", "Psalm 42:1", "Psalm 63:1", "Isaiah 49:15", "Isaiah 46:4",
    "Isaiah 42:16", "Psalm 139:7", "Psalm 139:14", "Psalm 139:23", "Psalm 139:24",
    "1 Peter 5:6", "1 Peter 5:10", "James 4:8", "Psalm 27:13", "Psalm 27:14",
    "Psalm 31:24", "Job 19:25", "Job 23:10", "Deuteronomy 31:8", "Psalm 68:6",

    # --- word, wisdom, light ---
    "Psalm 119:105", "Psalm 119:11", "Hebrews 4:12", "Isaiah 55:11",
    "Joshua 1:8", "Psalm 1:2", "Psalm 19:14", "Colossians 2:6", "2 Timothy 3:16",
    "James 1:17", "Proverbs 18:10", "Psalm 46:1",

    # --- generosity, service, purpose ---
    "Acts 20:35", "2 Corinthians 9:8", "Ephesians 2:10", "Galatians 2:20",
    "Matthew 5:6", "Colossians 1:11", "1 Corinthians 10:13", "Numbers 6:24-26",
    "Psalm 90:12", "Psalm 90:17", "Psalm 84:11", "Psalm 20:4", "Psalm 37:3",
    "Psalm 33:20", "Psalm 33:4", "Psalm 40:8", "Psalm 138:8", "Psalm 57:10",
    "Psalm 52:8", "Psalm 145:13", "Romans 14:19", "Hebrews 3:13",
]


def fetch(ref, cache):
    if ref in cache:
        return cache[ref]
    slug = urllib.parse.quote(ref.lower())
    url = f"https://bible-api.com/{slug}?translation=web"
    for attempt in range(6):
        try:
            with urllib.request.urlopen(url, timeout=20) as r:
                data = json.load(r)
            full = re.sub(r"\s+", " ", data.get("text", "")).strip()
            display = data.get("reference", ref).strip()
            if full:
                cache[ref] = {"full": full, "ref": display}
                CACHE.write_text(json.dumps(cache, ensure_ascii=False))
                time.sleep(2.2)  # bible-api.com allows ~15 req / 30s; stay under it
                return cache[ref]
        except Exception as e:
            wait = 8 * (attempt + 1)  # 429 window is ~30s; back off past it
            print(f"  retry {ref} ({e}); sleeping {wait}s", file=sys.stderr)
            time.sleep(wait)
    return None


# WEB capitalizes the first word of every poetic line. Once lines are joined, a
# capital mid-sentence (after a comma/semicolon) reads like a typo on a card, so we
# lowercase only unambiguous function words. Proper nouns, divine names, and "I" are
# NOT in this set, so they are never touched.
_LOWERABLE = {
    "For", "And", "But", "So", "Yet", "Nor", "Or", "He", "His", "Him", "She", "Her",
    "They", "Their", "Them", "You", "Your", "Yours", "We", "Our", "Us", "My", "Me",
    "It", "Its", "Then", "When", "While", "Though", "Although", "As", "To", "Of", "In",
    "On", "At", "With", "By", "From", "Let", "That", "Which", "Who", "Whose", "Where",
    "There", "Here", "Both", "All", "Each", "Every", "Even", "Because", "Since",
    "Before", "After", "Like", "Unto", "Upon", "Yes", "If", "Whom",
}


def normalize_full(full):
    """Verse-card display tidy-ups (WEB text, no wording changes): de-capitalize
    joined poetic-line starts (function words only), turn a dangling trailing
    comma/semicolon/colon into a period, and capitalize the very first letter."""
    full = full.strip()
    full = re.sub(r"([,;] )([A-Z][a-z]+)",
                  lambda m: m.group(1) + (m.group(2).lower() if m.group(2) in _LOWERABLE else m.group(2)),
                  full)
    full = re.sub(r"[,;:]+$", ".", full)
    m = re.search(r"[A-Za-z]", full)
    if m:
        i = m.start()
        full = full[:i] + full[i].upper() + full[i + 1:]
    return full


def normalize_ref(ref):
    # A single psalm is cited "Psalm 23:1", not "Psalms 23:1".
    return re.sub(r"^Psalms ", "Psalm ", ref.strip())


def make_short(full):
    full = full.strip()
    if len(full) <= SHORT_MAX:
        return full
    first = re.split(r"(?<=[.!?]) ", full)[0].strip()
    if len(first) <= SHORT_MAX:
        return first
    parts = first.split(", ")
    acc = parts[0]
    for p in parts[1:]:
        if len(acc) + 2 + len(p) <= SHORT_MAX - 1:
            acc += ", " + p
        else:
            break
    acc = acc.strip().rstrip(",;: ")
    if acc and acc[-1] not in ".!?’”)":
        acc += "…"
    return acc


def main():
    import random
    cache = json.loads(CACHE.read_text()) if CACHE.exists() else {}
    CACHE.parent.mkdir(parents=True, exist_ok=True)

    # dedupe references, preserve order
    seen, refs = set(), []
    for r in REFERENCES:
        if r not in seen:
            seen.add(r)
            refs.append(r)

    entries, failed = [], []
    for i, ref in enumerate(refs):
        rec = fetch(ref, cache)
        if not rec:
            failed.append(ref)
            continue
        if len(rec["full"]) > FULL_MAX:
            print(f"  skip (too long, {len(rec['full'])}): {ref}", file=sys.stderr)
            continue
        entries.append({"full": normalize_full(rec["full"]), "ref": normalize_ref(rec["ref"])})

    # dedupe by exact text (a couple of refs can resolve to the same verse)
    seen_text, deduped = set(), []
    for e in entries:
        if e["full"] not in seen_text:
            seen_text.add(e["full"])
            deduped.append(e)

    random.seed(SHUFFLE_SEED)
    random.shuffle(deduped)

    out = [{"d": i + 1, "full": e["full"], "short": make_short(e["full"]), "ref": e["ref"]}
           for i, e in enumerate(deduped)]
    OUT.write_text(json.dumps(out, ensure_ascii=False, indent=0) + "\n", encoding="utf-8")

    print(f"wrote {len(out)} verses to {OUT}")
    if failed:
        print(f"FAILED ({len(failed)}): {', '.join(failed)}", file=sys.stderr)


if __name__ == "__main__":
    main()
