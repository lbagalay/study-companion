import DateTimePicker, { type DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { format } from 'date-fns';
import Ionicons from '@expo/vector-icons/Ionicons';
import { createElement, type ChangeEvent, type CSSProperties } from 'react';
import { useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { radii, spacing, typography } from '@/constants/theme';
import { useAppTheme } from '@/hooks/useAppTheme';
import {
  localDateInputValue,
  localTimeInputValue,
  mergeLocalDateTimePart,
  type DateTimePart,
} from '@/lib/datetime';

type Props = {
  error?: string;
  label: string;
  mode?: 'date' | 'time' | 'datetime';
  onChange: (iso: string) => void;
  value: string;
};
export function DateTimeField({ error, label, mode = 'datetime', onChange, value }: Props) {
  const palette = useAppTheme();
  const [picker, setPicker] = useState<DateTimePart | null>(null);
  const parsed = new Date(value);
  const date = Number.isNaN(parsed.getTime()) ? new Date() : parsed;
  const change = (_event: DateTimePickerEvent, next?: Date) => {
    if (Platform.OS !== 'ios') setPicker(null);
    if (next) onChange(next.toISOString());
  };
  const updateWebValue = (part: DateTimePart, nextValue: string) => {
    const next = mergeLocalDateTimePart(date.toISOString(), part, nextValue);
    if (next) onChange(next);
  };
  const webStyle: CSSProperties = {
    appearance: 'none',
    background: palette.surface,
    border: `1px solid ${error ? palette.danger : palette.border}`,
    borderRadius: radii.md,
    boxSizing: 'border-box',
    color: palette.text,
    fontFamily: 'inherit',
    fontSize: 16,
    height: 52,
    outlineColor: palette.lavender,
    padding: '0 14px',
    width: '100%',
  };
  return (
    <View
      style={[
        styles.wrapper,
        {
          backgroundColor: palette.surfaceAlt,
          borderColor: error ? palette.danger : palette.border,
        },
      ]}
    >
      <View style={styles.heading}>
        <View style={[styles.headingIcon, { backgroundColor: palette.accentSoft }]}>
          <Ionicons color={palette.accentStrong} name="calendar-outline" size={17} />
        </View>
        <View style={styles.headingCopy}>
          <Text style={[styles.label, { color: palette.text }]}>{label}</Text>
          <Text style={[styles.summary, { color: palette.textMuted }]}>
            {format(date, 'EEEE, MMMM d, yyyy · h:mm a')}
          </Text>
        </View>
      </View>
      {Platform.OS === 'web' ? (
        <View style={styles.row}>
          {mode !== 'time' ? (
            <View style={styles.part}>
              <Text style={[styles.partLabel, { color: palette.textMuted }]}>DATE</Text>
              {createElement('input', {
                'aria-label': `${label} date`,
                onChange: (event: ChangeEvent<HTMLInputElement>) =>
                  updateWebValue('date', event.currentTarget.value),
                style: webStyle,
                type: 'date',
                value: localDateInputValue(date.toISOString()),
              })}
            </View>
          ) : null}
          {mode !== 'date' ? (
            <View style={styles.part}>
              <Text style={[styles.partLabel, { color: palette.textMuted }]}>TIME</Text>
              {createElement('input', {
                'aria-label': `${label} time`,
                onChange: (event: ChangeEvent<HTMLInputElement>) =>
                  updateWebValue('time', event.currentTarget.value),
                step: 60,
                style: webStyle,
                type: 'time',
                value: localTimeInputValue(date.toISOString()),
              })}
            </View>
          ) : null}
        </View>
      ) : (
        <>
          <View style={styles.row}>
            {mode !== 'time' ? (
              <Pressable
                accessibilityLabel={`${label} date`}
                onPress={() => setPicker('date')}
                style={[
                  styles.button,
                  {
                    backgroundColor: palette.surface,
                    borderColor: error ? palette.danger : palette.border,
                  },
                ]}
              >
                <Ionicons color={palette.lavender} name="calendar-outline" size={18} />
                <Text style={[styles.text, { color: palette.text }]}>
                  {format(date, 'MMM d, yyyy')}
                </Text>
              </Pressable>
            ) : null}
            {mode !== 'date' ? (
              <Pressable
                accessibilityLabel={`${label} time`}
                onPress={() => setPicker('time')}
                style={[
                  styles.button,
                  {
                    backgroundColor: palette.surface,
                    borderColor: error ? palette.danger : palette.border,
                  },
                ]}
              >
                <Ionicons color={palette.accent} name="time-outline" size={18} />
                <Text style={[styles.text, { color: palette.text }]}>{format(date, 'h:mm a')}</Text>
              </Pressable>
            ) : null}
          </View>
          {picker ? (
            <>
              <DateTimePicker
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                mode={picker}
                onChange={change}
                value={date}
              />
              {Platform.OS === 'ios' ? (
                <Pressable
                  accessibilityRole="button"
                  onPress={() => setPicker(null)}
                  style={[styles.done, { backgroundColor: palette.accentSoft }]}
                >
                  <Text style={[styles.text, { color: palette.accentStrong }]}>Done</Text>
                </Pressable>
              ) : null}
            </>
          ) : null}
        </>
      )}
      <Text style={[styles.helper, { color: palette.textMuted }]}>
        Choose any date and minute. Shown in your device timezone.
      </Text>
      {error ? (
        <Text accessibilityRole="alert" style={[styles.error, { color: palette.danger }]}>
          {error}
        </Text>
      ) : null}
    </View>
  );
}
const styles = StyleSheet.create({
  wrapper: { borderRadius: radii.lg, borderWidth: 1, gap: spacing.md, padding: spacing.md },
  heading: { alignItems: 'center', flexDirection: 'row', gap: spacing.sm },
  headingIcon: {
    alignItems: 'center',
    borderRadius: radii.pill,
    height: 36,
    justifyContent: 'center',
    width: 36,
  },
  headingCopy: { flex: 1, gap: 2 },
  label: typography.label,
  summary: { ...typography.caption, fontSize: 12 },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  part: { flex: 1, gap: spacing.xs, minWidth: 136 },
  partLabel: { ...typography.label, fontSize: 9 },
  button: {
    alignItems: 'center',
    borderRadius: radii.md,
    borderWidth: 1,
    flex: 1,
    flexDirection: 'row',
    gap: spacing.sm,
    minHeight: 52,
    minWidth: 136,
    paddingHorizontal: spacing.md,
  },
  done: { alignItems: 'center', borderRadius: radii.md, padding: spacing.sm },
  text: typography.body,
  helper: typography.caption,
  error: { ...typography.caption, marginLeft: spacing.xs },
});
