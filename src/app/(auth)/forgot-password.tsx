import { zodResolver } from '@hookform/resolvers/zod';
import { Link } from 'expo-router';
import { Controller, useForm } from 'react-hook-form';
import { Alert, StyleSheet } from 'react-native';
import { z } from 'zod';
import { AuthScreen } from '@/components/auth/AuthScreen';
import { AppButton } from '@/components/ui/AppButton';
import { FormField } from '@/components/ui/FormField';
import { typography } from '@/constants/theme';
import { useAppTheme } from '@/hooks/useAppTheme';
import { getErrorMessage } from '@/lib/errors';
import { useAuth } from '@/providers/AuthProvider';

const schema = z.object({ email: z.email('Enter a valid email.') });
type Values = z.infer<typeof schema>;
export default function ForgotPasswordScreen() {
  const { sendPasswordReset } = useAuth();
  const palette = useAppTheme();
  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<Values>({ resolver: zodResolver(schema), defaultValues: { email: '' } });
  const submit = handleSubmit(async ({ email }) => {
    try {
      await sendPasswordReset(email.trim());
      Alert.alert('Email sent', 'Use the link in your inbox to reset your password.');
    } catch (error) {
      Alert.alert('Could not send email', getErrorMessage(error));
    }
  });
  return (
    <AuthScreen description="We’ll email a secure link to your account." title="Reset password">
      <Controller
        control={control}
        name="email"
        render={({ field }) => (
          <FormField
            autoCapitalize="none"
            error={errors.email?.message}
            keyboardType="email-address"
            label="Email"
            onBlur={field.onBlur}
            onChangeText={field.onChange}
            value={field.value}
          />
        )}
      />
      <AppButton label="Send reset link" loading={isSubmitting} onPress={submit} />
      <Link href="/login" style={[styles.link, { color: palette.accentStrong }]}>
        Back to sign in
      </Link>
    </AuthScreen>
  );
}
const styles = StyleSheet.create({ link: { ...typography.body, textAlign: 'center' } });
