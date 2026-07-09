// Design tokens from design_handoff_pamwe/Pamwe App.dc.html (:root + [data-theme="dark"]).
// Names mirror the prototype's CSS variables — do not rename or "improve" values.

export type ThemeMode = 'light' | 'dark';

export interface ThemeColors {
  bg: string;
  surface: string;
  surface2: string;
  line: string;
  line2: string;
  line3: string;
  lineAccent: string;
  sel: string;
  ink: string;
  ink2: string;
  muted: string;
  accent: string;
  accent2: string;
  glass: string;
  glassBorder: string;
  /** bg at 85% — overlays that let content ghost through */
  bgOverlay: string;
}

export const light: ThemeColors = {
  bg: '#EFE6D6',
  surface: '#F7F0E1',
  surface2: '#F3E7E4',
  line: '#D9CCB0',
  line2: '#E5DAC4',
  line3: '#E0D3B8',
  lineAccent: '#E4CFC9',
  sel: '#EADFC6',
  ink: '#2B1F14',
  ink2: '#7A6A55',
  muted: '#A89678',
  accent: '#6B2421',
  accent2: '#9B5651',
  glass: 'rgba(247, 240, 225, 0.68)',
  glassBorder: 'rgba(255, 255, 255, 0.45)',
  bgOverlay: 'rgba(239, 230, 214, 0.85)',
};

export const dark: ThemeColors = {
  bg: '#17120E',
  surface: '#221B15',
  surface2: '#2B211D',
  line: '#3A3026',
  line2: '#2E261E',
  line3: '#352B22',
  lineAccent: '#4A352F',
  sel: '#33291F',
  ink: '#EFE6D6',
  ink2: '#B9A98D',
  muted: '#9C8D72',
  accent: '#E7AA9C',
  accent2: '#D18A7F',
  glass: 'rgba(28, 22, 17, 0.72)',
  glassBorder: 'rgba(255, 255, 255, 0.10)',
  bgOverlay: 'rgba(23, 18, 14, 0.85)',
};

// Verse highlight swatches are theme-independent; highlighted text stays ink-dark in both themes.
export const swatches = {
  amber: '#F0D89B',
  rose: '#ECBAB6',
  sage: '#C7D3B0',
  sky: '#B7CBDD',
  highlightInk: '#2B1F14',
} as const;

export type SwatchColor = keyof Omit<typeof swatches, 'highlightInk'>;

/** Universal horizontal screen gutter from the prototype. */
export const GUTTER = 26;

export const themes: Record<ThemeMode, ThemeColors> = { light, dark };
