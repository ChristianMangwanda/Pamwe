// planBuilder imports the Supabase client at module load; stub it so the pure
// generateSchedule function can be tested without a live client/env.
jest.mock('../lib/supabase', () => ({ supabase: { auth: {}, from: jest.fn() } }));

import { generateSchedule } from '../lib/planBuilder';

describe('generateSchedule', () => {
  it('walks chapters within a book', () => {
    expect(generateSchedule('John', 1, 3)).toEqual(['John 1', 'John 2', 'John 3']);
  });

  it('crosses the book boundary at the canon order', () => {
    // Jude has a single chapter; the next book is Revelation.
    expect(generateSchedule('Jude', 1, 2)).toEqual(['Jude 1', 'Revelation 1']);
  });

  it('clamps at the end of the canon (repeats the final chapter)', () => {
    expect(generateSchedule('Revelation', 22, 3)).toEqual([
      'Revelation 22', 'Revelation 22', 'Revelation 22',
    ]);
  });

  it('starts from a mid-book chapter', () => {
    expect(generateSchedule('Genesis', 49, 3)).toEqual(['Genesis 49', 'Genesis 50', 'Exodus 1']);
  });

  it('falls back to Genesis 1 for an unknown book', () => {
    expect(generateSchedule('Nowhere', 1, 1)).toEqual(['Genesis 1']);
  });

  it('always returns exactly `days` entries', () => {
    expect(generateSchedule('Psalms', 1, 30)).toHaveLength(30);
  });
});
