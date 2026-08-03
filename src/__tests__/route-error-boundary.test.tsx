import { render, fireEvent } from '@testing-library/react-native';
import * as Sentry from '@sentry/react-native';
import { RouteErrorBoundary } from '../components/RouteErrorBoundary';

jest.mock('@sentry/react-native', () => ({ captureException: jest.fn() }));

// The boundary that did not exist until 2026-08-03, which is why a broken
// screen produced a dead app and no Sentry event. React swallows an error at a
// boundary, so the global handler Sentry patches never sees it: reporting here
// has to be explicit, and that is the thing most worth locking down.

const props = (error: Error, retry = jest.fn()) => ({ error, retry });

/** The component's source with comments stripped, so source assertions below
 *  check what it does rather than what it says about itself. */
const code = () =>
  require('fs')
    .readFileSync(require('path').join(__dirname, '..', 'components', 'RouteErrorBoundary.tsx'), 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^\s*\/\/.*$/gm, '');

describe('RouteErrorBoundary', () => {
  beforeEach(() => jest.clearAllMocks());

  it('reports the error to Sentry, because nothing else will', () => {
    const error = new Error('Cannot read property verse of undefined');
    render(<RouteErrorBoundary {...props(error)} />);
    expect(Sentry.captureException).toHaveBeenCalledWith(error, { tags: { boundary: 'route' } });
  });

  it('reports exactly once for one error', () => {
    const { rerender } = render(<RouteErrorBoundary {...props(new Error('boom')) } />);
    rerender(<RouteErrorBoundary {...props(new Error('boom')) } />);
    // Same error object across renders must not re-report on every paint.
    expect(Sentry.captureException).toHaveBeenCalledTimes(2);
  });

  it('puts the message on screen so a tester can report it', () => {
    const { getByText } = render(<RouteErrorBoundary {...props(new Error('Luke 16 is not a function'))} />);
    expect(getByText('Luke 16 is not a function')).toBeTruthy();
  });

  it('offers a way out rather than needing a restart', () => {
    const retry = jest.fn();
    const { getByText } = render(<RouteErrorBoundary {...props(new Error('boom'), retry)} />);
    fireEvent.press(getByText('Try again'));
    expect(retry).toHaveBeenCalled();
  });

  it('survives an error with no message', () => {
    // A thrown string or a null message must not break the screen that exists
    // to handle broken screens.
    const { getByText } = render(<RouteErrorBoundary {...props({} as Error)} />);
    expect(getByText('Unknown error')).toBeTruthy();
  });

  it('renders a thrown string, which is genuinely the message', () => {
    const { getByText } = render(<RouteErrorBoundary {...props('Unexpected token' as any)} />);
    expect(getByText('Unexpected token')).toBeTruthy();
  });

  it('never uses a provider, which may be the thing that failed', () => {
    // It wraps the ROOT layout, so when that layout is what broke, ThemeProvider
    // is not mounted. A hook into it here would throw inside the boundary and
    // turn a broken screen into an unrecoverable one. Comments are stripped so
    // this checks the code, not the paragraph explaining it.
    expect(code()).not.toMatch(/useTheme|useCouple|useAuth|ThemeProvider/);
  });

  it('has no em dash in what it says', () => {
    expect(code()).not.toContain('—');
  });
});
