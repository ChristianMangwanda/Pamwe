// Real bible.helloao.org response for BSB Psalm 23, trimmed to the first
// verses. Kept verbatim because the shapes are the whole point: poetry arrives
// as { text, poem } fragments, footnotes as a bare { noteId }, and the chapter
// body carries headings and Hebrew subtitles alongside the verses.
const PSALM_23 = {
  chapter: {
    content: [
      { type: 'heading', content: ['The LORD Is My Shepherd'] },
      { type: 'hebrew_subtitle', content: ['A Psalm of David.'] },
      {
        type: 'verse',
        number: 1,
        content: [
          { text: 'The LORD is my shepherd;', poem: 1 },
          { noteId: 50 },
          { text: 'I shall not want.', poem: 2 },
        ],
      },
      {
        type: 'verse',
        number: 2,
        content: [
          { text: 'He makes me lie down in green pastures;', poem: 1 },
          { text: 'He leads me beside quiet waters.', poem: 2 },
        ],
      },
      {
        type: 'verse',
        number: 3,
        content: [
          { text: 'He restores my soul;', poem: 1 },
          { text: 'He guides me in the paths of righteousness', poem: 2 },
          { lineBreak: true },
          { text: 'for the sake of His name.', poem: 2 },
        ],
      },
      { type: 'line_break' },
    ],
  },
};

// bible-api.com's shape, for the translations it still serves.
const JOHN_1_WEB = {
  reference: 'John 1',
  verses: [{ verse: 1, text: 'In the beginning was the Word,\n and the Word was with God.' }],
};

describe('BSB chapters (bible.helloao.org)', () => {
  let bible: typeof import('../lib/bible');
  let mockFetch: jest.Mock;

  beforeEach(() => {
    // The chapter cache lives at module scope, so a fresh module per test keeps
    // one test's fetch from being served out of another's cache.
    jest.resetModules();
    bible = require('../lib/bible');
    mockFetch = jest.fn();
    (global as any).fetch = mockFetch;
  });

  function respondWith(body: unknown, ok = true) {
    mockFetch.mockResolvedValue({ ok, json: async () => body });
  }

  it('keys the request by USFM book code', async () => {
    respondWith(PSALM_23);
    await bible.fetchChapterVerses('Psalms', 23, 'bsb');

    expect(mockFetch).toHaveBeenCalledWith('https://bible.helloao.org/api/BSB/PSA/23.json');
  });

  it('drops footnote markers so they cannot land mid-verse', async () => {
    respondWith(PSALM_23);
    const { verses } = await bible.fetchChapterVerses('Psalms', 23, 'bsb');

    // { noteId: 50 } sits between the two halves of verse 1.
    expect(verses[0]).toEqual({ verse: 1, text: 'The LORD is my shepherd; I shall not want.' });
    expect(verses[0].text).not.toMatch(/50/);
  });

  it('joins poetry fragments and line breaks into readable prose', async () => {
    respondWith(PSALM_23);
    const { verses } = await bible.fetchChapterVerses('Psalms', 23, 'bsb');

    expect(verses[2]).toEqual({
      verse: 3,
      text: 'He restores my soul; He guides me in the paths of righteousness for the sake of His name.',
    });
  });

  it('returns only verses, not headings or Hebrew subtitles', async () => {
    respondWith(PSALM_23);
    const { verses, reference } = await bible.fetchChapterVerses('Psalms', 23, 'bsb');

    expect(verses).toHaveLength(3);
    expect(verses.map((v) => v.verse)).toEqual([1, 2, 3]);
    expect(JSON.stringify(verses)).not.toMatch(/Shepherd|Psalm of David/);
    expect(reference).toBe('Psalms 23');
  });

  it('surfaces a load failure rather than an empty chapter', async () => {
    respondWith({}, false);
    await expect(bible.fetchChapterVerses('Psalms', 23, 'bsb')).rejects.toThrow(/couldn't load/);
  });

  it('maps every book in the canon to a code the API accepts', async () => {
    respondWith(PSALM_23);
    // A missing code would throw the generic load error before any fetch.
    for (const book of bible.BIBLE_BOOKS) {
      await expect(bible.fetchChapterVerses(book.name, 1, 'bsb')).resolves.toBeDefined();
    }
    expect(mockFetch).toHaveBeenCalledTimes(66);
  });
});

describe('other translations still use bible-api.com', () => {
  let bible: typeof import('../lib/bible');
  let mockFetch: jest.Mock;

  beforeEach(() => {
    jest.resetModules();
    bible = require('../lib/bible');
    mockFetch = jest.fn().mockResolvedValue({ ok: true, json: async () => JOHN_1_WEB });
    (global as any).fetch = mockFetch;
  });

  it('routes a non-BSB translation to bible-api.com and collapses whitespace', async () => {
    const { verses } = await bible.fetchChapterVerses('John', 1, 'kjv');

    expect(mockFetch).toHaveBeenCalledWith('https://bible-api.com/john+1?translation=kjv');
    expect(verses[0].text).toBe('In the beginning was the Word, and the Word was with God.');
  });

  it('offers BSB alongside the public-domain set, and no longer offers YLT', () => {
    expect(bible.TRANSLATIONS).toContain('bsb');
    expect(bible.TRANSLATIONS).not.toContain('ylt');
    expect(bible.TRANSLATION_NAMES.bsb).toBe('Berean Standard Bible');
  });
});
