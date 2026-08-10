import React from 'react';
import { render, act, waitFor } from '@testing-library/react-native';
import { Text } from 'react-native';
import { AuthProvider, useAuth } from '../providers/AuthProvider';
import { supabase } from '../lib/supabase';
import { clearPushToken, cancelMorningNotification } from '../lib/notifications';
import { clearAllReminders } from '../lib/prayerReminders';
import { clearAccountLocalData } from '../lib/localData';
import { shareAnniversary } from '../../modules/pamwe-widget';

jest.mock('../lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: jest.fn(),
      onAuthStateChange: jest.fn(),
      signOut: jest.fn(),
    },
  },
}));

// AuthProvider owns push wiring now (auth-scoped registration); the tests here
// exercise session state only.
jest.mock('../lib/notifications', () => ({
  // Registration only: the prompt moved to the connected screen, so nothing
  // AuthProvider calls can put a permission dialog in front of anyone.
  getPushTokenIfGranted: jest.fn(() => Promise.resolve(null)),
  savePushToken: jest.fn(() => Promise.resolve()),
  clearPushToken: jest.fn(() => Promise.resolve()),
  watchPushTokenRotation: jest.fn(() => ({ remove: jest.fn() })),
  scheduleMorningFromPrefs: jest.fn(() => Promise.resolve()),
  scheduleRecapFromPrefs: jest.fn(() => Promise.resolve()),
  schedulePrayerReviewFromPrefs: jest.fn(() => Promise.resolve()),
  clearDeliveredNotifications: jest.fn(() => Promise.resolve()),
  cleanupLegacyScheduled: jest.fn(() => Promise.resolve()),
  // Sign-out cancels what iOS is already holding. These are scheduled with the
  // system, so they outlive the session on their own and would keep firing on a
  // phone whose account has left.
  cancelMorningNotification: jest.fn(() => Promise.resolve()),
  cancelWeeklyRecap: jest.fn(() => Promise.resolve()),
  cancelPrayerReview: jest.fn(() => Promise.resolve()),
}));

jest.mock('../lib/prayerReminders', () => ({
  clearAllReminders: jest.fn(() => Promise.resolve()),
}));

jest.mock('../lib/localData', () => ({
  clearAccountLocalData: jest.fn(() => Promise.resolve()),
}));

jest.mock('../../modules/pamwe-widget', () => ({
  shareAnniversary: jest.fn(),
}));

// Same reason: the sign-in effect also stamps the terms acceptance.
jest.mock('../lib/account', () => ({
  recordTermsAcceptance: jest.fn(() => Promise.resolve()),
}));

const mockGetSession = supabase.auth.getSession as jest.Mock;
const mockOnAuthStateChange = supabase.auth.onAuthStateChange as jest.Mock;
const mockSignOut = supabase.auth.signOut as jest.Mock;

function TestConsumer() {
  const { session, user, loading } = useAuth();
  return (
    <>
      <Text testID="loading">{String(loading)}</Text>
      <Text testID="session">{session ? 'has-session' : 'no-session'}</Text>
      <Text testID="user">{user?.id ?? 'no-user'}</Text>
    </>
  );
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe('AuthProvider', () => {
  it('starts in loading state', () => {
    mockGetSession.mockReturnValue(new Promise(() => {})); // never resolves
    mockOnAuthStateChange.mockReturnValue({ data: { subscription: { unsubscribe: jest.fn() } } });

    const { getByTestId } = render(
      <AuthProvider><TestConsumer /></AuthProvider>
    );

    expect(getByTestId('loading').props.children).toBe('true');
  });

  it('sets session and user after getSession resolves', async () => {
    const fakeSession = { user: { id: 'user-1', email: 'test@test.com' } };
    mockGetSession.mockResolvedValue({ data: { session: fakeSession } });
    mockOnAuthStateChange.mockReturnValue({ data: { subscription: { unsubscribe: jest.fn() } } });

    const { getByTestId } = render(
      <AuthProvider><TestConsumer /></AuthProvider>
    );

    await waitFor(() => {
      expect(getByTestId('loading').props.children).toBe('false');
    });
    expect(getByTestId('session').props.children).toBe('has-session');
    expect(getByTestId('user').props.children).toBe('user-1');
  });

  it('sets no session when getSession returns null', async () => {
    mockGetSession.mockResolvedValue({ data: { session: null } });
    mockOnAuthStateChange.mockReturnValue({ data: { subscription: { unsubscribe: jest.fn() } } });

    const { getByTestId } = render(
      <AuthProvider><TestConsumer /></AuthProvider>
    );

    await waitFor(() => {
      expect(getByTestId('loading').props.children).toBe('false');
    });
    expect(getByTestId('session').props.children).toBe('no-session');
    expect(getByTestId('user').props.children).toBe('no-user');
  });

  it('updates session on auth state change', async () => {
    mockGetSession.mockResolvedValue({ data: { session: null } });

    let authCallback: (event: string, session: any) => void;
    mockOnAuthStateChange.mockImplementation((cb: any) => {
      authCallback = cb;
      return { data: { subscription: { unsubscribe: jest.fn() } } };
    });

    const { getByTestId } = render(
      <AuthProvider><TestConsumer /></AuthProvider>
    );

    await waitFor(() => {
      expect(getByTestId('loading').props.children).toBe('false');
    });
    expect(getByTestId('session').props.children).toBe('no-session');

    const newSession = { user: { id: 'user-2', email: 'new@test.com' } };
    act(() => {
      authCallback('SIGNED_IN', newSession);
    });

    expect(getByTestId('session').props.children).toBe('has-session');
    expect(getByTestId('user').props.children).toBe('user-2');
  });

  it('signOut calls supabase.auth.signOut', async () => {
    mockGetSession.mockResolvedValue({ data: { session: null } });
    mockOnAuthStateChange.mockReturnValue({ data: { subscription: { unsubscribe: jest.fn() } } });
    mockSignOut.mockResolvedValue({});

    function SignOutButton() {
      const { signOut } = useAuth();
      React.useEffect(() => { signOut(); }, []);
      return null;
    }

    render(
      <AuthProvider><SignOutButton /></AuthProvider>
    );

    await waitFor(() => {
      expect(mockSignOut).toHaveBeenCalled();
    });
  });

  it('signs out even when the push-token call never comes back', async () => {
    // The reported bug: "I played Sign Out but I'm still able to see a lot of
    // the information". clearPushToken has to run BEFORE the session goes,
    // because clear_push_token reads auth.uid() — but it is a network call, and
    // it used to be awaited with nothing bounding it. On a dead connection the
    // tap did nothing at all, for as long as the request hung.
    jest.useFakeTimers();
    mockGetSession.mockResolvedValue({ data: { session: null } });
    mockOnAuthStateChange.mockReturnValue({ data: { subscription: { unsubscribe: jest.fn() } } });
    mockSignOut.mockResolvedValue({});
    // Never resolves, like a request on a radio that has gone away.
    (clearPushToken as jest.Mock).mockReturnValue(new Promise(() => {}));

    function SignOutButton() {
      const { signOut } = useAuth();
      React.useEffect(() => { signOut(); }, []);
      return null;
    }

    render(<AuthProvider><SignOutButton /></AuthProvider>);

    expect(mockSignOut).not.toHaveBeenCalled();
    await act(async () => { jest.advanceTimersByTime(2500); });

    expect(mockSignOut).toHaveBeenCalled();
    expect(clearAccountLocalData).toHaveBeenCalled();
    // The widget counts "In love N days" out of the App Group and has no idea
    // who you are, so nothing else can make it stop.
    expect(shareAnniversary).toHaveBeenCalledWith(null);
    // Scheduled with iOS, so they outlive the session unless something cancels
    // them by id.
    expect(cancelMorningNotification).toHaveBeenCalled();
    expect(clearAllReminders).toHaveBeenCalled();
    jest.useRealTimers();
  });

  it('unsubscribes on unmount', async () => {
    const unsubscribe = jest.fn();
    mockGetSession.mockResolvedValue({ data: { session: null } });
    mockOnAuthStateChange.mockReturnValue({ data: { subscription: { unsubscribe } } });

    const { unmount } = render(
      <AuthProvider><TestConsumer /></AuthProvider>
    );

    unmount();
    expect(unsubscribe).toHaveBeenCalled();
  });
});
