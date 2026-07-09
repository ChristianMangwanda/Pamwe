jest.mock('@react-native-async-storage/async-storage', () => ({
  // __esModule so the default-import interop doesn't double-wrap the module
  // (otherwise `AsyncStorage.getItem` resolves to undefined).
  __esModule: true,
  default: {
    getItem: jest.fn(() => Promise.resolve(null)),
    setItem: jest.fn(() => Promise.resolve()),
    removeItem: jest.fn(() => Promise.resolve()),
    clear: jest.fn(() => Promise.resolve()),
    getAllKeys: jest.fn(() => Promise.resolve([])),
  },
}));

jest.mock('expo-linking', () => ({
  addEventListener: jest.fn(() => ({ remove: jest.fn() })),
  getInitialURL: jest.fn(() => Promise.resolve(null)),
  parse: jest.fn(() => ({ queryParams: {} })),
}));

jest.mock('expo-splash-screen', () => ({
  preventAutoHideAsync: jest.fn(),
  hideAsync: jest.fn(),
}));

jest.mock('expo-font', () => ({
  useFonts: jest.fn(() => [true, null]),
  isLoaded: jest.fn(() => true),
}));

jest.mock('@expo-google-fonts/fraunces', () => ({
  useFonts: jest.fn(() => [true, null]),
  Fraunces_300Light: 'Fraunces_300Light',
  Fraunces_300Light_Italic: 'Fraunces_300Light_Italic',
  Fraunces_400Regular: 'Fraunces_400Regular',
  Fraunces_400Regular_Italic: 'Fraunces_400Regular_Italic',
}));

jest.mock('@expo-google-fonts/instrument-sans', () => ({
  InstrumentSans_400Regular: 'InstrumentSans_400Regular',
  InstrumentSans_500Medium: 'InstrumentSans_500Medium',
  InstrumentSans_600SemiBold: 'InstrumentSans_600SemiBold',
}));

jest.mock('expo-apple-authentication', () => ({
  signInAsync: jest.fn(),
  AppleAuthenticationScope: {
    FULL_NAME: 0,
    EMAIL: 1,
  },
}));

jest.mock('react-native-url-polyfill/auto', () => {});
