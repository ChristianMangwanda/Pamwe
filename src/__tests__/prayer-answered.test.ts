const chain: any = {};
jest.mock('../lib/supabase', () => ({
  supabase: { auth: { getSession: jest.fn() }, from: jest.fn(() => chain) },
}));

import { markAnswered, reopenPrayer } from '../lib/prayers';
import { supabase } from '../lib/supabase';

let captured: any = null;

beforeEach(() => {
  jest.clearAllMocks();
  captured = null;
  chain.update = jest.fn((patch: any) => { captured = patch; return chain; });
  chain.eq = jest.fn(() => chain);
  chain.select = jest.fn(() => chain);
  chain.single = jest.fn(() => Promise.resolve({ data: { id: 'p1' }, error: null }));
});

describe('markAnswered', () => {
  it('records the note about how it was answered', async () => {
    await markAnswered('p1', 'She got the job.');
    expect(captured.status).toBe('answered');
    expect(captured.answer_note).toBe('She got the job.');
    expect(captured.answered_at).toEqual(expect.any(String));
  });

  it('treats a blank note as no note', async () => {
    await markAnswered('p1', '   ');
    expect(captured.answer_note).toBeNull();
  });

  it('accepts no note at all, since the note is optional', async () => {
    await markAnswered('p1');
    expect(captured.answer_note).toBeNull();
    expect(captured.status).toBe('answered');
  });
});

// Marking answered used to be a one-way door, and it sits on a swipe card, so
// it is the easiest tap in the app to make by accident.
describe('reopenPrayer', () => {
  it('puts the prayer back among the ones still being carried', async () => {
    await reopenPrayer('p1');
    expect(captured).toEqual({ status: 'active', answered_at: null, answer_note: null });
  });

  it('clears the answer note rather than leaving it on an open prayer', async () => {
    await reopenPrayer('p1');
    expect(captured.answer_note).toBeNull();
  });

  it('throws when the write fails, so the screen can say so', async () => {
    chain.single = jest.fn(() => Promise.resolve({ data: null, error: { message: 'nope' } }));
    await expect(reopenPrayer('p1')).rejects.toBeTruthy();
  });

  it('targets exactly the prayer asked for', async () => {
    await reopenPrayer('p1');
    expect(supabase.from).toHaveBeenCalledWith('prayers');
    expect(chain.eq).toHaveBeenCalledWith('id', 'p1');
  });
});
