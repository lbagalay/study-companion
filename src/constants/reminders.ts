const REMINDER_OFFSET_LABELS = {
  20160: '2 weeks before',
  10080: '1 week before',
  4320: '3 days before',
  1440: '1 day before',
  180: '3 hours before',
  60: '1 hour before',
} as const;

type ReminderOffset = keyof typeof REMINDER_OFFSET_LABELS;

/** Builds `{ label, value }` choices for a subset of the shared offset catalog, in the given order. */
export function reminderOffsetChoices(offsets: readonly ReminderOffset[]) {
  return offsets.map((value) => ({ label: REMINDER_OFFSET_LABELS[value], value }));
}
