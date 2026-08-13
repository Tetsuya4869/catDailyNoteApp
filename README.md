# 🐱 猫の日記 (Cat Daily Note)

猫との毎日・写真・健康・通院予定をまとめて記録する Expo / React Native アプリです。多頭飼いに対応し、ローカルだけでも利用でき、Supabaseを設定するとクラウド同期も有効になります。

## 主な機能

- 日記の作成・編集・削除
- 写真をアプリ管理領域へ保存
- 猫ごとのタイムライン切替
- 気分・カテゴリ・お気に入り・検索
- 月間カレンダーと日別記録一覧
- 複数猫プロフィール（性別・誕生日・写真）
- 健康記録（体重・通院・ワクチン・投薬）
- 体重推移表示
- 通院・ワクチン予定
- アルバム表示
- 統計・連続記録日数
- 日次リマインダー
- Light / Darkテーマ
- 猫の安全なアーカイブ
- 写真込み完全バックアップ v2 / 復元
- Optional Supabase offline-first sync

## 技術スタック

- React Native + Expo 50
- TypeScript
- React Navigation
- AsyncStorage
- Expo FileSystem / ImagePicker / Notifications
- Supabase PostgREST + Auth + Storage（任意、SDK依存なし）

## セットアップ

```bash
npm install
npm start
```

型チェックとテスト:

```bash
npx tsc --noEmit
npm test -- --runInBand
```

## Supabase（任意）

環境変数がない場合は完全ローカルで動作します。クラウド同期を使う場合は `.env.example` を `.env` にコピーし、Migrationを適用してください。

詳細: `docs/SUPABASE_SETUP.md`

## データ設計

日記・誕生日・健康記録・予定の「日付」は `yyyy-MM-dd` のdate-only形式で保持し、`createdAt` / `updatedAt` のみISO timestampを使用します。これによりUTC/JST境界で日付がずれる問題を防ぎます。

## 構成

```text
src/
├── contexts/
├── navigation/
├── repositories/   # UIとストレージ/Supabaseの境界
├── screens/
├── services/       # Supabase session bootstrap
├── storage/        # AsyncStorage実装
├── types/
└── utils/

supabase/
└── migrations/
```
