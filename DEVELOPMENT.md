# 開発ガイド

## 環境構築

### 必要なもの
- Node.js 18 以上
- npm
- Expo Go アプリ（実機確認用）または Android Emulator / iOS Simulator

### 初回セットアップ
```bash
npm install
```

## 開発コマンド

```bash
# 開発サーバー起動（ブラウザ上でQRコード表示）
npm start

# Android エミュレータで直接起動
npm run android

# iOS シミュレータで直接起動（macOS のみ）
npm run ios

# Web ブラウザで起動
npm run web
```

## アーキテクチャ

### データフロー

```
ユーザー操作
  ↓
Screen コンポーネント
  ↓
storage.ts（AsyncStorage + FileSystem）
  ↓
端末ローカルストレージ
```

### 写真の扱い

`expo-image-picker` で選択した一時URI を `expo-file-system` でアプリ専用ディレクトリ（`documentDirectory/photos/`）にコピーして永続化します。

### ナビゲーション型定義

[src/types/DiaryEntry.ts](src/types/DiaryEntry.ts) の `RootStackParamList` で各画面のパラメータ型を管理します。

## ファイル追加時のガイドライン

| 種類 | 配置先 |
|------|--------|
| 画面コンポーネント | `src/screens/` |
| 再利用UIパーツ | `src/components/` |
| データアクセス | `src/storage/` |
| 型定義 | `src/types/` |

## 既知の制限事項

- AsyncStorage は端末ごとのローカル保存のみ（クラウド同期なし）
- 画像はアプリ削除時に消去される
