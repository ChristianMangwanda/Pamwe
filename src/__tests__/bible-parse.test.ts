import { parseReference } from '../lib/bible';

describe('parseReference', () => {
  it('matches book + chapter', () => {
    const r = parseReference('john 3');
    expect(r?.book.name).toBe('John');
    expect(r?.chapter).toBe(3);
  });

  it('matches a book name only (no chapter)', () => {
    const r = parseReference('psalms');
    expect(r?.book.name).toBe('Psalms');
    expect(r?.chapter).toBeUndefined();
  });

  it('matches a numbered book by prefix', () => {
    const r = parseReference('1 cor');
    expect(r?.book.name).toBe('1 Corinthians');
  });

  it('clamps the chapter to the book range', () => {
    const r = parseReference('psalm 999');
    expect(r?.book.name).toBe('Psalms');
    expect(r?.chapter).toBe(150);
  });

  it('parses but discards the verse, jumping to the chapter', () => {
    const r = parseReference('psalm 23:4');
    expect(r?.book.name).toBe('Psalms');
    expect(r?.chapter).toBe(23);
  });

  it('matches by startsWith prefix', () => {
    expect(parseReference('gen')?.book.name).toBe('Genesis');
  });

  it('returns null for no match or too-short input', () => {
    expect(parseReference('zzzz')).toBeNull();
    expect(parseReference('')).toBeNull();
    expect(parseReference('jo')).toBeNull();
  });
});

// Built plans cite passages, not just chapters ("Ruth 1:6-18"). The old
// pattern stopped at an optional ":6", so any range failed to parse at all and
// the reader link silently fell back to the plain reading screen.
describe('parseReference with verses and ranges', () => {
  it('parses a verse range and keeps the start verse', () => {
    const r = parseReference('Ruth 1:6-18');
    expect(r?.book.name).toBe('Ruth');
    expect(r?.chapter).toBe(1);
    expect(r?.verse).toBe(6);
  });

  it('parses a single verse', () => {
    expect(parseReference('John 21:15')).toMatchObject({ chapter: 21, verse: 15 });
  });

  it('parses a numbered, multi-word book with a range', () => {
    const r = parseReference('1 Corinthians 13:4-7');
    expect(r?.book.name).toBe('1 Corinthians');
    expect(r?.chapter).toBe(13);
    expect(r?.verse).toBe(4);
  });

  it('leaves verse undefined for a plain chapter', () => {
    const r = parseReference('Psalm 23');
    expect(r?.chapter).toBe(23);
    expect(r?.verse).toBeUndefined();
  });

  it('tolerates spaces around the range dash', () => {
    expect(parseReference('Psalm 62:5 - 8')).toMatchObject({ chapter: 62, verse: 5 });
  });
});

// A generated day can run into the next chapter ("Matthew 5:1-6:34"). The
// reader opens one chapter at a time, so a span resolves to where it starts.
describe('parseReference with two-chapter spans', () => {
  it('parses a span and lands on the opening chapter and verse', () => {
    const r = parseReference('Matthew 5:1-6:34');
    expect(r?.book.name).toBe('Matthew');
    expect(r?.chapter).toBe(5);
    expect(r?.verse).toBe(1);
  });

  it('parses a span in a numbered book', () => {
    expect(parseReference('1 Corinthians 12:1-13:13')).toMatchObject({ chapter: 12, verse: 1 });
  });

  it('still rejects a bare chapter range, which the source cannot fetch', () => {
    // "John 1-3" answers "too many chapters", so it must never reach the reader
    // looking like a valid reference.
    const r = parseReference('John 1-3');
    // It may resolve the book, but never as chapter 1 through 3.
    expect(r?.verse).toBeUndefined();
  });
});

// The far end of a range, which the reader needs to open a plan day on the
// passage it names rather than on the whole chapter it sits in. Christian,
// 2026-08-07: "sometimes you just want parts of a passage, not the whole thing".
describe('parseReference end of range', () => {
  it('keeps both ends of a range inside one chapter', () => {
    expect(parseReference('Matthew 6:19-34')).toMatchObject({ chapter: 6, verse: 19, endVerse: 34 });
  });

  it('keeps both ends across spaces and numbered books', () => {
    expect(parseReference('1 Corinthians 13:4 - 7')).toMatchObject({ verse: 4, endVerse: 7 });
  });

  it('leaves the end undefined for a single verse', () => {
    expect(parseReference('John 21:15')?.endVerse).toBeUndefined();
  });

  it('leaves the end undefined for a plain chapter', () => {
    expect(parseReference('Psalm 23')?.endVerse).toBeUndefined();
  });

  // The reader shows one chapter, so a span that runs into the next one has no
  // end inside this chapter. It opens at the start and shows the chapter whole,
  // which is exactly what it did before ranges existed.
  it('leaves the end undefined for a span that crosses a chapter', () => {
    const r = parseReference('Matthew 5:1-6:34');
    expect(r).toMatchObject({ chapter: 5, verse: 1 });
    expect(r?.endVerse).toBeUndefined();
  });
});
