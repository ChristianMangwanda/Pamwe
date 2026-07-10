import React from 'react';
import { Alert } from 'react-native';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import * as AppleAuthentication from 'expo-apple-authentication';
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import SignInScreen from '../app/(auth)/sign-in';
import { supabase } from '../lib/supabase';

// Every successful sign-in must route back through the gate (router.replace('/')).
// The first TestFlight round shipped without this: Apple sign-in succeeded
// server-side but the user stayed on the sign-in screen forever.

const mockRouter = { back: jest.fn(), push: jest.fn(), replace: jest.fn() };
jest.mock('expo-router', () => ({
  useRouter: () => mockRouter,
}));

jest.mock('@react-native-google-signin/google-signin', () => ({
  GoogleSignin: {
    hasPlayServices: jest.fn(() => Promise.resolve(true)),
    signIn: jest.fn(),
  },
  statusCodes: { SIGN_IN_CANCELLED: 'SIGN_IN_CANCELLED' },
}));

jest.mock('../lib/supabase', () => ({
  supabase: {
    auth: {
      signInWithOtp: jest.fn(),
      signInWithPassword: jest.fn(),
      signInWithIdToken: jest.fn(),
    },
  },
}));

const mockSignInWithIdToken = supabase.auth.signInWithIdToken as jest.Mock;
const mockSignInWithOtp = supabase.auth.signInWithOtp as jest.Mock;
const mockAppleSignInAsync = AppleAuthentication.signInAsync as jest.Mock;
const mockGoogleSignIn = GoogleSignin.signIn as jest.Mock;

beforeEach(() => {
  jest.clearAllMocks();
  jest.spyOn(Alert, 'alert').mockImplementation(() => {});
});

describe('Apple sign-in', () => {
  it('exchanges the identity token and routes through the gate', async () => {
    mockAppleSignInAsync.mockResolvedValue({ identityToken: 'apple-token' });
    mockSignInWithIdToken.mockResolvedValue({ error: null });

    const { getByText } = render(<SignInScreen />);
    fireEvent.press(getByText('Continue with Apple'));

    await waitFor(() => expect(mockRouter.replace).toHaveBeenCalledWith('/'));
    expect(mockSignInWithIdToken).toHaveBeenCalledWith({ provider: 'apple', token: 'apple-token' });
    expect(Alert.alert).not.toHaveBeenCalled();
  });

  it('alerts on a Supabase rejection and stays put', async () => {
    mockAppleSignInAsync.mockResolvedValue({ identityToken: 'apple-token' });
    mockSignInWithIdToken.mockResolvedValue({ error: new Error('Unacceptable audience in id_token') });

    const { getByText } = render(<SignInScreen />);
    fireEvent.press(getByText('Continue with Apple'));

    await waitFor(() =>
      expect(Alert.alert).toHaveBeenCalledWith('Apple Sign In Error', 'Unacceptable audience in id_token'),
    );
    expect(mockRouter.replace).not.toHaveBeenCalled();
  });

  it('is a silent no-op when the user cancels the Apple sheet', async () => {
    mockAppleSignInAsync.mockRejectedValue({ code: 'ERR_REQUEST_CANCELED' });

    const { getByText } = render(<SignInScreen />);
    fireEvent.press(getByText('Continue with Apple'));

    await waitFor(() => expect(mockAppleSignInAsync).toHaveBeenCalled());
    expect(mockSignInWithIdToken).not.toHaveBeenCalled();
    expect(Alert.alert).not.toHaveBeenCalled();
    expect(mockRouter.replace).not.toHaveBeenCalled();
  });
});

describe('Google sign-in', () => {
  it('exchanges the ID token and routes through the gate', async () => {
    mockGoogleSignIn.mockResolvedValue({ type: 'success', data: { idToken: 'google-token' } });
    mockSignInWithIdToken.mockResolvedValue({ error: null });

    const { getByText } = render(<SignInScreen />);
    fireEvent.press(getByText('Continue with Google'));

    await waitFor(() => expect(mockRouter.replace).toHaveBeenCalledWith('/'));
    expect(mockSignInWithIdToken).toHaveBeenCalledWith({ provider: 'google', token: 'google-token' });
    expect(Alert.alert).not.toHaveBeenCalled();
  });

  it('treats a dismissed account picker as a no-op', async () => {
    mockGoogleSignIn.mockResolvedValue({ type: 'cancelled' });

    const { getByText } = render(<SignInScreen />);
    fireEvent.press(getByText('Continue with Google'));

    await waitFor(() => expect(mockGoogleSignIn).toHaveBeenCalled());
    expect(mockSignInWithIdToken).not.toHaveBeenCalled();
    expect(Alert.alert).not.toHaveBeenCalled();
    expect(mockRouter.replace).not.toHaveBeenCalled();
  });

  it('alerts on a Supabase rejection (e.g. nonce mismatch) and stays put', async () => {
    mockGoogleSignIn.mockResolvedValue({ type: 'success', data: { idToken: 'google-token' } });
    mockSignInWithIdToken.mockResolvedValue({
      error: new Error('Passed nonce and nonce in id_token should either both exist or not.'),
    });

    const { getByText } = render(<SignInScreen />);
    fireEvent.press(getByText('Continue with Google'));

    await waitFor(() =>
      expect(Alert.alert).toHaveBeenCalledWith(
        'Google Sign In Error',
        'Passed nonce and nonce in id_token should either both exist or not.',
      ),
    );
    expect(mockRouter.replace).not.toHaveBeenCalled();
  });
});

describe('Email magic link', () => {
  it('requests the link then shows the check-email screen', async () => {
    mockSignInWithOtp.mockResolvedValue({ error: null });

    const { getByText, getByPlaceholderText } = render(<SignInScreen />);
    fireEvent.changeText(getByPlaceholderText('you@example.com'), 'us@example.com');
    fireEvent.press(getByText('Continue with email'));

    await waitFor(() => expect(mockRouter.push).toHaveBeenCalledWith('/(auth)/magic-link'));
    expect(mockSignInWithOtp).toHaveBeenCalledWith({
      email: 'us@example.com',
      options: { emailRedirectTo: 'pamwe://(auth)/magic-link' },
    });
  });
});
