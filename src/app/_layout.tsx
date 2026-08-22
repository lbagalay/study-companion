import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useColorScheme } from 'react-native';

import { FeedbackState } from '@/components/ui/FeedbackState';
import { OfflineBanner } from '@/components/ui/OfflineBanner';
import { colors } from '@/constants/theme';
import { AuthProvider, useAuth } from '@/providers/AuthProvider';
import { QueryProvider } from '@/providers/QueryProvider';
import { configureNotifications } from '@/lib/notifications';

configureNotifications();

export default function RootLayout() {
  return <AuthProvider><AppProviders /></AuthProvider>;
}

function AppProviders() {
  const { user } = useAuth();
  return <QueryProvider cacheKey={`study-companion-cache-${user?.id ?? 'guest'}`} key={user?.id ?? 'guest'}><RootNavigator /></QueryProvider>;
}

function RootNavigator() {
  const isDark = useColorScheme() === 'dark';
  const { loading, session } = useAuth();
  if (loading) return <FeedbackState loading message="Restoring your secure session." title="Opening Study Companion" />;

  return (
    <>
      <OfflineBanner />
      <Stack
        screenOptions={{
          contentStyle: {
            backgroundColor: isDark ? colors.dark.background : colors.light.background,
          },
          headerShown: false,
        }}
      >
      <Stack.Screen name="index" />
      <Stack.Screen name="reset-password" />
        <Stack.Protected guard={!session}><Stack.Screen name="(auth)" /></Stack.Protected>
        <Stack.Protected guard={Boolean(session)}>
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="subjects" />
          <Stack.Screen name="schedule" />
          <Stack.Screen name="assignments" />
          <Stack.Screen name="exams" />
          <Stack.Screen name="materials" />
          <Stack.Screen name="notes" />
          <Stack.Screen name="sessions" />
        </Stack.Protected>
      </Stack>
      <StatusBar style={isDark ? 'light' : 'dark'} />
    </>
  );
}
