import React from 'react';

/**
 * Web プレビュー用の DateTimePicker 代替。
 *
 * @react-native-community/datetimepicker はネイティブ専用で web 実装を持たず、
 * ブラウザでは何も表示されない（日付・時刻を選べない）。
 * metro.config.js が platform === 'web' のときだけこのファイルを解決するため、
 * iOS / Android のビルドには一切影響しない。
 *
 * 本家と同じ props / onChange シグネチャだけを実装している。
 */

type Mode = 'date' | 'time';

type Props = {
  value: Date;
  mode?: Mode;
  display?: string;
  maximumDate?: Date;
  minimumDate?: Date;
  onChange?: (
    event: { type: 'set' | 'dismissed' },
    date?: Date
  ) => void;
};

function pad(n: number): string {
  return String(n).padStart(2, '0');
}

// input[type=date] / input[type=time] が要求するローカル時刻文字列に変換する
function toInputValue(date: Date, mode: Mode): string {
  if (Number.isNaN(date.getTime())) return '';
  if (mode === 'time') {
    return `${pad(date.getHours())}:${pad(date.getMinutes())}`;
  }
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

// 入力値を、既存の日付（時刻部分）を保ったまま Date に反映する
function fromInputValue(raw: string, mode: Mode, base: Date): Date | null {
  if (!raw) return null;
  const next = new Date(base.getTime());
  if (mode === 'time') {
    const [h, m] = raw.split(':').map(Number);
    if (Number.isNaN(h) || Number.isNaN(m)) return null;
    next.setHours(h, m, 0, 0);
    return next;
  }
  const [y, mo, d] = raw.split('-').map(Number);
  if (Number.isNaN(y) || Number.isNaN(mo) || Number.isNaN(d)) return null;
  next.setFullYear(y, mo - 1, d);
  return next;
}

export default function DateTimePicker({
  value,
  mode = 'date',
  maximumDate,
  minimumDate,
  onChange,
}: Props) {
  const base = value instanceof Date && !Number.isNaN(value.getTime())
    ? value
    : new Date();

  return React.createElement('input', {
    type: mode === 'time' ? 'time' : 'date',
    value: toInputValue(base, mode),
    max: mode === 'date' && maximumDate ? toInputValue(maximumDate, 'date') : undefined,
    min: mode === 'date' && minimumDate ? toInputValue(minimumDate, 'date') : undefined,
    'aria-label': mode === 'time' ? '時刻を選択' : '日付を選択',
    style: {
      fontSize: 16,
      padding: 12,
      marginTop: 8,
      borderRadius: 12,
      border: '1px solid rgba(0,0,0,0.2)',
      width: '100%',
      boxSizing: 'border-box',
    },
    onChange: (e: { target: { value: string } }) => {
      const next = fromInputValue(e.target.value, mode, base);
      if (next) onChange?.({ type: 'set' }, next);
    },
  });
}
