// Minimal Bible browser support. Chapters are fetched on demand, no local seed.
//
// Two sources, both public domain. bible-api.com serves the older translations
// (WEB, KJV, ASV, BBE, Darby). The Berean Standard Bible comes from
// bible.helloao.org instead, because bible-api.com's catalog predates the BSB's
// 2023 public-domain release and doesn't carry it. The BSB is the one modern,
// readable translation that is genuinely free of licensing strings: the popular
// moderns (NIV, ESV, NLT, NKJV) are all copyrighted and reachable only under
// non-commercial terms that would restrict the whole app.

import AsyncStorage from '@react-native-async-storage/async-storage';

export type Testament = 'old' | 'new';

export interface BibleBook {
  name: string;
  testament: Testament;
  chapters: number;
}

// Canonical 66-book list with chapter counts. Order matches a standard Protestant canon.
export const BIBLE_BOOKS: BibleBook[] = [
  // Old Testament — 39 books
  { name: 'Genesis', testament: 'old', chapters: 50 },
  { name: 'Exodus', testament: 'old', chapters: 40 },
  { name: 'Leviticus', testament: 'old', chapters: 27 },
  { name: 'Numbers', testament: 'old', chapters: 36 },
  { name: 'Deuteronomy', testament: 'old', chapters: 34 },
  { name: 'Joshua', testament: 'old', chapters: 24 },
  { name: 'Judges', testament: 'old', chapters: 21 },
  { name: 'Ruth', testament: 'old', chapters: 4 },
  { name: '1 Samuel', testament: 'old', chapters: 31 },
  { name: '2 Samuel', testament: 'old', chapters: 24 },
  { name: '1 Kings', testament: 'old', chapters: 22 },
  { name: '2 Kings', testament: 'old', chapters: 25 },
  { name: '1 Chronicles', testament: 'old', chapters: 29 },
  { name: '2 Chronicles', testament: 'old', chapters: 36 },
  { name: 'Ezra', testament: 'old', chapters: 10 },
  { name: 'Nehemiah', testament: 'old', chapters: 13 },
  { name: 'Esther', testament: 'old', chapters: 10 },
  { name: 'Job', testament: 'old', chapters: 42 },
  { name: 'Psalms', testament: 'old', chapters: 150 },
  { name: 'Proverbs', testament: 'old', chapters: 31 },
  { name: 'Ecclesiastes', testament: 'old', chapters: 12 },
  { name: 'Song of Solomon', testament: 'old', chapters: 8 },
  { name: 'Isaiah', testament: 'old', chapters: 66 },
  { name: 'Jeremiah', testament: 'old', chapters: 52 },
  { name: 'Lamentations', testament: 'old', chapters: 5 },
  { name: 'Ezekiel', testament: 'old', chapters: 48 },
  { name: 'Daniel', testament: 'old', chapters: 12 },
  { name: 'Hosea', testament: 'old', chapters: 14 },
  { name: 'Joel', testament: 'old', chapters: 3 },
  { name: 'Amos', testament: 'old', chapters: 9 },
  { name: 'Obadiah', testament: 'old', chapters: 1 },
  { name: 'Jonah', testament: 'old', chapters: 4 },
  { name: 'Micah', testament: 'old', chapters: 7 },
  { name: 'Nahum', testament: 'old', chapters: 3 },
  { name: 'Habakkuk', testament: 'old', chapters: 3 },
  { name: 'Zephaniah', testament: 'old', chapters: 3 },
  { name: 'Haggai', testament: 'old', chapters: 2 },
  { name: 'Zechariah', testament: 'old', chapters: 14 },
  { name: 'Malachi', testament: 'old', chapters: 4 },
  // New Testament — 27 books
  { name: 'Matthew', testament: 'new', chapters: 28 },
  { name: 'Mark', testament: 'new', chapters: 16 },
  { name: 'Luke', testament: 'new', chapters: 24 },
  { name: 'John', testament: 'new', chapters: 21 },
  { name: 'Acts', testament: 'new', chapters: 28 },
  { name: 'Romans', testament: 'new', chapters: 16 },
  { name: '1 Corinthians', testament: 'new', chapters: 16 },
  { name: '2 Corinthians', testament: 'new', chapters: 13 },
  { name: 'Galatians', testament: 'new', chapters: 6 },
  { name: 'Ephesians', testament: 'new', chapters: 6 },
  { name: 'Philippians', testament: 'new', chapters: 4 },
  { name: 'Colossians', testament: 'new', chapters: 4 },
  { name: '1 Thessalonians', testament: 'new', chapters: 5 },
  { name: '2 Thessalonians', testament: 'new', chapters: 3 },
  { name: '1 Timothy', testament: 'new', chapters: 6 },
  { name: '2 Timothy', testament: 'new', chapters: 4 },
  { name: 'Titus', testament: 'new', chapters: 3 },
  { name: 'Philemon', testament: 'new', chapters: 1 },
  { name: 'Hebrews', testament: 'new', chapters: 13 },
  { name: 'James', testament: 'new', chapters: 5 },
  { name: '1 Peter', testament: 'new', chapters: 5 },
  { name: '2 Peter', testament: 'new', chapters: 3 },
  { name: '1 John', testament: 'new', chapters: 5 },
  { name: '2 John', testament: 'new', chapters: 1 },
  { name: '3 John', testament: 'new', chapters: 1 },
  { name: 'Jude', testament: 'new', chapters: 1 },
  { name: 'Revelation', testament: 'new', chapters: 22 },
];

export function findBook(slug: string): BibleBook | undefined {
  const normalized = slug.toLowerCase().trim();
  return BIBLE_BOOKS.find((b) => b.name.toLowerCase() === normalized);
}

// bible-api.com translation ids. All public domain.
//
// Young's Literal ('ylt') was removed: bible-api.com carries it for the New
// Testament only (its catalog names it "Young's Literal Translation (NT only)"),
// so every Old Testament chapter 404'd and the reader blamed the connection.
// Because the choice persists globally, picking it inside a Gospel silently
// broke ~60% of the Bible until the reader switched back.
export type Translation = 'web' | 'bsb' | 'kjv' | 'asv' | 'bbe' | 'darby';

export const TRANSLATIONS: Translation[] = ['web', 'bsb', 'kjv', 'asv', 'bbe', 'darby'];

export const TRANSLATION_NAMES: Record<Translation, string> = {
  web: 'World English Bible',
  bsb: 'Berean Standard Bible',
  kjv: 'King James Version',
  asv: 'American Standard Version',
  bbe: 'Bible in Basic English',
  darby: 'Darby Translation',
};

export const TRANSLATION_ABBR: Record<Translation, string> = {
  web: 'WEB', bsb: 'BSB', kjv: 'KJV', asv: 'ASV', bbe: 'BBE', darby: 'DBY',
};

// Only the BSB is served by helloao; everything else comes from bible-api.com.
const BSB_TRANSLATION: Translation = 'bsb';

// USFM book codes, which the helloao API keys its chapters by. Generated from
// that API's own BSB book list rather than hand-typed, and checked against
// BIBLE_BOOKS: all 66 names line up in order and every chapter count matches.
const USFM_CODES: Record<string, string> = {
  'Genesis': 'GEN', 'Exodus': 'EXO', 'Leviticus': 'LEV', 'Numbers': 'NUM',
  'Deuteronomy': 'DEU', 'Joshua': 'JOS', 'Judges': 'JDG', 'Ruth': 'RUT',
  '1 Samuel': '1SA', '2 Samuel': '2SA', '1 Kings': '1KI', '2 Kings': '2KI',
  '1 Chronicles': '1CH', '2 Chronicles': '2CH', 'Ezra': 'EZR', 'Nehemiah': 'NEH',
  'Esther': 'EST', 'Job': 'JOB', 'Psalms': 'PSA', 'Proverbs': 'PRO',
  'Ecclesiastes': 'ECC', 'Song of Solomon': 'SNG', 'Isaiah': 'ISA', 'Jeremiah': 'JER',
  'Lamentations': 'LAM', 'Ezekiel': 'EZK', 'Daniel': 'DAN', 'Hosea': 'HOS',
  'Joel': 'JOL', 'Amos': 'AMO', 'Obadiah': 'OBA', 'Jonah': 'JON',
  'Micah': 'MIC', 'Nahum': 'NAM', 'Habakkuk': 'HAB', 'Zephaniah': 'ZEP',
  'Haggai': 'HAG', 'Zechariah': 'ZEC', 'Malachi': 'MAL', 'Matthew': 'MAT',
  'Mark': 'MRK', 'Luke': 'LUK', 'John': 'JHN', 'Acts': 'ACT',
  'Romans': 'ROM', '1 Corinthians': '1CO', '2 Corinthians': '2CO', 'Galatians': 'GAL',
  'Ephesians': 'EPH', 'Philippians': 'PHP', 'Colossians': 'COL', '1 Thessalonians': '1TH',
  '2 Thessalonians': '2TH', '1 Timothy': '1TI', '2 Timothy': '2TI', 'Titus': 'TIT',
  'Philemon': 'PHM', 'Hebrews': 'HEB', 'James': 'JAS', '1 Peter': '1PE',
  '2 Peter': '2PE', '1 John': '1JN', '2 John': '2JN', '3 John': '3JN',
  'Jude': 'JUD', 'Revelation': 'REV',
};

export interface BibleVerse {
  verse: number;
  text: string;
}

type ChapterResult = { reference: string; verses: BibleVerse[] };
const chapterCache = new Map<string, ChapterResult>();

// Persistent chapter cache so recently read chapters survive app restarts and
// read on a subway or a flight. Bounded to the most recent chapters via a small
// LRU index; scripture text is immutable, so a hit never goes stale.
const CHAPTER_KEY_PREFIX = 'pamwe:chapter:';
const CHAPTER_INDEX_KEY = 'pamwe:chapterIndex';
const CHAPTER_CACHE_MAX = 40;

async function persistChapter(key: string, result: ChapterResult) {
  try {
    await AsyncStorage.setItem(CHAPTER_KEY_PREFIX + key, JSON.stringify(result));
    const raw = await AsyncStorage.getItem(CHAPTER_INDEX_KEY);
    const index: string[] = raw ? JSON.parse(raw) : [];
    const next = [key, ...index.filter((k) => k !== key)];
    const evicted = next.slice(CHAPTER_CACHE_MAX);
    await AsyncStorage.setItem(CHAPTER_INDEX_KEY, JSON.stringify(next.slice(0, CHAPTER_CACHE_MAX)));
    if (evicted.length) await AsyncStorage.multiRemove(evicted.map((k) => CHAPTER_KEY_PREFIX + k));
  } catch {
    // best effort — the in-memory cache still serves this session
  }
}

async function readPersistedChapter(key: string): Promise<ChapterResult | null> {
  try {
    const v = await AsyncStorage.getItem(CHAPTER_KEY_PREFIX + key);
    return v ? (JSON.parse(v) as ChapterResult) : null;
  } catch {
    return null;
  }
}

const LOAD_FAILED = "The Bible text couldn't load. Check your connection and try again.";

async function fetchFromBibleApi(
  book: string,
  chapter: number,
  translation: Translation,
): Promise<ChapterResult> {
  const slug = book.toLowerCase().replace(/ /g, '+');
  const resp = await fetch(`https://bible-api.com/${slug}+${chapter}?translation=${translation}`);
  if (!resp.ok) throw new Error(LOAD_FAILED);
  const data = await resp.json();
  const verses: BibleVerse[] = (Array.isArray(data.verses) ? data.verses : []).map((v: any) => ({
    verse: v.verse,
    text: String(v.text ?? '').replace(/\s+/g, ' ').trim(),
  }));
  return { reference: data.reference ?? `${book} ${chapter}`, verses };
}

// A BSB verse's content is a mix of bare strings, poetry fragments ({ text,
// poem }), footnote markers ({ noteId }) and ({ lineBreak }). Only the pieces
// carrying text belong in the reader: a noteId rendered as-is would surface a
// bare number mid-sentence.
function bsbVerseText(content: unknown[]): string {
  return content
    .map((part) => {
      if (typeof part === 'string') return part;
      const text = (part as { text?: unknown })?.text;
      return typeof text === 'string' ? text : '';
    })
    .filter(Boolean)
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim();
}

async function fetchBsbChapter(book: string, chapter: number): Promise<ChapterResult> {
  const code = USFM_CODES[book];
  if (!code) throw new Error(LOAD_FAILED);
  const resp = await fetch(`https://bible.helloao.org/api/BSB/${code}/${chapter}.json`);
  if (!resp.ok) throw new Error(LOAD_FAILED);
  const data = await resp.json();
  // The chapter body also carries headings, line breaks and Hebrew subtitles;
  // the verse-by-verse reader wants only the verses.
  const content: any[] = Array.isArray(data?.chapter?.content) ? data.chapter.content : [];
  const verses: BibleVerse[] = content
    .filter((item) => item?.type === 'verse')
    .map((v) => ({
      verse: v.number,
      text: bsbVerseText(Array.isArray(v.content) ? v.content : []),
    }));
  return { reference: `${book} ${chapter}`, verses };
}

/**
 * Fetch a chapter as individual verses (for the verse-by-verse reader). Served
 * from memory, then disk, then network. A chapter read before is served from
 * disk without touching the network, so reading works offline. Throws only when
 * the chapter has never been fetched and the network is unreachable.
 */
export async function fetchChapterVerses(
  book: string,
  chapter: number,
  translation: Translation = 'web',
): Promise<ChapterResult> {
  const key = `${book}|${chapter}|${translation}`;
  const cached = chapterCache.get(key);
  if (cached) return cached;

  // A disk hit is authoritative: scripture is immutable, so there is nothing to
  // revalidate. This used to warm memory and then refetch anyway, which made
  // every chapter open across a restart a fresh request. bible-api.com allows
  // ~15 before it 429s, and those 429s surfaced as "check your connection" on
  // whichever translation was tapped last, reading as a broken translation.
  const persisted = await readPersistedChapter(key);
  if (persisted) {
    chapterCache.set(key, persisted);
    return persisted;
  }

  const result =
    translation === BSB_TRANSLATION
      ? await fetchBsbChapter(book, chapter)
      : await fetchFromBibleApi(book, chapter, translation);

  chapterCache.set(key, result);
  persistChapter(key, result);
  return result;
}

/**
 * Fetch a passage's plain text by reference string (e.g. "John 3:1-16"). Used for
 * custom-plan days whose passage_text is NULL (fetched live instead of seeded).
 *
 * bible-api.com only: it resolves a free-form reference in one call, which the
 * BSB's source can't do (it serves whole chapters keyed by book code). The BSB
 * is excluded at the type level rather than failing at runtime.
 */
export async function fetchPassage(
  reference: string,
  translation: Exclude<Translation, 'bsb'> = 'web',
): Promise<string> {
  const slug = reference.toLowerCase().replace(/ /g, '+');
  const url = `https://bible-api.com/${slug}?translation=${translation}`;
  const resp = await fetch(url);
  if (!resp.ok) throw new Error(LOAD_FAILED);
  const data = await resp.json();
  return String(data.text ?? '').replace(/\s+/g, ' ').trim();
}

/**
 * Parse a search query into a book (+ optional chapter). Mirrors the prototype:
 * exact name → de-spaced → startsWith prefix. The verse part is parsed but the
 * jump targets the chapter. Returns null when nothing matches.
 */
export function parseReference(
  query: string,
): { book: BibleBook; chapter?: number; verse?: number } | null {
  const raw = query.trim();
  // Verse and range are captured, not just tolerated. Built plans cite
  // passages like "Ruth 1:6-18", and the old pattern stopped at an optional
  // ":6", so anything with a range failed to parse at all and the reader link
  // fell back to the plain reading screen.
  const m = raw.match(/^(\d?\s?[a-z][a-z ]*?)\s*(\d+)?(?::(\d+)(?:\s*-\s*\d+)?)?$/i);
  if (!m) return null;

  const namePart = m[1].trim().toLowerCase();
  if (namePart.length < 3) return null;
  const despaced = namePart.replace(/\s+/g, '');

  const book =
    BIBLE_BOOKS.find((b) => b.name.toLowerCase() === namePart) ||
    BIBLE_BOOKS.find((b) => b.name.toLowerCase().replace(/\s+/g, '') === despaced) ||
    BIBLE_BOOKS.find((b) => b.name.toLowerCase().startsWith(namePart));
  if (!book) return null;

  let chapter = m[2] ? parseInt(m[2], 10) : undefined;
  if (chapter !== undefined) chapter = Math.max(1, Math.min(book.chapters, chapter));
  // The verse is the start of the range, so the reader can open on it.
  const verse = m[3] ? parseInt(m[3], 10) : undefined;
  return { book, chapter, verse };
}
