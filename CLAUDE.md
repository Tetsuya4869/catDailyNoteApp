# CLAUDE.md

Claude Code がこのプロジェクトで作業する際の指示書です。

## プロジェクト概要

猫の日記アプリ - 猫ごとに日記・健康記録・写真を管理する React Native (Expo) モバイルアプリ。

## 開発コマンド

```bash
npm start          # 開発サーバー起動（Expo Go でスキャン）
npm test           # Jest テスト実行
npm run android    # Android エミュレータ起動
npm run ios        # iOS シミュレータ起動（macOS のみ）
npx tsc --noEmit   # TypeScript 型チェック
```

## 技術スタック

- **Expo** ~50.0.0 (managed workflow)
- **React Native** 0.73.2 / **React** 18.2.0 / **TypeScript**
- **React Navigation** v6
  - `@react-navigation/native-stack` — スタックナビゲーション
  - `@react-navigation/bottom-tabs` — 4タブ + 中央 FAB
- **expo-image-picker** — 写真ライブラリへのアクセス
- **expo-file-system** — 写真をアプリ内にコピーして永続化
- **AsyncStorage** — データの永続化
- **Jest** — ユニットテスト

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

### ディレクトリ構成

```
src/
├── constants/theme.ts         # カラーパレット（テラコッタ/クリーム）、spacing、borderRadius
├── contexts/
│   ├── CatContext.tsx         # 猫一覧・選択状態のグローバル管理
│   └── ThemeContext.tsx       # ライト/ダーク/システムテーマ
├── navigation/types.ts        # RootStackParamList, TabParamList
├── screens/
│   ├── HomeScreen.tsx         # タイムライン（猫切替チップ）
│   ├── CalendarScreen.tsx     # 月間カレンダー
│   ├── CatsScreen.tsx         # マイ猫（2カラムグリッド）
│   ├── CatProfileScreen.tsx   # 猫プロフィール（セグメント: 日記/健康/アルバム）
│   ├── CatEditScreen.tsx      # 猫追加/編集
│   ├── DiaryEntryScreen.tsx   # 日記投稿/編集
│   ├── SettingsScreen.tsx     # 設定
│   └── StatsScreen.tsx        # 統計
├── storage/
│   ├── catStorage.ts          # 猫 CRUD
│   ├── diaryStorage.ts        # 日記 CRUD
│   ├── healthStorage.ts       # 健康記録・予定 CRUD
│   ├── settingsStorage.ts     # 設定の永続化
│   └── __tests__/             # ストレージのユニットテスト
├── types/index.ts             # Cat, DiaryEntry, HealthRecord, Appointment 等
└── utils/
    ├── age.ts                 # formatCatAge（N歳Mヶ月）
    ├── export.ts              # データエクスポート
    └── notifications.ts       # リマインダー通知
App.tsx                        # ThemeProvider > CatProvider > NavigationContainer
```

## カラーパレット

```typescript
// ライトテーマ
primary: '#E0976A'       // テラコッタ
peach: '#F1D4B5'
brown: '#B08862'
background: '#FBF1E6'    // クリーム
card: '#FFFFFF'
text: '#4A3B2E'
```

## データモデル

`src/types/index.ts` が単一の情報源（source of truth）です。

- **Cat**: id, name, color, gender?, birthDate?, weightGoal?, photoUri?, createdAt
- **DiaryEntry**: id, catId?, date, title, content, mood, photoUri?, category?, favorite?, createdAt, updatedAt
- **HealthRecord**: id, catId, type (weight/vet/vaccine/medication), date, weightKg?, title?, note?, createdAt
- **Appointment**: id, catId, type (vet/vaccine), date, title, note?, done

## テスト

45 件のユニットテストがあります:
- catStorage.test.ts (9)
- diaryStorage.test.ts (9)
- healthStorage.test.ts (10)
- settingsStorage.test.ts (9)
- age.test.ts (8)

## コーディング規約

- 日本語 UI テキスト
- TypeScript strict mode
- 関数コンポーネント + Hooks
- StyleSheet.create でテーマ対応（createStyles パターン）
