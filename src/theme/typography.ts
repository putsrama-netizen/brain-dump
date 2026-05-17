import { Platform, TextStyle } from 'react-native';

// "Paper Trail" type stack:
//   Serif headers   → Playfair Display (loaded via @expo-google-fonts in _layout)
//   Body / UI       → platform sans (still clean and minimal)
//   Input / mono    → typewriter monospace (Menlo on iOS, system mono on Android)
//
// Font family strings here match the exports of @expo-google-fonts/playfair-display.
// If the font hasn't loaded yet (e.g. first render), RN falls back to the platform
// default; the root layout gates rendering on `useFonts` so this is brief.

export const playfair = {
  regular: 'PlayfairDisplay_400Regular',
  medium: 'PlayfairDisplay_500Medium',
  semibold: 'PlayfairDisplay_600SemiBold',
  bold: 'PlayfairDisplay_700Bold',
} as const;

const sansSerif = Platform.select({
  ios: 'System',
  android: 'sans-serif',
  default: 'System',
});

const mono = Platform.select({
  ios: 'Menlo',
  android: 'monospace',
  default: 'Menlo',
});

export const typography = {
  display: {
    fontFamily: playfair.semibold,
    fontSize: 34,
    letterSpacing: -0.3,
    lineHeight: 42,
  },
  title: {
    fontFamily: playfair.medium,
    fontSize: 24,
    letterSpacing: -0.1,
    lineHeight: 30,
  },
  body: {
    fontFamily: sansSerif,
    fontSize: 17,
    fontWeight: '400',
    lineHeight: 24,
  },
  bodyLarge: {
    fontFamily: sansSerif,
    fontSize: 19,
    fontWeight: '400',
    lineHeight: 28,
  },
  caption: {
    fontFamily: sansSerif,
    fontSize: 12,
    fontWeight: '500',
    letterSpacing: 0.6,
    lineHeight: 16,
  },
  // Typewriter / architect's-notes feel for the dump input.
  input: {
    fontFamily: mono,
    fontSize: 18,
    fontWeight: '400',
    lineHeight: 28,
    letterSpacing: 0.1,
  },
} satisfies Record<string, TextStyle>;
