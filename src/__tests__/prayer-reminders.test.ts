jest.mock('@react-native-async-storage/async-storage', () => {
  let store: Record<string, string> = {};
  return {
    __esModule: true,
    default: {
      getItem: jest.fn((k: string) => Promise.resolve(store[k] ?? null)),
      setItem: jest.fn((k: string, v: string) => { store[k] = v; return Promise.resolve(); }),
      __reset: () => { store = {}; },
    },
  };
});

jest.mock('expo-notifications', () => ({
  SchedulableTriggerInputTypes: { DATE: 'date', DAILY: 'daily', WEEKLY: 'weekly' },
  scheduleNotificationAsync: jest.fn(() => Promise.resolve('id')),
  cancelScheduledNotificationAsync: jest.fn(() => Promise.resolve()),
  requestPermissionsAsync: jest.fn(() => Promise.resolve({ status: 'granted' })),
}));

jest.mock('../lib/notifications', () => ({
  getNotificationPermissionStatus: jest.fn(() => Promise.resolve('granted')),
}));

import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { setReminder, clearReminder, syncReminders, todayLocalISO } from '../lib/prayerReminders';

const mockSchedule = Notifications.scheduleNotificationAsync as jest.Mock;
const mockCancel = Notifications.cancelScheduledNotificationAsync as jest.Mock;

beforeEach(() => {
  jest.clearAllMocks();
  (AsyncStorage as any).__reset();
});

const scheduledIds = () => mockSchedule.mock.calls.map((c) => c[0].identifier as string);

// A repeating DAILY trigger cannot be skipped for a single day, so reminders are
// dated one-shots re-armed on each visit to the tab.
describe('setReminder', () => {
  it('schedules dated one-shots, never a repeating trigger', async () => {
    await setReminder('p1', 'pray for the OPT decision', 21, 0);

    expect(mockSchedule).toHaveBeenCalled();
    for (const call of mockSchedule.mock.calls) {
      expect(call[0].trigger.type).toBe('date');
      expect(call[0].trigger.date).toBeInstanceOf(Date);
    }
  });

  it('fires at the requested time and carries the prayer id for routing', async () => {
    await setReminder('p1', 'pray for the OPT decision', 21, 0);

    const first = mockSchedule.mock.calls[0][0];
    expect(first.trigger.date.getHours()).toBe(21);
    expect(first.trigger.date.getMinutes()).toBe(0);
    expect(first.content.data).toEqual({ type: 'prayer_reminder', prayerId: 'p1' });
  });

  it('truncates a long prayer rather than spilling it onto the lock screen', async () => {
    await setReminder('p1', 'x'.repeat(200), 21, 0);
    expect((mockSchedule.mock.calls[0][0].content.body as string).length).toBeLessThanOrEqual(90);
  });
});

// Christian's rule (2026-07-31): praying for something ends the asking, full
// stop. Not quiet for a day or a week: the reminder is dropped, and setting a
// new one from the prayer's sheet is the only way to be asked again.
describe('praying retires the reminder', () => {
  it('sync cancels the whole pending window, not just today', async () => {
    await setReminder('p1', 'prayed for now', 21, 0);
    jest.clearAllMocks();

    await syncReminders([{ id: 'p1', text: 'prayed for now' }], ['p1']);

    const cancelled = mockCancel.mock.calls.map(([id]) => String(id));
    expect(cancelled).toContain(`pamwe-prayer-p1-${todayLocalISO()}`);
    // The sweep covers future days too, so nothing fires again tomorrow.
    expect(cancelled.length).toBeGreaterThan(1);
    expect(cancelled.every((id) => id.startsWith('pamwe-prayer-p1-'))).toBe(true);
    expect(scheduledIds()).toHaveLength(0);
  });

  it('never re-arms it, even after the mark ages out of the recent-marks window', async () => {
    await setReminder('p1', 'prayed for now', 21, 0);
    await syncReminders([{ id: 'p1', text: 'prayed for now' }], ['p1']);
    jest.clearAllMocks();

    // Weeks later the mark no longer appears in the marks the tab fetches.
    // The reminder was dropped outright, so nothing comes back.
    await syncReminders([{ id: 'p1', text: 'prayed for now' }], []);
    expect(scheduledIds()).toHaveLength(0);
  });
});

describe('syncReminders', () => {
  it('drops a reminder whose prayer is gone, which is how a partner delete reaches this phone', async () => {
    await setReminder('p1', 'still here', 21, 0);
    await setReminder('p2', 'deleted by my partner', 21, 0);
    jest.clearAllMocks();

    await syncReminders([{ id: 'p1', text: 'still here' }]);

    // p2 is swept across the whole window and never re-armed.
    expect(mockCancel.mock.calls.some(([id]) => String(id).startsWith('pamwe-prayer-p2-'))).toBe(true);
    expect(scheduledIds().some((id) => id.startsWith('pamwe-prayer-p2-'))).toBe(false);
    expect(scheduledIds().some((id) => id.startsWith('pamwe-prayer-p1-'))).toBe(true);
  });

  it('drops a reminder for a prayer that has been answered', async () => {
    await setReminder('p1', 'answered now', 21, 0);
    jest.clearAllMocks();

    await syncReminders([{ id: 'p1', text: 'answered now', status: 'answered' }]);

    expect(scheduledIds()).toHaveLength(0);
  });

  it('arms nothing at all for a prayer already prayed for', async () => {
    await setReminder('p1', 'prayed already', 8, 0);
    jest.clearAllMocks();

    await syncReminders([{ id: 'p1', text: 'prayed already' }], ['p1']);

    // Not today, and not tomorrow either: the asking is done.
    expect(scheduledIds()).toHaveLength(0);
  });

  it('still arms the prayers that have NOT been prayed for', async () => {
    await setReminder('p1', 'done', 8, 0);
    await setReminder('p2', 'still needs praying', 8, 0);
    jest.clearAllMocks();

    await syncReminders(
      [{ id: 'p1', text: 'done' }, { id: 'p2', text: 'still needs praying' }],
      ['p1'],
    );

    expect(scheduledIds().some((id) => id.startsWith('pamwe-prayer-p1-'))).toBe(false);
    expect(scheduledIds().some((id) => id.startsWith('pamwe-prayer-p2-'))).toBe(true);
  });

  it('stays under the iOS 64 pending-notification cap as reminders pile up', async () => {
    // iOS silently drops everything past 64, which would take the morning
    // reminder and the weekly recap down with it.
    const prayers = Array.from({ length: 20 }, (_, i) => ({ id: `p${i}`, text: `prayer ${i}` }));
    for (const p of prayers) await setReminder(p.id, p.text, 21, 0);
    jest.clearAllMocks();

    await syncReminders(prayers);

    expect(scheduledIds().length).toBeLessThanOrEqual(40);
  });
});

describe('clearReminder', () => {
  it('cancels the whole window and forgets the prayer', async () => {
    await setReminder('p1', 'gone', 21, 0);
    jest.clearAllMocks();

    await clearReminder('p1');
    expect(mockCancel.mock.calls.every(([id]) => String(id).startsWith('pamwe-prayer-p1-'))).toBe(true);

    jest.clearAllMocks();
    await syncReminders([{ id: 'p1', text: 'gone' }]);
    expect(scheduledIds()).toHaveLength(0);
  });
});
