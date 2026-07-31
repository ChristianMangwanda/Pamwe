# Building with Pamwe

Pamwe is a couples devotional app: warm, quiet, paper-like. Cream grounds, maroon accents, serif headings. These components are the real app components (React Native rendered through react-native-web), so they are styled with **props and JS style objects, never CSS classes**.

## Wrap and setup

Wrap every design in `ThemeProvider`; add `SafeAreaProvider` when using `Screen` or `BottomSheet`:

```jsx
const { ThemeProvider, SafeAreaProvider, Screen } = window.Pamwe;
<ThemeProvider><SafeAreaProvider>
  <Screen animated={false}>…</Screen>
</SafeAreaProvider></ThemeProvider>
```

Components fall back to light-theme colors without the provider, but the provider is what makes `useTheme()` consistent. Dark mode: `const { setMode } = useTheme(); setMode('dark')`.

## Color and layout idiom

Read colors from the hook, never hardcode: `const { colors } = useTheme()` gives `bg, surface, surface2, line, line2, line3, lineAccent, sel, ink, ink2, muted, accent, accent2, glass, glassBorder, bgOverlay`. Page ground is `colors.bg`, cards are `colors.surface` with a `colors.line` border, primary actions are `colors.accent`. The same names exist as CSS custom properties in `_ds_bundle.css` (`--bg`, `--accent`, `--swatch-amber`…) as reference values only; components do not read them. Horizontal screen gutter is the exported `GUTTER` (26). Verse-highlight swatches are the exported `swatches` (amber, rose, sage, sky).

## Typography

Never set a raw font family. Use `Text` with a `variant`: `hero, h1, h2, heading, scripture, journal, reader, body, label, eyebrow, button, cta, chip` (plus `italic` and `color` props). The brand families (Fraunces, Instrument Sans) ship in `fonts/fonts.css` under their exact React Native names (`Fraunces_600SemiBold` etc.) and are applied by the variants; `typeScale` is exported if you need the raw values for measuring.

## Component facts that save debugging

- `Button`: `variant` primary | secondary | ghost | dashed, `title` string, `loading`, `disabled`. It stretches full width; constrain the wrapper (~300px).
- `SegmentedControl`: segments are `{ key, label }` objects, controlled by `value` + `onChange(key)`.
- `Switch`: `value` + `onValueChange` only, no disabled state.
- `StreakTree count={n}` picks its growth stage (0, 1, 3, 7, 14, 30 thresholds); `treeStage(n)` is exported. `StreakBar count max` is the 7-day week strip.
- `Screen` is the page shell (bg, gutter, generous bottom clearance); pass `animated={false}` in static contexts.
- `BottomSheet visible onClose` renders a full-viewport scrim + cream sheet.
- Surfaces (`Card`, `Glass`, `StripedBanner`) are cream: always place them on `colors.bg`, never on white. `Glass` needs content behind it to read.
- `Floral variant="corner"|"divider"` needs explicit width/height in `style` (corner ~116, divider ~140x26).

## Copy voice

Pamwe never uses em dashes in UI text: commas, colons, or periods. Placeholder glyph for empty values is `·`. Keep copy warm and unhurried ("Begin today's reading", "While you wait for Ammy").

## Where the truth lives

Read `styles.css` → `_ds_bundle.css` for tokens, `fonts/fonts.css` for families, each component's `.d.ts` for its exact props, and its `.prompt.md` for a working composition.

# Pamwe (pamwe@1.0.0)

This design system is the published pamwe React library, bundled as a single
browser global. All 19 components are the real upstream code.

## Where things are

- `_ds_bundle.js` — the whole-DS bundle at the project root; loads every component to `window.Pamwe`. First line is a `/* @ds-bundle: … */` metadata header.
- `styles.css` — the single stylesheet entry: it `@import`s the tokens, fonts, and component styles (`_ds_bundle.css`). Link this one file.
- `components/<group>/<Name>/<Name>.prompt.md` (example JSX + variants), `<Name>.d.ts` (types), `<Name>.html` (variant grid).
- `tokens/*.css` — CSS custom properties, names verbatim from upstream.
- `fonts/` — `@font-face` files + `fonts.css` (when the package ships fonts).

For a specific component, `read_file("components/<group>/<Name>/<Name>.prompt.md")`.

## Loading

Add these two lines to your page once (React must be on the page first):

```html
<link rel="stylesheet" href="styles.css">
<script src="_ds_bundle.js"></script>
```

Components are then available at `window.Pamwe.*`. Mount into a dedicated child node (e.g. `<div id="ds-root">`), not the host page's own React root, so the two trees don't collide:

```jsx
const { Avatar } = window.Pamwe;
ReactDOM.createRoot(document.getElementById('ds-root')).render(<Avatar />);
```

Wrap the tree in the provider — most components read theme/i18n from context:

```jsx
<ThemeProvider><SafeAreaProvider>{children}</SafeAreaProvider></ThemeProvider>
```

## Tokens

22 CSS custom properties from pamwe. Names are
preserved verbatim from upstream. They are declared inside `_ds_bundle.css` (this DS ships one compiled stylesheet rather than separate token files).

- **color** (2): `--surface`, `--surface2`
- **other** (20): `--bg`, `--line`, `--line2`, …

## Components

### general
- `Avatar`
- `BackLink`
- `BottomSheet`
- `Button`
- `Card`
- `CategoryChip`
- `Floral`
- `Glass`
- `ProgressBar`
- `Screen`
- `SectionEyebrow`
- `SegmentedControl`
- `Spinner`
- `StreakBar`
- `StreakTree`
- `StripedBanner`
- `Switch`
- `Text`
- `TwineDivider`
