jest.mock('../lib/supabase', () => ({ supabase: {} }));

import { pickOnThisDay, ReflectionSummary } from '../lib/reflections';

const NOW = new Date('2026-07-11T12:00:00Z');

function refl(id: string, daysAgo: number): ReflectionSummary {
  return {
    id,
    couplePlanId: 'cp',
    planId: 'p',
    planTitle: 'Plan',
    dayNumber: 1,
    reference: 'John 1',
    title: null,
    book: 'John',
    snippet: 'snippet',
    revealedAt: new Date(NOW.getTime() - daysAgo * 86_400_000).toISOString(),
  };
}

describe('pickOnThisDay', () => {
  it('prefers a reflection from about a month ago', () => {
    const pick = pickOnThisDay([refl('recent', 2), refl('month', 30), refl('week', 7)], NOW);
    expect(pick?.item.id).toBe('month');
    expect(pick?.label).toBe('About a month ago');
  });

  it('falls back to about a week ago', () => {
    const pick = pickOnThisDay([refl('recent', 2), refl('week', 7)], NOW);
    expect(pick?.item.id).toBe('week');
    expect(pick?.label).toBe('A week ago');
  });

  it('returns null when the history is too young', () => {
    expect(pickOnThisDay([refl('a', 0), refl('b', 2), refl('c', 4)], NOW)).toBeNull();
  });

  it('returns null for an empty history', () => {
    expect(pickOnThisDay([], NOW)).toBeNull();
  });

  it('ignores reflections older than the month window', () => {
    const pick = pickOnThisDay([refl('old', 60)], NOW);
    expect(pick).toBeNull();
  });
});
