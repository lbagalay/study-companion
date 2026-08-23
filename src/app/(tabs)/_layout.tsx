import { Tabs } from 'expo-router';
import { useColorScheme, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { TabBarIcon } from '@/components/navigation/TabBarIcon';
import { brand, colors, typography } from '@/constants/theme';

export default function TabLayout() {
  const isDark = useColorScheme() === 'dark';
  const palette = isDark ? colors.dark : colors.light;
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const tabBarWidth = Math.min(width - 28, 720);
  const tabBarBottom = Math.max(12, insets.bottom);

  return (
    <Tabs
      initialRouteName="home"
      screenOptions={{
        headerShown: false,
        sceneStyle: { backgroundColor: palette.background },
        tabBarActiveBackgroundColor: 'transparent',
        tabBarActiveTintColor: brand.ink,
        tabBarAllowFontScaling: false,
        tabBarHideOnKeyboard: true,
        tabBarIconStyle: { height: 34, marginTop: 1 },
        tabBarInactiveTintColor: brand.ink,
        tabBarLabelPosition: 'below-icon',
        tabBarStyle: {
          backgroundColor: brand.blush,
          borderColor: brand.blue,
          borderRadius: 26,
          borderTopWidth: 1,
          borderWidth: 1,
          bottom: tabBarBottom,
          boxShadow: '0 16px 38px rgba(193, 141, 180, 0.34)',
          height: 80,
          left: (width - tabBarWidth) / 2,
          paddingBottom: 7,
          paddingTop: 7,
          position: 'absolute',
          width: tabBarWidth,
        },
        tabBarItemStyle: { borderRadius: 20, marginHorizontal: 2, marginVertical: 3, paddingVertical: 2 },
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: typography.label.fontWeight,
          lineHeight: 14,
          marginBottom: 1,
          marginTop: 0,
        },
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, focused, size }) => (
            <TabBarIcon color={color} focused={focused} name="home" size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="schedule"
        options={{
          title: 'Schedule',
          tabBarIcon: ({ color, focused, size }) => (
            <TabBarIcon color={color} focused={focused} name="calendar" size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="tasks"
        options={{
          title: 'Tasks',
          tabBarIcon: ({ color, focused, size }) => (
            <TabBarIcon color={color} focused={focused} name="checkbox" size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="study"
        options={{
          title: 'Study',
          tabBarIcon: ({ color, focused, size }) => (
            <TabBarIcon color={color} focused={focused} name="book" size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, focused, size }) => (
            <TabBarIcon color={color} focused={focused} name="person" size={size} />
          ),
        }}
      />
    </Tabs>
  );
}
