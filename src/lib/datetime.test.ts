import { describe, expect, it } from 'vitest';
import { localDateInputValue, localTimeInputValue, mergeLocalDateTimePart } from './datetime';

describe('local date and time editing', () => {
  it('changes the calendar date without changing the local time', () => {
    const original = new Date(2031, 2, 8, 14, 37, 25).toISOString();
    const result = mergeLocalDateTimePart(original, 'date', '2042-11-19');
    const changed = new Date(result!);
    expect([changed.getFullYear(), changed.getMonth(), changed.getDate()]).toEqual([2042, 10, 19]);
    expect([changed.getHours(), changed.getMinutes()]).toEqual([14, 37]);
  });

  it('changes the local time without changing the calendar date', () => {
    const original = new Date(2031, 2, 8, 14, 37, 25).toISOString();
    const result = mergeLocalDateTimePart(original, 'time', '23:49');
    const changed = new Date(result!);
    expect([changed.getFullYear(), changed.getMonth(), changed.getDate()]).toEqual([2031, 2, 8]);
    expect([changed.getHours(), changed.getMinutes(), changed.getSeconds()]).toEqual([23, 49, 0]);
  });

  it('allows dates before or after the current value without range limits', () => {
    const original = new Date(2031, 2, 8, 14, 37).toISOString();
    const past = new Date(mergeLocalDateTimePart(original, 'date', '1998-04-12')!);
    const future = new Date(mergeLocalDateTimePart(original, 'date', '2099-09-30')!);
    expect([past.getFullYear(), past.getMonth(), past.getDate()]).toEqual([1998, 3, 12]);
    expect([future.getFullYear(), future.getMonth(), future.getDate()]).toEqual([2099, 8, 30]);
  });

  it('formats values for browser date and time controls', () => {
    const iso = new Date(2036, 0, 5, 7, 4).toISOString();
    expect(localDateInputValue(iso)).toBe('2036-01-05');
    expect(localTimeInputValue(iso)).toBe('07:04');
  });

  it('rejects impossible dates and invalid times', () => {
    const original = new Date(2031, 0, 1, 12, 0).toISOString();
    expect(mergeLocalDateTimePart(original, 'date', '2031-02-31')).toBeNull();
    expect(mergeLocalDateTimePart(original, 'time', '25:00')).toBeNull();
  });
});
