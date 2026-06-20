import { formatCatAge } from '../age';

describe('formatCatAge', () => {
  const now = new Date('2026-06-20T00:00:00.000Z');

  it('returns null when birthDate is missing', () => {
    expect(formatCatAge(undefined, now)).toBeNull();
  });

  it('returns null for an invalid date', () => {
    expect(formatCatAge('not-a-date', now)).toBeNull();
  });

  it('returns null for a future birth date', () => {
    expect(formatCatAge('2027-01-01', now)).toBeNull();
  });

  it('formats years and months', () => {
    expect(formatCatAge('2024-03-20', now)).toBe('2歳3ヶ月');
  });

  it('formats whole years', () => {
    expect(formatCatAge('2023-06-20', now)).toBe('3歳');
  });

  it('formats months only when under a year', () => {
    expect(formatCatAge('2026-02-20', now)).toBe('4ヶ月');
  });

  it('handles a newborn within the same month', () => {
    expect(formatCatAge('2026-06-10', now)).toBe('0ヶ月');
  });

  it('borrows a month when the day has not passed', () => {
    expect(formatCatAge('2024-06-25', now)).toBe('1歳11ヶ月');
  });
});
