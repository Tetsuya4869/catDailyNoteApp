# 猫日記 — 設計ドキュメント

> 「大切な毎日を、写真とともに。複数の猫の記録・通院管理ができる、やさしい日記アプリ。」

本ドキュメントは添付ワイヤーフレーム（`猫日記 画面構成`）に基づく **機能設計** と **画面遷移設計** を定義する。

---

## 1. コンセプト / デザイン原則

| 項目 | 内容 |
| --- | --- |
| 主役 | 日々の投稿（タイムライン）＋写真 |
| サブ | 複数猫の管理・通院/健康管理 |
| トーン | かわいい / やわらかい（角丸・余白多め・暖色） |
| 対象 | 多頭飼い・健康管理をしたい飼い主 |

### カラーパレット（PDF準拠）

| 名前 | 役割 | Light | Dark |
| --- | --- | --- | --- |
| クリーム | 背景 | `#FBF1E6` | `#1E1A16` |
| ピーチ | アクセント面・ヘッダー | `#F1D4B5` | `#3A2E24` |
| テラコッタ | プライマリ（強調・選択） | `#E0976A` | `#E0976A` |
| ブラウン | セカンダリ（カテゴリ・見出し） | `#B08862` | `#C9A079` |
| テキスト | 文字 | `#4A3B2E` | `#F0E8DF` |

### タイポグラフィ

- 見出し: Zen Maru Gothic 相当（太め・丸ゴシック）
- 本文: M PLUS Rounded 1c 相当（丸ゴシック）
- 実装上はシステムフォント＋`fontWeight`で近似（フォント同梱は次フェーズ）

---

## 2. ナビゲーション設計

### 採用案: **案A タイムライン中心**（おすすめ）

理由: 「続けやすく振り返りが楽しい」「写真投稿の動線が最短」。多頭飼い・健康管理は1階層下げて対応する。

```
┌─────────────────────────────────────────────┐
│  Bottom Tab Bar（4タブ）                      │
│  ホーム   カレンダー   マイ猫   設定          │
│   🏠        📅          🐈      ⚙️            │
└─────────────────────────────────────────────┘
              ＋ 新規投稿（中央FAB → モーダル）
```

- **新規投稿**は全タブ共通のFAB（中央）からモーダルで起動する。
- 健康記録は「マイ猫 → 猫プロフィール → 健康」タブからアクセス（案Aの「猫ごとの管理は1階層深い」をプロフィール内セグメントで吸収）。

---

## 3. サイトマップ（画面階層）

```
ホーム (Home / Timeline)
├─ タイムライン（日記一覧・猫切替・写真フィード）
├─ 投稿の詳細（DiaryEntry 詳細）
│   └─ 写真の拡大（PhotoViewer）
└─ フィルタ（猫・タグ）

カレンダー (Calendar)
├─ 月表示（写真サムネ・記録のある日）
├─ 日別の記録（その日の投稿一覧）
├─ 予定（通院・ワクチン）
└─ リマインド設定

マイ猫 (MyCats)
├─ 猫の一覧
├─ 猫プロフィール（基本情報 ＋ セグメント）
│   ├─ 日記（その子の投稿）
│   ├─ 健康（体重グラフ ＋ 通院/ワクチン/投薬履歴）
│   └─ アルバム（写真グリッド）
└─ 猫の追加 / 編集

設定 (Settings) ＝ 共通/設定
├─ ＋新規投稿（モーダル：写真・メモ・猫タグ・カテゴリ）
├─ 通知 / リマインド
├─ バックアップ・共有（エクスポート/インポート）
├─ 統計（旧Statsタブを内包）
└─ テーマ / アカウント
```

---

## 4. 画面遷移設計

### ナビゲーション構造（React Navigation）

```
RootStack (NativeStack)
├─ MainTabs (BottomTab)
│   ├─ Home        → TimelineScreen
│   ├─ Calendar    → CalendarScreen
│   ├─ MyCats      → CatsScreen
│   └─ Settings    → SettingsScreen
├─ CatProfile   { catId }            … マイ猫の詳細（セグメント: 日記/健康/アルバム）
├─ DiaryEntry   { id?, catId? }      … 投稿の詳細・編集（presentation: card）
├─ NewPost      { catId? }           … 新規投稿（presentation: modal）
├─ CatEdit      { id? }              … 猫の追加/編集（presentation: modal）
├─ HealthRecordEdit { catId, type }  … 健康記録の追加（presentation: modal）
├─ DayDetail    { date }             … カレンダー日別
└─ PhotoViewer  { uri }              … 写真拡大（presentation: transparentModal）
```

### 主要フロー

**投稿フロー（最短動線）**
```
任意タブ → ＋FAB → NewPost(modal)
  → 写真選択 → メモ入力 → 猫タグ/カテゴリ付け → 保存 → タイムラインへ反映
```

**健康管理フロー**
```
マイ猫 → 猫プロフィール → [健康]セグメント
  → 体重グラフ確認 / ＋記録 → HealthRecordEdit(modal)
  （type: weight | vet | vaccine | medication）
```

**振り返りフロー**
```
カレンダー → 記録のある日タップ → DayDetail → 投稿の詳細 → 写真拡大
```

---

## 5. データモデル（機能設計）

```ts
// 猫
interface Cat {
  id: string;
  name: string;
  color: CatColor;
  gender?: 'male' | 'female' | 'unknown';
  birthDate?: string;        // 年齢算出に使用
  weightGoal?: number;       // 任意
  photoUri?: string;
  createdAt: string;
}

// 日記（投稿）
interface DiaryEntry {
  id: string;
  catId?: string;            // 猫タグ
  date: string;
  title: string;
  content: string;
  mood: CatMood;
  photoUri?: string;
  category?: PostCategory;   // ごはん/あそび/通院 等
  favorite?: boolean;
  createdAt: string;
  updatedAt: string;
}

// 健康記録（新規）
type HealthType = 'weight' | 'vet' | 'vaccine' | 'medication';
interface HealthRecord {
  id: string;
  catId: string;
  type: HealthType;
  date: string;
  weightKg?: number;         // type=weight
  title?: string;            // 通院名/ワクチン名/薬名
  note?: string;
  createdAt: string;
}

// 予定（新規・通院/ワクチンのリマインド）
interface Appointment {
  id: string;
  catId: string;
  type: 'vet' | 'vaccine';
  date: string;
  title: string;
  note?: string;
  done: boolean;
}

// カテゴリ（投稿タグ）
type PostCategory = 'meal' | 'play' | 'sleep' | 'health' | 'grooming' | 'other';
```

### ストレージ構成（AsyncStorage）

| キー | 内容 |
| --- | --- |
| `@cat_diary_entries` | DiaryEntry[] |
| `@cat_diary_cats` | Cat[] |
| `@cat_diary_health` | HealthRecord[] |
| `@cat_diary_appointments` | Appointment[] |
| `@cat_diary_settings` | テーマ・リマインダー |

---

## 6. 実装フェーズ

| フェーズ | 内容 | 状態 |
| --- | --- | --- |
| 1 | 設計ドキュメント・カラーパレット・データモデル・ナビ再構築（案A） | 着手 |
| 2 | タイムライン（猫切替フィード）・新規投稿モーダル高精細化 | 予定 |
| 3 | 猫プロフィール（セグメント: 日記/健康/アルバム） | 予定 |
| 4 | 健康記録（体重グラフ・通院/ワクチン/投薬・予定リマインド） | 予定 |
| 5 | カレンダー写真サムネ・日別詳細・写真拡大 | 予定 |

---

_最終更新: 2026-06-20 — 添付ワイヤーフレームに基づく再設計_
