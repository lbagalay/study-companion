import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'expo-router';
import { Controller, useForm } from 'react-hook-form';
import { Alert } from 'react-native';
import { z } from 'zod';
import { AuthScreen } from '@/components/auth/AuthScreen';
import { AppButton } from '@/components/ui/AppButton';
import { FormField } from '@/components/ui/FormField';
import { getErrorMessage } from '@/lib/errors';
import { useAuth } from '@/providers/AuthProvider';

const schema = z
  .object({ password: z.string().min(8).max(72), confirm: z.string() })
  .refine((v) => v.password === v.confirm, {
    path: ['confirm'],
    message: 'Passwords do not match.',
  });
type Values = z.infer<typeof schema>;
export default function ResetPasswordScreen() {
  const { session, updatePassword } = useAuth();
  const router = useRouter();
  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { password: '', confirm: '' },
  });
  const submit = handleSubmit(async ({ password }) => {
    try {
      await updatePassword(password);
      Alert.alert('Password updated', 'Your new password is ready.');
      router.replace(session ? '/home' : '/login');
    } catch (error) {
      Alert.alert('Could not update password', getErrorMessage(error));
    }
  });
  return (
    <AuthScreen
      description={
        session
          ? 'Choose a strong password for your account.'
          : 'Open the reset link from your email first.'
      }
      title="Set a new password"
    >
      <Controller
        control={control}
        name="password"
        render={({ field }) => (
          <FormField
            error={errors.password?.message}
            label="New password"
            onChangeText={field.onChange}
            secureTextEntry
            value={field.value}
          />
        )}
      />
      <Controller
        control={control}
        name="confirm"
        render={({ field }) => (
          <FormField
            error={errors.confirm?.message}
            label="Confirm password"
            onChangeText={field.onChange}
            secureTextEntry
            value={field.value}
          />
        )}
      />
      <AppButton
        disabled={!session}
        label="Update password"
        loading={isSubmitting}
        onPress={submit}
      />
    </AuthScreen>
  );
}
