export type DateTimePart = 'date' | 'time';

const pad = (value: number) => String(value).padStart(2, '0');

export function localDateInputValue(iso: string) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  return `${String(date.getFullYear()).padStart(4, '0')}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function localTimeInputValue(iso: string) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  return `${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function mergeLocalDateTimePart(currentIso: string, part: DateTimePart, value: string) {
  const current = new Date(currentIso);
  if (Number.isNaN(current.getTime())) return null;
  const next = new Date(current);

  if (part === 'date') {
    const match = /^(\d{4,})-(\d{2})-(\d{2})$/.exec(value);
    if (!match) return null;
    const year = Number(match[1]); const month = Number(match[2]); const day = Number(match[3]);
    next.setFullYear(year, month - 1, day);
    if (next.getFullYear() !== year || next.getMonth() !== month - 1 || next.getDate() !== day) return null;
  } else {
    const match = /^(\d{2}):(\d{2})$/.exec(value);
    if (!match) return null;
    const hours = Number(match[1]); const minutes = Number(match[2]);
    if (hours > 23 || minutes > 59) return null;
    next.setHours(hours, minutes, 0, 0);
  }

  return Number.isNaN(next.getTime()) ? null : next.toISOString();
}
