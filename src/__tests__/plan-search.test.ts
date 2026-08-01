jest.mock('../lib/supabase', () => ({ supabase: {} }));

import { searchPlans, filterPlans, topicsIn } from '../lib/plans';

const PLANS = [
  { title: 'Gospel of John', book_label: 'John', topics: ['gospels', 'jesus', 'faith'], duration_days: 21 },
  { title: 'A Cord of Three Strands', book_label: 'Ecclesiastes', topics: ['marriage', 'together', 'faith'], duration_days: 21 },
  { title: 'Psalms of Comfort', book_label: 'Psalms', topics: ['comfort', 'grief', 'waiting'], duration_days: 30 },
  { title: "Courage in the Lion's Den", tagline: 'Made for you', topics: ['faith', 'courage'], duration_days: 14 },
];

// The search field is the new front door: it looks through what the couple can
// already open, and only offers to build when it finds nothing.
describe('searchPlans', () => {
  it('returns everything for an empty query', () => {
    expect(searchPlans(PLANS, '')).toHaveLength(4);
    expect(searchPlans(PLANS, '   ')).toHaveLength(4);
  });

  it('matches on title', () => {
    expect(searchPlans(PLANS, 'psalms').map((p) => p.title)).toEqual(['Psalms of Comfort']);
  });

  it('matches on a topic tag the title never mentions', () => {
    // "grief" appears nowhere in "Psalms of Comfort", which is the point of tags.
    expect(searchPlans(PLANS, 'grief').map((p) => p.title)).toEqual(['Psalms of Comfort']);
  });

  it('matches on the book behind the title', () => {
    expect(searchPlans(PLANS, 'ecclesiastes').map((p) => p.title)).toEqual(['A Cord of Three Strands']);
  });

  it('ignores case', () => {
    expect(searchPlans(PLANS, 'GOSPEL')).toHaveLength(1);
  });

  it('narrows with each extra term rather than widening', () => {
    // Three plans carry "faith"; adding "marriage" must leave one, not four.
    expect(searchPlans(PLANS, 'faith')).toHaveLength(3);
    expect(searchPlans(PLANS, 'faith marriage').map((p) => p.title)).toEqual(['A Cord of Three Strands']);
  });

  it('returns nothing when there is no match, so the build offer can appear', () => {
    expect(searchPlans(PLANS, 'quantum physics')).toHaveLength(0);
  });

  it('survives plans with no topics or labels', () => {
    expect(searchPlans([{ title: 'Bare' }], 'bare')).toHaveLength(1);
    expect(searchPlans([{ title: 'Bare' }], 'faith')).toHaveLength(0);
  });
});

describe('filterPlans', () => {
  it('filters by topic', () => {
    expect(filterPlans(PLANS, 'marriage', null)).toHaveLength(1);
  });

  it('filters by exact length', () => {
    expect(filterPlans(PLANS, null, 21)).toHaveLength(2);
    expect(filterPlans(PLANS, null, 7)).toHaveLength(0);
  });

  it('combines topic and length', () => {
    expect(filterPlans(PLANS, 'faith', 21)).toHaveLength(2);
    expect(filterPlans(PLANS, 'faith', 14).map((p) => p.title)).toEqual(["Courage in the Lion's Den"]);
  });

  it('is a no-op with neither filter set', () => {
    expect(filterPlans(PLANS, null, null)).toHaveLength(4);
  });
});

describe('topicsIn', () => {
  it('offers the most common topics first', () => {
    // faith is on three plans, so it leads.
    expect(topicsIn(PLANS)[0]).toBe('faith');
  });

  it('never offers a topic no plan carries', () => {
    const offered = topicsIn(PLANS);
    for (const t of offered) {
      expect(filterPlans(PLANS, t, null).length).toBeGreaterThan(0);
    }
  });

  it('deduplicates across plans', () => {
    expect(new Set(topicsIn(PLANS)).size).toBe(topicsIn(PLANS).length);
  });
});
