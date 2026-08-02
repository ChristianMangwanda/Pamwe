import type { ImageSourcePropType } from 'react-native';

// The tree set, from Claude Design's handoff (2026-08-02). Static requires,
// because Metro resolves these at build time and a computed path would not
// bundle.
//
// ONE set, not two. The light and dark exports were pixel-identical silhouettes
// differing only in fill, so these ship as alpha-only art and every screen
// tints them with the theme's accent: half the payload, and they follow the
// palette automatically if it ever moves. Do not add a coloured variant.
export const TREE_SOURCES: Record<string, ImageSourcePropType> = {
  fig: require('../../assets/images/grove/fig.png'),
  olive: require('../../assets/images/grove/olive.png'),
  oak: require('../../assets/images/grove/oak.png'),
  baobab: require('../../assets/images/grove/baobab.png'),
  cedar: require('../../assets/images/grove/cedar.png'),
  redwood: require('../../assets/images/grove/redwood.png'),
};

/** Left and right barefoot prints. */
export const STEP_SOURCES: Record<'a' | 'b', ImageSourcePropType> = {
  a: require('../../assets/images/grove/step-a.png'),
  b: require('../../assets/images/grove/step-b.png'),
};
