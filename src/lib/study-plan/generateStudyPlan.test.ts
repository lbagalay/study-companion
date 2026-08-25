import { describe, expect, it } from 'vitest';
import { generateStudyPlan } from './generateStudyPlan';

const base = {
  availableDays: [0, 1, 2, 3, 4, 5, 6],
  duration: 30,
  examAt: '2026-09-01T01:00:00.000Z',
  examId: 'exam-1',
  now: new Date('2026-08-26T00:00:00.000Z'),
  plannedTime: '18:00',
  subjectId: 'subject-1',
  topics: ['Functions', 'Limits', 'Derivatives', 'Practice'],
};

describe('generateStudyPlan', () => {
  it('reserves the final available day for review', () => {
    const result = generateStudyPlan(base);
    expect(result).toHaveLength(5);
    expect(result.at(-1)?.topic).toContain('Review:');
    expect(result.at(-1)?.exam_id).toBe('exam-1');
  });
  it('only schedules selected weekdays', () => {
    const result = generateStudyPlan({ ...base, availableDays: [6, 0] });
    expect(result).toHaveLength(2);
    expect(result.every((item) => [6, 0].includes(new Date(item.planned_at).getDay()))).toBe(true);
  });
  it('returns no sessions when no available day exists', () => {
    expect(generateStudyPlan({ ...base, availableDays: [] })).toEqual([]);
  });
});
