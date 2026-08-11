const mockInvoke = jest.fn();
jest.mock('../lib/supabase', () => ({ supabase: { functions: { invoke: (...a: unknown[]) => mockInvoke(...a) } } }));
jest.mock('../lib/bible', () => ({ parseReference: (r: string) => ({ book: { name: r.split(' ')[0] }, chapter: 1 }) }));
jest.mock('../lib/planBuilder', () => ({ generateSchedule: () => [] }));

import { buildPlan } from '../lib/askPamwe';

// functions.invoke() reports any non-2xx as an error with data null, so the
// server's own sentence used to be thrown away and replaced with a generic
// "resting for a moment". That is how two credit outages stayed invisible: the
// server said it could not reach a model, and the phone said it was resting.
function httpError(status: number, body: unknown) {
  return Object.assign(new Error('FunctionsHttpError'), {
    context: { json: () => Promise.resolve(body) } as unknown as Response,
  });
}

describe('buildPlan error reporting', () => {
  beforeEach(() => mockInvoke.mockReset());

  it('speaks the server sentence instead of the generic one', async () => {
    mockInvoke.mockResolvedValue({
      data: null,
      error: httpError(503, {
        error: 'Pamwe cannot build plans right now. This one is on our side, not on you or your connection. Everything in Browse is still here.',
        unavailable: true,
      }),
    });

    const res = await buildPlan('dealing with insecurities');

    expect(res.kind).toBe('error');
    if (res.kind !== 'error') return;
    expect(res.message).toContain('on our side');
    expect(res.message).not.toContain('resting');
    // The flag is what lets a caller tell a dead account from a bad answer
    // without matching on copy.
    expect(res.unavailable).toBe(true);
  });

  it('does not claim an outage for an ordinary bad answer', async () => {
    mockInvoke.mockResolvedValue({
      data: null,
      error: httpError(502, { error: 'Pamwe put that one together wrong. Try asking again.' }),
    });

    const res = await buildPlan('something');

    expect(res.kind).toBe('error');
    if (res.kind !== 'error') return;
    expect(res.message).toContain('Try asking again');
    expect(res.unavailable).toBe(false);
  });

  it('still says "try again" when the failure really is transient', async () => {
    // No readable body: a dropped connection or the 30s abort. Here the line is
    // true, which is the whole point of not using it everywhere else.
    mockInvoke.mockRejectedValue(new Error('Network request failed'));

    const res = await buildPlan('something');

    expect(res).toEqual({
      kind: 'error',
      message: 'Pamwe is resting for a moment. Try again in a bit.',
    });
  });

  it('falls back to the generic line when the body is unreadable', async () => {
    mockInvoke.mockResolvedValue({
      data: null,
      error: Object.assign(new Error('FunctionsHttpError'), {
        context: { json: () => Promise.reject(new Error('not json')) } as unknown as Response,
      }),
    });

    const res = await buildPlan('something');

    expect(res.kind).toBe('error');
    if (res.kind !== 'error') return;
    expect(res.message).toContain('resting');
  });
});
