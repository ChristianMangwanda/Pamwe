// Web shim: Screen only needs the FAB_CLEARANCE constant; the real PamweFab
// drags in expo-router and the Ask Pamwe sheet. Keep the value in sync with
// src/components/PamweFab.tsx (halo 68 + gap).
export const FAB_CLEARANCE = 96;
export function PamweFab(): null {
  return null;
}
