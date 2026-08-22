import Ionicons from '@expo/vector-icons/Ionicons';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import * as DocumentPicker from 'expo-document-picker';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';

import { AppButton } from '@/components/ui/AppButton';
import { ChoiceField } from '@/components/ui/ChoiceField';
import { FeedbackState } from '@/components/ui/FeedbackState';
import { FormField } from '@/components/ui/FormField';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { radii, spacing, typography } from '@/constants/theme';
import { keys } from '@/hooks/useStudyData';
import { useAppTheme } from '@/hooks/useAppTheme';
import { getErrorMessage } from '@/lib/errors';
import { studyLoadExtractionSchema, type ExtractedSchedule, type ExtractedSubject, type StudyLoadImportSubject } from '@/lib/study-load/schema';
import { extractStudyLoad, importStudyLoad } from '@/services';

const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'] as const;
const subjectColors = ['#F26167', '#7770C9', '#E09A3E', '#5F9B82', '#D06C9B', '#5F86C9'] as const;
type ReviewSubject = Omit<ExtractedSubject, 'units'> & { color: string; selected: boolean; units: string };

export default function ImportStudyLoadScreen() {
  const palette = useAppTheme();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [asset, setAsset] = useState<DocumentPicker.DocumentPickerAsset | null>(null);
  const [subjects, setSubjects] = useState<ReviewSubject[]>([]);

  const analyze = useMutation({
    mutationFn: extractStudyLoad,
    onSuccess: (data) => setSubjects(data.subjects.map((subject, index) => ({ ...subject, color: subjectColors[index % subjectColors.length], selected: true, units: String(subject.units) }))),
  });
  const save = useMutation({
    mutationFn: async () => {
      const chosen = subjects.filter((subject) => subject.selected).map(({ selected: _selected, units, ...subject }) => ({ ...subject, units: Number(units) }));
      if (!chosen.length) throw new Error('Select at least one subject to import.');
      const parsed = studyLoadExtractionSchema.safeParse({ subjects: chosen });
      if (!parsed.success) throw new Error(parsed.error.issues[0]?.message || 'Review the extracted information.');
      return importStudyLoad(chosen satisfies StudyLoadImportSubject[]);
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: keys.subjects }),
        queryClient.invalidateQueries({ queryKey: keys.schedules }),
      ]);
      Alert.alert('Study load imported', 'Your selected subjects and class meetings are ready.', [{ text: 'Done', onPress: () => router.replace('/subjects') }]);
    },
    onError: (error) => Alert.alert('Could not import study load', getErrorMessage(error)),
  });

  const chooseFile = async () => {
    const result = await DocumentPicker.getDocumentAsync({ copyToCacheDirectory: true, multiple: false, type: ['application/pdf', 'image/*'] });
    if (result.canceled) return;
    const selected = result.assets[0];
    if (selected.size && selected.size > 12 * 1024 * 1024) {
      Alert.alert('File is too large', 'Choose a photo or PDF smaller than 12 MB.');
      return;
    }
    setAsset(selected);
    setSubjects([]);
    analyze.mutate(selected);
  };

  const updateSubject = (index: number, patch: Partial<ReviewSubject>) => setSubjects((current) => current.map((subject, subjectIndex) => subjectIndex === index ? { ...subject, ...patch } : subject));
  const updateSchedule = (subjectIndex: number, scheduleIndex: number, patch: Partial<ExtractedSchedule>) => setSubjects((current) => current.map((subject, currentSubjectIndex) => currentSubjectIndex === subjectIndex ? { ...subject, schedules: subject.schedules.map((schedule, currentScheduleIndex) => currentScheduleIndex === scheduleIndex ? { ...schedule, ...patch } : schedule) } : subject));
  const addSchedule = (subjectIndex: number) => setSubjects((current) => current.map((subject, index) => index === subjectIndex ? { ...subject, schedules: [...subject.schedules, { day_of_week: 1, end_time: '09:00', room: subject.room, start_time: '08:00' }] } : subject));
  const removeSchedule = (subjectIndex: number, scheduleIndex: number) => setSubjects((current) => current.map((subject, index) => index === subjectIndex ? { ...subject, schedules: subject.schedules.filter((_schedule, currentIndex) => currentIndex !== scheduleIndex) } : subject));
  const selectedCount = subjects.filter((subject) => subject.selected).length;

  return <ScreenContainer><ScreenHeader back description="Upload a clear photo or PDF, then review everything before saving." title="Import study load" />
    <View style={styles.content}>
      <View style={[styles.uploadCard, { backgroundColor: palette.surfaceAlt, borderColor: palette.border }]}>
        <View style={[styles.uploadIcon, { backgroundColor: palette.accentSoft }]}><Ionicons color={palette.accentSolid} name="document-text-outline" size={28} /></View>
        <View style={styles.uploadCopy}>
          <Text style={[styles.uploadTitle, { color: palette.text }]}>{asset ? asset.name : 'Choose your study load'}</Text>
          <Text style={[styles.body, { color: palette.textMuted }]}>{asset ? `${formatBytes(asset.size)} · ${asset.mimeType ?? 'document'}` : 'Supported files: photos and PDF documents up to 12 MB.'}</Text>
        </View>
        <AppButton label={asset ? 'Choose another file' : 'Choose photo or PDF'} onPress={() => void chooseFile()} variant={asset ? 'secondary' : 'primary'} />
      </View>

      {analyze.isPending ? <FeedbackState loading message="Finding subjects, instructors, rooms, units, and class times." title="Reading your study load" /> : null}
      {analyze.error ? <FeedbackState actionLabel="Try again" message={getErrorMessage(analyze.error)} onAction={() => asset && analyze.mutate(asset)} title="Could not read this file" /> : null}
      {!analyze.isPending && analyze.isSuccess && !subjects.length ? <FeedbackState actionLabel="Choose another file" message="No clear subject rows were found. Try a sharper photo or the original PDF." onAction={() => void chooseFile()} title="Nothing recognized" /> : null}

      {subjects.length ? <>
        <View style={styles.reviewHeader}><View style={styles.uploadCopy}><Text style={[styles.sectionTitle, { color: palette.text }]}>Review extracted details</Text><Text style={[styles.body, { color: palette.textMuted }]}>AI can misread documents. Correct anything below and deselect rows you do not want.</Text></View><Text style={[styles.count, { backgroundColor: palette.accentSoft, color: palette.accentStrong }]}>{selectedCount}/{subjects.length}</Text></View>
        {subjects.map((subject, subjectIndex) => <View key={`${subject.code}-${subjectIndex}`} style={[styles.subjectCard, { backgroundColor: palette.surface, borderColor: subject.selected ? subject.color : palette.border, opacity: subject.selected ? 1 : 0.58 }]}>
          <Pressable accessibilityRole="checkbox" accessibilityState={{ checked: subject.selected }} onPress={() => updateSubject(subjectIndex, { selected: !subject.selected })} style={styles.subjectHeader}>
            <Ionicons color={subject.selected ? palette.accentSolid : palette.textMuted} name={subject.selected ? 'checkmark-circle' : 'ellipse-outline'} size={25} />
            <View style={styles.uploadCopy}><Text style={[styles.subjectTitle, { color: palette.text }]}>{subject.code || subject.name || `Subject ${subjectIndex + 1}`}</Text><Text style={[styles.caption, { color: palette.textMuted }]}>{subject.selected ? 'Included in import' : 'Not included'}</Text></View>
          </Pressable>
          {subject.selected ? <View style={styles.fields}>
            <FormField label="Subject name" onChangeText={(name) => updateSubject(subjectIndex, { name })} value={subject.name} />
            <View style={styles.row}><View style={styles.flex}><FormField label="Code" onChangeText={(code) => updateSubject(subjectIndex, { code })} value={subject.code} /></View><View style={styles.flex}><FormField keyboardType="decimal-pad" label="Units" onChangeText={(units) => updateSubject(subjectIndex, { units })} value={subject.units} /></View></View>
            <FormField label="Instructor" onChangeText={(teacher) => updateSubject(subjectIndex, { teacher })} value={subject.teacher} />
            <FormField label="Default room" onChangeText={(room) => updateSubject(subjectIndex, { room })} value={subject.room} />
            <View style={styles.row}><View style={styles.flex}><FormField label="Semester" onChangeText={(semester) => updateSubject(subjectIndex, { semester })} value={subject.semester} /></View><View style={styles.flex}><FormField label="Academic year" onChangeText={(academic_year) => updateSubject(subjectIndex, { academic_year })} value={subject.academic_year} /></View></View>
            <Text style={[styles.meetingTitle, { color: palette.text }]}>Weekly class meetings</Text>
            {subject.schedules.map((schedule, scheduleIndex) => <View key={`${schedule.day_of_week}-${schedule.start_time}-${scheduleIndex}`} style={[styles.meeting, { backgroundColor: palette.surfaceAlt, borderColor: palette.border }]}>
              <ChoiceField choices={days.map((label, value) => ({ label: label.slice(0, 3), value }))} label={`Meeting ${scheduleIndex + 1} day`} onChange={(day_of_week) => updateSchedule(subjectIndex, scheduleIndex, { day_of_week })} value={schedule.day_of_week} />
              <View style={styles.row}><View style={styles.flex}><FormField label="Starts (HH:MM)" onChangeText={(start_time) => updateSchedule(subjectIndex, scheduleIndex, { start_time })} value={schedule.start_time} /></View><View style={styles.flex}><FormField label="Ends (HH:MM)" onChangeText={(end_time) => updateSchedule(subjectIndex, scheduleIndex, { end_time })} value={schedule.end_time} /></View></View>
              <FormField label="Room" onChangeText={(room) => updateSchedule(subjectIndex, scheduleIndex, { room })} value={schedule.room} />
              <AppButton label="Remove meeting" onPress={() => removeSchedule(subjectIndex, scheduleIndex)} variant="ghost" />
            </View>)}
            <AppButton label="Add class meeting" onPress={() => addSchedule(subjectIndex)} variant="secondary" />
          </View> : null}
        </View>)}
        <AppButton disabled={!selectedCount} label={`Import ${selectedCount} subject${selectedCount === 1 ? '' : 's'}`} loading={save.isPending} onPress={() => save.mutate()} />
      </> : null}
    </View>
  </ScreenContainer>;
}

function formatBytes(size?: number) {
  if (!size) return 'Size unavailable';
  return size < 1024 * 1024 ? `${Math.ceil(size / 1024)} KB` : `${(size / 1024 / 1024).toFixed(1)} MB`;
}

const styles = StyleSheet.create({
  content: { gap: spacing.lg, paddingBottom: spacing.xxl },
  uploadCard: { borderRadius: radii.xl, borderWidth: 1, gap: spacing.md, padding: spacing.lg },
  uploadIcon: { alignItems: 'center', borderRadius: radii.pill, height: 52, justifyContent: 'center', width: 52 },
  uploadCopy: { flex: 1, gap: spacing.xs },
  uploadTitle: typography.sectionTitle,
  body: typography.body,
  reviewHeader: { alignItems: 'center', flexDirection: 'row', gap: spacing.md },
  sectionTitle: typography.sectionTitle,
  count: { ...typography.label, borderRadius: radii.pill, overflow: 'hidden', paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  subjectCard: { borderRadius: radii.xl, borderWidth: 1.5, boxShadow: '0 8px 22px rgba(180, 72, 78, 0.07)', gap: spacing.md, padding: spacing.lg },
  subjectHeader: { alignItems: 'center', flexDirection: 'row', gap: spacing.md },
  subjectTitle: typography.sectionTitle,
  caption: typography.caption,
  fields: { gap: spacing.md },
  row: { flexDirection: 'row', gap: spacing.md },
  flex: { flex: 1 },
  meetingTitle: { ...typography.sectionTitle, fontSize: 17, marginTop: spacing.sm },
  meeting: { borderRadius: radii.lg, borderWidth: 1, gap: spacing.md, padding: spacing.md },
});
