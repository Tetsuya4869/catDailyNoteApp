export function toDateOnly(value: Date | string): string {
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return value;
  }

  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '';

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function normalizeDateOnly(value?: string): string | undefined {
  if (!value) return undefined;
  const normalized = toDateOnly(value);
  return normalized || undefined;
}

export function dateOnlyToLocalDate(value: string): Date {
  const normalized = toDateOnly(value);
  if (!normalized) return new Date(NaN);
  const [year, month, day] = normalized.split('-').map(Number);
  return new Date(year, month - 1, day);
}

export function todayDateOnly(now: Date = new Date()): string {
  return toDateOnly(now);
}

export function shiftDateOnly(value: string, amountDays: number): string {
  const date = dateOnlyToLocalDate(value);
  if (Number.isNaN(date.getTime())) return '';
  date.setDate(date.getDate() + amountDays);
  return toDateOnly(date);
}
