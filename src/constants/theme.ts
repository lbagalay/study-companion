import type { TextStyle } from 'react-native';

const shared = {
  danger: '#D94D58',
  warning: '#D9913D',
  success: '#5F9B82',
} as const;

export const colors = {
  light: {
    ...shared,
    accent: '#F26167',
    accentSolid: '#D14350',
    accentStrong: '#C94350',
    accentSoft: '#FFE3E4',
    background: '#FFF8F7',
    border: '#F3DADB',
    lavender: '#7770C9',
    lavenderSoft: '#EEEAFE',
    peachSoft: '#FFF0D9',
    surface: '#FFFFFF',
    surfaceAlt: '#FFF0F0',
    text: '#292124',
    textMuted: '#766B6F',
  },
  dark: {
    ...shared,
    accent: '#FF8C90',
    accentSolid: '#D14350',
    accentStrong: '#FFB5B8',
    accentSoft: '#49272A',
    background: '#1D1617',
    border: '#4B3436',
    lavender: '#C5BEFF',
    lavenderSoft: '#342F4B',
    peachSoft: '#463522',
    surface: '#291F21',
    surfaceAlt: '#352326',
    text: '#FFF7F6',
    textMuted: '#D2BCBF',
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
  sm: 10,
  md: 16,
  lg: 24,
  xl: 32,
  pill: 999,
} as const;

export const typography = {
  title: {
    fontSize: 36,
    fontWeight: '700',
    letterSpacing: -1,
    lineHeight: 42,
  } satisfies TextStyle,
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    lineHeight: 26,
  } satisfies TextStyle,
  body: {
    fontSize: 16,
    fontWeight: '400',
    lineHeight: 24,
  } satisfies TextStyle,
  label: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.8,
    lineHeight: 16,
  } satisfies TextStyle,
  caption: {
    fontSize: 11,
    fontWeight: '500',
    lineHeight: 14,
  } satisfies TextStyle,
} as const;
