import {
  Nunito_700Bold,
  Nunito_800ExtraBold,
  useFonts as useNunitoFonts,
} from '@expo-google-fonts/nunito';

import {
  Inter_400Regular,
  Inter_500Medium,
  useFonts as useInterFonts,
} from '@expo-google-fonts/inter';

import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AssistantButton } from '@/components/assistant/AssistantButton';
import { AssistantProvider } from '@/components/assistant/AssistantProvider';
import { AssistantSheet } from '@/components/assistant/AssistantSheet';
import { FeedbackState } from '@/components/ui/FeedbackState';
import { LaunchAnimation } from '@/components/ui/LaunchAnimation';
import { OfflineBanner } from '@/components/ui/OfflineBanner';
import { useAppTheme } from '@/hooks/useAppTheme';
import { configureNotifications } from '@/lib/notifications';
import { AuthProvider, useAuth } from '@/providers/AuthProvider';
import { QueryProvider } from '@/providers/QueryProvider';
import { ThemeProvider, useTheme } from '@/providers/ThemeProvider';

configureNotifications();

export default function RootLayout() {
  const [nunitoLoaded, nunitoError] = useNunitoFonts({
    Nunito_700Bold,
    Nunito_800ExtraBold,
  });

  const [interLoaded, interError] = useInterFonts({
    Inter_400Regular,
    Inter_500Medium,
  });

  /*
   * A font that fails to download must not strand the
   * app on a blank screen. Render with system fallbacks
   * instead once the request has settled either way.
   */
  const fontsSettled = (nunitoLoaded || nunitoError) && (interLoaded || interError);

  if (!fontsSettled) {
    return null;
  }

  return (
    // Every screen calls useSafeAreaInsets() or renders SafeAreaView
    // (the tab bar's floating pill, ScreenContainer, etc). Without this
    // provider those all silently fall back to zero insets on native,
    // so the tab bar and screen content sit flush under the notch /
    // status bar and behind the home indicator.
    <SafeAreaProvider>
      <ThemeProvider>
        <AuthProvider>
          <View style={styles.root}>
            <AppProviders />

            {/*
             * Kept outside the user-keyed QueryProvider so that
             * signing in does not remount the splash and replay
             * it over — and block taps on — the home screen.
             */}
            <LaunchAnimation />
          </View>
        </AuthProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}

function AppProviders() {
  const { user } = useAuth();

  return (
    <QueryProvider
      cacheKey={`study-companion-cache-${user?.id ?? 'guest'}`}
      key={user?.id ?? 'guest'}
    >
      <View style={styles.root}>
        <RootNavigator />
      </View>
    </QueryProvider>
  );
}

function RootNavigator() {
  const { loading, session } = useAuth();
  const palette = useAppTheme();
  const { scheme } = useTheme();

  if (loading) {
    return (
      <FeedbackState
        loading
        message="Restoring your secure session."
        title="Opening Study Companion"
      />
    );
  }

  return (
    <AssistantProvider>
      <OfflineBanner />

      <Stack
        screenOptions={{
          contentStyle: {
            backgroundColor: palette.background,
          },
          headerShown: false,
        }}
      >
        <Stack.Screen name="index" />
        <Stack.Screen name="reset-password" />

        <Stack.Protected guard={!session}>
          <Stack.Screen name="(auth)" />
        </Stack.Protected>

        <Stack.Protected guard={Boolean(session)}>
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="subjects" />
          <Stack.Screen name="settings/index" />
          <Stack.Screen name="settings/themes" />
          <Stack.Screen name="settings/folder-designs" />
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

      <AssistantButton />
      <AssistantSheet />

      <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />
    </AssistantProvider>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
});
