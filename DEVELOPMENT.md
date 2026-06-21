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
# 開発サーバー起動（QRコード表示）
npm start

# Jest テスト実行
npm test

# TypeScript 型チェック
npx tsc --noEmit

# Android エミュレータで直接起動
npm run android

# iOS シミュレータで直接起動（macOS のみ）
npm run ios
```

## アーキテクチャ

### ナビゲーション構造（Plan A: タイムライン中心）

```
MainTabs (BottomTabNavigator)
├── ホーム     — タイムライン（猫切替チップ付き）
├── カレンダー — 月間カレンダー
├── [中央FAB]  — 新規投稿モーダル
├── マイ猫    — 猫一覧（2カラムグリッド）
└── 設定      — テーマ・リマインダー・データ管理

Stack (モーダル/詳細)
├── CatProfile  — 猫プロフィール（日記/健康/アルバム セグメント）
├── DiaryEntry  — 日記投稿/編集
├── CatEdit     — 猫追加/編集
└── Stats       — 統計
```

### データフロー

```
ユーザー操作
  ↓
Screen コンポーネント
  ↓
Context（CatContext / ThemeContext）
  ↓
storage/*.ts（AsyncStorage + FileSystem）
  ↓
端末ローカルストレージ
```

### 写真の扱い

`expo-image-picker` で選択した一時URI を `expo-file-system` でアプリ専用ディレクトリ（`documentDirectory` 配下）にコピーして永続化します。

### 型定義

[src/types/index.ts](src/types/index.ts) で `Cat` / `DiaryEntry` / `HealthRecord` / `Appointment` などのデータモデルを、[src/navigation/types.ts](src/navigation/types.ts) で `RootStackParamList` / `TabParamList` を管理します。

## ファイル追加時のガイドライン

| 種類 | 配置先 |
|------|--------|
| 画面コンポーネント | `src/screens/` |
| データアクセス | `src/storage/` |
| 型定義 | `src/types/` |
| ユーティリティ | `src/utils/` |
| グローバル状態 | `src/contexts/` |

## テスト

`src/**/__tests__/` に Jest ユニットテストがあります（計45件）。ストレージ・ユーティリティを変更した場合は対応するテストも更新してください。

## 既知の制限事項

- AsyncStorage は端末ごとのローカル保存のみ（クラウド同期なし）
- 画像はアプリ削除時に消去される
- バックエンド連携（Supabase）は設計段階（`docs/SYSTEM_ARCHITECTURE.md`）
