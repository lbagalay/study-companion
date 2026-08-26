import { Image, StyleSheet, View } from 'react-native';

import { useAppTheme } from '@/hooks/useAppTheme';

const SOURCES = {
  avatar: require('../../../assets/images/bear-avatar.png'),
  button: require('../../../assets/images/bear-button.png'),
  full: require('../../../assets/images/bear.png'),
} as const;

type Props = {
  size?: number;
  variant?: keyof typeof SOURCES;
};

export function BearAvatar({ size = 40, variant = 'avatar' }: Props) {
  const palette = useAppTheme();

  return (
    <View
      accessibilityLabel="Study Assistant avatar"
      accessibilityRole="image"
      style={[
        styles.wrap,
        {
          backgroundColor: palette.accentSoft,
          borderColor: palette.border,
          borderRadius: size / 2,
          height: size,
          width: size,
        },
      ]}
    >
      <Image
        accessibilityIgnoresInvertColors
        resizeMode="cover"
        source={SOURCES[variant]}
        style={{ borderRadius: size / 2, height: size, width: size }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    borderWidth: 1,
    justifyContent: 'center',
    overflow: 'hidden',
  },
});
