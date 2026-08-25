import { zodResolver } from '@hookform/resolvers/zod';
import { Link, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';

import { StyleSheet, Text, View } from 'react-native';

import { AuthScreen } from '@/components/auth/AuthScreen';
import { AppButton } from '@/components/ui/AppButton';
import { FormField } from '@/components/ui/FormField';

import { radii, spacing, typography } from '@/constants/theme';

import { useAppTheme } from '@/hooks/useAppTheme';

import { loginSchema, type LoginValues, signInErrorMessage } from '@/lib/auth/login';

import { useAuth } from '@/providers/AuthProvider';

export default function LoginScreen() {
  const { configured, session, signIn } = useAuth();

  const palette = useAppTheme();
  const router = useRouter();

  const [submitError, setSubmitError] = useState<string | null>(null);

  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),

    defaultValues: {
      email: '',
      password: '',
    },
  });

  useEffect(() => {
    if (session) {
      router.replace('/home');
    }
  }, [router, session]);

  const submit = handleSubmit(
    async (values) => {
      setSubmitError(null);

      try {
        await signIn(values.email.trim(), values.password);
      } catch (error) {
        setSubmitError(signInErrorMessage(error));
      }
    },

    (invalid) => {
      setSubmitError(
        invalid.email?.message ??
          invalid.password?.message ??
          'Review your sign-in details and try again.',
      );
    },
  );

  return (
    <AuthScreen
      description="See what matters today and choose what to study next."
      title="Welcome back"
    >
      {!configured ? (
        <Text
          accessibilityRole="alert"
          style={[
            styles.notice,
            {
              backgroundColor: palette.accentSoft,
              borderColor: palette.border,
              color: palette.danger,
            },
          ]}
        >
          Accounts are not configured for this deployment. Add the Supabase URL and publishable key
          to the environment settings, then redeploy.
        </Text>
      ) : null}

      <View style={styles.fields}>
        <Controller
          control={control}
          name="email"
          render={({ field }) => (
            <FormField
              autoCapitalize="none"
              autoComplete="email"
              error={errors.email?.message}
              keyboardType="email-address"
              label="Email"
              onBlur={field.onBlur}
              onChangeText={(value) => {
                setSubmitError(null);

                field.onChange(value);
              }}
              value={field.value}
            />
          )}
        />

        <Controller
          control={control}
          name="password"
          render={({ field }) => (
            <FormField
              autoCapitalize="none"
              autoComplete="password"
              error={errors.password?.message}
              label="Password"
              onBlur={field.onBlur}
              onChangeText={(value) => {
                setSubmitError(null);

                field.onChange(value);
              }}
              secureTextEntry
              value={field.value}
            />
          )}
        />
      </View>

      {submitError ? (
        <Text
          accessibilityRole="alert"
          style={[
            styles.error,
            {
              backgroundColor: palette.accentSoft,
              borderColor: palette.border,
              color: palette.danger,
            },
          ]}
        >
          {submitError}
        </Text>
      ) : null}

      <AppButton
        disabled={!configured}
        label="Sign in"
        loading={isSubmitting}
        onPress={submit}
        style={styles.signInButton}
      />

      <View style={styles.linkGroup}>
        <Link
          href="/forgot-password"
          style={[
            styles.secondaryLink,
            {
              color: palette.textMuted,
            },
          ]}
        >
          Forgot password?
        </Link>

        <View style={styles.accountRow}>
          <Text
            style={[
              styles.accountText,
              {
                color: palette.textMuted,
              },
            ]}
          >
            New here?
          </Text>

          <Link
            href="/register"
            style={[
              styles.createLink,
              {
                color: palette.accentStrong,
              },
            ]}
          >
            Create an account
          </Link>
        </View>
      </View>
    </AuthScreen>
  );
}

const styles = StyleSheet.create({
  fields: {
    gap: 16,
  },

  notice: {
    ...typography.caption,
    borderRadius: radii.md,
    borderWidth: 1,
    lineHeight: 19,
    padding: spacing.md,
  },

  error: {
    ...typography.caption,
    borderRadius: radii.md,
    borderWidth: 1,
    lineHeight: 19,
    padding: spacing.md,
  },

  signInButton: {
    marginTop: 4,
    minHeight: 54,
  },

  linkGroup: {
    alignItems: 'center',
    gap: 14,
    marginTop: 4,
  },

  secondaryLink: {
    ...typography.body,
    fontSize: 14,
    textAlign: 'center',
  },

  accountRow: {
    alignItems: 'center',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 5,
    justifyContent: 'center',
  },

  accountText: {
    ...typography.body,
    fontSize: 14,
  },

  createLink: {
    ...typography.body,
    fontFamily: 'Inter_500Medium',
    fontSize: 14,
  },
});
