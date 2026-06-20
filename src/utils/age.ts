/**
 * 誕生日から「N歳Mヶ月」形式の年齢文字列を算出する。
 * 未設定や未来日付の場合は null を返す。
 */
export function formatCatAge(
  birthDate?: string,
  now: Date = new Date()
): string | null {
  if (!birthDate) return null;
  const birth = new Date(birthDate);
  if (isNaN(birth.getTime()) || birth.getTime() > now.getTime()) {
    return null;
  }

  let years = now.getFullYear() - birth.getFullYear();
  let months = now.getMonth() - birth.getMonth();

  if (now.getDate() < birth.getDate()) {
    months -= 1;
  }
  if (months < 0) {
    years -= 1;
    months += 12;
  }

  if (years <= 0 && months <= 0) {
    return '0ヶ月';
  }
  if (years <= 0) {
    return `${months}ヶ月`;
  }
  if (months <= 0) {
    return `${years}歳`;
  }
  return `${years}歳${months}ヶ月`;
}
