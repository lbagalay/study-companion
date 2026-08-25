import { LinearGradient } from 'expo-linear-gradient';
import { Image, StyleSheet, Text, View } from 'react-native';

type FolderPattern =
  | 'hearts'
  | 'floralHeart'
  | 'plaid'
  | 'gingham'
  | 'argyle'
  | 'diamondDot'
  | 'heartGridWhite'
  | 'floralLeaf'
  | 'bowStripe'
  | 'diagonalPlaid'
  | 'checkerSparkle'
  | 'ginghamFine';

type FolderTheme = {
  base: string;
  tab: string;
  accent: string;
  accent2?: string;
  pattern: FolderPattern;
};

export type FolderPackKey =
  'cutesyPink' | 'pastelDreams' | 'sunsetPeach' | 'sageMeadow' | 'moonlight';

export const folderPackMeta: Record<FolderPackKey, { label: string; description: string }> = {
  cutesyPink: { label: 'Cutesy Pink', description: 'Hearts, gingham, and bows in soft pink.' },
  pastelDreams: { label: 'Pastel Dreams', description: 'Mint, lilac, sky, and butter-yellow.' },
  sunsetPeach: { label: 'Sunset Peach', description: 'Coral, terracotta, and warm mustard.' },
  sageMeadow: { label: 'Sage Meadow', description: 'Olive, moss, and creamy earth tones.' },
  moonlight: { label: 'Moonlight', description: 'Deep plum, navy, and emerald jewel tones.' },
};

export const FOLDER_PACKS: Record<FolderPackKey, FolderTheme[]> = {
  cutesyPink: [
    { base: '#F6F0FA', tab: '#E4C6DE', accent: '#D9A9CE', pattern: 'hearts' },
    {
      base: '#FBD7E4',
      tab: '#F3A9C4',
      accent: '#E8729B',
      accent2: '#F5A0C0',
      pattern: 'floralHeart',
    },
    { base: '#FCE6D2', tab: '#EFB98C', accent: '#E2946B', pattern: 'plaid' },
    { base: '#FFFFFF', tab: '#F3AFC7', accent: '#F3AFC7', pattern: 'gingham' },
    { base: '#FBD8D9', tab: '#E9A0AE', accent: '#D9727F', accent2: '#EFAAB3', pattern: 'argyle' },
    { base: '#FCE3EC', tab: '#F0AFC9', accent: '#E890B3', pattern: 'diamondDot' },
    { base: '#FFFFFF', tab: '#F2AFC6', accent: '#F2AFC6', pattern: 'heartGridWhite' },
    {
      base: '#FADCE6',
      tab: '#EFAFC8',
      accent: '#E8799F',
      accent2: '#8FBF8A',
      pattern: 'floralLeaf',
    },
    {
      base: '#FDE9EF',
      tab: '#F0A9C3',
      accent: '#F5C4D6',
      accent2: '#E8729B',
      pattern: 'bowStripe',
    },
    { base: '#E9A9A0', tab: '#D98177', accent: '#C96A5E', pattern: 'diagonalPlaid' },
    {
      base: '#F3C6E0',
      tab: '#D9A0D0',
      accent: '#D9B8F0',
      accent2: '#FFFFFF',
      pattern: 'checkerSparkle',
    },
    { base: '#FFFFFF', tab: '#EFAFC0', accent: '#EFAFC0', pattern: 'ginghamFine' },
  ],

  pastelDreams: [
    { base: '#F3F0FB', tab: '#D8C9EF', accent: '#B79EE0', pattern: 'hearts' },
    {
      base: '#E8F6EC',
      tab: '#B7E4C4',
      accent: '#6FBF8B',
      accent2: '#8FD1A6',
      pattern: 'floralHeart',
    },
    { base: '#FFF6DE', tab: '#F2DA96', accent: '#E0BD5E', pattern: 'plaid' },
    { base: '#FFFFFF', tab: '#A9D3EE', accent: '#A9D3EE', pattern: 'gingham' },
    { base: '#FDE8E0', tab: '#F3B79D', accent: '#E0906E', accent2: '#F0C3AC', pattern: 'argyle' },
    { base: '#EAF2FE', tab: '#B9D3F2', accent: '#8FB3E0', pattern: 'diamondDot' },
    { base: '#FFFFFF', tab: '#C9B6EA', accent: '#C9B6EA', pattern: 'heartGridWhite' },
    {
      base: '#EAFBF0',
      tab: '#A8E0BC',
      accent: '#F2A6C4',
      accent2: '#5FAE7C',
      pattern: 'floralLeaf',
    },
    {
      base: '#F5F0FF',
      tab: '#D3C2F0',
      accent: '#E9DFFC',
      accent2: '#B79EE0',
      pattern: 'bowStripe',
    },
    { base: '#FBE0C9', tab: '#E8B98A', accent: '#D69A61', pattern: 'diagonalPlaid' },
    {
      base: '#E4F3FF',
      tab: '#A9CDEE',
      accent: '#C7E4F7',
      accent2: '#FFFFFF',
      pattern: 'checkerSparkle',
    },
    { base: '#FFFFFF', tab: '#C9E7D2', accent: '#C9E7D2', pattern: 'ginghamFine' },
  ],

  sunsetPeach: [
    { base: '#FFF3E8', tab: '#F5C99A', accent: '#E8A669', pattern: 'hearts' },
    {
      base: '#FDE3D0',
      tab: '#F0B385',
      accent: '#E0793F',
      accent2: '#F0956B',
      pattern: 'floralHeart',
    },
    { base: '#FFF0DC', tab: '#E8B45C', accent: '#C98A3A', pattern: 'plaid' },
    { base: '#FFFFFF', tab: '#F0A97C', accent: '#F0A97C', pattern: 'gingham' },
    { base: '#FBDCC8', tab: '#E39B6E', accent: '#C96B3E', accent2: '#EAB48C', pattern: 'argyle' },
    { base: '#FDEBDD', tab: '#F0BE96', accent: '#E09763', pattern: 'diamondDot' },
    { base: '#FFFFFF', tab: '#F0C08A', accent: '#F0C08A', pattern: 'heartGridWhite' },
    {
      base: '#FFF0E0',
      tab: '#F0C48F',
      accent: '#E27D4F',
      accent2: '#8FAE5F',
      pattern: 'floralLeaf',
    },
    {
      base: '#FFF6EC',
      tab: '#F0CBA0',
      accent: '#F7E1C8',
      accent2: '#D97D42',
      pattern: 'bowStripe',
    },
    { base: '#D98E5C', tab: '#B8663A', accent: '#96502C', pattern: 'diagonalPlaid' },
    {
      base: '#FCE0C4',
      tab: '#E8A96D',
      accent: '#F2C593',
      accent2: '#FFFFFF',
      pattern: 'checkerSparkle',
    },
    { base: '#FFFFFF', tab: '#EFC49A', accent: '#EFC49A', pattern: 'ginghamFine' },
  ],

  sageMeadow: [
    { base: '#F3F6EE', tab: '#C9DCB0', accent: '#9CB77D', pattern: 'hearts' },
    {
      base: '#E6EFD9',
      tab: '#B7D19A',
      accent: '#6F8F4E',
      accent2: '#8FAE6A',
      pattern: 'floralHeart',
    },
    { base: '#F2EEDC', tab: '#C9BE87', accent: '#A69A5E', pattern: 'plaid' },
    { base: '#FFFFFF', tab: '#A9C48A', accent: '#A9C48A', pattern: 'gingham' },
    { base: '#E4EAD2', tab: '#AABF83', accent: '#7C9152', accent2: '#C3D19E', pattern: 'argyle' },
    { base: '#EDF3E3', tab: '#BCD39D', accent: '#8FAE6A', pattern: 'diamondDot' },
    { base: '#FFFFFF', tab: '#B7CE9A', accent: '#B7CE9A', pattern: 'heartGridWhite' },
    {
      base: '#EAF2DC',
      tab: '#B4CE8F',
      accent: '#D9A45C',
      accent2: '#6F8F4E',
      pattern: 'floralLeaf',
    },
    {
      base: '#F5F6EC',
      tab: '#C7D8A9',
      accent: '#E4EAD2',
      accent2: '#7C9152',
      pattern: 'bowStripe',
    },
    { base: '#A9A46E', tab: '#847F4C', accent: '#66622F', pattern: 'diagonalPlaid' },
    {
      base: '#E6EAD2',
      tab: '#B4C48A',
      accent: '#D3DCB4',
      accent2: '#FFFFFF',
      pattern: 'checkerSparkle',
    },
    { base: '#FFFFFF', tab: '#C4D6A4', accent: '#C4D6A4', pattern: 'ginghamFine' },
  ],

  moonlight: [
    { base: '#2E2440', tab: '#4A3866', accent: '#8A6FB0', pattern: 'hearts' },
    {
      base: '#24303F',
      tab: '#375068',
      accent: '#5B8AA6',
      accent2: '#7FB0C4',
      pattern: 'floralHeart',
    },
    { base: '#2A1F2E', tab: '#4A2E4E', accent: '#6E4470', pattern: 'plaid' },
    { base: '#1F2A24', tab: '#3E6B52', accent: '#3E6B52', pattern: 'gingham' },
    { base: '#331A22', tab: '#5C2A38', accent: '#8A3F4F', accent2: '#B0596A', pattern: 'argyle' },
    { base: '#1E2440', tab: '#33407A', accent: '#5468B0', pattern: 'diamondDot' },
    { base: '#241E33', tab: '#4A3E66', accent: '#4A3E66', pattern: 'heartGridWhite' },
    {
      base: '#1F2E28',
      tab: '#335C48',
      accent: '#6F9C7F',
      accent2: '#B0596A',
      pattern: 'floralLeaf',
    },
    {
      base: '#2A2038',
      tab: '#4A3866',
      accent: '#6E5490',
      accent2: '#B0596A',
      pattern: 'bowStripe',
    },
    { base: '#4A2E4E', tab: '#331F35', accent: '#21131F', pattern: 'diagonalPlaid' },
    {
      base: '#1E2440',
      tab: '#33407A',
      accent: '#5468B0',
      accent2: '#FFD98A',
      pattern: 'checkerSparkle',
    },
    { base: '#241E33', tab: '#4A3E66', accent: '#4A3E66', pattern: 'ginghamFine' },
  ],
};

function hashString(value: string) {
  let hash = 0;

  for (let i = 0; i < value.length; i += 1) {
    hash = (hash * 31 + value.charCodeAt(i)) >>> 0;
  }

  return hash;
}

export function themeForSeed(seed: string, pack: FolderPackKey = 'cutesyPink') {
  const list = FOLDER_PACKS[pack];

  return list[hashString(seed) % list.length];
}

export function FolderIcon({
  seed,
  size = 56,
  pack = 'cutesyPink',
  skinUrl,
}: {
  seed: string;
  size?: number;
  pack?: FolderPackKey;
  skinUrl?: string | null;
}) {
  const theme = themeForSeed(seed, pack);

  const width = size;

  const bodyHeight = size * 0.72;

  const tabHeight = size * 0.24;

  const tabVisible = tabHeight * 0.5;

  const tabOverlap = tabHeight - tabVisible;

  const corner = size * 0.07;

  const cornerSeam = size * 0.015;

  const tabCorner = size * 0.05;

  return (
    <View style={{ height: bodyHeight + tabVisible, width }}>
      <View
        style={[
          styles.tab,
          {
            backgroundColor: theme.tab,
            borderColor: theme.tab,
            borderTopLeftRadius: cornerSeam,
            borderTopRightRadius: tabCorner,
            borderWidth: 1,
            height: tabHeight,
            width: width * 0.44,
          },
        ]}
      />

      <View
        style={[
          styles.body,
          {
            backgroundColor: theme.base,
            borderBottomLeftRadius: corner,
            borderBottomRightRadius: corner,
            borderColor: 'rgba(0,0,0,0.06)',
            borderTopLeftRadius: cornerSeam,
            borderTopRightRadius: corner,
            borderWidth: 1,
            boxShadow: '0 2px 5px rgba(140, 60, 90, 0.18)',
            height: bodyHeight,
            top: tabOverlap,
            width,
          },
        ]}
      >
        {skinUrl ? (
          <Image resizeMode="cover" source={{ uri: skinUrl }} style={StyleSheet.absoluteFill} />
        ) : (
          renderPattern(theme)
        )}

        <LinearGradient
          colors={['rgba(255,255,255,0.18)', 'rgba(255,255,255,0)']}
          end={{ x: 0, y: 0.4 }}
          start={{ x: 0, y: 0 }}
          style={StyleSheet.absoluteFill}
        />

        <View style={styles.rim} />
      </View>
    </View>
  );
}

function renderPattern(theme: FolderTheme) {
  switch (theme.pattern) {
    case 'hearts':
      return <GlyphGrid color={theme.accent} count={6} glyph="♡" size={9} />;

    case 'heartGridWhite':
      return <GlyphGrid color={theme.accent} count={9} glyph="♥" size={7} />;

    case 'floralHeart':
      return (
        <View style={styles.glyphGrid}>
          {Array.from({ length: 6 }).map((_, index) => (
            <Text
              key={index}
              style={[styles.glyph, { color: index % 2 === 0 ? theme.accent : theme.accent2 }]}
            >
              {index % 2 === 0 ? '❀' : '♥'}
            </Text>
          ))}
        </View>
      );

    case 'floralLeaf':
      return (
        <View style={styles.glyphGrid}>
          {Array.from({ length: 6 }).map((_, index) => (
            <Text
              key={index}
              style={[styles.glyph, { color: index % 3 === 2 ? theme.accent2 : theme.accent }]}
            >
              {index % 3 === 2 ? '❦' : '✿'}
            </Text>
          ))}
        </View>
      );

    case 'diamondDot':
      return (
        <View style={styles.diamondGrid}>
          {Array.from({ length: 12 }).map((_, index) => (
            <View key={index} style={[styles.diamond, { backgroundColor: theme.accent }]} />
          ))}
        </View>
      );

    case 'gingham':
      return (
        <CrosshatchLines
          color={theme.accent}
          opacity={0.55}
          spacing={[13, 27, 41, 55, 69, 83]}
          thickness={1.4}
        />
      );

    case 'ginghamFine':
      return (
        <CrosshatchLines
          color={theme.accent}
          opacity={0.5}
          spacing={[11, 22, 33, 44, 55, 66, 77, 88]}
          thickness={1}
        />
      );

    case 'plaid':
      return (
        <>
          <CrosshatchLines color={theme.accent} opacity={0.35} spacing={[30, 68]} thickness={3} />
          <CrosshatchLines
            color={theme.accent}
            opacity={0.2}
            spacing={[12, 48, 86]}
            thickness={1}
          />
        </>
      );

    case 'diagonalPlaid':
      return (
        <View style={styles.stripesWrap}>
          <DiagonalStripes color={theme.accent} rotate="20deg" tops={[6, 30, 54, 78]} />
          <DiagonalStripes color={theme.accent} rotate="-20deg" tops={[6, 30, 54, 78]} />
        </View>
      );

    case 'argyle':
      return (
        <>
          <View style={styles.stripesWrap}>
            <DiagonalStripes
              color={theme.accent2 ?? theme.accent}
              rotate="45deg"
              tops={[10, 45, 80]}
            />
            <DiagonalStripes
              color={theme.accent2 ?? theme.accent}
              rotate="-45deg"
              tops={[10, 45, 80]}
            />
          </View>

          <GlyphGrid color={theme.accent} count={4} glyph="♥" size={7} />
        </>
      );

    case 'bowStripe':
      return (
        <>
          <View style={styles.vStripesWrap}>
            {Array.from({ length: 4 }).map((_, index) => (
              <View key={index} style={[styles.vStripe, { backgroundColor: theme.accent }]} />
            ))}
          </View>

          <GlyphGrid color={theme.accent2 ?? theme.accent} count={4} glyph="🎀" size={10} />
        </>
      );

    case 'checkerSparkle':
      return (
        <>
          <View style={styles.checkerGrid}>
            {Array.from({ length: 9 }).map((_, index) => (
              <View
                key={index}
                style={[
                  styles.checkerCell,
                  { backgroundColor: index % 2 === 0 ? theme.accent : 'transparent' },
                ]}
              />
            ))}
          </View>

          <GlyphGrid
            color={theme.accent2 ?? '#FFFFFF'}
            count={3}
            glyph="✦"
            opacity={0.85}
            size={8}
          />
        </>
      );

    default:
      return null;
  }
}

function GlyphGrid({
  color,
  count,
  glyph,
  size = 9,
  opacity = 0.6,
}: {
  color: string;
  count: number;
  glyph: string;
  size?: number;
  opacity?: number;
}) {
  return (
    <View style={[styles.glyphGrid, { opacity }]}>
      {Array.from({ length: count }).map((_, index) => (
        <Text key={index} style={[styles.glyph, { color, fontSize: size }]}>
          {glyph}
        </Text>
      ))}
    </View>
  );
}

function CrosshatchLines({
  color,
  spacing,
  thickness,
  opacity = 0.4,
}: {
  color: string;
  spacing: number[];
  thickness: number;
  opacity?: number;
}) {
  return (
    <View style={StyleSheet.absoluteFill}>
      {spacing.map((pos) => (
        <View
          key={`h${pos}`}
          style={[
            styles.hLine,
            { backgroundColor: color, height: thickness, opacity, top: `${pos}%` },
          ]}
        />
      ))}

      {spacing.map((pos) => (
        <View
          key={`v${pos}`}
          style={[
            styles.vLine,
            { backgroundColor: color, left: `${pos}%`, opacity, width: thickness },
          ]}
        />
      ))}
    </View>
  );
}

function DiagonalStripes({
  color,
  rotate,
  tops,
  opacity = 0.3,
}: {
  color: string;
  rotate: string;
  tops: number[];
  opacity?: number;
}) {
  return (
    <>
      {tops.map((top) => (
        <View
          key={top}
          style={[
            styles.diagStripe,
            { backgroundColor: color, opacity, top: `${top}%`, transform: [{ rotate }] },
          ]}
        />
      ))}
    </>
  );
}

const styles = StyleSheet.create({
  tab: {
    left: 0,
    position: 'absolute',
    top: 0,
  },

  body: {
    left: 0,
    overflow: 'hidden',
    position: 'absolute',
  },

  rim: {
    backgroundColor: 'rgba(255,255,255,0.55)',
    height: 1,
    left: 0,
    position: 'absolute',
    right: 0,
    top: 0,
  },

  glyphGrid: {
    alignContent: 'center',
    flex: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },

  glyph: {
    margin: 2,
  },

  diamondGrid: {
    alignContent: 'center',
    flex: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    opacity: 0.55,
    paddingHorizontal: 5,
  },

  diamond: {
    height: 5,
    margin: 2.5,
    transform: [{ rotate: '45deg' }],
    width: 5,
  },

  hLine: { position: 'absolute', width: '100%' },
  vLine: { bottom: 0, position: 'absolute', top: 0 },

  checkerGrid: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    flexWrap: 'wrap',
    opacity: 0.45,
  },

  checkerCell: {
    height: '33.33%',
    width: '33.33%',
  },

  stripesWrap: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    overflow: 'hidden',
  },

  diagStripe: {
    height: 2.5,
    left: '-30%',
    position: 'absolute',
    width: '160%',
  },

  vStripesWrap: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    flexDirection: 'row',
    gap: 6,
    justifyContent: 'center',
    opacity: 0.3,
    overflow: 'hidden',
  },

  vStripe: {
    height: '160%',
    width: 3,
  },
});
