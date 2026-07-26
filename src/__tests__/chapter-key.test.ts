// planBuilder imports the supabase client, which boots createClient at module
// load with app env vars this suite doesn't have. chapterKey is pure.
jest.mock('../lib/supabase', () => ({
  supabase: { auth: { getSession: jest.fn() }, from: jest.fn() },
}));

import { chapterKey } from '../lib/planBuilder';

// The prompt library is keyed by chapter, so every passage_reference the app
// stores has to resolve to exactly one (book, chapter) pair. M'Cheyne stores 38
// of its 437 days as ranges, and Psalms are stored singular ("Psalm 23"), so
// both shapes have to land on the right key or the whole library silently misses.
describe('chapterKey', () => {
  it('keys a plain reference', () => {
    expect(chapterKey('Daniel 5')).toBe('Daniel|5');
    expect(chapterKey('John 11')).toBe('John|11');
  });

  it('keys a numbered book, where the leading digit is part of the name', () => {
    expect(chapterKey('1 Corinthians 13')).toBe('1 Corinthians|13');
    expect(chapterKey('2 Kings 4')).toBe('2 Kings|4');
  });

  it('keys a multi-word book', () => {
    expect(chapterKey('Song of Solomon 8')).toBe('Song of Solomon|8');
  });

  it('keys a range on its FIRST chapter', () => {
    // They read both, so a question grounded in the first is still grounded in
    // something they actually read.
    expect(chapterKey('Genesis 9-10')).toBe('Genesis|9');
    expect(chapterKey('1 Kings 4-5')).toBe('1 Kings|4');
    expect(chapterKey('Ruth 3-4')).toBe('Ruth|3');
    expect(chapterKey('Genesis 9 - 10')).toBe('Genesis|9');
  });

  it('keeps Psalms singular, the way plan_days stores them', () => {
    // Assuming "Psalms" here would miss every psalm in the library.
    expect(chapterKey('Psalm 23')).toBe('Psalm|23');
  });

  it('tolerates surrounding whitespace', () => {
    expect(chapterKey('  Exodus 14  ')).toBe('Exodus|14');
  });

  it('returns null for anything it cannot place, so the caller falls back', () => {
    expect(chapterKey('')).toBeNull();
    expect(chapterKey('Genesis')).toBeNull();
    expect(chapterKey('John 3:16')).toBeNull();
    expect(chapterKey(undefined as unknown as string)).toBeNull();
  });
});
