import { FeedbackState } from '@/components/ui/FeedbackState';
import { ChoiceField } from '@/components/ui/ChoiceField';
import { useSubjects } from '@/hooks/useStudyData';
import { StyleSheet, Text, View } from 'react-native';
import { spacing, typography } from '@/constants/theme';
import { useAppTheme } from '@/hooks/useAppTheme';

export function SubjectField({
  error,
  onChange,
  value,
}: {
  error?: string;
  onChange: (id: string) => void;
  value: string;
}) {
  const subjects = useSubjects();
  const palette = useAppTheme();
  if (subjects.isLoading)
    return <FeedbackState loading message="Loading subjects." title="One moment" />;
  if (!subjects.data?.length)
    return (
      <FeedbackState message="Add a subject before creating this item." title="Subject required" />
    );
  return (
    <View style={styles.wrapper}>
      <ChoiceField
        choices={subjects.data.map((subject) => ({
          label: subject.code || subject.name,
          value: subject.id,
        }))}
        label="Subject"
        onChange={onChange}
        value={value}
      />
      {error ? (
        <Text accessibilityRole="alert" style={[styles.error, { color: palette.danger }]}>
          {error}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { gap: spacing.xs },
  error: { ...typography.caption, marginLeft: spacing.xs },
});
