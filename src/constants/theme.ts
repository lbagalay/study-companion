import type { TextStyle } from 'react-native';

export const brand = {
  navy: '#0E1B48',
  mauve: '#C18DB4',
  blush: '#E2CAD8',
  blue: '#87A7D0',
  slate: '#27425D',
  ink: '#0E1F2F',
} as const;

const shared = {
  danger: brand.navy,
  warning: brand.blue,
  success: brand.slate,
} as const;

export const colors = {
  light: {
    ...shared,

    accent: brand.mauve,
    accentSolid: brand.mauve,
    accentStrong: brand.ink,
    accentSoft: brand.blush,

    background: '#FAF7F9',
    border: brand.blush,

    lavender: brand.blue,
    lavenderSoft: '#EDF3F9',

    peachSoft: '#F6ECF2',

    surface: '#FFFCFE',
    surfaceAlt: '#F7EEF3',

    text: brand.ink,
    textMuted: brand.slate,
  },

  dark: {
    ...shared,

    accent: brand.mauve,
    accentSolid: brand.mauve,
    accentStrong: brand.blush,
    accentSoft: brand.slate,

    background: brand.ink,
    border: brand.slate,

    lavender: brand.blue,
    lavenderSoft: brand.navy,

    peachSoft: brand.slate,

    surface: '#142A3D',
    surfaceAlt: brand.navy,

    text: '#FFF8FC',
    textMuted: brand.blush,
  },
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 20,
  xl: 28,
  xxl: 40,
} as const;

export const radii = {
  sm: 8,
  md: 14,
  lg: 22,
  xl: 30,
  pill: 999,
} as const;

export const typography = {
  title: {
    fontFamily: 'Nunito_800ExtraBold',
    fontSize: 38,
    fontWeight: '800',
    letterSpacing: -0.7,
    lineHeight: 44,
  } satisfies TextStyle,

  sectionTitle: {
    fontFamily: 'Nunito_700Bold',
    fontSize: 22,
    fontWeight: '700',
    letterSpacing: -0.25,
    lineHeight: 28,
  } satisfies TextStyle,

  body: {
    fontFamily: 'Inter_400Regular',
    fontSize: 16,
    fontWeight: '400',
    lineHeight: 24,
  } satisfies TextStyle,

  label: {
    fontFamily: 'Inter_500Medium',
    fontSize: 12,
    fontWeight: '500',
    letterSpacing: 1.1,
    lineHeight: 16,
    textTransform: 'uppercase',
  } satisfies TextStyle,

  caption: {
    fontFamily: 'Inter_400Regular',
    fontSize: 11,
    fontWeight: '400',
    lineHeight: 15,
  } satisfies TextStyle,
} as const;
