import { Platform, type TextStyle } from 'react-native';

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
    accentSolid: brand.navy,
    accentStrong: brand.navy,
    accentSoft: brand.blush,
    background: '#F8F4F7',
    border: brand.blush,
    lavender: brand.blue,
    lavenderSoft: '#EAF0F7',
    peachSoft: '#F2E8EE',
    surface: '#FFFCFE',
    surfaceAlt: '#F3EAF0',
    text: brand.ink,
    textMuted: brand.slate,
  },
  dark: {
    ...shared,
    accent: brand.mauve,
    accentSolid: brand.slate,
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

const editorialFont = Platform.select({ android: 'serif', default: 'Georgia', ios: 'Georgia', web: 'Georgia, Times New Roman, serif' });

export const typography = {
  title: {
    fontFamily: editorialFont,
    fontSize: 38,
    fontWeight: '600',
    letterSpacing: -0.6,
    lineHeight: 45,
  } satisfies TextStyle,
  sectionTitle: {
    fontFamily: editorialFont,
    fontSize: 22,
    fontWeight: '600',
    lineHeight: 29,
  } satisfies TextStyle,
  body: {
    fontSize: 16,
    fontWeight: '400',
    lineHeight: 24,
  } satisfies TextStyle,
  label: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1.15,
    lineHeight: 16,
    textTransform: 'uppercase',
  } satisfies TextStyle,
  caption: {
    fontSize: 11,
    fontWeight: '500',
    lineHeight: 14,
  } satisfies TextStyle,
} as const;
