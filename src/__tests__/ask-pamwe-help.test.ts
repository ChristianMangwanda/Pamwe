import { askPamweHelp } from '../lib/askPamwe';
import { supabase } from '../lib/supabase';

jest.mock('../lib/supabase', () => ({
  supabase: {
    functions: { invoke: jest.fn() },
  },
}));

const mockInvoke = supabase.functions.invoke as jest.Mock;

describe('askPamweHelp', () => {
  beforeEach(() => mockInvoke.mockReset());

  it('returns an answer and keeps only references whose book resolves', async () => {
    mockInvoke.mockResolvedValue({
      data: {
        off_topic: false,
        answer: 'Read it slowly together.',
        references: [
          { reference: 'Psalm 23', note: 'a shepherd psalm' },
          { reference: 'Gandalf 3', note: 'not a book' },
        ],
      },
      error: null,
    });
    const res = await askPamweHelp('a psalm for a hard day');
    expect(res.kind).toBe('answer');
    if (res.kind === 'answer') {
      expect(res.answer).toBe('Read it slowly together.');
      expect(res.references).toHaveLength(1);
      expect(res.references[0].reference).toBe('Psalm 23');
    }
  });

  it('passes help mode to the edge function', async () => {
    mockInvoke.mockResolvedValue({ data: { off_topic: false, answer: 'ok', references: [] }, error: null });
    await askPamweHelp('how does the reveal work');
    expect(mockInvoke).toHaveBeenCalledWith('ask-pamwe', expect.objectContaining({
      body: expect.objectContaining({ mode: 'help' }),
    }));
  });

  it('surfaces the gentle line when the model flags off topic', async () => {
    mockInvoke.mockResolvedValue({ data: { off_topic: true, message: 'Pamwe is here for Scripture.' }, error: null });
    const res = await askPamweHelp('teach me quantum physics');
    expect(res.kind).toBe('off_topic');
    if (res.kind === 'off_topic') expect(res.message).toContain('Scripture');
  });

  it('returns a gentle error (never throws) when the call fails', async () => {
    mockInvoke.mockResolvedValue({ data: null, error: new Error('boom') });
    const res = await askPamweHelp('anything');
    expect(res.kind).toBe('error');
  });

  it('treats a missing answer as an error', async () => {
    mockInvoke.mockResolvedValue({ data: { off_topic: false, answer: '   ', references: [] }, error: null });
    const res = await askPamweHelp('anything');
    expect(res.kind).toBe('error');
  });
});
