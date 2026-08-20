jest.mock('../lib/supabase', () => ({
  supabase: { auth: { getSession: jest.fn() }, from: jest.fn(), rpc: jest.fn() },
}));

import { activityTitle, activityRoute, getActivity, type ActivityItem } from '../lib/activity';
import { supabase } from '../lib/supabase';

const mockRpc = supabase.rpc as jest.Mock;

const item = (over: Partial<ActivityItem>): ActivityItem => ({
  kind: 'prayer',
  id: 'a1',
  actorId: 'them',
  happenedAt: '2026-08-09T10:00:00Z',
  preview: null,
  target: {},
  ...over,
});

beforeEach(() => jest.clearAllMocks());

// A reaction carries no body, so the sentence has to supply the whole meaning.
// Getting these wrong means the record says something the app did not do.
describe('activityTitle', () => {
  it('names each kind of response', () => {
    const r = (responseKind: string) =>
      activityTitle(item({ kind: 'response', target: { responseKind, day: 3 } }), 'Ammy');
    expect(r('heart')).toBe('Ammy left a heart on your reflection');
    expect(r('amen')).toBe('Ammy said amen to your reflection');
    expect(r('quote')).toBe('Ammy kept a line from your reflection');
    expect(r('reply')).toBe('Ammy replied to you');
  });

  it('names prayers, dreams and verse marks', () => {
    expect(activityTitle(item({ kind: 'prayer' }), 'Ammy')).toBe('Ammy added a prayer');
    expect(activityTitle(item({ kind: 'dream' }), 'Ammy')).toBe('Ammy wrote down a dream');
    expect(activityTitle(item({ kind: 'note', target: { book: 'John', chapter: 1, verse: 5 } }), 'Ammy'))
      .toBe('Ammy took note of John 1:5');
    expect(activityTitle(
      item({ kind: 'verse_comment', target: { commentKind: 'comment', book: 'Ruth', chapter: 1, verse: 16 } }),
      'Ammy',
    )).toBe('Ammy said something on Ruth 1:16');
  });

  it('never writes an em dash', () => {
    // Christian's rule, and this file is all developer-authored copy.
    const all = [
      activityTitle(item({ kind: 'response', target: { responseKind: 'heart' } }), 'Ammy'),
      activityTitle(item({ kind: 'prayer' }), 'Ammy'),
      activityTitle(item({ kind: 'dream' }), 'Ammy'),
      activityTitle(item({ kind: 'note', target: { book: 'John', chapter: 1, verse: 5 } }), 'Ammy'),
    ].join(' ');
    expect(all).not.toContain('—');
  });
});

describe('activityRoute', () => {
  it('sends a response to the reveal for its own day', () => {
    // Pinned by day for the same reason the partner push carries one:
    // current_day may have moved on since.
    expect(activityRoute(item({ kind: 'response', target: { day: 4 } })))
      .toEqual({ pathname: '/(tabs)/today/reveal', params: { day: '4' }, anchored: false });
  });

  it('refuses to guess when a response has no day', () => {
    expect(activityRoute(item({ kind: 'response', target: {} }))).toBeNull();
  });

  it('opens dreams behind the prayers toggle', () => {
    expect(activityRoute(item({ kind: 'dream' })))
      .toEqual({ pathname: '/(tabs)/prayers', params: { tab: 'dreams' }, anchored: false });
  });

  it('reads a note in the chapter and a comment on the discussion page', () => {
    const target = { book: 'John', chapter: 1, verse: 5 };
    const note = activityRoute(item({ kind: 'note', target }));
    const comment = activityRoute(item({ kind: 'verse_comment', target }));
    expect(note?.pathname).toBe('/(tabs)/bible/[book]/[chapter]');
    expect(comment?.pathname).toBe('/(tabs)/bible/verse');
    // Both are nested pushes in the bible stack, so both must carry an anchor
    // or their back link falls through to Today and strands the tab.
    expect(note?.anchored).toBe(true);
    expect(comment?.anchored).toBe(true);
  });

  it('refuses a verse mark missing its reference', () => {
    expect(activityRoute(item({ kind: 'note', target: { book: 'John' } }))).toBeNull();
  });
});

describe('getActivity', () => {
  it('maps the RPC rows into the shape screens read', async () => {
    mockRpc.mockResolvedValue({
      data: [{
        kind: 'prayer', id: 'p1', actor_id: 'them',
        happened_at: '2026-08-09T10:00:00Z', preview: 'for her interview',
        target: { prayerId: 'p1' },
      }],
      error: null,
    });

    await expect(getActivity()).resolves.toEqual([{
      kind: 'prayer', id: 'p1', actorId: 'them',
      happenedAt: '2026-08-09T10:00:00Z', preview: 'for her interview',
      target: { prayerId: 'p1' },
    }]);
  });

  it('passes the cursor through for the next page', async () => {
    mockRpc.mockResolvedValue({ data: [], error: null });
    await getActivity('2026-08-01T00:00:00Z', 10);
    expect(mockRpc).toHaveBeenCalledWith('activity_feed', {
      p_before: '2026-08-01T00:00:00Z',
      p_limit: 10,
    });
  });

  it('throws rather than reporting an empty feed when the read fails', async () => {
    mockRpc.mockResolvedValue({ data: null, error: { message: 'nope' } });
    await expect(getActivity()).rejects.toBeTruthy();
  });
});
