import { milestoneFor, MILESTONE_COPY, MILESTONES } from '../lib/milestones';

describe('milestoneFor', () => {
  it('returns null below the first milestone', () => {
    expect(milestoneFor(0)).toBeNull();
    expect(milestoneFor(6)).toBeNull();
  });

  it('returns the highest milestone reached', () => {
    expect(milestoneFor(7)).toBe(7);
    expect(milestoneFor(29)).toBe(7);
    expect(milestoneFor(30)).toBe(30);
    expect(milestoneFor(99)).toBe(30);
    expect(milestoneFor(100)).toBe(100);
    expect(milestoneFor(365)).toBe(100);
  });

  it('has copy for every milestone, with no em dashes', () => {
    for (const m of MILESTONES) {
      const copy = MILESTONE_COPY[m];
      expect(copy.title.length).toBeGreaterThan(0);
      expect(copy.body.length).toBeGreaterThan(0);
      expect(copy.title).not.toContain('—');
      expect(copy.body).not.toContain('—');
    }
  });
});
