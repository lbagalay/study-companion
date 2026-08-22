import { zodResolver } from '@hookform/resolvers/zod';
import { Link } from 'expo-router';
import { Controller, useForm } from 'react-hook-form';
import { Alert, StyleSheet, Text } from 'react-native';
import { z } from 'zod';
import { AuthScreen } from '@/components/auth/AuthScreen';
import { AppButton } from '@/components/ui/AppButton';
import { FormField } from '@/components/ui/FormField';
import { spacing, typography } from '@/constants/theme';
import { useAppTheme } from '@/hooks/useAppTheme';
import { getErrorMessage } from '@/lib/errors';
import { useAuth } from '@/providers/AuthProvider';

const schema = z.object({ email: z.email('Enter a valid email.'), password: z.string().min(8, 'Use at least 8 characters.') });
type Values = z.infer<typeof schema>;

export default function LoginScreen() {
  const { configured, signIn } = useAuth();
  const palette = useAppTheme();
  const { control, handleSubmit, formState: { errors, isSubmitting } } = useForm<Values>({ resolver: zodResolver(schema), defaultValues: { email: '', password: '' } });
  const submit = handleSubmit(async (values) => { try { await signIn(values.email.trim(), values.password); } catch (error) { Alert.alert('Could not sign in', getErrorMessage(error)); } });
  return <AuthScreen description="See what matters today and choose what to study next." title="Welcome back">
    {!configured ? <Text style={[styles.notice, { color: palette.warning }]}>Add Supabase values to `.env` to enable accounts.</Text> : null}
    <Controller control={control} name="email" render={({ field }) => <FormField autoCapitalize="none" autoComplete="email" error={errors.email?.message} keyboardType="email-address" label="Email" onBlur={field.onBlur} onChangeText={field.onChange} value={field.value} />} />
    <Controller control={control} name="password" render={({ field }) => <FormField autoCapitalize="none" autoComplete="password" error={errors.password?.message} label="Password" onBlur={field.onBlur} onChangeText={field.onChange} secureTextEntry value={field.value} />} />
    <AppButton label="Sign in" loading={isSubmitting} onPress={submit} />
    <Link href="/forgot-password" style={[styles.link, { color: palette.accentStrong }]}>Forgot password?</Link>
    <Link href="/register" style={[styles.link, { color: palette.accentStrong }]}>Create an account</Link>
  </AuthScreen>;
}
const styles = StyleSheet.create({ notice: { ...typography.body, marginBottom: spacing.sm }, link: { ...typography.body, textAlign: 'center' } });
