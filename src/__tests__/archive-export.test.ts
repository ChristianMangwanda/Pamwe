// exportText is pure, but it lives beside the queries that fetch what it
// formats, and constructing the client needs env this suite has no business
// caring about.
jest.mock('../lib/supabase', () => ({ supabase: {} }));

import { exportText, ArchiveEntry } from '../lib/archive';

// The export is the one thing here that outlives the app. If Pamwe stops
// existing, this file is what a couple still has, so it is asserted like a
// document rather than like a payload.

const entry = (over: Partial<ArchiveEntry>): ArchiveEntry => ({
  id: 'e1',
  day_number: 1,
  user_id: 'a',
  text_content: null,
  transcript: null,
  submitted_at: '2026-03-01T09:00:00.000Z',
  reference: null,
  ...over,
});

const names = { a: 'Christian', b: 'Ammy' };

describe('exportText', () => {
  it('puts the oldest first, whatever order the rows arrived in', () => {
    const out = exportText([
      entry({ id: 'new', submitted_at: '2026-06-01T09:00:00.000Z', text_content: 'later' }),
      entry({ id: 'old', submitted_at: '2026-01-01T09:00:00.000Z', text_content: 'earlier' }),
    ], names, null);
    expect(out.indexOf('earlier')).toBeLessThan(out.indexOf('later'));
  });

  it('names whose words are whose', () => {
    const out = exportText([
      entry({ user_id: 'a', text_content: 'mine' }),
      entry({ id: 'e2', user_id: 'b', text_content: 'hers' }),
    ], names, null);
    expect(out).toContain('Christian');
    expect(out).toContain('Ammy');
  });

  it('falls back to the transcript when there was no typing', () => {
    const out = exportText([entry({ transcript: 'what I said out loud' })], names, null);
    expect(out).toContain('what I said out loud');
  });

  it('says a voice reflection existed even with no transcript', () => {
    // Better than a blank space under a date: the day happened, and the file
    // should not imply nothing was said.
    const out = exportText([entry({})], names, null);
    expect(out).toContain('(a voice reflection)');
  });

  it('counts what it contains', () => {
    const out = exportText([entry({}), entry({ id: 'e2' })], names, null);
    expect(out).toContain('2 reflections');
  });

  it('survives a person whose name it never learned', () => {
    const out = exportText([entry({ user_id: 'ghost', text_content: 'words' })], names, null);
    expect(out).toContain('Someone');
    expect(out).toContain('words');
  });
});
