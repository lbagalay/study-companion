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

const neutrals = {
  light: {
    ...shared,

    background: '#FAF7F9',
    surface: '#FFFCFE',
    surfaceAlt: '#F7EEF3',

    text: brand.ink,
    textMuted: brand.slate,
  },

  dark: {
    ...shared,

    background: brand.ink,
    surface: '#142A3D',
    surfaceAlt: brand.navy,

    text: '#FFF8FC',
    textMuted: brand.blush,
  },
} as const;

type AccentTone = {
  accent: string;
  accentSolid: string;
  accentStrong: string;
  accentSoft: string;
  border: string;
  lavender: string;
  lavenderSoft: string;
  peachSoft: string;
  tabBarBackground: string;
  tabBarBorder: string;
  tabBarActiveBackground: string;
  tabBarActiveTint: string;
  tabBarInactiveTint: string;
};

export const accentThemes = {
  blush: {
    light: {
      accent: brand.mauve,
      accentSolid: brand.mauve,
      accentStrong: brand.ink,
      accentSoft: brand.blush,
      border: brand.blush,
      lavender: brand.blue,
      lavenderSoft: '#EDF3F9',
      peachSoft: '#F6ECF2',
      tabBarBackground: brand.blush,
      tabBarBorder: 'rgba(193, 141, 180, 0.65)',
      tabBarActiveBackground: brand.mauve,
      tabBarActiveTint: brand.ink,
      tabBarInactiveTint: brand.slate,
    },

    dark: {
      accent: brand.mauve,
      accentSolid: brand.mauve,
      accentStrong: brand.blush,
      accentSoft: brand.slate,
      border: brand.slate,
      lavender: brand.blue,
      lavenderSoft: brand.navy,
      peachSoft: brand.slate,
      tabBarBackground: brand.navy,
      tabBarBorder: 'rgba(193, 141, 180, 0.35)',
      tabBarActiveBackground: brand.mauve,
      tabBarActiveTint: brand.blush,
      tabBarInactiveTint: brand.blue,
    },
  },

  lavender: {
    light: {
      accent: '#9B8AC4',
      accentSolid: '#9B8AC4',
      accentStrong: '#241B4A',
      accentSoft: '#E4DEF3',
      border: '#E4DEF3',
      lavender: '#7EA6D8',
      lavenderSoft: '#EEF1FA',
      peachSoft: '#F1EEF8',
      tabBarBackground: '#E4DEF3',
      tabBarBorder: 'rgba(155, 138, 196, 0.65)',
      tabBarActiveBackground: '#9B8AC4',
      tabBarActiveTint: '#241B4A',
      tabBarInactiveTint: '#4A3F73',
    },

    dark: {
      accent: '#B3A2D6',
      accentSolid: '#9B8AC4',
      accentStrong: '#E4DEF3',
      accentSoft: '#3B2F63',
      border: '#3B2F63',
      lavender: '#7EA6D8',
      lavenderSoft: '#241B4A',
      peachSoft: '#3B2F63',
      tabBarBackground: '#241B4A',
      tabBarBorder: 'rgba(155, 138, 196, 0.35)',
      tabBarActiveBackground: '#9B8AC4',
      tabBarActiveTint: '#E4DEF3',
      tabBarInactiveTint: '#7EA6D8',
    },
  },

  ocean: {
    light: {
      accent: '#5FA8A0',
      accentSolid: '#5FA8A0',
      accentStrong: '#123B3A',
      accentSoft: '#D6EDEA',
      border: '#D6EDEA',
      lavender: '#6FA0C9',
      lavenderSoft: '#EAF3F8',
      peachSoft: '#E6F2F0',
      tabBarBackground: '#D6EDEA',
      tabBarBorder: 'rgba(95, 168, 160, 0.65)',
      tabBarActiveBackground: '#5FA8A0',
      tabBarActiveTint: '#123B3A',
      tabBarInactiveTint: '#2E5C58',
    },

    dark: {
      accent: '#7FC2BA',
      accentSolid: '#5FA8A0',
      accentStrong: '#D6EDEA',
      accentSoft: '#1E4A47',
      border: '#1E4A47',
      lavender: '#6FA0C9',
      lavenderSoft: '#123B3A',
      peachSoft: '#1E4A47',
      tabBarBackground: '#123B3A',
      tabBarBorder: 'rgba(95, 168, 160, 0.35)',
      tabBarActiveBackground: '#5FA8A0',
      tabBarActiveTint: '#D6EDEA',
      tabBarInactiveTint: '#6FA0C9',
    },
  },
} as const satisfies Record<string, { light: AccentTone; dark: AccentTone }>;

export type AccentThemeKey = keyof typeof accentThemes;
export type ColorScheme = 'light' | 'dark';

export const accentThemeMeta: Record<AccentThemeKey, { label: string; swatch: string }> = {
  blush: { label: 'Blush', swatch: brand.mauve },
  lavender: { label: 'Lavender', swatch: '#9B8AC4' },
  ocean: { label: 'Ocean', swatch: '#5FA8A0' },
};

export function buildPalette(accentKey: AccentThemeKey, scheme: ColorScheme) {
  return { ...neutrals[scheme], ...accentThemes[accentKey][scheme] };
}

export type Palette = ReturnType<typeof buildPalette>;

export const colors = {
  light: buildPalette('blush', 'light'),
  dark: buildPalette('blush', 'dark'),
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
