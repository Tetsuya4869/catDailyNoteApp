# 🐱 catDailyNoteApp

猫の写真にキャプションを付けて日記として記録するモバイルアプリです。

## 概要

- 写真ライブラリから写真を選択
- テキストでキャプションを入力
- 日付ごとの日記として一覧表示・詳細閲覧

## 技術スタック

| 区分 | 技術 |
|------|------|
| フレームワーク | React Native (Expo managed) |
| 言語 | TypeScript |
| ナビゲーション | React Navigation (Native Stack) |
| 写真選択 | expo-image-picker |
| ファイル操作 | expo-file-system |
| データ永続化 | AsyncStorage |

## セットアップ

```bash
# 依存関係をインストール
npm install

# 開発サーバー起動
npm start
```

Expo Go アプリ（iOS / Android）でQRコードをスキャンして動作確認できます。

## 画面構成

```
Home（一覧）
  └─ NewEntry（新規作成）
  └─ EntryDetail（詳細・削除）
```

## ディレクトリ構成

```
src/
├── types/
│   └── DiaryEntry.ts       # 型定義・ナビゲーション型
├── storage/
│   └── storage.ts          # AsyncStorage CRUD + ファイルコピー
├── screens/
│   ├── HomeScreen.tsx       # エントリ一覧
│   ├── NewEntryScreen.tsx   # 新規日記作成
│   └── EntryDetailScreen.tsx # 詳細・削除
└── components/
    └── EntryCard.tsx        # 一覧カードコンポーネント
```
