import type { TextStyle } from 'react-native';

const shared = {
  accent: '#4F6F52',
  accentSoft: '#E6EEE3',
  danger: '#B8473D',
  warning: '#B7791F',
} as const;

export const colors = {
  light: {
    ...shared,
    background: '#F7F8F3',
    border: '#E0E4DA',
    surface: '#FFFFFF',
    text: '#1D261E',
    textMuted: '#68716A',
  },
  dark: {
    ...shared,
    accent: '#9CC49F',
    accentSoft: '#263A2A',
    background: '#121713',
    border: '#303A32',
    surface: '#1C241E',
    text: '#F0F4EF',
    textMuted: '#AAB4AC',
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
  md: 14,
  lg: 20,
  pill: 999,
} as const;

export const typography = {
  title: {
    fontSize: 34,
    fontWeight: '700',
    letterSpacing: -0.8,
    lineHeight: 40,
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
