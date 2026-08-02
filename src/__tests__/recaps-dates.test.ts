// recaps.ts imports the Supabase client at module load; stub it so the pure
// date helpers can be tested without a live client/env.
jest.mock('../lib/supabase', () => ({ supabase: { auth: {}, from: jest.fn() } }));

import {
  recapCutoffISO, RECAP_DAYS, RECAP_LABEL,
  recapHeadline, recapEncouragement, recapInsight,
} from '../lib/recaps';

const NOW = Date.UTC(2026, 6, 9, 12, 0, 0); // 2026-07-09T12:00:00.000Z

describe('recap date math', () => {
  it('week window is 7 days before now', () => {
    expect(recapCutoffISO('week', NOW)).toBe('2026-07-02T12:00:00.000Z');
  });

  it('month window is 30 days before now', () => {
    expect(recapCutoffISO('month', NOW)).toBe('2026-06-09T12:00:00.000Z');
  });

  it('quarter window is 90 days before now', () => {
    expect(recapCutoffISO('quarter', NOW)).toBe('2026-04-10T12:00:00.000Z');
  });

  it('exposes day counts and labels for each period', () => {
    expect(RECAP_DAYS).toEqual({ week: 7, month: 30, quarter: 90 });
    expect(RECAP_LABEL.week).toBe('This week');
    expect(RECAP_LABEL.quarter).toBe('This quarter');
  });
});

// The recap used to only state facts. These are the lines that congratulate and
// push forward, so they are worth pinning: they are the whole point of it.
describe('recap copy', () => {
  const ALL = [
    recapHeadline(7, 3, 'week'), recapHeadline(0, 0, 'week'), recapHeadline(1, 0, 'month'),
    recapEncouragement(7, 'week'), recapEncouragement(2, 'week'), recapEncouragement(0, 'quarter'),
  ];

  it('never uses an em dash', () => {
    for (const line of ALL) expect(line).not.toContain('—');
  });

  it('congratulates a strong stretch rather than just counting it', () => {
    expect(recapHeadline(7, 2, 'week')).toBe('7 days in the Word. Well done, both of you.');
  });

  it('stays gentle when nothing happened', () => {
    expect(recapHeadline(0, 0, 'week')).toBe('A gentle pause this week.');
    expect(recapHeadline(0, 4, 'week')).toBe('You carried each other in prayer this week.');
  });

  it('names the singular day correctly', () => {
    expect(recapHeadline(1, 0, 'week')).toBe('1 day in the Word, together.');
  });

  it('always ends with something to do next', () => {
    expect(recapEncouragement(6, 'week')).toContain('keep it');
    expect(recapEncouragement(2, 'week')).toContain('Pick your next reading');
    expect(recapEncouragement(0, 'month')).toContain('Start small');
  });
});

describe('recapInsight', () => {
  it('says nothing when there is too little to go on', () => {
    expect(recapInsight([], [], 'week')).toBeNull();
    expect(recapInsight(['family', 'health'], ['John 1'], 'week')).toBeNull();
  });

  it('names the subject most prayed about', () => {
    expect(recapInsight(['family', 'family', 'work'], [], 'week'))
      .toBe('Most of what you prayed for this week was your family.');
  });

  it('stays quiet on a tie, which says nothing', () => {
    expect(recapInsight(['family', 'family', 'work', 'work'], [], 'week')).toBeNull();
  });

  it("ignores 'other', which names no subject", () => {
    // 'other' leads on count, but the real subject is health.
    expect(recapInsight(['other', 'other', 'other', 'health'], [], 'week')).toBeNull();
    expect(recapInsight(['other', 'health', 'health', 'health'], [], 'week'))
      .toBe('Most of what you prayed for this week was health.');
  });

  it('falls back to the book most read', () => {
    expect(recapInsight([], ['John 1', 'John 2', 'Psalm 23'], 'week'))
      .toBe('You spent most of your reading in John.');
  });

  it('handles numbered books', () => {
    expect(recapInsight([], ['1 Samuel 3', '1 Samuel 4', 'Ruth 1'], 'month'))
      .toBe('You spent most of your reading in 1 Samuel.');
  });
});
