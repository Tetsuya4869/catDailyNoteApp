# 🐱 猫の日記 (Cat Daily Note)

猫との毎日を記録するシンプルなモバイルアプリです。

## 機能

- 日記の作成・編集・削除
- 写真の添付
- 猫の気分を記録（ごきげん、ねむい、あそびたい、おなかすいた、リラックス）
- ローカルストレージでデータを保存

## 技術スタック

- React Native + Expo
- TypeScript
- React Navigation
- AsyncStorage

## セットアップ

```bash
# 依存関係のインストール
npm install

# 開発サーバーの起動
npm start
```

## 使い方

1. `npm start` でExpo開発サーバーを起動
2. Expo Goアプリをスマートフォンにインストール
3. QRコードをスキャンしてアプリを実行

## プロジェクト構成

```
src/
├── types/           # TypeScript型定義
├── storage/         # ローカルストレージ
├── screens/         # 画面コンポーネント
│   ├── HomeScreen.tsx
│   └── DiaryEntryScreen.tsx
└── navigation/      # ナビゲーション設定
```
