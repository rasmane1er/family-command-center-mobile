import { Platform } from 'react-native';

const fontFamily = Platform.select({
  ios: {
    regular: 'System',
    medium: 'System',
    bold: 'System',
    heavy: 'System',
  },
  android: {
    regular: 'Roboto',
    medium: 'Roboto-Medium',
    bold: 'Roboto-Bold',
    heavy: 'Roboto-Black',
  },
  default: {
    regular: 'System',
    medium: 'System',
    bold: 'System',
    heavy: 'System',
  },
});

export const typography = {
  // Display
  display1: { fontSize: 48, fontWeight: '800' as const, lineHeight: 56, letterSpacing: -1.5 },
  display2: { fontSize: 40, fontWeight: '800' as const, lineHeight: 48, letterSpacing: -1 },

  // Headings
  h1: { fontSize: 32, fontWeight: '700' as const, lineHeight: 40, letterSpacing: -0.5 },
  h2: { fontSize: 28, fontWeight: '700' as const, lineHeight: 36 },
  h3: { fontSize: 24, fontWeight: '600' as const, lineHeight: 32 },
  h4: { fontSize: 20, fontWeight: '600' as const, lineHeight: 28 },
  h5: { fontSize: 18, fontWeight: '600' as const, lineHeight: 26 },
  h6: { fontSize: 16, fontWeight: '600' as const, lineHeight: 24 },

  // Body
  bodyLarge: { fontSize: 18, fontWeight: '400' as const, lineHeight: 28 },
  body: { fontSize: 16, fontWeight: '400' as const, lineHeight: 24 },
  bodySmall: { fontSize: 14, fontWeight: '400' as const, lineHeight: 22 },

  // Utility
  label: { fontSize: 12, fontWeight: '600' as const, lineHeight: 16, letterSpacing: 0.5 },
  labelLarge: { fontSize: 14, fontWeight: '600' as const, lineHeight: 20 },
  caption: { fontSize: 11, fontWeight: '400' as const, lineHeight: 16 },
  overline: { fontSize: 10, fontWeight: '700' as const, lineHeight: 14, letterSpacing: 1.5 },

  // Numeric
  numericLarge: { fontSize: 36, fontWeight: '700' as const, lineHeight: 44, fontVariant: ['tabular-nums'] as const },
  numeric: { fontSize: 24, fontWeight: '700' as const, lineHeight: 32, fontVariant: ['tabular-nums'] as const },
  numericSmall: { fontSize: 16, fontWeight: '700' as const, lineHeight: 24, fontVariant: ['tabular-nums'] as const },

  fontFamily,
};

export type Typography = typeof typography;
