#!/usr/bin/env python3
"""
The spec for the Bible catalogue: vocabulary, enums, output schema, prompt.

WHY THIS IS ITS OWN FILE
    The vocabulary is the one irreversible decision in the whole pipeline.
    Everything else can be re-run for pennies; changing a theme name means
    re-tagging 31,102 verses. So it lives apart from the runner, where it can be
    read, argued with, and diffed without wading through HTTP and caching code.

    SPEC_VERSION is part of every cache key. Bump it and the next run regenerates
    from scratch instead of serving stale tags that were made under older rules.

THE GOVERNING RULE
    A tag names SUBJECT MATTER, never application.

        grief                     yes, the passage is about grief
        suffering-is-discipline   no, that is a reading of what it means

    This is "Pamwe points, never preaches" (CLAUDE.md) applied to the catalogue.
    It matters more here than anywhere else in the app, because nobody is ever
    going to audit 31,102 rows by hand. If an interpretation gets in at tag time
    it silently shapes every plan built from the catalogue, forever, and no
    reviewer downstream will see it happen. The constraint lives in the prompt or
    it does not exist.
"""

# Bump when the vocabulary, the enums, the schema, or the prompt change.
#   2026-08-01    first draft
#   2026-08-01b   first sample run showed three faults: no verse was EVER left
#                 untagged (a 54-verse genealogy came back fully tagged), every
#                 long chapter split into exactly 8 passages because 8 was named
#                 as the maximum, and Leviticus 13 raised no caution because the
#                 enum had nothing for illness. Fixed in that order.
#   2026-08-01c   the b fix over-corrected: Luke 15 collapsed its two distinct
#                 parables into one passage because the guidance named a verse
#                 range and the model anchored on it. Both numeric hints removed.
#                 The rule is now a test of coherence, not a size.
#   2026-08-01d   the harness. Neither OpenAI model could find the Lamentations
#                 3:19 boundary that Sonnet found, so stop asking them to infer
#                 it: BSB ships section headings where WEB ships none, and its
#                 positions (never its titles, which are readings) go into the
#                 prompt. WEB's own line breaks give the acrostic stanza grid,
#                 which validate() now enforces where the grid is real.
#   2026-08-01e   d made the model obey the sections and stop thinking. It gave
#                 back Lamentations 3 as 19-36, the BSB section verbatim, and
#                 merged Luke 15's crowd into the lost sheep. Cautions slipped
#                 from 6/6 to 4/6 as the structure block pulled attention off
#                 them. Sections are now stated as a floor and explicitly NOT a
#                 ceiling, and structure is scoped to boundaries alone.
#   2026-08-01f   stop asking the model for boundaries at all. Three rounds of
#                 prose tuning (c coarse, d slavish, e confetti) showed the real
#                 pattern: every constraint enforced in code held at 100%, every
#                 constraint requested in prose oscillated. Passages are now
#                 fixed in code from BSB's printed sections before the call, and
#                 the model only describes the units it is given. Fine grain
#                 inside a section is retrieval's job, not generation's:
#                 contiguous same-theme VERSES collapse into ranges, which is
#                 what the verse tags are for. Model of choice is gpt-5.6-luna.
SPEC_VERSION = "2026-08-01f"

# ---------------------------------------------------------------------------
# Themes: what a passage is ABOUT. Closed set. A tag outside it fails the row.
#
# The gloss is not decoration. It ships in the prompt, because a bare word list
# gets read differently on Leviticus than on Luke, and consistency across 1,189
# chapters is the entire point of a catalogue.
# ---------------------------------------------------------------------------
THEMES = {
    # Grief and hardship
    "grief":          "loss, mourning, bereavement",
    "fear":           "dread, terror, anxiety about what may come",
    "loneliness":     "isolation, abandonment, being without company",
    "suffering":      "bodily or circumstantial affliction",
    "illness":        "sickness, disease, physical infirmity",
    "death":          "dying, the dead, burial, mortality",
    "doubt":          "uncertainty about God or about his promises",
    "shame":          "disgrace, humiliation, exposure",
    "guilt":          "wrongdoing acknowledged or carried",
    "despair":        "hopelessness, wishing not to go on",

    # Waiting and endurance
    "waiting":        "delay, longing for what has not yet come",
    "endurance":      "persisting under pressure over time",
    "exile":          "displacement, living far from home, captivity",
    "hope":           "expectation of good that is still ahead",

    # Relationships
    "marriage":       "husband and wife, betrothal, wedding",
    "love":           "devotion between people",
    "friendship":     "companionship and loyalty between peers",
    "family":         "household, kin, generations",
    "parenting":      "raising children, a parent's care",
    "children":       "offspring, birth, barrenness, childlessness",
    "conflict":       "quarrel, dispute, division between people",
    "betrayal":       "broken trust, treachery",
    "forgiveness":    "pardon, between people or from God",
    "reconciliation": "a relationship restored after rupture",
    "sexuality":      "desire, physical intimacy, sexual conduct",

    # Community and society
    "community":      "a people together, congregation, neighbours",
    "hospitality":    "welcoming the stranger or the guest",
    "injustice":      "oppression, corrupt power, the wronged",
    "justice":        "right judgment, fairness, defending the weak",
    "poverty":        "want, the poor, need",
    "wealth":         "riches, money, possessions",
    "war":            "battle, armies, conquest",

    # Work and daily life
    "work":           "labour, craft, occupation",
    "provision":      "food, harvest, being supplied with what is needed",
    "rest":           "sabbath, ceasing, sleep",
    "land":           "territory, inheritance of place, farming",
    "leadership":     "governing, kingship, authority over others",

    # Toward God
    "prayer":         "speaking to God, petition, intercession",
    "praise":         "extolling God",
    "lament":         "grief or complaint voiced to God",
    "thanksgiving":   "gratitude expressed to God",
    "repentance":     "turning from wrongdoing",
    "obedience":      "keeping what God commands",
    "disobedience":   "refusing or breaking what God commands",
    "covenant":       "a binding agreement between God and a people",
    "calling":        "being summoned or sent to a task",
    "guidance":       "direction sought or given for a path",
    "presence":       "God being near, dwelling among people",
    "silence":        "God seeming absent, or not answering",

    # Character
    "wisdom":         "discernment, skill in living",
    "folly":          "foolishness, self-destructive choices",
    "humility":       "lowliness, not exalting oneself",
    "pride":          "self-exaltation, arrogance",
    "patience":       "slowness to anger, bearing with others",
    "anger":          "wrath or indignation in people",
    "generosity":     "giving freely",
    "integrity":      "honesty, keeping one's word",

    # Divine action, described and not explained
    "creation":       "the making of the world and its creatures",
    "deliverance":    "rescue from danger or bondage",
    "mercy":          "compassion shown, judgment withheld",
    "judgment":       "a verdict or punishment declared",
    "healing":        "restoration of body or mind",
    "promise":        "a pledge given about what is to come",
    "blessing":       "favour spoken or bestowed",
    "worship":        "ritual, sacrifice, temple service",
}

# The register a passage speaks in. Lets the plan agent build an arc that moves,
# instead of seven days in the same key.
TONES = [
    "lament", "praise", "thanksgiving", "instruction",
    "narrative", "warning", "promise", "questioning",
]

# Chapter-level literary kind. Keeps the agent from pairing a census with a psalm
# because both happened to touch "family".
GENRES = [
    "narrative", "law", "poetry", "wisdom", "prophecy",
    "gospel", "letter", "apocalyptic", "genealogy",
]

# Retrieval exclusions. Nothing downstream can infer these, so they are set here
# or not at all: a couple who asked for help with grief must not be handed a
# text about a dead child because it matched on "grief".
CAUTIONS = {
    "violence":       "killing, war atrocity, graphic bloodshed",
    "sexual-content": "explicit sexual acts, rape, incest",
    "severe-judgment": "curses, destruction of a people, imprecation",
    "death-of-child": "the death or sacrifice of a child",
    "infertility":    "barrenness, the inability to conceive",
    "self-harm":      "suicide, self-wounding",
    "adultery":       "marital betrayal, unfaithfulness",
    # Added after the first sample run: Leviticus 13 is 59 verses of skin disease,
    # examination and quarantine, and it came back with no caution at all because
    # there was nothing here for it to use. A couple sitting with a diagnosis
    # should not meet that chapter by accident.
    "illness-graphic": "detailed disease, decay, bodily affliction",
}

SYSTEM = f"""You are cataloguing the Bible for Pamwe, a devotional app where a Christian couple read a passage together and each write a private reflection.

You are given the full text of one chapter, verse by verse. You produce a structured record of what that chapter and its verses are ABOUT, so the app can later find passages that fit what a couple is going through.

THE ONE RULE THAT MATTERS
You describe subject matter. You never interpret, apply, or teach.

  Correct:   this passage is about grief and waiting
  Wrong:     this passage teaches that suffering is discipline
  Correct:   Abraham is told to sacrifice Isaac
  Wrong:     this shows we must surrender what we love most

Nobody will read all 31,102 of these rows. If you put a reading into a summary it will silently shape every plan built from this catalogue and no one will catch it. Describe what is on the page. Say what happens, who is present, what is spoken about. Stop there.

WHAT YOU PRODUCE, IN THIS ORDER

1. verses. One entry for EVERY verse you were given, from the first to the last, none skipped and none invented. Each carries its themes, its tone, and any cautions.

   MANY VERSES HAVE NOTHING TO TAG, and their themes array must be empty. A name in a genealogy, an item in an inventory, a measurement, a boundary, a date, a number. In a chapter that is mostly a list, expect MOST verses to come back empty. Tagging a name in a family tree with "family" is precisely the failure this catalogue exists to prevent, because it means every genealogy answers a search for family and buries the passages that are really about it. If you have to strain to say what a verse is about, it is not about anything. Leave it empty and move on. Where a formula repeats with only the names changing, every one of those verses carries the same tags, which is usually none.

2. passages. The chapter comes to you ALREADY DIVIDED into passages, each marked with its verse range. These divisions follow the printed sections of a published translation and are not yours to change: echo every passage's start and end exactly as given, in the given order, none added, none dropped, none moved.

   Your work on a passage is its content: a plain summary of what happens in it, in one or two sentences, its themes, its tone, and any cautions. Judge each passage from its own verses alone.

3. chapter. The whole chapter: its summary, its themes, its genre, its dominant tone.

Work upward. Read the verses, then describe each given passage, then the chapter. Do not decide the chapter's theme first and bend the verses to match it.

THEMES. Use ONLY these. Anything else is rejected and the chapter is regenerated. Prefer two to four per verse and three to six per chapter. Fewer and accurate beats more and loose.
{chr(10).join(f"  {k}: {v}" for k, v in THEMES.items())}

TONES. Exactly one per verse, passage and chapter, from: {", ".join(TONES)}

GENRES. Exactly one per chapter, from: {", ".join(GENRES)}

CAUTIONS. Set these where they apply, so the app can hold a passage back from someone it would wound. Most verses have none.
{chr(10).join(f"  {k}: {v}" for k, v in CAUTIONS.items())}

WRITING THE SUMMARIES
- Plain and concrete. Name what is in the text.
- Present tense. "Job answers his friends", not "Job answered".
- Never use em dashes. Use commas, colons, or periods.
- No verse citations inside a summary. The reference is already recorded.
- One or two sentences for a passage. Two at most for a chapter."""

SCHEMA = {
    "type": "object",
    "additionalProperties": False,
    # Field order is reasoning order: verses first, then the groupings, then the
    # abstraction. Putting the chapter record first would let the model pick a
    # theme up front and bend the verses to match it.
    "properties": {
        "verses": {
            "type": "array",
            "items": {
                "type": "object",
                "additionalProperties": False,
                "properties": {
                    "v": {"type": "integer"},
                    "themes": {"type": "array", "items": {"enum": sorted(THEMES)}},
                    "tone": {"enum": TONES},
                    "caution": {"type": "array", "items": {"enum": sorted(CAUTIONS)}},
                },
                "required": ["v", "themes", "tone", "caution"],
            },
        },
        "passages": {
            "type": "array",
            "items": {
                "type": "object",
                "additionalProperties": False,
                "properties": {
                    "start": {"type": "integer"},
                    "end": {"type": "integer"},
                    "summary": {"type": "string"},
                    "themes": {"type": "array", "items": {"enum": sorted(THEMES)}},
                    "tone": {"enum": TONES},
                    "caution": {"type": "array", "items": {"enum": sorted(CAUTIONS)}},
                },
                "required": ["start", "end", "summary", "themes", "tone", "caution"],
            },
        },
        "chapter": {
            "type": "object",
            "additionalProperties": False,
            "properties": {
                "summary": {"type": "string"},
                "themes": {"type": "array", "items": {"enum": sorted(THEMES)}},
                "genre": {"enum": GENRES},
                "tone": {"enum": TONES},
            },
            "required": ["summary", "themes", "genre", "tone"],
        },
    },
    "required": ["verses", "passages", "chapter"],
}


def validate(record, n_verses, divisions=None):
    """Every reason a chapter can be rejected. Returns a list of problems.

    The verse-coverage check is the load-bearing one, and it is free: the API
    tells us how many verses the chapter has, so a model that skips verse 34 or
    invents verse 67 is caught without anyone reading the output.

    divisions is the list of (start, end) passage ranges the chapter was given
    already divided into. The model's only boundary job is to echo them, so the
    check is bare equality. This replaced three spec versions of prose trying to
    steer where the model put its cuts: the c/d/e history above is the record of
    why judgment calls do not belong in the generation.
    """
    problems = []

    verses = record.get("verses", [])
    got = [v["v"] for v in verses]
    want = list(range(1, n_verses + 1))
    if got != want:
        missing = sorted(set(want) - set(got))
        extra = sorted(set(got) - set(want))
        if missing:
            problems.append(f"missing verses {missing[:8]}{'...' if len(missing) > 8 else ''}")
        if extra:
            problems.append(f"invented verses {extra[:8]}")
        if not missing and not extra:
            problems.append("verses out of order")

    passages = record.get("passages", [])
    if not passages:
        problems.append("no passages")
    else:
        if passages[0]["start"] != 1:
            problems.append(f"passages start at {passages[0]['start']}, not 1")
        if passages[-1]["end"] != n_verses:
            problems.append(f"passages end at {passages[-1]['end']}, not {n_verses}")
        for a, b in zip(passages, passages[1:]):
            if b["start"] != a["end"] + 1:
                problems.append(f"gap or overlap at {a['end']}/{b['start']}")
        for p in passages:
            if p["start"] > p["end"]:
                problems.append(f"backwards passage {p['start']}-{p['end']}")
        if divisions:
            got = [(p["start"], p["end"]) for p in passages]
            want = [tuple(d) for d in divisions]
            if got != want:
                problems.append(f"passages {got} do not echo the given divisions {want}")

    # Belt and braces on the enums. The schema should make these impossible, but
    # the catalogue is the source of truth for everything downstream and a bad
    # tag here is invisible for months.
    for v in verses:
        for t in v.get("themes", []):
            if t not in THEMES:
                problems.append(f"unknown theme '{t}' on verse {v['v']}")
    for t in record.get("chapter", {}).get("themes", []):
        if t not in THEMES:
            problems.append(f"unknown chapter theme '{t}'")

    return problems
