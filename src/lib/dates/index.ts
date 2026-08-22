import { differenceInCalendarDays, isToday } from 'date-fns';
import type { Assignment, Exam } from '@/types';

export function isClassCurrent(startTime: string, endTime: string, now = new Date()) {
  const current = now.toTimeString().slice(0, 8);
  return current >= startTime && current <= endTime;
}

export function assignmentUrgency(item: Assignment, now = new Date()) {
  if (item.status === 'COMPLETED') return 99;
  const days = differenceInCalendarDays(new Date(item.due_at), now);
  return days < 0 ? 0 : isToday(new Date(item.due_at)) ? 1 : days <= 3 ? 3 : 5;
}

export function examUrgency(item: Exam, now = new Date()) {
  if (item.status !== 'UPCOMING') return 99;
  return differenceInCalendarDays(new Date(item.exam_at), now) <= 3 ? 2 : 4;
}
