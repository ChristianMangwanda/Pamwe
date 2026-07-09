import React from 'react';
import { render, act, waitFor } from '@testing-library/react-native';
import { Text } from 'react-native';
import { AuthProvider, useAuth } from '../providers/AuthProvider';
import { supabase } from '../lib/supabase';

jest.mock('../lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: jest.fn(),
      onAuthStateChange: jest.fn(),
      signOut: jest.fn(),
    },
  },
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
