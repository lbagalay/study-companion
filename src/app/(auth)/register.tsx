import { zodResolver } from '@hookform/resolvers/zod';
import { Link, useRouter } from 'expo-router';
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

const schema = z.object({ fullName: z.string().trim().min(2, 'Enter your full name.').max(100, 'Keep your name under 100 characters.'), preferredName: z.string().trim().min(1, 'Enter the name you want to see in the app.').max(50, 'Keep your preferred name under 50 characters.'), email: z.email('Enter a valid email.'), password: z.string().min(8, 'Use at least 8 characters.').max(72, 'Keep your password under 72 characters.') });
type Values = z.infer<typeof schema>;

export default function RegisterScreen() {
  const { signUp } = useAuth(); const palette = useAppTheme(); const router = useRouter();
  const { control, handleSubmit, formState: { errors, isSubmitting } } = useForm<Values>({ resolver: zodResolver(schema), defaultValues: { fullName: '', preferredName: '', email: '', password: '' } });
  const submit = handleSubmit(async (values) => { try { const signedIn = await signUp({ ...values, email: values.email.trim() }); if (!signedIn) { Alert.alert('Check your inbox', 'Confirm your email, then return to sign in.'); router.replace('/login'); } } catch (error) { Alert.alert('Could not create account', getErrorMessage(error)); } });
  return <AuthScreen description="A calm space for classes, deadlines, and study plans." title="Create your account">
    <Controller control={control} name="fullName" render={({ field }) => <FormField error={errors.fullName?.message} label="Full name" onBlur={field.onBlur} onChangeText={field.onChange} value={field.value} />} />
    <Controller control={control} name="preferredName" render={({ field }) => <FormField error={errors.preferredName?.message} label="Preferred name" onBlur={field.onBlur} onChangeText={field.onChange} value={field.value} />} />
    <Controller control={control} name="email" render={({ field }) => <FormField autoCapitalize="none" error={errors.email?.message} keyboardType="email-address" label="Email" onBlur={field.onBlur} onChangeText={field.onChange} value={field.value} />} />
    <Controller control={control} name="password" render={({ field }) => <FormField error={errors.password?.message} label="Password" onBlur={field.onBlur} onChangeText={field.onChange} secureTextEntry value={field.value} />} />
    <AppButton label="Create account" loading={isSubmitting} onPress={submit} />
    <Link href="/login" style={[styles.link, { color: palette.accent }]}>Already have an account?</Link>
  </AuthScreen>;
}
const styles = StyleSheet.create({ link: { ...typography.body, textAlign: 'center' } });
