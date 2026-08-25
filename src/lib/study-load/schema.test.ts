import { describe, expect, it } from 'vitest';

import { studyLoadExtractionSchema } from './schema';

const validSubject = {
  academic_year: '2026-2027',
  code: 'PHYS 101',
  name: 'General Physics',
  room: 'Lab 2',
  schedules: [{ day_of_week: 1, end_time: '10:30', room: 'Lab 2', start_time: '09:00' }],
  semester: 'First Semester',
  teacher: 'Dr. Santos',
  units: 3,
};

describe('study load extraction schema', () => {
  it('accepts reviewed subject and schedule data', () => {
    expect(studyLoadExtractionSchema.parse({ subjects: [validSubject] }).subjects[0].code).toBe(
      'PHYS 101',
    );
  });

  it('rejects invalid or reversed meeting times', () => {
    const result = studyLoadExtractionSchema.safeParse({
      subjects: [
        { ...validSubject, schedules: [{ ...validSubject.schedules[0], end_time: '08:00' }] },
      ],
    });
    expect(result.success).toBe(false);
  });

  it('rejects imports larger than the supported batch', () => {
    expect(
      studyLoadExtractionSchema.safeParse({
        subjects: Array.from({ length: 51 }, () => validSubject),
      }).success,
    ).toBe(false);
  });
});
