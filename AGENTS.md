# AGENTS.md

AI エージェントがこのプロジェクトで作業する際のガイドラインです。

## プロジェクト概要

**catDailyNoteApp** — 猫ごとに日記・健康記録・写真を管理する React Native (Expo) モバイルアプリ。

- iOS / Android 対応（Expo managed workflow）
- ローカルストレージのみ（AsyncStorage）。将来的に Supabase バックエンド連携を計画（`docs/SYSTEM_ARCHITECTURE.md` 参照）

## リポジトリ構成

```
catDailyNoteApp/
├── App.tsx                        # エントリポイント・ナビゲーション設定（4タブ + 中央FAB）
├── index.ts                       # Expo エントリ
├── app.json                       # Expo 設定
├── src/
│   ├── constants/theme.ts         # カラーパレット・spacing・borderRadius
│   ├── contexts/                  # CatContext / ThemeContext
│   ├── navigation/types.ts        # RootStackParamList / TabParamList
│   ├── screens/                   # 画面コンポーネント
│   ├── storage/                   # AsyncStorage CRUD（cat/diary/health/settings）
│   ├── types/index.ts             # Cat, DiaryEntry, HealthRecord, Appointment 等
│   └── utils/                     # age / export / notifications
├── assets/                        # 画像・アイコン等
├── docs/SYSTEM_ARCHITECTURE.md    # バックエンド・サービス展開設計
├── README.md                      # プロジェクト概要
├── DEVELOPMENT.md                 # 開発ガイド
├── CHANGELOG.md                   # 変更履歴
└── CLAUDE.md                      # Claude Code 向け指示
```

## セットアップ

```bash
npm install
npm start        # Expo Go でQRスキャンして実機確認
npm test         # Jest テスト
npx tsc --noEmit # 型チェック
```

## 主要な制約

| 項目 | 内容 |
|------|------|
| パッケージ追加 | `npx expo install <pkg>` を使う（SDK互換性を自動解決） |
| ナビゲーター | `@react-navigation/native-stack` + `@react-navigation/bottom-tabs` |
| スタイリング | StyleSheet.create（`createStyles(colors)` パターンでテーマ対応） |
| 状態管理 | React Context（CatContext / ThemeContext）+ Hooks |
| データ保存 | AsyncStorage のみ（SQLite・外部DB なし） |

## 変更時のルール

1. **画面追加** — `src/screens/` にファイルを作成し、`RootStackParamList` / `TabParamList`（`src/navigation/types.ts`）と `App.tsx` の両方に登録する
2. **写真操作** — 一時URIを直接保存せず、`expo-file-system` でアプリ内にコピーしてから永続化する
3. **型定義** — `src/types/index.ts` で一元管理する
4. **テスト** — ストレージ・ユーティリティ変更時は `src/**/__tests__/` のテストを更新する
5. **CHANGELOG.md** — 機能追加・変更・修正を行った場合は更新する
