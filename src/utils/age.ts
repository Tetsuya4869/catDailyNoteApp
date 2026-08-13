import { dateOnlyToLocalDate, normalizeDateOnly } from './date';

/** 誕生日から「N歳Mヶ月」形式の年齢文字列を算出する。 */
export function formatCatAge(birthDate?: string, now: Date = new Date()): string | null {
  const normalized = normalizeDateOnly(birthDate);
  if (!normalized) return null;
  const birth = dateOnlyToLocalDate(normalized);
  if (Number.isNaN(birth.getTime()) || birth.getTime() > now.getTime()) return null;

  let years = now.getFullYear() - birth.getFullYear();
  let months = now.getMonth() - birth.getMonth();
  if (now.getDate() < birth.getDate()) months -= 1;
  if (months < 0) { years -= 1; months += 12; }
  if (years <= 0 && months <= 0) return '0ヶ月';
  if (years <= 0) return `${months}ヶ月`;
  if (months <= 0) return `${years}歳`;
  return `${years}歳${months}ヶ月`;
}
