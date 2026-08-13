# Supabase セットアップ

このアプリは **ローカル優先 / Supabase任意** です。環境変数が未設定なら従来どおりAsyncStorageだけで動きます。

## 1. Supabaseプロジェクトを作る

Supabase Dashboardでプロジェクトを作成し、SQL EditorまたはSupabase CLIで `supabase/migrations/001_initial.sql` を適用します。

このMigrationは以下を作成します。

- `cats`
- `diary_entries`
- `health_records`
- `appointments`
- 全テーブルのRow Level Security
- `cat-media` Storage bucketとユーザー別Storage policy

## 2. Anonymous Sign-Insを有効化

Authentication設定で Anonymous Sign-Ins を有効化します。

アプリは初回起動時に匿名ユーザーを作成し、そのセッションをAsyncStorageへ保存します。既存セッションはrefresh tokenで更新されます。

> 匿名アカウントは端末データを消すと復旧できません。将来的にApple/Google/email等へリンクする場合は、同じSupabase userへIdentityを追加してください。

## 3. Expo環境変数

`.env.example` を `.env` にコピーして設定します。

```env
EXPO_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=YOUR_PUBLISHABLE_OR_ANON_KEY
```

service_role keyは絶対にアプリへ入れないでください。

## 4. 同期動作

起動時:

1. ローカルストレージを利用可能な状態で開始
2. Supabase anonymous sessionを復元/作成
3. Repositoryを `SyncingRepository` へ切替
4. Supabase側データをローカルへmerge
5. ローカル側データをSupabaseへupsert
6. 以降の書き込みはローカルへ先に保存し、その後Supabaseへmirror

ネットワーク障害時もローカル保存は成功します。remote write失敗はconsole warningとして残り、次回の起動時syncで再送されます。

## 5. 写真

端末で選択した写真はまずアプリ管理領域へコピーされます。Supabase同期時には `cat-media/{userId}/...` へアップロードされ、DB側には公開Storage URLが保存されます。

完全バックアップv2では写真自体をBase64でJSONへ含めるため、Supabase未使用でも別端末へ復元できます。

## 6. セキュリティ

- 全ドメインテーブルは `auth.uid() = user_id` でRLS制御
- Storage write/deleteも `auth.uid()` と先頭フォルダを照合
- `service_role` はクライアントで使用しない
- Anonymous userもSupabase上では `authenticated` roleとして扱われるためRLS対象

## 7. 将来のアカウント昇格

Anonymous Authはデバイス初期化時の復元性がありません。本格運用時はApple/Google/emailをanonymous userへリンクし、同じ`user_id`を維持する設計を推奨します。
