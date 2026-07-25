import * as Haptics from 'expo-haptics';

/**
 * 触覚フィードバックの薄いラッパー。
 *
 * 触覚はあくまで補助的な演出であり、失敗しても本処理を止めてはいけない。
 * 端末が非対応の場合や Web では expo-haptics が例外を投げるため、
 * ここで握りつぶして未処理の Promise 拒否が発生しないようにする。
 */

export const ImpactFeedbackStyle = Haptics.ImpactFeedbackStyle;
export const NotificationFeedbackType = Haptics.NotificationFeedbackType;

function ignoreFailure(run: () => Promise<void>): void {
  try {
    run().catch(() => {});
  } catch {
    // 非対応環境では同期的に throw されることもあるため両方を吸収する
  }
}

export function impactAsync(style?: Haptics.ImpactFeedbackStyle): void {
  ignoreFailure(() => Haptics.impactAsync(style));
}

export function notificationAsync(
  type?: Haptics.NotificationFeedbackType
): void {
  ignoreFailure(() => Haptics.notificationAsync(type));
}

export function selectionAsync(): void {
  ignoreFailure(() => Haptics.selectionAsync());
}
