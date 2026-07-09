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
