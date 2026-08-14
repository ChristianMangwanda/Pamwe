jest.mock('react-native', () => ({ Platform: { OS: 'ios' } }));
jest.mock('expo-notifications', () => ({
  setNotificationHandler: jest.fn(),
  getPermissionsAsync: jest.fn(),
  requestPermissionsAsync: jest.fn(),
  setNotificationChannelAsync: jest.fn(),
  getExpoPushTokenAsync: jest.fn(),
  addPushTokenListener: jest.fn(() => ({ remove: jest.fn() })),
}));
jest.mock('expo-device', () => ({ isDevice: true }));
// A failed getExpoPushTokenAsync is reported rather than swallowed now, and
// the real SDK pulls in native modules this suite deliberately does not have.
jest.mock('@sentry/react-native', () => ({ captureException: jest.fn() }));
jest.mock('expo-constants', () => ({ expoConfig: { extra: { eas: { projectId: 'p' } } } }));
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(() => Promise.resolve(null)),
  setItem: jest.fn(() => Promise.resolve()),
  removeItem: jest.fn(() => Promise.resolve()),
}));
jest.mock('../lib/supabase', () => ({
  supabase: { auth: { getSession: jest.fn() }, from: jest.fn(), rpc: jest.fn() },
}));
jest.mock('../lib/couples', () => ({ getUserCouple: jest.fn() }));
jest.mock('../lib/plans', () => ({ getActiveCouPlan: jest.fn() }));
jest.mock('../lib/entries', () => ({ countMyTotalSubmitted: jest.fn() }));
jest.mock('../lib/prayers', () => ({ getPrayers: jest.fn() }));

import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import {
  savePushToken, clearPushToken, getPushTokenIfGranted, requestPushPermission,
  reconcilePushRegistration,
} from '../lib/notifications';
import { supabase } from '../lib/supabase';

const mockRpc = supabase.rpc as jest.Mock;
const mockFrom = supabase.from as jest.Mock;
const mockGetSession = supabase.auth.getSession as jest.Mock;
const mockGetPerms = Notifications.getPermissionsAsync as jest.Mock;
const mockReqPerms = Notifications.requestPermissionsAsync as jest.Mock;
const mockGetToken = Notifications.getExpoPushTokenAsync as jest.Mock;
const mockSetItem = AsyncStorage.setItem as jest.Mock;
const mockGetItem = AsyncStorage.getItem as jest.Mock;

beforeEach(() => {
  jest.clearAllMocks();
  jest.resetModules();
  mockGetSession.mockResolvedValue({ data: { session: { user: { id: 'user-1' } } } });
  mockRpc.mockResolvedValue({ error: null });
  mockGetItem.mockResolvedValue(null);
});

// One token per ACCOUNT meant one phone per person: a second device overwrote
// the first, and signing out on either silenced both.
describe('savePushToken', () => {
  it('registers this device rather than overwriting the account', async () => {
    await savePushToken('ExponentPushToken[aaa]');
    expect(mockRpc).toHaveBeenCalledWith('save_push_token', {
      p_token: 'ExponentPushToken[aaa]',
      p_platform: 'ios',
    });
  });

  // A token per test: the anti-loop guard below is module-level state that
  // deliberately outlives a single call, so reusing one token across cases
  // would have the guard silently swallow the next test's write.
  it('remembers the token so sign-out can detach only this device', async () => {
    await savePushToken('ExponentPushToken[bbb]');
    expect(mockSetItem).toHaveBeenCalledWith('pamwe:pushToken', 'ExponentPushToken[bbb]');
  });

  it('skips a repeat save of the same token, which used to loop', async () => {
    // getExpoPushTokenAsync re-registers with APNs and re-fires the rotation
    // listener with an unchanged token; without the guard every launch became
    // an endless write loop (build 7 slowness and crash).
    await savePushToken('ExponentPushToken[ccc]');
    await savePushToken('ExponentPushToken[ccc]');
    expect(mockRpc).toHaveBeenCalledTimes(1);
  });

  it('does nothing when signed out', async () => {
    mockGetSession.mockResolvedValue({ data: { session: null } });
    await savePushToken('ExponentPushToken[zzz]');
    expect(mockRpc).not.toHaveBeenCalled();
  });

  it('force re-writes a token the guard believes is already saved', async () => {
    // The row can be deleted while the app stays open, and the guard would
    // otherwise refuse to put it back until the next launch.
    await savePushToken('ExponentPushToken[ddd]');
    await savePushToken('ExponentPushToken[ddd]', { force: true });
    expect(mockRpc).toHaveBeenCalledTimes(2);
  });
});

// Permission granted is not the same as registered, and the difference is
// invisible: every notify-* function answers no_token with an HTTP 200, so the
// phone stays silent while Settings shows every toggle on.
describe('reconcilePushRegistration', () => {
  const chainFor = (result: { data: unknown; error: unknown }) => {
    const chain: Record<string, unknown> = {};
    chain.select = jest.fn(() => chain);
    chain.eq = jest.fn(() => chain);
    chain.maybeSingle = jest.fn(() => Promise.resolve(result));
    mockFrom.mockReturnValue(chain);
    return chain;
  };

  beforeEach(() => {
    mockGetPerms.mockResolvedValue({ status: 'granted' });
    mockGetToken.mockResolvedValue({ data: 'ExponentPushToken[live]' });
  });

  it('leaves a device that is already registered alone', async () => {
    chainFor({ data: { token: 'ExponentPushToken[live]' }, error: null });
    await expect(reconcilePushRegistration()).resolves.toBe('registered');
    expect(mockRpc).not.toHaveBeenCalled();
  });

  it('writes the row back when it has gone missing', async () => {
    // How it goes missing in ordinary use: save_push_token keys on the TOKEN
    // and reassigns it, so signing into a partner's account on this handset
    // moves the row off yours and leaves you silent.
    chainFor({ data: null, error: null });
    await expect(reconcilePushRegistration()).resolves.toBe('repaired');
    expect(mockRpc).toHaveBeenCalledWith('save_push_token', {
      p_token: 'ExponentPushToken[live]',
      p_platform: 'ios',
    });
  });

  it('says unregistered, not repaired, when the write fails', async () => {
    chainFor({ data: null, error: null });
    mockRpc.mockResolvedValue({ error: { message: 'offline' } });
    await expect(reconcilePushRegistration()).resolves.toBe('unregistered');
  });

  it('never accuses a phone whose lookup failed', async () => {
    // A blipped network must not put "not connected" in front of someone whose
    // registration is fine.
    chainFor({ data: null, error: { message: 'network' } });
    await expect(reconcilePushRegistration()).resolves.toBe('unknown');
    expect(mockRpc).not.toHaveBeenCalled();
  });

  it('reports no_permission for a phone that was never asked, and never asks', async () => {
    mockGetPerms.mockResolvedValue({ status: 'undetermined' });
    await expect(reconcilePushRegistration()).resolves.toBe('no_permission');
    expect(mockReqPerms).not.toHaveBeenCalled();
    expect(mockFrom).not.toHaveBeenCalled();
  });

  it('separates "allowed but no token" from "never allowed"', async () => {
    // The state Christian's phone was actually in: notifications switched ON,
    // getExpoPushTokenAsync throwing, so nothing was ever registered and every
    // screen agreed it was fine. Folding this into no_permission showed no
    // banner at all, because permission really was granted.
    mockGetToken.mockRejectedValue(new Error('no valid "aps-environment"'));
    await expect(reconcilePushRegistration()).resolves.toBe('no_token');
    expect(mockFrom).not.toHaveBeenCalled();
  });
});

describe('clearPushToken', () => {
  it('detaches only the device signing out', async () => {
    mockGetItem.mockResolvedValue('ExponentPushToken[this-phone]');
    await clearPushToken();
    expect(mockRpc).toHaveBeenCalledWith('clear_push_token', {
      p_token: 'ExponentPushToken[this-phone]',
    });
  });

  it('takes nothing away when this device never registered', async () => {
    // A phone that refused permission has no row of its own, and must not take
    // the account's other phones with it. Undefined lets the function's own
    // default handle it.
    mockGetItem.mockResolvedValue(null);
    await clearPushToken();
    expect(mockRpc).toHaveBeenCalledWith('clear_push_token', { p_token: undefined });
  });
});

// iOS asks once and a refusal is permanent, so nothing on the launch path may
// prompt. The ask belongs on the connected screen, where there is a partner to
// name and a reason to say yes.
describe('permission split', () => {
  it('getPushTokenIfGranted never prompts when permission is undetermined', async () => {
    mockGetPerms.mockResolvedValue({ status: 'undetermined' });
    await expect(getPushTokenIfGranted()).resolves.toBeNull();
    expect(mockReqPerms).not.toHaveBeenCalled();
  });

  it('getPushTokenIfGranted never prompts when permission was refused', async () => {
    mockGetPerms.mockResolvedValue({ status: 'denied' });
    await expect(getPushTokenIfGranted()).resolves.toBeNull();
    expect(mockReqPerms).not.toHaveBeenCalled();
  });

  it('getPushTokenIfGranted returns the token when already allowed', async () => {
    mockGetPerms.mockResolvedValue({ status: 'granted' });
    mockGetToken.mockResolvedValue({ data: 'ExponentPushToken[ok]' });
    await expect(getPushTokenIfGranted()).resolves.toBe('ExponentPushToken[ok]');
    expect(mockReqPerms).not.toHaveBeenCalled();
  });

  it('requestPushPermission is the only path that asks', async () => {
    mockGetPerms.mockResolvedValue({ status: 'undetermined' });
    mockReqPerms.mockResolvedValue({ status: 'granted' });
    await expect(requestPushPermission()).resolves.toBe(true);
    expect(mockReqPerms).toHaveBeenCalled();
  });

  it('requestPushPermission does not re-ask when already granted', async () => {
    mockGetPerms.mockResolvedValue({ status: 'granted' });
    await expect(requestPushPermission()).resolves.toBe(true);
    expect(mockReqPerms).not.toHaveBeenCalled();
  });
});
