import { Tabs } from 'expo-router';
import { Platform, useColorScheme, useWindowDimensions } from 'react-native';

import { TabBarIcon } from '@/components/navigation/TabBarIcon';
import { brand, colors, typography } from '@/constants/theme';

export default function TabLayout() {
  const isDark = useColorScheme() === 'dark';
  const palette = isDark ? colors.dark : colors.light;
  const { width } = useWindowDimensions();
  const tabBarWidth = Math.min(width - 28, 720);

  return (
    <Tabs
      initialRouteName="home"
      screenOptions={{
        headerShown: false,
        sceneStyle: { backgroundColor: palette.background },
        tabBarActiveBackgroundColor: brand.slate,
        tabBarActiveTintColor: brand.blush,
        tabBarHideOnKeyboard: true,
        tabBarInactiveTintColor: brand.blue,
        tabBarStyle: {
          backgroundColor: brand.navy,
          borderColor: brand.slate,
          borderRadius: 26,
          borderTopWidth: 1,
          borderWidth: 1,
          bottom: 12,
          boxShadow: '0 16px 38px rgba(14, 27, 72, 0.24)',
          height: 72,
          left: (width - tabBarWidth) / 2,
          paddingBottom: Platform.OS === 'ios' ? 12 : 8,
          paddingTop: 8,
          position: 'absolute',
          width: tabBarWidth,
        },
        tabBarItemStyle: { borderRadius: 18, marginHorizontal: 3, marginVertical: 4 },
        tabBarLabelStyle: {
          fontSize: typography.caption.fontSize,
          fontWeight: typography.label.fontWeight,
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
