// recaps.ts imports the Supabase client at module load; stub it so the pure
// date helpers can be tested without a live client/env.
jest.mock('../lib/supabase', () => ({ supabase: { auth: {}, from: jest.fn() } }));

import { recapCutoffISO, RECAP_DAYS, RECAP_LABEL } from '../lib/recaps';

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
