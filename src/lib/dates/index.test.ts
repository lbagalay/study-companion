import { describe, expect, it } from 'vitest';
import { assignmentUrgency, examUrgency, isClassCurrent } from './index';
import type { Assignment, Exam } from '@/types';

const timestamps = { created_at: '2026-08-01T00:00:00Z', updated_at: '2026-08-01T00:00:00Z' };
const assignment = {
  ...timestamps,
  id: 'a',
  user_id: 'u',
  subject_id: 's',
  title: 'Task',
  description: '',
  due_at: '2026-08-22T10:00:00Z',
  priority: 'MEDIUM',
  status: 'NOT_STARTED',
  attachment_url: null,
  notes: '',
  reminder_offsets: [],
  notification_ids: [],
  completed_at: null,
} satisfies Assignment;
const exam = {
  ...timestamps,
  id: 'e',
  user_id: 'u',
  subject_id: 's',
  title: 'Exam',
  type: 'EXAM',
  exam_at: '2026-08-24T10:00:00Z',
  room: '',
  coverage: '',
  notes: '',
  status: 'UPCOMING',
  reminder_offsets: [],
  notification_ids: [],
} satisfies Exam;

describe('date priorities', () => {
  it('detects a current class inclusively', () => {
    expect(isClassCurrent('09:00:00', '10:00:00', new Date('2026-08-22T09:30:00'))).toBe(true);
    expect(isClassCurrent('09:00:00', '10:00:00', new Date('2026-08-22T10:30:00'))).toBe(false);
  });
  it('places today assignments ahead of near exams', () => {
    const now = new Date('2026-08-22T01:00:00Z');
    expect(assignmentUrgency(assignment, now)).toBe(1);
    expect(examUrgency(exam, now)).toBe(2);
  });
  it('moves completed assignments out of urgency ordering', () => {
    expect(assignmentUrgency({ ...assignment, status: 'COMPLETED' })).toBe(99);
  });
});
