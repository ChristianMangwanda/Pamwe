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
