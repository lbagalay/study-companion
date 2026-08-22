import { describe, expect, it } from 'vitest';

import { parseStudyLoadText } from '@/lib/study-load/parser';

const sample = `
Enrolled Date: July 31, 2026 10:05 AM
Subject # Subject Title Offer # Schedule Units
PATHFit 3 Menu of Dance, Sports, Martial Arts, Group Exercise, Outdoor and Adventure Activities 1 5197 M 07:30AM - 09:30AM Rm ORH 2.0
EP 1 English Proficiency Level 1 (lec/lab) 6607 TTh 10:30AM - 12:00PM Rm 406A 3.0
Psych 105 Filip! ino Psychology 6364 MWF 12:30PM - 01:30PM Rm 501A 3.0
Psych 103B Theories of Personality 2 6359 MWF 02:30PM - 03:30PM Rm 430 3.0
Psych 107 Field Methods in Psychology 6368 WF 08:30AM - 11:00AM Rm 502 5.0
Psych 108 Physiological Psychology 6644 TTh 01:30PM - 03:00PM Rm FLD1 3.0
FIT Foundation in Information Technology (Lec/Lab) 11036 TTh 04:30PM - 06:00PM Rm 310 3.0
ReEd 3 Our Restless Hearts: An Introduction to Doing Catholic Morality 16042 MWF 11:30AM - 12:30PM Rm 317 3.0
Welcome and aspire to I.N.S.P.I.R.E Adelante!
`;

const browserOcrSample = `
Subject # Subject Title Offer # Schedule Units
PATHFit 3 Menu of Dance, Sports, Martial Arts, Group Exercise, Outdoor and Adventure Activities 1 5197 M 07:30AM - 09:30AM Rm ORH 20
EP1 English Proficiency Level 1 (lec/lab) 6607 TTh 10:30AM - 12:00PM Rm 406A 3.0
Psych 105 Filipino Psychology 6364 MWF 12:30PM - 01:30PM Rm 501A 3.0
Psych 103B Theories of Personality 2 6359 MWF 02:30PM - 03:30PM Rm 430 3.0
Psych 107 Field Methods in Psychology 6368 WF 08:30AM - 11:00AM Rm 502 5.0
Psych 108 Physiological Psychology 6644 TTh 01:30PM - 03:00PM Rm FLD1 3.0
FIT Foundation in Information Technology (Lec/Lab) 11036 TTh 04:30PM - 06:00PM Rm 310 3.0
ReEd 3 Our Restless Hearts: An Introduction to Doing Catholic Morality 16042 MWF 11:30AM - 12:30PM Rm 317 3.0
`;

describe('parseStudyLoadText', () => {
  it('turns the supplied study-load table into editable subjects and meetings', () => {
    const result = parseStudyLoadText(sample);

    expect(result.subjects).toHaveLength(8);
    expect(result.subjects.reduce((total, subject) => total + subject.schedules.length, 0)).toBe(18);
    expect(result.subjects[0]).toMatchObject({ code: 'PATHFit 3', name: 'Menu of Dance, Sports, Martial Arts, Group Exercise, Outdoor and Adventure Activities 1', room: 'ORH', units: 2 });
    expect(result.subjects[1].schedules.map((meeting) => meeting.day_of_week)).toEqual([2, 4]);
    expect(result.subjects[2].schedules[0]).toMatchObject({ day_of_week: 1, start_time: '12:30', end_time: '13:30', room: '501A' });
    expect(result.subjects[6]).toMatchObject({ code: 'FIT', name: 'Foundation in Information Technology (Lec/Lab)', units: 3 });
  });

  it('returns an empty review when no schedule rows are present', () => {
    expect(parseStudyLoadText('This is not a study load.').subjects).toEqual([]);
  });

  it('handles spacing and decimal mistakes produced by browser OCR', () => {
    const result = parseStudyLoadText(browserOcrSample);

    expect(result.subjects).toHaveLength(8);
    expect(result.subjects[0].units).toBe(2);
    expect(result.subjects[1].code).toBe('EP 1');
  });
});
