# 猫日記アプリ システムアーキテクチャ設計書

## 1. 概要

猫の日記・健康記録・写真を管理するモバイルアプリのバックエンド構成とサービス展開計画。

### 1.1 技術スタック

| レイヤー | 技術 | 備考 |
|----------|------|------|
| フロントエンド | React Native (Expo) | iOS/Android対応 |
| バックエンド | Supabase (BaaS) | PostgreSQL + Auth + Storage |
| CDN | Cloudflare | 画像キャッシュ・DNS |
| Push通知 | Expo Push Notifications | 無料 |
| ビルド | EAS Build | 無料枠あり |

---

## 2. システム構成図

### 2.1 全体アーキテクチャ

```mermaid
flowchart TB
    subgraph Client["クライアント"]
        iOS[iOS App]
        Android[Android App]
    end

    subgraph CDN["Cloudflare (無料)"]
        DNS[DNS]
        Cache[CDN Cache]
        Workers[Workers<br/>画像リサイズ]
    end

    subgraph Supabase["Supabase (Free Tier)"]
        Auth[Auth<br/>認証]
        API[PostgREST<br/>REST API]
        Realtime[Realtime<br/>リアルタイム同期]
        Storage[Storage<br/>写真保存]
        DB[(PostgreSQL<br/>データベース)]
        Edge[Edge Functions<br/>カスタムロジック]
    end

    subgraph External["外部サービス"]
        ExpoPush[Expo Push<br/>通知サービス]
        OAuth[OAuth Providers<br/>Google/Apple]
    end

    iOS --> DNS
    Android --> DNS
    DNS --> Cache
    Cache --> API
    Cache --> Storage
    Workers --> Storage
    
    API --> DB
    Auth --> DB
    Auth --> OAuth
    Edge --> DB
    Edge --> ExpoPush
    Realtime --> DB
```

### 2.2 認証フロー

```mermaid
sequenceDiagram
    participant User as ユーザー
    participant App as アプリ
    participant Auth as Supabase Auth
    participant OAuth as OAuth Provider
    participant DB as PostgreSQL

    User->>App: ログインボタン押下
    App->>Auth: signInWithOAuth()
    Auth->>OAuth: 認証リクエスト
    OAuth->>User: 認証画面表示
    User->>OAuth: 認証情報入力
    OAuth->>Auth: アクセストークン
    Auth->>DB: ユーザー情報保存/更新
    Auth->>App: セッション情報
    App->>User: ホーム画面表示
```

### 2.3 データ同期フロー

```mermaid
sequenceDiagram
    participant App as アプリ
    participant Local as AsyncStorage
    participant API as Supabase API
    participant DB as PostgreSQL
    participant Other as 他デバイス

    Note over App,Other: オンライン時
    App->>API: データ更新
    API->>DB: INSERT/UPDATE
    DB->>Other: Realtime通知
    Other->>Other: UI更新

    Note over App,Local: オフライン時
    App->>Local: ローカル保存
    App->>App: オフラインキュー追加
    
    Note over App,DB: オンライン復帰時
    App->>API: キュー内データ送信
    API->>DB: 一括同期
    DB->>App: 最新データ取得
```

---

## 3. データベース設計

### 3.1 ER図

```mermaid
erDiagram
    users ||--o{ cats : "owns"
    users ||--o{ user_settings : "has"
    cats ||--o{ diary_entries : "has"
    cats ||--o{ health_records : "has"
    cats ||--o{ appointments : "has"
    diary_entries ||--o{ photos : "contains"

    users {
        uuid id PK
        string email UK
        string display_name
        string avatar_url
        timestamp created_at
        timestamp updated_at
    }

    cats {
        uuid id PK
        uuid user_id FK
        string name
        string color
        date birth_date
        string gender
        string photo_url
        timestamp created_at
        timestamp updated_at
    }

    diary_entries {
        uuid id PK
        uuid user_id FK
        uuid cat_id FK
        date date
        text content
        smallint mood
        string category
        decimal weight
        boolean is_favorite
        timestamp created_at
        timestamp updated_at
    }

    health_records {
        uuid id PK
        uuid user_id FK
        uuid cat_id FK
        date date
        string type
        string value
        text notes
        timestamp created_at
    }

    appointments {
        uuid id PK
        uuid user_id FK
        uuid cat_id FK
        timestamp datetime
        string type
        string title
        text notes
        boolean is_completed
        timestamp created_at
    }

    photos {
        uuid id PK
        uuid entry_id FK
        string storage_path
        int width
        int height
        int size_bytes
        timestamp created_at
    }

    user_settings {
        uuid id PK
        uuid user_id FK
        string theme
        boolean reminder_enabled
        time reminder_time
        jsonb notification_settings
        timestamp updated_at
    }
```

### 3.2 テーブル定義詳細

```sql
-- ユーザー拡張情報（auth.usersを拡張）
create table public.profiles (
    id uuid references auth.users on delete cascade primary key,
    display_name text,
    avatar_url text,
    created_at timestamptz default now(),
    updated_at timestamptz default now()
);

-- 猫
create table public.cats (
    id uuid primary key default gen_random_uuid(),
    user_id uuid references auth.users on delete cascade not null,
    name text not null,
    color text not null default 'brown',
    birth_date date,
    gender text check (gender in ('male', 'female', null)),
    photo_url text,
    created_at timestamptz default now(),
    updated_at timestamptz default now()
);

-- 日記エントリ
create table public.diary_entries (
    id uuid primary key default gen_random_uuid(),
    user_id uuid references auth.users on delete cascade not null,
    cat_id uuid references public.cats on delete cascade not null,
    date date not null default current_date,
    content text,
    mood smallint check (mood between 1 and 5),
    category text,
    weight decimal(4,2),
    is_favorite boolean default false,
    created_at timestamptz default now(),
    updated_at timestamptz default now()
);

-- 写真
create table public.photos (
    id uuid primary key default gen_random_uuid(),
    entry_id uuid references public.diary_entries on delete cascade not null,
    storage_path text not null,
    width int,
    height int,
    size_bytes int,
    created_at timestamptz default now()
);

-- 健康記録
create table public.health_records (
    id uuid primary key default gen_random_uuid(),
    user_id uuid references auth.users on delete cascade not null,
    cat_id uuid references public.cats on delete cascade not null,
    date date not null default current_date,
    type text not null check (type in ('weight', 'vaccine', 'vet', 'medication', 'other')),
    value text,
    notes text,
    created_at timestamptz default now()
);

-- 予定
create table public.appointments (
    id uuid primary key default gen_random_uuid(),
    user_id uuid references auth.users on delete cascade not null,
    cat_id uuid references public.cats on delete cascade not null,
    datetime timestamptz not null,
    type text not null check (type in ('vet', 'vaccine', 'grooming', 'medication', 'other')),
    title text not null,
    notes text,
    is_completed boolean default false,
    created_at timestamptz default now()
);

-- ユーザー設定
create table public.user_settings (
    id uuid primary key default gen_random_uuid(),
    user_id uuid references auth.users on delete cascade unique not null,
    theme text default 'system' check (theme in ('light', 'dark', 'system')),
    reminder_enabled boolean default false,
    reminder_time time default '20:00',
    notification_settings jsonb default '{}',
    updated_at timestamptz default now()
);

-- インデックス
create index idx_cats_user_id on public.cats(user_id);
create index idx_diary_entries_user_id on public.diary_entries(user_id);
create index idx_diary_entries_cat_id on public.diary_entries(cat_id);
create index idx_diary_entries_date on public.diary_entries(date desc);
create index idx_health_records_cat_id on public.health_records(cat_id);
create index idx_appointments_datetime on public.appointments(datetime);
```

### 3.3 Row Level Security (RLS)

```sql
-- 全テーブルでRLS有効化
alter table public.profiles enable row level security;
alter table public.cats enable row level security;
alter table public.diary_entries enable row level security;
alter table public.photos enable row level security;
alter table public.health_records enable row level security;
alter table public.appointments enable row level security;
alter table public.user_settings enable row level security;

-- ポリシー: 自分のデータのみアクセス可能
create policy "Users can view own profile"
    on public.profiles for select using (auth.uid() = id);

create policy "Users can update own profile"
    on public.profiles for update using (auth.uid() = id);

create policy "Users can CRUD own cats"
    on public.cats for all using (auth.uid() = user_id);

create policy "Users can CRUD own diary entries"
    on public.diary_entries for all using (auth.uid() = user_id);

create policy "Users can CRUD own photos"
    on public.photos for all using (
        exists (
            select 1 from public.diary_entries
            where id = photos.entry_id and user_id = auth.uid()
        )
    );

create policy "Users can CRUD own health records"
    on public.health_records for all using (auth.uid() = user_id);

create policy "Users can CRUD own appointments"
    on public.appointments for all using (auth.uid() = user_id);

create policy "Users can CRUD own settings"
    on public.user_settings for all using (auth.uid() = user_id);
```

---

## 4. API設計

### 4.1 エンドポイント一覧

```mermaid
flowchart LR
    subgraph Auth["認証 /auth"]
        A1[POST /signup]
        A2[POST /signin]
        A3[POST /signout]
        A4[POST /oauth/google]
        A5[POST /oauth/apple]
    end

    subgraph Cats["/cats"]
        C1[GET /cats]
        C2[POST /cats]
        C3[GET /cats/:id]
        C4[PATCH /cats/:id]
        C5[DELETE /cats/:id]
    end

    subgraph Diary["/diary"]
        D1[GET /diary]
        D2[POST /diary]
        D3[GET /diary/:id]
        D4[PATCH /diary/:id]
        D5[DELETE /diary/:id]
    end

    subgraph Health["/health"]
        H1[GET /health/:catId]
        H2[POST /health]
        H3[DELETE /health/:id]
    end

    subgraph Storage["/storage"]
        S1[POST /upload]
        S2[DELETE /photos/:id]
    end
```

### 4.2 Supabase クライアント設定

```typescript
// src/lib/supabase.ts
import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import { Database } from './database.types';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
```

---

## 5. ストレージ設計

### 5.1 バケット構成

```mermaid
flowchart TB
    subgraph Storage["Supabase Storage"]
        subgraph Avatars["avatars (public)"]
            A1[user_id/avatar.jpg]
        end
        
        subgraph CatPhotos["cat-photos (public)"]
            C1[user_id/cat_id/profile.jpg]
        end
        
        subgraph DiaryPhotos["diary-photos (private)"]
            D1[user_id/entry_id/photo_1.jpg]
            D2[user_id/entry_id/photo_2.jpg]
        end
    end
```

### 5.2 ストレージポリシー

```sql
-- バケット作成
insert into storage.buckets (id, name, public) values 
    ('avatars', 'avatars', true),
    ('cat-photos', 'cat-photos', true),
    ('diary-photos', 'diary-photos', false);

-- アバター: 自分のみアップロード可、全員閲覧可
create policy "Avatar upload" on storage.objects for insert
    with check (bucket_id = 'avatars' and auth.uid()::text = (storage.foldername(name))[1]);

create policy "Avatar public read" on storage.objects for select
    using (bucket_id = 'avatars');

-- 猫写真: 自分のみCRUD可、全員閲覧可
create policy "Cat photo CRUD" on storage.objects for all
    using (bucket_id = 'cat-photos' and auth.uid()::text = (storage.foldername(name))[1]);

-- 日記写真: 自分のみCRUD可
create policy "Diary photo CRUD" on storage.objects for all
    using (bucket_id = 'diary-photos' and auth.uid()::text = (storage.foldername(name))[1]);
```

### 5.3 画像最適化パイプライン

```mermaid
flowchart LR
    A[写真選択] --> B[Expo ImageManipulator<br/>リサイズ 800px]
    B --> C[圧縮 70%<br/>JPEG変換]
    C --> D[Supabase Storage<br/>アップロード]
    D --> E[Cloudflare CDN<br/>キャッシュ]
    E --> F[クライアント表示]
    
    style B fill:#f9f,stroke:#333
    style C fill:#f9f,stroke:#333
    style E fill:#bbf,stroke:#333
```

---

## 6. コスト分析

### 6.1 Supabase料金体系

```mermaid
pie title Supabase Free Tier リソース配分
    "Database 500MB" : 500
    "Storage 1GB" : 1000
    "Bandwidth 5GB" : 5000
    "Edge Functions 500K" : 500
```

### 6.2 ユーザー規模別コスト

```mermaid
xychart-beta
    title "月額コスト推移 (USD)"
    x-axis ["100人", "500人", "1,000人", "3,000人", "5,000人", "10,000人"]
    y-axis "USD" 0 --> 100
    bar [0, 0, 0, 25, 35, 65]
```

### 6.3 詳細コスト表

| ユーザー数 | DB使用量 | Storage | 帯域 | Supabase | その他 | 月額合計 |
|------------|----------|---------|------|----------|--------|----------|
| 100人 | 5MB | 100MB | 500MB | $0 | $1 (ドメイン) | **$1** |
| 500人 | 25MB | 500MB | 2.5GB | $0 | $1 | **$1** |
| 1,000人 | 50MB | 1GB | 5GB | $0 | $1 | **$1** |
| 3,000人 | 150MB | 3GB | 15GB | $25 | $1 | **$26** |
| 5,000人 | 250MB | 5GB | 25GB | $25 + $10 | $1 | **$36** |
| 10,000人 | 500MB | 10GB | 50GB | $25 + $40 | $1 | **$66** |

### 6.4 無料枠最大化戦略

```mermaid
flowchart TB
    subgraph Optimization["コスト最適化施策"]
        O1[画像圧縮<br/>500KB→150KB]
        O2[CDNキャッシュ<br/>帯域80%削減]
        O3[遅延読み込み<br/>不要なAPI削減]
        O4[オフラインファースト<br/>同期頻度最適化]
    end

    subgraph Result["効果"]
        R1[Storage 3倍長持ち]
        R2[帯域 5倍余裕]
        R3[API呼び出し50%減]
        R4[UX向上+コスト減]
    end

    O1 --> R1
    O2 --> R2
    O3 --> R3
    O4 --> R4
```

---

## 7. セキュリティ設計

### 7.1 セキュリティレイヤー

```mermaid
flowchart TB
    subgraph Client["クライアント側"]
        C1[HTTPS通信]
        C2[セキュアストレージ<br/>トークン保存]
        C3[入力バリデーション]
    end

    subgraph Network["ネットワーク"]
        N1[Cloudflare WAF]
        N2[DDoS保護]
        N3[Rate Limiting]
    end

    subgraph Backend["バックエンド"]
        B1[JWT認証]
        B2[Row Level Security]
        B3[入力サニタイズ]
        B4[CORS設定]
    end

    subgraph Data["データ"]
        D1[暗号化保存]
        D2[バックアップ]
        D3[監査ログ]
    end

    Client --> Network --> Backend --> Data
```

### 7.2 認証フロー詳細

```mermaid
stateDiagram-v2
    [*] --> Unauthenticated
    
    Unauthenticated --> Authenticating: ログイン開始
    Authenticating --> Authenticated: 認証成功
    Authenticating --> Unauthenticated: 認証失敗
    
    Authenticated --> TokenRefresh: トークン期限切れ
    TokenRefresh --> Authenticated: リフレッシュ成功
    TokenRefresh --> Unauthenticated: リフレッシュ失敗
    
    Authenticated --> Unauthenticated: ログアウト
    Authenticated --> [*]
```

---

## 8. 通知システム

### 8.1 通知フロー

```mermaid
sequenceDiagram
    participant Scheduler as Supabase Cron
    participant Edge as Edge Function
    participant DB as PostgreSQL
    participant Expo as Expo Push
    participant Device as デバイス

    Scheduler->>Edge: 毎日20:00実行
    Edge->>DB: リマインダー有効ユーザー取得
    DB->>Edge: ユーザーリスト + push_token
    
    loop 各ユーザー
        Edge->>DB: 今日の日記有無確認
        alt 日記なし
            Edge->>Expo: Push通知送信
            Expo->>Device: 通知表示
        end
    end
```

### 8.2 通知種別

| 種別 | トリガー | 内容 |
|------|----------|------|
| 日記リマインダー | 毎日指定時刻 | 「今日の猫日記を書きましょう」 |
| 予定通知 | 予定日時の1日前/1時間前 | 「明日は〇〇の予定があります」 |
| 健康記録 | 体重未記録7日経過 | 「〇〇ちゃんの体重を記録しましょう」 |

---

## 9. デプロイメント

### 9.1 CI/CDパイプライン

```mermaid
flowchart LR
    subgraph Dev["開発"]
        D1[ローカル開発]
        D2[Git Push]
    end

    subgraph CI["GitHub Actions"]
        C1[Lint & Type Check]
        C2[Unit Tests]
        C3[E2E Tests]
    end

    subgraph Build["EAS Build"]
        B1[iOS Build]
        B2[Android Build]
    end

    subgraph Deploy["デプロイ"]
        P1[TestFlight]
        P2[Play Console]
        P3[App Store]
        P4[Google Play]
    end

    D1 --> D2 --> C1 --> C2 --> C3
    C3 --> B1 --> P1 --> P3
    C3 --> B2 --> P2 --> P4
```

### 9.2 環境構成

```mermaid
flowchart TB
    subgraph Environments["環境"]
        Dev[Development<br/>ローカル]
        Staging[Staging<br/>テスト用]
        Prod[Production<br/>本番]
    end

    subgraph Supabase["Supabase Projects"]
        S1[catdiary-dev]
        S2[catdiary-staging]
        S3[catdiary-prod]
    end

    Dev --> S1
    Staging --> S2
    Prod --> S3
```

---

## 10. 監視・運用

### 10.1 監視項目

```mermaid
flowchart TB
    subgraph Metrics["メトリクス"]
        M1[API応答時間]
        M2[エラー率]
        M3[アクティブユーザー]
        M4[ストレージ使用量]
    end

    subgraph Alerts["アラート"]
        A1[エラー率 > 1%]
        A2[応答時間 > 3秒]
        A3[ストレージ > 80%]
    end

    subgraph Actions["対応"]
        R1[調査開始]
        R2[スケールアップ検討]
        R3[クリーンアップ実行]
    end

    M1 --> A2 --> R1
    M2 --> A1 --> R1
    M4 --> A3 --> R3
```

### 10.2 ダッシュボード

- **Supabase Dashboard**: DB/Storage/Auth メトリクス
- **Cloudflare Analytics**: CDNヒット率、帯域
- **Expo Dashboard**: Push通知配信率
- **Sentry**: エラー追跡（無料枠あり）

---

## 11. マイルストーン

```mermaid
gantt
    title 開発ロードマップ
    dateFormat  YYYY-MM-DD
    
    section Phase 1: 基盤
    Supabaseセットアップ     :2024-01-01, 2d
    DBスキーマ作成           :2024-01-03, 2d
    認証実装                 :2024-01-05, 3d
    
    section Phase 2: コア機能
    猫CRUD API連携           :2024-01-08, 3d
    日記CRUD API連携         :2024-01-11, 3d
    写真アップロード         :2024-01-14, 2d
    
    section Phase 3: 同期
    オフライン対応           :2024-01-16, 3d
    リアルタイム同期         :2024-01-19, 2d
    
    section Phase 4: 通知
    Push通知実装             :2024-01-21, 2d
    リマインダー機能         :2024-01-23, 2d
    
    section Phase 5: リリース
    テスト・修正             :2024-01-25, 5d
    ストア申請               :2024-01-30, 3d
```

---

## 12. 参考リンク

- [Supabase Documentation](https://supabase.com/docs)
- [Expo Documentation](https://docs.expo.dev)
- [React Navigation](https://reactnavigation.org/docs/getting-started)
- [Cloudflare Workers](https://developers.cloudflare.com/workers/)

---

## 付録: 環境変数

```bash
# .env.local (開発用)
EXPO_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJxxxxx

# EAS Secrets (本番用)
# eas secret:create --name SUPABASE_URL --value "https://xxxxx.supabase.co"
# eas secret:create --name SUPABASE_ANON_KEY --value "eyJxxxxx"
```
