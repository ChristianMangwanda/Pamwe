// Minimal Bible browser support. Uses bible-api.com (WEB translation, public domain)
// for on-demand chapter fetching. No local seed required.

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

export type Translation = 'web' | 'kjv' | 'bbe';

export const TRANSLATION_NAMES: Record<Translation, string> = {
  web: 'World English Bible',
  kjv: 'King James Version',
  bbe: 'Bible in Basic English',
};

export interface BibleVerse {
  verse: number;
  text: string;
}

const chapterCache = new Map<string, { reference: string; verses: BibleVerse[] }>();

/**
 * Fetch a chapter as individual verses (for the verse-by-verse reader) from
 * bible-api.com. Cached per (book, chapter, translation). Throws on error.
 */
export async function fetchChapterVerses(
  book: string,
  chapter: number,
  translation: Translation = 'web',
): Promise<{ reference: string; verses: BibleVerse[] }> {
  const key = `${book}|${chapter}|${translation}`;
  const cached = chapterCache.get(key);
  if (cached) return cached;

  const slug = book.toLowerCase().replace(/ /g, '+');
  const url = `https://bible-api.com/${slug}+${chapter}?translation=${translation}`;
  const resp = await fetch(url);
  if (!resp.ok) throw new Error(`bible-api.com returned HTTP ${resp.status} for ${book} ${chapter}`);
  const data = await resp.json();
  const verses: BibleVerse[] = (Array.isArray(data.verses) ? data.verses : []).map((v: any) => ({
    verse: v.verse,
    text: String(v.text ?? '').replace(/\s+/g, ' ').trim(),
  }));
  const result = { reference: data.reference ?? `${book} ${chapter}`, verses };
  chapterCache.set(key, result);
  return result;
}

/**
 * Fetch a passage's plain text by reference string (e.g. "John 3:1-16"). Used for
 * custom-plan days whose passage_text is NULL (fetched live instead of seeded).
 */
export async function fetchPassage(reference: string, translation: Translation = 'web'): Promise<string> {
  const slug = reference.toLowerCase().replace(/ /g, '+');
  const url = `https://bible-api.com/${slug}?translation=${translation}`;
  const resp = await fetch(url);
  if (!resp.ok) throw new Error(`bible-api.com returned HTTP ${resp.status} for ${reference}`);
  const data = await resp.json();
  return String(data.text ?? '').replace(/\s+/g, ' ').trim();
}

/**
 * Parse a search query into a book (+ optional chapter). Mirrors the prototype:
 * exact name → de-spaced → startsWith prefix. The verse part is parsed but the
 * jump targets the chapter. Returns null when nothing matches.
 */
export function parseReference(query: string): { book: BibleBook; chapter?: number } | null {
  const raw = query.trim();
  const m = raw.match(/^(\d?\s?[a-z][a-z ]*?)\s*(\d+)?(?::\d+)?$/i);
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
  return { book, chapter };
}
