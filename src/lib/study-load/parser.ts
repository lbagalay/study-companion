import { studyLoadExtractionSchema, type ExtractedSchedule, type StudyLoadExtraction } from '@/lib/study-load/schema';

const rowPattern = /(.*?)\s+(\d{3,6})\s+((?:Th|Su|Sa|M|T|W|F|S)+)\s+(\d{1,2}\s*[:;.]\s*\d{2}\s*(?:AM|PM))\s*[-–—]\s*(\d{1,2}\s*[:;.]\s*\d{2}\s*(?:AM|PM))\s+(?:R[mn]\.?\s*)?(.+?)\s+(\d+(?:[.,]\d+)?)\b/gi;

const dayNumbers: Record<string, number> = { F: 5, M: 1, S: 6, Sa: 6, Su: 0, T: 2, Th: 4, W: 3 };

function cleanOcrText(value: string) {
  return value
    .replace(/[|]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function stripHeader(value: string) {
  const headerEnd = value.toLowerCase().lastIndexOf('units');
  return cleanOcrText(headerEnd >= 0 ? value.slice(headerEnd + 'units'.length) : value)
    .replace(/^.*?subject\s*#\s*/i, '')
    .trim();
}

function splitSubject(value: string) {
  const cleaned = stripHeader(value);
  const match = cleaned.match(/^([A-Za-z][A-Za-z-]*\s*\d+[A-Za-z]?|[A-Z]{2,})\s+(.+)$/);
  if (match) return { code: match[1].replace(/([A-Za-z])(\d)/, '$1 $2').replace(/\s+/g, ' ').trim(), name: match[2].trim() };

  const [code = '', ...title] = cleaned.split(' ');
  return { code, name: title.join(' ').trim() };
}

function parseDays(value: string) {
  const days: number[] = [];
  for (let index = 0; index < value.length;) {
    const pair = value.slice(index, index + 2);
    const token = pair === 'Th' || pair === 'Su' || pair === 'Sa' ? pair : value[index];
    const day = dayNumbers[token];
    if (day !== undefined && !days.includes(day)) days.push(day);
    index += token.length;
  }
  return days;
}

function toTwentyFourHour(value: string) {
  const normalized = value.toUpperCase().replace(/[;.]/g, ':').replace(/\s+/g, '');
  const match = normalized.match(/^(\d{1,2}):(\d{2})(AM|PM)$/);
  if (!match) return '';
  let hour = Number(match[1]);
  const minute = Number(match[2]);
  if (hour < 1 || hour > 12 || minute > 59) return '';
  if (match[3] === 'AM' && hour === 12) hour = 0;
  if (match[3] === 'PM' && hour !== 12) hour += 12;
  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
}

export function parseStudyLoadText(rawText: string): StudyLoadExtraction {
  const text = cleanOcrText(rawText);
  const subjects: StudyLoadExtraction['subjects'] = [];
  let match: RegExpExecArray | null;

  rowPattern.lastIndex = 0;
  while ((match = rowPattern.exec(text))) {
    const { code, name } = splitSubject(match[1]);
    const startTime = toTwentyFourHour(match[4]);
    const endTime = toTwentyFourHour(match[5]);
    const room = cleanOcrText(match[6]);
    if (!name || !startTime || !endTime || endTime <= startTime) continue;

    const schedules: ExtractedSchedule[] = parseDays(match[3]).map((day_of_week) => ({
      day_of_week,
      end_time: endTime,
      room,
      start_time: startTime,
    }));
    if (!schedules.length) continue;

    const rawUnits = match[7].replace(',', '.');
    let units = Number(rawUnits);
    if (!rawUnits.includes('.') && units >= 10 && units % 10 === 0) units /= 10;

    subjects.push({
      academic_year: '',
      code,
      name,
      room,
      schedules,
      semester: '',
      teacher: '',
      units,
    });
  }

  return studyLoadExtractionSchema.parse({ subjects });
}
