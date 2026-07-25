// Web shim: liquid glass is iOS-only. Glass.tsx guards every GlassView use
// behind isLiquidGlassAvailable(), so forcing false routes the web render
// through the real BlurView branch (expo-blur has a web implementation).
export const isLiquidGlassAvailable = () => false;
export function GlassView(_props: unknown): null {
  return null;
}
