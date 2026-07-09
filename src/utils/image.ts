import * as ImageManipulator from 'expo-image-manipulator';

// アップロード前に写真を圧縮・リサイズする。
// 長辺を MAX_DIMENSION に収め、JPEG quality 0.7 で書き出すことで
// ファイルサイズを抑え、アップロード失敗（5MB 超）をほぼ防ぐ。
const MAX_DIMENSION = 1920;
const COMPRESS_QUALITY = 0.7;

export async function resizeImage(uri: string): Promise<string> {
  try {
    // まず何もせず読み込んで元の寸法を取得
    const original = await ImageManipulator.manipulateAsync(uri, [], {
      compress: 1,
      format: ImageManipulator.SaveFormat.JPEG,
    });

    const { width, height } = original;
    const longSide = Math.max(width, height);

    // 長辺が上限以下ならリサイズ不要（拡大を防ぐ）。圧縮のみ適用済みの結果を返す。
    if (longSide <= MAX_DIMENSION) {
      const compressed = await ImageManipulator.manipulateAsync(uri, [], {
        compress: COMPRESS_QUALITY,
        format: ImageManipulator.SaveFormat.JPEG,
      });
      return compressed.uri;
    }

    // 長辺を MAX_DIMENSION に合わせる（アスペクト比維持）
    const resizeAction =
      width >= height
        ? { resize: { width: MAX_DIMENSION } }
        : { resize: { height: MAX_DIMENSION } };

    const result = await ImageManipulator.manipulateAsync(uri, [resizeAction], {
      compress: COMPRESS_QUALITY,
      format: ImageManipulator.SaveFormat.JPEG,
    });
    return result.uri;
  } catch (err) {
    // リサイズに失敗しても元の画像を返す（アップロード時のサイズ検証で最終的に弾かれる）
    console.error('Failed to resize image:', err);
    return uri;
  }
}
