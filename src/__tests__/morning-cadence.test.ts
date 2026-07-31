jest.mock('expo-notifications', () => ({
  setNotificationHandler: jest.fn(),
  SchedulableTriggerInputTypes: { DAILY: 'daily', DATE: 'date' },
  getAllScheduledNotificationsAsync: jest.fn(() => Promise.resolve([])),
  cancelScheduledNotificationAsync: jest.fn(() => Promise.resolve()),
}));
jest.mock('expo-device', () => ({ isDevice: true }));
jest.mock('expo-constants', () => ({ default: { expoConfig: {} } }));
jest.mock('../lib/supabase', () => ({ supabase: { auth: {}, from: jest.fn() } }));
jest.mock('../lib/couples', () => ({ getUserCouple: jest.fn() }));
jest.mock('../lib/plans', () => ({ getActiveCouPlan: jest.fn() }));

import * as Notifications from 'expo-notifications';
import { nextReadingDates, cleanupLegacyScheduled, morningContent } from '../lib/notifications';

const iso = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

// A couple reading every other day should be reminded every other day. The
// reminder used to be a hard DAILY trigger, which kept nagging on a rhythm the
// couple had explicitly opted out of.
describe('nextReadingDates', () => {
  const now = new Date(2026, 6, 14, 9, 0, 0); // 14 July 2026, 09:00 local

  it('steps one reading per cadence window', () => {
    const dates = nextReadingDates('2026-07-01', 2, 6, 30, 4, now);

    // Start 1 Jul on a 2-day cadence: 15, 17, 19, 21 July are the next ones.
    expect(dates.map(iso)).toEqual(['2026-07-15', '2026-07-17', '2026-07-19', '2026-07-21']);
  });

  it('honours the chosen time of day', () => {
    const [first] = nextReadingDates('2026-07-01', 2, 6, 30, 1, now);

    expect(first.getHours()).toBe(6);
    expect(first.getMinutes()).toBe(30);
  });

  it('skips reading days that have already passed', () => {
    const dates = nextReadingDates('2026-07-01', 2, 6, 30, 3, now);

    expect(dates.every((d) => d > now)).toBe(true);
  });

  it('does not skip today when the time has not come yet', () => {
    // 13 July is a reading day on this cadence; at 09:00 an 18:00 slot is still ahead.
    const earlier = new Date(2026, 6, 13, 9, 0, 0);
    const [first] = nextReadingDates('2026-07-01', 2, 18, 0, 1, earlier);

    expect(iso(first)).toBe('2026-07-13');
  });

  it('spaces a weekly rhythm a week apart', () => {
    const dates = nextReadingDates('2026-07-01', 7, 6, 30, 3, now);

    expect(dates.map(iso)).toEqual(['2026-07-15', '2026-07-22', '2026-07-29']);
  });

  it('treats a zero or negative cadence as daily rather than looping', () => {
    const dates = nextReadingDates('2026-07-01', 0, 6, 30, 3, now);

    expect(dates.map(iso)).toEqual(['2026-07-15', '2026-07-16', '2026-07-17']);
  });

  it('returns the count asked for', () => {
    expect(nextReadingDates('2026-07-01', 2, 6, 30, 12, now)).toHaveLength(12);
  });
});

// The greeting uses whoever this phone belongs to, by first name, and stays
// warm and plain when we don't have one. Christian's wording, 2026-07-31.
describe('morningContent', () => {
  it('greets by name', () => {
    const c = morningContent('Christian');
    expect(c.title).toBe('Good morning, Christian');
    expect(c.body).toBe("Let's read today's word.");
  });

  it('uses only the first name of a full name', () => {
    expect(morningContent('Ammy Mangwanda').title).toBe('Good morning, Ammy');
  });

  it('falls back to a plain greeting when there is no name', () => {
    expect(morningContent(null).title).toBe('Good morning');
    expect(morningContent('   ').title).toBe('Good morning');
  });
});

// Pre-b14 builds scheduled the morning reminder without an identifier (random
// id, repeating DAILY) and cancelled via cancel-all; pre-b17 prayer reminders
// were the same. iOS keeps scheduled requests across app updates, so those
// leftovers kept firing beside the new cancel-by-id ones: the duplicate
// morning banner, and a prayer nag nothing in the app could stop.
describe('cleanupLegacyScheduled', () => {
  const mockGetAll = Notifications.getAllScheduledNotificationsAsync as jest.Mock;
  const mockCancel = Notifications.cancelScheduledNotificationAsync as jest.Mock;

  beforeEach(() => jest.clearAllMocks());

  it('cancels leftovers under foreign ids, leaves our own and unrelated ones alone', async () => {
    mockGetAll.mockResolvedValueOnce([
      { identifier: '0A1B-random-uuid', content: { data: { type: 'morning' } } },
      { identifier: 'pamwe-morning', content: { data: { type: 'morning' } } },
      { identifier: 'pamwe-morning-3', content: { data: { type: 'morning' } } },
      { identifier: 'F9A2-random-uuid', content: { data: { type: 'prayer_reminder', prayerId: 'p1' } } },
      { identifier: 'pamwe-prayer-p2-2026-07-31', content: { data: { type: 'prayer_reminder', prayerId: 'p2' } } },
      { identifier: 'pamwe-recap', content: { data: { type: 'recap' } } },
      { identifier: 'pamwe-prayer-review', content: { data: { type: 'prayer_review' } } },
    ]);

    await cleanupLegacyScheduled();

    expect(mockCancel.mock.calls.map(([id]) => id).sort()).toEqual([
      '0A1B-random-uuid',
      'F9A2-random-uuid',
    ]);
  });

  it('is a no-op once the leftovers are gone', async () => {
    await cleanupLegacyScheduled();
    expect(mockCancel).not.toHaveBeenCalled();
  });
});
