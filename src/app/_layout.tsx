import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, useColorScheme, View } from 'react-native';

import { FeedbackState } from '@/components/ui/FeedbackState';
import { LaunchAnimation } from '@/components/ui/LaunchAnimation';
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
  return <QueryProvider cacheKey={`study-companion-cache-${user?.id ?? 'guest'}`} key={user?.id ?? 'guest'}><View style={styles.root}><RootNavigator /><LaunchAnimation /></View></QueryProvider>;
}

const styles = StyleSheet.create({ root: { flex: 1 } });

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
          <Stack.Screen name="schedule/create" />
          <Stack.Screen name="schedule/[id]" />
          <Stack.Screen name="assignments/create" />
          <Stack.Screen name="assignments/[id]" />
          <Stack.Screen name="exams/create" />
          <Stack.Screen name="exams/[id]" />
          <Stack.Screen name="materials/create" />
          <Stack.Screen name="materials/[id]" />
          <Stack.Screen name="materials/[id]/reader" />
          <Stack.Screen name="notes/create" />
          <Stack.Screen name="notes/[id]" />
          <Stack.Screen name="sessions" />
          <Stack.Screen name="sessions/create-plan" />
          <Stack.Screen name="sessions/[id]" />
        </Stack.Protected>
      </Stack>
      <StatusBar style={isDark ? 'light' : 'dark'} />
    </>
  );
}
