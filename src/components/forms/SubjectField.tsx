import { FeedbackState } from '@/components/ui/FeedbackState';
import { ChoiceField } from '@/components/ui/ChoiceField';
import { useSubjects } from '@/hooks/useStudyData';

export function SubjectField({ onChange, value }: { onChange: (id: string) => void; value: string }) {
  const subjects = useSubjects();
  if (subjects.isLoading) return <FeedbackState loading message="Loading subjects." title="One moment" />;
  if (!subjects.data?.length) return <FeedbackState message="Add a subject before creating this item." title="Subject required" />;
  return <ChoiceField choices={subjects.data.map((subject) => ({ label: subject.code || subject.name, value: subject.id }))} label="Subject" onChange={onChange} value={value || subjects.data[0].id} />;
}
