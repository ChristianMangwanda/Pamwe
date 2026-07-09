export const fonts = {
  serif: 'Fraunces_400Regular',
  serifItalic: 'Fraunces_400Regular_Italic',
  serifLight: 'Fraunces_300Light',
  serifLightItalic: 'Fraunces_300Light_Italic',
  serifMedium: 'Fraunces_500Medium',
  serifMediumItalic: 'Fraunces_500Medium_Italic',
  serifSemiBold: 'Fraunces_600SemiBold',
  sans: 'InstrumentSans_400Regular',
  sansMedium: 'InstrumentSans_500Medium',
  sansSemiBold: 'InstrumentSans_600SemiBold',
};

export const typeScale = {
  hero: { fontFamily: fonts.serifLight, fontSize: 32 },
  heading: { fontFamily: fonts.serifLightItalic, fontSize: 26 },
  scripture: { fontFamily: fonts.serif, fontSize: 18 },
  journal: { fontFamily: fonts.serif, fontSize: 17 },
  body: { fontFamily: fonts.sans, fontSize: 14 },
  label: { fontFamily: fonts.sansMedium, fontSize: 10, letterSpacing: 2.2, textTransform: 'uppercase' as const },
  button: { fontFamily: fonts.sansMedium, fontSize: 14, letterSpacing: 0.8, textTransform: 'uppercase' as const },
  // Design-handoff tokens (Pamwe App.dc.html) — exact values from the prototype.
  eyebrow: { fontFamily: fonts.sansSemiBold, fontSize: 10, letterSpacing: 2, textTransform: 'uppercase' as const },
  h1: { fontFamily: fonts.serifLight, fontSize: 30 },
  h2: { fontFamily: fonts.serif, fontSize: 22 },
  reader: { fontFamily: fonts.serif, fontSize: 19, lineHeight: 19 * 1.9 },
  cta: { fontFamily: fonts.sansSemiBold, fontSize: 13, letterSpacing: 1.2, textTransform: 'uppercase' as const },
  chip: { fontFamily: fonts.sansSemiBold, fontSize: 8.5, letterSpacing: 0.85, textTransform: 'uppercase' as const },
};
