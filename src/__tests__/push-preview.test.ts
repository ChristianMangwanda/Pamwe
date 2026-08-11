// The edge helper is Deno-flavoured TypeScript but fanOut is pure, so it can be
// exercised here. Duplicated rather than imported because supabase/functions is
// outside the app's tsconfig and imports from esm.sh.
type Msg = { to: string; title: string; body: string; data?: Record<string, unknown> };

function fanOut(tokens: string[], message: Omit<Msg, 'to'>, preview?: string | null): Msg[] {
  const shown = preview === 'generic'
    ? { ...message, title: 'Pamwe', body: 'Something is waiting for you.' }
    : message;
  return tokens.map((to) => ({ ...shown, to }));
}

const REAL = {
  title: 'Ammy just wrote theirs',
  body: 'Write yours and open them together.',
  data: { type: 'partner_entry', day: 4, reveal: true },
};

describe('fanOut across devices', () => {
  it('addresses every device a person is signed in on', () => {
    // One column per account meant one phone per person: a second device
    // overwrote the first and the first went quiet.
    const out = fanOut(['tok-a', 'tok-b'], REAL);
    expect(out.map((m) => m.to)).toEqual(['tok-a', 'tok-b']);
    expect(out.every((m) => m.title === REAL.title)).toBe(true);
  });

  it('sends nothing when a person has no devices', () => {
    expect(fanOut([], REAL)).toEqual([]);
  });
});

describe('lock screen privacy', () => {
  it('says only that something happened when previews are private', () => {
    const [m] = fanOut(['tok'], REAL, 'generic');
    expect(m.title).toBe('Pamwe');
    expect(m.body).toBe('Something is waiting for you.');
    // The partner's name and what they did must not survive onto a locked phone.
    expect(JSON.stringify({ t: m.title, b: m.body })).not.toContain('Ammy');
  });

  it('keeps the routing data, so the tap still lands in the right place', () => {
    const [m] = fanOut(['tok'], REAL, 'generic');
    expect(m.data).toEqual(REAL.data);
  });

  it('shows the real words on full, and on an unset preference', () => {
    expect(fanOut(['tok'], REAL, 'full')[0].title).toBe(REAL.title);
    expect(fanOut(['tok'], REAL, null)[0].title).toBe(REAL.title);
    expect(fanOut(['tok'], REAL, undefined)[0].title).toBe(REAL.title);
  });

  it('hides the words on every device, not just the first', () => {
    const out = fanOut(['a', 'b', 'c'], REAL, 'generic');
    expect(out.every((m) => m.title === 'Pamwe')).toBe(true);
  });
});
