import { z } from 'zod';

export const extractedScheduleSchema = z.object({
  day_of_week: z.number().int().min(0).max(6),
  end_time: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Use HH:MM time.'),
  room: z.string().max(50),
  start_time: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Use HH:MM time.'),
}).refine((value) => value.end_time > value.start_time, { message: 'End time must be after start time.', path: ['end_time'] });

export const extractedSubjectSchema = z.object({
  academic_year: z.string().max(20),
  code: z.string().max(30),
  name: z.string().trim().min(1).max(100),
  room: z.string().max(50),
  schedules: z.array(extractedScheduleSchema).max(20),
  semester: z.string().max(50),
  teacher: z.string().max(100),
  units: z.number().min(0).max(20),
});

export const studyLoadExtractionSchema = z.object({ subjects: z.array(extractedSubjectSchema).max(50) });

export type ExtractedSchedule = z.infer<typeof extractedScheduleSchema>;
export type ExtractedSubject = z.infer<typeof extractedSubjectSchema>;
export type StudyLoadExtraction = z.infer<typeof studyLoadExtractionSchema>;
export type StudyLoadImportSubject = ExtractedSubject & { color: string };
