# AGENTS.md

AI エージェントがこのプロジェクトで作業する際のガイドラインです。

## プロジェクト概要

**catDailyNoteApp** — 猫の写真にキャプションを付けて日記形式で管理する React Native (Expo) モバイルアプリ。

- iOS / Android 対応（Expo managed workflow）
- ローカルストレージのみ（サーバーなし）

## リポジトリ構成

```
catDailyNoteApp/
├── App.tsx                        # エントリポイント・ナビゲーション設定
├── index.ts                       # Expo エントリ
├── app.json                       # Expo 設定
├── src/
│   ├── types/DiaryEntry.ts        # 型定義
│   ├── storage/storage.ts         # データ永続化ロジック
│   ├── screens/                   # 画面コンポーネント
│   └── components/                # 再利用UIコンポーネント
├── assets/                        # 画像・アイコン等
├── README.md                      # プロジェクト概要
├── DEVELOPMENT.md                 # 開発ガイド
├── CHANGELOG.md                   # 変更履歴
└── CLAUDE.md                      # Claude Code 向け指示
```

## セットアップ

```bash
npm install
npm start        # Expo Go でQRスキャンして実機確認
```

## 主要な制約

| 項目 | 内容 |
|------|------|
| パッケージ追加 | `npx expo install <pkg>` を使う（npm install は使わない） |
| ナビゲーター | `@react-navigation/native-stack` のみ使用 |
| スタイリング | StyleSheet.create（外部スタイルライブラリなし） |
| 状態管理 | useState / useCallback のみ（Redux・Zustand 等なし） |
| データ保存 | AsyncStorage のみ（SQLite・外部DB なし） |

## 変更時のルール

1. **画面追加** — `src/screens/` にファイルを作成し、`RootStackParamList`（`src/types/DiaryEntry.ts`）と `App.tsx` の両方に登録する
2. **写真操作** — 一時URIを直接保存せず、必ず `copyPhotoToAppDir()` でアプリ内にコピーする
3. **削除処理** — ファイルと AsyncStorage を両方削除する（`deleteEntry()` を使う）
4. **CHANGELOG.md** — 機能追加・変更・修正を行った場合は更新する
