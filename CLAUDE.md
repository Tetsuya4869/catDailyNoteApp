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
- **Firebase** — Auth（Google ログイン）・Cloud Firestore・Cloud Storage（写真）
- **@react-native-community/netinfo** — オンライン/オフライン検知
- **expo-image-picker** — 写真ライブラリへのアクセス
- **expo-image-manipulator** — アップロード前の写真リサイズ（長辺1920px）
- **expo-notifications** — 日記リマインダー・予定通知
- **AsyncStorage** — オフラインキャッシュ + pending ops キュー
- **Jest** — ユニットテスト

## データ同期（オフラインファースト）

- 各 storage 関数は `userId` を受け取り、オンライン時は Firestore と同期、オフライン時は AsyncStorage キャッシュを使用
- オフライン中の変更は pending ops キューに積まれ、オンライン復帰時に `SyncStatusBanner` が自動同期
- 初回ログイン時に `src/lib/migration.ts` がローカルデータを Firestore へ移行
- Firestore は各ドキュメントの `userId` フィールドで所有者を管理（`firebase/firestore.rules` で強制）
- 写真は Firebase Storage にアップロードし、ダウンロード URL を `photoUri` として保存

## アーキテクチャ

### ナビゲーション構造（Plan A: タイムライン中心）

```
Login (未ログイン時) — Google ログイン

MainTabs (BottomTabNavigator)
├── ホーム     — タイムライン（猫切替チップ・直近予定バナー付き）
├── カレンダー — 月間カレンダー（同日複数日記はパネル表示）
├── [中央FAB]  — 新規投稿モーダル
├── マイ猫    — 猫一覧（2カラムグリッド）
└── 設定      — アカウント・テーマ・リマインダー・統計への導線

Stack (モーダル/詳細)
├── CatProfile  — 猫プロフィール（日記/健康/アルバム セグメント）
├── DiaryEntry  — 日記投稿/編集（カテゴリタグ・未保存ガード・削除Undo）
├── CatEdit     — 猫追加/編集/削除
├── HealthEntry — 健康記録・予定の追加（mode: 'record' | 'appointment'）
└── Stats       — 統計（猫別切替・エクスポート/インポート）
```

### ディレクトリ構成

```
src/
├── components/
│   └── SyncStatusBanner.tsx   # オフライン/同期中/同期完了バナー + 自動同期
├── constants/theme.ts         # カラーパレット（テラコッタ/クリーム）、spacing、borderRadius
├── contexts/
│   ├── AuthContext.tsx        # Firebase Auth（Google ログイン）・セッション管理
│   ├── CatContext.tsx         # 猫一覧・選択状態のグローバル管理
│   ├── SnackbarContext.tsx    # スナックバー（削除Undo等）
│   └── ThemeContext.tsx       # ライト/ダーク/システムテーマ
├── lib/
│   ├── firebase.ts            # Firebase 初期化（Auth/Firestore/Storage）
│   ├── database.types.ts      # Firestore ドキュメント型（DbCat 等）+ COLLECTIONS
│   ├── syncService.ts         # isOnline、App↔Firestore マッパー、型検証
│   ├── photoStorage.ts        # Firebase Storage への写真アップロード
│   └── migration.ts           # 初回ログイン時のローカル→Firestore 移行
├── navigation/types.ts        # RootStackParamList, TabParamList
├── screens/
│   ├── LoginScreen.tsx        # Google ログイン
│   ├── HomeScreen.tsx         # タイムライン（猫切替チップ・予定バナー）
│   ├── CalendarScreen.tsx     # 月間カレンダー
│   ├── CatsScreen.tsx         # マイ猫（2カラムグリッド）
│   ├── CatProfileScreen.tsx   # 猫プロフィール（日記/健康+予定/アルバム）
│   ├── CatEditScreen.tsx      # 猫追加/編集/削除
│   ├── DiaryEntryScreen.tsx   # 日記投稿/編集
│   ├── HealthEntryScreen.tsx  # 健康記録・予定の追加
│   ├── SettingsScreen.tsx     # 設定
│   └── StatsScreen.tsx        # 統計
├── storage/
│   ├── catStorage.ts          # 猫 CRUD（Firestore 同期 + キャッシュ）
│   ├── diaryStorage.ts        # 日記 CRUD（同上）
│   ├── healthStorage.ts       # 健康記録・予定 CRUD（同上）
│   ├── settingsStorage.ts     # 設定の永続化（ローカルのみ）
│   └── __tests__/             # ストレージのユニットテスト
├── types/index.ts             # Cat, DiaryEntry, HealthRecord, Appointment 等
└── utils/
    ├── age.ts                 # formatCatAge（N歳Mヶ月）
    ├── export.ts              # データエクスポート/インポート
    ├── image.ts               # resizeImage（アップロード前圧縮）
    └── notifications.ts       # 日記リマインダー・予定通知
firebase/                      # Firestore / Storage セキュリティルール
App.tsx                        # ThemeProvider > AuthProvider > CatProvider > Navigation
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
