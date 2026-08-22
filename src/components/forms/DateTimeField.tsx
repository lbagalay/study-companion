import DateTimePicker, { type DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { format } from 'date-fns';
import { useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { radii, spacing, typography } from '@/constants/theme';
import { useAppTheme } from '@/hooks/useAppTheme';

type Props = { label: string; mode?: 'date' | 'time' | 'datetime'; onChange: (iso: string) => void; value: string };
export function DateTimeField({ label, mode = 'datetime', onChange, value }: Props) {
  const palette = useAppTheme(); const [picker, setPicker] = useState<'date' | 'time' | null>(null); const date = new Date(value);
  const change = (_event: DateTimePickerEvent, next?: Date) => { if (Platform.OS !== 'ios') setPicker(null); if (next) onChange(next.toISOString()); };
  return <View style={styles.wrapper}><Text style={[styles.label, { color: palette.text }]}>{label}</Text><View style={styles.row}>
    {mode !== 'time' ? <Pressable onPress={() => setPicker('date')} style={[styles.button, { backgroundColor: palette.surface, borderColor: palette.border }]}><Text style={[styles.text, { color: palette.text }]}>{format(date, 'MMM d, yyyy')}</Text></Pressable> : null}
    {mode !== 'date' ? <Pressable onPress={() => setPicker('time')} style={[styles.button, { backgroundColor: palette.surface, borderColor: palette.border }]}><Text style={[styles.text, { color: palette.text }]}>{format(date, 'h:mm a')}</Text></Pressable> : null}
  </View>{picker ? <><DateTimePicker display={Platform.OS === 'ios' ? 'spinner' : 'default'} mode={picker} onChange={change} value={date} />{Platform.OS === 'ios' ? <Pressable accessibilityRole="button" onPress={() => setPicker(null)} style={[styles.done, { backgroundColor: palette.accentSoft }]}><Text style={[styles.text, { color: palette.accentStrong }]}>Done</Text></Pressable> : null}</> : null}</View>;
}
const styles = StyleSheet.create({ wrapper: { gap: spacing.sm }, label: typography.label, row: { flexDirection: 'row', gap: spacing.sm }, button: { borderRadius: radii.md, borderWidth: 1, flex: 1, minHeight: 50, justifyContent: 'center', paddingHorizontal: spacing.md }, done: { alignItems: 'center', borderRadius: radii.md, padding: spacing.sm }, text: typography.body });
