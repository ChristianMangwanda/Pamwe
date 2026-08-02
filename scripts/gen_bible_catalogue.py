#!/usr/bin/env python3
"""
Build the Bible catalogue: every verse, passage and chapter tagged by subject.

WHY THIS EXISTS
    Ask Pamwe used to invent a reading list from a prompt, which meant the plan a
    couple got depended on how they happened to phrase their sentence. You cannot
    hard-code a branch for "we lost a baby" and another for "we lost a dog", and
    trying is how you end up with a generator that is all vibes.

    So the knowledge moves out of the prompt and into a catalogue. Tag the whole
    canon once, by subject, and a couple in grief gets the passages that are
    actually about grief because a lookup said so, not because a model improvised
    under pressure. The plan agent then only ARRANGES what retrieval handed it.
    It cannot invent a reference, because it is never asked to produce one.

    Same principle as scripts/gen_passage_prompts.py, one layer deeper: generate
    once, store forever, never re-spend tokens on the same chapter.

WHAT IT DOES
    Per chapter: pull the real WEB text from bible.helloao.org, ask a model for
    the structured record defined in bible_catalogue_spec.py, then REJECT it
    unless the verse tags cover exactly verses 1..N and the passages tile the
    chapter with no gaps. The API tells us how many verses a chapter has, so that
    check is free and catches a skipped or invented verse without anyone reading
    the output.

    python3 scripts/gen_bible_catalogue.py --sample
    python3 scripts/gen_bible_catalogue.py --sample --provider openai --model gpt-5.6-luna
    python3 scripts/gen_bible_catalogue.py --book Ruth
    python3 scripts/gen_bible_catalogue.py --all

    Text and generations are both cached to the scratchpad, keyed by SPEC_VERSION
    and model, so a re-run costs nothing for work already done and two providers
    can be compared without re-downloading a single chapter.

COST (measured, 1,189 chapters, batch + prompt caching)
    Sonnet 5    ~$9.25     gpt-5.6-luna  ~$0.83     gpt-5-mini  ~$1.34
    A 20-chapter sample is 1.7% of that, so comparing providers costs cents.
"""
import argparse
import json
import os
import re
import sys
import threading
import time
import urllib.request
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from bible_catalogue_spec import SPEC_VERSION, SYSTEM, SCHEMA, validate  # noqa: E402

ROOT = Path(__file__).resolve().parent.parent
SCRATCH = Path(
    "/private/tmp/claude-501/-Users-christianmangwanda-Desktop-Pamwe/"
    "b1c4f230-a837-4c3e-af44-991cc72d993b/scratchpad"
)
TEXT_CACHE = SCRATCH / "catalogue_text_cache.json"
GEN_CACHE = SCRATCH / "catalogue_gen_cache.json"
BOOKS_CACHE = SCRATCH / "catalogue_books.json"

API = "https://bible.helloao.org/api/ENGWEBP"

DEFAULT_MODEL = {"anthropic": "claude-sonnet-5", "openai": "gpt-5.6-luna"}

# Chosen to exercise the hard cases, not to be a pleasant read. Each one is here
# for a reason the review needs to check:
#   Numbers 7, 1 Chronicles 1  repetitive lists, must produce EMPTY themes
#                              rather than forcing a tag onto a name or a weight
#   Luke 15                    three separate parables, so passage boundaries
#                              have an unambiguous right answer to be judged by
#   Lamentations 3             66 verses turning from grief to hope mid-chapter,
#                              the boundary call the whole catalogue rests on
#   Psalm 88                   lament that never resolves, so a model that adds
#                              hope which is not in the text gets caught
#   Psalm 23                   6 verses, must stay ONE passage, not be split
#   Gen 22, 1 Sam 1, Ps 137,   one per caution flag: death-of-child, infertility,
#   Song 4, Lev 13, Job 3      severe-judgment, sexual-content, illness, self-harm
SAMPLE = [
    ("Genesis", 1), ("Genesis", 22), ("Leviticus", 13), ("Numbers", 7),
    ("Ruth", 1), ("1 Samuel", 1), ("1 Chronicles", 1), ("Job", 3),
    ("Psalms", 23), ("Psalms", 88), ("Psalms", 137), ("Proverbs", 3),
    ("Ecclesiastes", 3), ("Song of Solomon", 4), ("Isaiah", 40), ("Lamentations", 3),
    ("Matthew", 5), ("Luke", 15), ("John", 11), ("Romans", 8),
]


def load(path):
    try:
        return json.loads(path.read_text())
    except Exception:
        return {}


# One lock for every cache write. Six workers sharing one .tmp filename had
# them clobbering each other's rename, and serialising json.dumps also stops a
# thread reading a dict while another is still adding to it.
_IO = threading.Lock()

# Real token spend, so the full-run cost is a measurement and not my arithmetic.
USAGE = {"in": 0, "out": 0, "cache_write": 0, "cache_read": 0}


def bill(**kw):
    with _IO:
        for k, v in kw.items():
            USAGE[k] += v or 0


def save(path, data):
    with _IO:
        path.parent.mkdir(parents=True, exist_ok=True)
        tmp = path.with_suffix(f".{os.getpid()}.{threading.get_ident()}.tmp")
        tmp.write_text(json.dumps(data, indent=1, sort_keys=True))
        tmp.replace(path)


def get_json(url, tries=4):
    for attempt in range(tries):
        try:
            with urllib.request.urlopen(url, timeout=45) as r:
                return json.loads(r.read().decode())
        except Exception as e:
            if attempt == tries - 1:
                raise
            print(f"    retry {url.rsplit('/', 2)[-2:]}: {e}", file=sys.stderr)
            time.sleep(2 * (attempt + 1))


def books():
    """The 66-book canon, straight from the API rather than hand-typed.

    gen_widget_verses.py learned this the same way: a hand-typed USFM map is a
    silent source of 404s (Ezekiel is EZK, not EZE), and the API already knows.
    """
    cached = load(BOOKS_CACHE)
    if cached:
        return cached
    data = get_json(f"{API}/books.json")
    out = {
        b["commonName"]: {
            "code": b["id"],
            "chapters": b["numberOfChapters"],
            "order": b["order"],
        }
        for b in data["books"]
    }
    save(BOOKS_CACHE, out)
    return out


def verse_text(v):
    """Verse content is a mix of bare strings and {text, poem} objects."""
    out = []
    for c in v.get("content", []):
        if isinstance(c, str):
            out.append(c)
        elif isinstance(c, dict) and "text" in c:
            out.append(c["text"])
    return re.sub(r"\s+", " ", " ".join(out)).strip()


def starts_after(content, kind):
    """Verses at which a `kind` marker opens a new unit.

    Markers sit BETWEEN verses, so a marker following verse 18 means the next
    unit begins at 19. One before any verse means the unit begins at 1.
    """
    out, last = [], 0
    for item in content:
        if item.get("type") == "verse":
            last = item["number"]
        elif item.get("type") == kind:
            out.append(last + 1)
    return sorted(set(out) | {1})


def fetch_chapter(book, chapter, code, cache):
    """WEB text plus the structural signal, from helloao. That API serves whole
    chapters, which is why the catalogue uses it over bible-api.com, and it also
    turns out to carry the two things a model cannot reliably infer alone:

    SECTION STARTS come from BSB, which ships editorial section headings where
    WEB ships none. We take the POSITIONS and throw the titles away. Where a unit
    begins is a structural fact; calling it "The Prophet's Hope" is a reading,
    and letting that into the catalogue would break the rule the whole thing
    rests on. BSB is public domain and already a dependency of the reader.

    STANZA STARTS come from WEB's own line breaks. In Lamentations 3 they fall
    every third verse, because the poem is an acrostic in stanzas of three.
    """
    key = f"{book} {chapter}"
    cached = cache.get(key)
    if cached and "grid" in cached:
        return cached

    data = get_json(f"{API}/{code}/{chapter}.json")
    content = data["chapter"]["content"]
    verses = [
        {"v": item["number"], "text": verse_text(item)}
        for item in content
        if item.get("type") == "verse"
    ]
    stanzas = starts_after(content, "line_break")

    # BSB is a separate fetch and a nice-to-have: a chapter without headings just
    # gets no section hint rather than failing.
    try:
        bsb = get_json(f"https://bible.helloao.org/api/BSB/{code}/{chapter}.json")
        sections = starts_after(bsb["chapter"]["content"], "heading")
    except Exception as e:
        print(f"    {key}: no BSB sections ({e})", file=sys.stderr)
        sections = [1]

    # WEB's line breaks are not one thing. In Lamentations 3 there are 23 of them
    # every three verses, which is the acrostic and a real grid. In Proverbs 3
    # there are three, twelve verses apart, which is just paragraphing. Enforcing
    # against the second kind would cap Proverbs at three passages and reject
    # good boundaries all day, so only a genuine grid is binding. The rest still
    # goes into the prompt as a hint, where being wrong costs nothing.
    n = data["numberOfVerses"]
    grid = stanzas if len(stanzas) >= 6 and n / len(stanzas) <= 4.5 else None

    # numberOfVerses is the API's own count, and it is what makes the coverage
    # check in validate() free rather than a guess.
    rec = {"verses": verses, "n": n, "sections": sections,
           "stanzas": stanzas, "grid": grid}
    cache[key] = rec
    save(TEXT_CACHE, cache)
    return rec


def divisions_of(rec):
    """The chapter's passage ranges, decided here and not by the model.

    BSB's printed section starts become the cuts. This is the whole fix for the
    c/d/e oscillation recorded in the spec header: a boundary the model never
    emits is a boundary it cannot get wrong, and the same chapter now divides
    identically on every run of every model. Finer grain than a section is
    retrieval's job, from the verse tags.
    """
    n = rec["n"]
    starts = sorted({s for s in rec.get("sections") or [1] if 1 <= s <= n} | {1})
    ends = [s - 1 for s in starts[1:]] + [n]
    return list(zip(starts, ends))


def user_message(book, chapter, rec):
    divs = divisions_of(rec)
    text = {v["v"]: v["text"] for v in rec["verses"]}
    blocks = []
    for i, (s, e) in enumerate(divs, 1):
        lines = "\n".join(f"{v}. {text[v]}" for v in range(s, e + 1) if v in text)
        blocks.append(f"PASSAGE {i}, verses {s} to {e}\n{lines}")
    spans = ", ".join(f"{s}-{e}" for s, e in divs)
    return (
        f"{book} {chapter}, {rec['n']} verses, already divided into "
        f"{len(divs)} passages: {spans}.\n\n" + "\n\n".join(blocks) + "\n\n"
        f"Catalogue this chapter. Tag all {rec['n']} verses, and describe each "
        f"of the {len(divs)} passages in order, echoing its given start and end."
    )


def call_anthropic(client, model, prompt):
    # No temperature: Sonnet 5 rejects it outright, and the GPT-5 family ignores
    # it. Consistency across the canon comes from the frozen vocabulary and the
    # schema, which is where it should have come from anyway. A temperature knob
    # was never going to make two chapters agree about what "grief" means.
    msg = client.messages.create(
        model=model,
        max_tokens=16384,
        # The spec is ~2,500 tokens and identical on all 1,189 calls, so caching
        # it turns the bulk of input spend into cache reads at a tenth the price.
        system=[{"type": "text", "text": SYSTEM, "cache_control": {"type": "ephemeral"}}],
        output_config={"format": {"type": "json_schema", "schema": SCHEMA}},
        messages=[{"role": "user", "content": prompt}],
    )
    if msg.stop_reason == "refusal":
        raise RuntimeError("refused")
    u = msg.usage
    bill(**{"in": u.input_tokens, "out": u.output_tokens,
            "cache_write": getattr(u, "cache_creation_input_tokens", 0),
            "cache_read": getattr(u, "cache_read_input_tokens", 0)})
    return json.loads("".join(b.text for b in msg.content if b.type == "text"))


def call_openai(client, model, prompt):
    # OpenAI caches prompt prefixes over 1,024 tokens automatically, and ours is
    # ~2,500, so the discount needs no flag. SCHEMA is already strict-compliant:
    # additionalProperties false, every property required.
    resp = client.chat.completions.create(
        model=model,
        response_format={
            "type": "json_schema",
            "json_schema": {"name": "catalogue", "strict": True, "schema": SCHEMA},
        },
        messages=[
            {"role": "system", "content": SYSTEM},
            {"role": "user", "content": prompt},
        ],
    )
    u = resp.usage
    cached = getattr(getattr(u, "prompt_tokens_details", None), "cached_tokens", 0) or 0
    bill(**{"in": u.prompt_tokens - cached, "out": u.completion_tokens, "cache_read": cached})
    return json.loads(resp.choices[0].message.content)


def api_key(provider):
    env_name = "ANTHROPIC_API_KEY" if provider == "anthropic" else "OPENAI_API_KEY"
    key = os.environ.get(env_name)
    if not key:
        env = ROOT / "supabase" / "functions" / ".env"
        if env.exists():
            for line in env.read_text().splitlines():
                if line.startswith(f"{env_name}="):
                    key = line.split("=", 1)[1].strip().strip('"').strip("'")
    if not key:
        sys.exit(f"{env_name} not found (env or supabase/functions/.env)")
    return key


def make_client(provider, key):
    if provider == "anthropic":
        try:
            import anthropic
        except ImportError:
            sys.exit("pip install anthropic")
        return anthropic.Anthropic(api_key=key), call_anthropic
    try:
        import openai
    except ImportError:
        sys.exit("pip install openai")
    return openai.OpenAI(api_key=key), call_openai


def catalogue_chapter(book, chapter, code, texts, gens, client, call, model, lock_print):
    ref = f"{book} {chapter}"
    ck = f"{ref}|{SPEC_VERSION}|{model}"
    if ck in gens:
        lock_print(f"  {ref} (cached)")
        return ref, gens[ck]

    rec = fetch_chapter(book, chapter, code, texts)
    prompt = user_message(book, chapter, rec)

    # One retry, because a rejected chapter is almost always a coverage slip that
    # a second pass gets right. A chapter that fails twice is reported, never
    # silently dropped: a catalogue with holes in it is worse than no catalogue.
    last = None
    # 4 attempts with growing sleeps: over a ~45 minute canon run the OpenAI
    # rate limiter WILL fire at some point, and a chapter that fails on a 429 is
    # indistinguishable in the report from one that failed on quality.
    for attempt in (1, 2, 3, 4):
        try:
            out = call(client, model, prompt)
        except Exception as e:
            last = [f"call failed: {e}"]
            time.sleep(5 * attempt)
            continue
        problems = validate(out, rec["n"], divisions_of(rec))
        if not problems:
            out["_n"] = rec["n"]
            gens[ck] = out
            # Persist per chapter, not per run: a crash 40 minutes into the
            # canon must cost one chapter, and the cache lives in /private/tmp
            # so the write never touches the iCloud-synced repo.
            save(GEN_CACHE, gens)
            lock_print(f"  {ref}  {rec['n']}v  {len(out['passages'])} passages  {out['chapter']['genre']}")
            return ref, out
        last = problems
        lock_print(f"  {ref} attempt {attempt} rejected: {'; '.join(problems[:3])}")

    lock_print(f"  {ref} FAILED: {'; '.join(last or ['unknown'])}")
    return ref, None


def review_markdown(results, texts, model):
    """The whole point of --sample: put real tags in front of a human.

    Passage text is included because a boundary can only be judged against the
    words it falls between.
    """
    out = [
        f"# Bible catalogue sample",
        "",
        f"- spec `{SPEC_VERSION}`, model `{model}`",
        f"- {len([r for r in results.values() if r])} of {len(results)} chapters accepted",
        "",
        "Check three things: do the passage boundaries fall where a thought starts and",
        "ends, do the summaries describe rather than interpret, and do the repetitive",
        "chapters carry empty themes instead of forced ones.",
        "",
    ]
    for ref, rec in results.items():
        if not rec:
            out += [f"## {ref}", "", "**FAILED validation.**", ""]
            continue
        ch = rec["chapter"]
        verses = {v["v"]: v["text"] for v in texts[ref]["verses"]}
        out += [
            f"## {ref}",
            "",
            f"`{ch['genre']}` · `{ch['tone']}` · {rec['_n']} verses · {len(rec['passages'])} passages",
            "",
            f"**{ch['summary']}**",
            "",
            f"themes: {', '.join(ch['themes'])}",
            "",
        ]
        for p in rec["passages"]:
            span = f"{p['start']}-{p['end']}" if p["start"] != p["end"] else str(p["start"])
            body = " ".join(verses.get(i, "") for i in range(p["start"], p["end"] + 1))
            if len(body) > 420:
                body = body[:420].rsplit(" ", 1)[0] + " ..."
            caution = f" · ⚠ {', '.join(p['caution'])}" if p["caution"] else ""
            out += [
                f"### {ref}:{span} · {p['tone']}{caution}",
                "",
                f"{p['summary']}",
                "",
                f"themes: {', '.join(p['themes']) or '·'}",
                "",
                f"> {body}",
                "",
            ]
        tagged = [v for v in rec["verses"] if v["themes"]]
        untagged = [v["v"] for v in rec["verses"] if not v["themes"]]
        out += ["<details><summary>verse tags</summary>", ""]
        for v in tagged:
            c = f"  ⚠ {','.join(v['caution'])}" if v["caution"] else ""
            out.append(f"- **{v['v']}** `{v['tone']}` {', '.join(v['themes'])}{c}")
        if untagged:
            out += ["", f"untagged ({len(untagged)}): {untagged}"]
        out += ["", "</details>", ""]
    return "\n".join(out)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--sample", action="store_true", help="the 20 review chapters")
    ap.add_argument("--book", help="one whole book, by common name")
    ap.add_argument("--all", action="store_true", help="the whole canon, 1,189 chapters")
    # luna is the model of choice (Christian, 2026-08-01): 15x cheaper than
    # Sonnet, equal caution recall, and boundaries no longer depend on the model.
    ap.add_argument("--provider", choices=["anthropic", "openai"], default="openai")
    ap.add_argument("--model", default=None)
    ap.add_argument("--workers", type=int, default=6)
    ap.add_argument("--out", default=None)
    args = ap.parse_args()

    model = args.model or DEFAULT_MODEL[args.provider]
    bk = books()

    if args.all:
        chapters = [(n, c) for n, m in sorted(bk.items(), key=lambda kv: kv[1]["order"])
                    for c in range(1, m["chapters"] + 1)]
    elif args.book:
        if args.book not in bk:
            sys.exit(f"unknown book '{args.book}'. one of: {', '.join(sorted(bk))}")
        chapters = [(args.book, c) for c in range(1, bk[args.book]["chapters"] + 1)]
    else:
        chapters = SAMPLE

    client, call = make_client(args.provider, api_key(args.provider))
    texts, gens = load(TEXT_CACHE), load(GEN_CACHE)

    print(f"{len(chapters)} chapters · {args.provider}/{model} · spec {SPEC_VERSION}\n")

    def run(bc):
        book, chapter = bc
        return catalogue_chapter(book, chapter, bk[book]["code"],
                                 texts, gens, client, call, model, print)

    started = time.time()
    # The first call alone, so it WRITES the shared prompt cache. Firing all six
    # at once would have every one of them miss it and pay full input price.
    results = dict([run(chapters[0])])
    if len(chapters) > 1:
        with ThreadPoolExecutor(max_workers=args.workers) as pool:
            for ref, rec in pool.map(run, chapters[1:]):
                results[ref] = rec
    save(GEN_CACHE, gens)

    ok = len([r for r in results.values() if r])
    print(f"\n{ok}/{len(results)} accepted in {time.time() - started:.0f}s")

    billed = sum(USAGE.values())
    if billed:
        done = len([1 for bc in chapters if f"{bc[0]} {bc[1]}|{SPEC_VERSION}|{model}" in gens])
        print("  tokens  " + "  ".join(f"{k} {v:,}" for k, v in USAGE.items() if v))
        # Extrapolated per accepted chapter, so a partial or cached run still
        # projects honestly instead of quietly reporting a fraction of the truth.
        if done:
            scale = 1189 / done
            print(f"  full canon at this rate: "
                  f"{USAGE['in'] * scale / 1e6:.2f}M in, {USAGE['out'] * scale / 1e6:.2f}M out, "
                  f"{(USAGE['cache_read'] + USAGE['cache_write']) * scale / 1e6:.2f}M cached")
    failed = [r for r, v in results.items() if not v]
    if failed:
        print(f"FAILED: {', '.join(failed)}")

    out = Path(args.out) if args.out else SCRATCH / f"catalogue_review_{model}.md"
    out.write_text(review_markdown(results, texts, model))
    print(f"review -> {out}")


if __name__ == "__main__":
    main()
