import { Tabs } from 'expo-router';
import { useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { TabBarIcon } from '@/components/navigation/TabBarIcon';
import { brand, colors, typography } from '@/constants/theme';

export default function TabLayout() {
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const tabBarWidth = Math.min(width - 32, 720);
  const tabBarBottom = Math.max(10, insets.bottom);

  return (
    <Tabs
      initialRouteName="home"
      screenOptions={{
        headerShown: false,
        sceneStyle: { backgroundColor: colors.light.background },
        tabBarActiveBackgroundColor: 'transparent',
        tabBarActiveTintColor: brand.ink,
        tabBarAllowFontScaling: false,
        tabBarHideOnKeyboard: true,
        tabBarIconStyle: { height: 30, marginTop: 1 },
        tabBarInactiveTintColor: brand.slate,
        tabBarLabelPosition: 'below-icon',
        tabBarStyle: {
          backgroundColor: brand.blush,
          borderColor: 'rgba(193, 141, 180, 0.65)',
          borderRadius: 24,
          borderWidth: 1,
          bottom: tabBarBottom,
          boxShadow: '0 12px 30px rgba(39, 66, 93, 0.16)',
          height: 72,
          left: (width - tabBarWidth) / 2,
          paddingBottom: 5,
          paddingTop: 5,
          position: 'absolute',
          width: tabBarWidth,
        },
        tabBarItemStyle: { borderRadius: 18, marginHorizontal: 2 },
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: typography.label.fontWeight,
          letterSpacing: 0.15,
          lineHeight: 13,
          marginBottom: 2,
          marginTop: 1,
          textTransform: 'none',
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
