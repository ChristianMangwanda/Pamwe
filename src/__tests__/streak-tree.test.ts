import { treeStage, stemTopFor } from '../components/ui/StreakTree';

describe('treeStage thresholds', () => {
  it('is a resting seed at 0', () => expect(treeStage(0)).toBe(0));
  it('is planted at 1-2', () => { expect(treeStage(1)).toBe(1); expect(treeStage(2)).toBe(1); });
  it('takes root at 3', () => expect(treeStage(3)).toBe(2));
  it('grows at 7', () => expect(treeStage(7)).toBe(3));
  it('reaches up at 14', () => expect(treeStage(14)).toBe(4));
  it('blooms at 30 and beyond', () => { expect(treeStage(30)).toBe(5); expect(treeStage(365)).toBe(5); });
});

// The stem used to snap between 6 fixed heights, so on all but 5 days of the
// first month nothing moved and the tree read as static art.
describe('stemTopFor growth', () => {
  it('lands exactly on the old heights at every stage boundary', () => {
    expect(stemTopFor(0)).toBe(70);
    expect(stemTopFor(1)).toBe(62);
    expect(stemTopFor(3)).toBe(50);
    expect(stemTopFor(7)).toBe(38);
    expect(stemTopFor(14)).toBe(26);
    expect(stemTopFor(30)).toBe(20);
  });

  it('rises a little on days that do not cross a threshold', () => {
    // The whole point of the change: day 8 must not look like day 7.
    expect(stemTopFor(8)).toBeLessThan(stemTopFor(7));
    expect(stemTopFor(10)).toBeLessThan(stemTopFor(8));
    expect(stemTopFor(4)).toBeLessThan(stemTopFor(3));
  });

  it('never grows downward and never leaves the viewBox', () => {
    for (let n = 1; n <= 40; n++) {
      expect(stemTopFor(n)).toBeLessThanOrEqual(stemTopFor(n - 1));
      expect(stemTopFor(n)).toBeGreaterThanOrEqual(20);
    }
  });

  it('stays at full bloom past 30 rather than overshooting', () => {
    expect(stemTopFor(100)).toBe(20);
    expect(stemTopFor(365)).toBe(20);
  });
});
