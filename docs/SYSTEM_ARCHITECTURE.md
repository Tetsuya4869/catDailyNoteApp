# 猫日記アプリ システム設計書（少人数・無料運用版）

## 1. 概要

**想定規模**: 数人（家族・友人間での利用）  
**コスト目標**: 完全無料（$0/月）

---

## 2. 構成パターン比較

```mermaid
flowchart LR
    subgraph A["案A: ローカルのみ（推奨）"]
        A1[端末内完結]
        A2[バックエンド不要]
        A3[完全無料]
    end
    
    subgraph B["案B: クラウド同期"]
        B1[Supabase Free]
        B2[複数端末同期]
        B3[無料枠内]
    end
    
    A -->|シンプル| 推奨
    B -->|将来拡張| オプション
```

| 項目 | 案A: ローカルのみ | 案B: Supabase Free |
|------|-------------------|---------------------|
| 月額コスト | **$0** | **$0** |
| 複数端末同期 | ✗ | ✓ |
| データバックアップ | 手動エクスポート | 自動クラウド保存 |
| オフライン動作 | ✓ 完全対応 | ✓ 対応 |
| セットアップ難易度 | なし | 低（30分程度） |
| 推奨ユーザー | 1端末利用者 | 複数端末/家族共有 |

---

## 3. 案A: ローカルのみ（現在の実装・推奨）

### 3.1 アーキテクチャ

```mermaid
flowchart TB
    subgraph Device["端末"]
        App[React Native App]
        Storage[(AsyncStorage)]
        Photos[expo-file-system<br/>写真ファイル]
    end
    
    App --> Storage
    App --> Photos
    
    subgraph Distribution["配布方法"]
        ExpoGo[Expo Go<br/>QRコード]
        APK[APK直接配布<br/>Android]
        TestFlight[TestFlight<br/>iOS]
    end
```

### 3.2 データ保存

| データ | 保存先 | 容量目安 |
|--------|--------|----------|
| 猫情報 | AsyncStorage | 数KB |
| 日記 | AsyncStorage | 〜1MB（1000件） |
| 健康記録 | AsyncStorage | 〜100KB |
| 写真 | expo-file-system | 端末ストレージ依存 |

### 3.3 バックアップ方法

```mermaid
sequenceDiagram
    participant User as ユーザー
    participant App as アプリ
    participant Share as 共有シート

    User->>App: 設定 → エクスポート
    App->>App: JSON生成
    App->>Share: 共有シート表示
    Share->>User: ファイル保存/送信
    
    Note over User,Share: iCloud/Google Drive/<br/>メール等で保存可能
```

**実装済み機能**:
- `src/utils/export.ts` — JSON形式でエクスポート/インポート
- 設定画面 → 統計 → エクスポート/インポート

### 3.4 配布方法（すべて無料）

#### Expo Go（開発・テスト用）
```bash
npm start
# → QRコードをExpo Goアプリでスキャン
```
- **メリット**: 即座に実行可能、ビルド不要
- **デメリット**: Expo Goアプリのインストールが必要

#### Android APK（本番配布）
```bash
# ローカルビルド（無料）
npx expo run:android --variant release

# または EAS Build（月30ビルドまで無料）
eas build --platform android --profile preview
```
- APKファイルを直接共有（Google Drive、メール等）
- Google Playストアは不要

#### iOS TestFlight
```bash
eas build --platform ios --profile preview
```
- Apple Developer Program ($99/年) が必要
- **無料代替**: Expo Goでの利用を継続

### 3.5 コスト内訳

| 項目 | コスト |
|------|--------|
| 開発・テスト | $0（Expo Go） |
| Android配布 | $0（APK直接） |
| iOS配布 | $0（Expo Go）または $99/年（TestFlight） |
| バックエンド | $0（なし） |
| **合計** | **$0** |

---

## 4. 案B: Supabase Free（将来オプション）

複数端末同期や自動バックアップが必要になった場合の構成。

### 4.1 アーキテクチャ

```mermaid
flowchart TB
    subgraph Devices["端末"]
        iOS[iOS]
        Android[Android]
    end
    
    subgraph Supabase["Supabase Free Tier"]
        Auth[Auth<br/>認証]
        DB[(PostgreSQL<br/>500MB)]
        Storage[Storage<br/>1GB]
    end
    
    iOS --> Auth
    Android --> Auth
    Auth --> DB
    Auth --> Storage
```

### 4.2 無料枠

| リソース | 無料枠 | 数人での消費目安 |
|----------|--------|------------------|
| Database | 500MB | 〜1%使用（5MB） |
| Storage | 1GB | 〜10%使用（100MB） |
| Auth | 50,000 MAU | 〜0.01%使用 |
| API | 500K/月 | 〜1%使用 |

**結論**: 数人なら無料枠の1%も使わない

### 4.3 移行手順（将来必要時）

```mermaid
flowchart LR
    A[案A: ローカル] -->|必要時| B[Supabase登録]
    B --> C[DB作成]
    C --> D[認証設定]
    D --> E[アプリ改修]
    E --> F[既存データ移行]
```

1. Supabaseアカウント作成（無料）
2. プロジェクト作成
3. `@supabase/supabase-js` 追加
4. 認証UI追加
5. ストレージAPIをSupabaseに切り替え
6. 既存AsyncStorageデータをインポート

**改修工数**: 約2-3日

---

## 5. 推奨プラン

```mermaid
flowchart TB
    Start[開始] --> Q1{複数端末で<br/>同期したい？}
    Q1 -->|No| A[案A: ローカルのみ]
    Q1 -->|Yes| Q2{iOSユーザー<br/>いる？}
    Q2 -->|No| B1[案A + Android APK配布]
    Q2 -->|Yes| Q3{$99/年<br/>払える？}
    Q3 -->|No| B2[案A + Expo Go利用]
    Q3 -->|Yes| B3[案A + TestFlight]
    
    A --> Done[完全無料で運用開始]
    B1 --> Done
    B2 --> Done
    B3 --> Low[$99/年のみ]
```

### 今すぐやること

1. **現状のまま使用開始**（案A）
   - バックエンド構築は不要
   - `npm start` → Expo GoでQRスキャン

2. **Android配布が必要な場合**
   ```bash
   npx expo run:android --variant release
   # 生成されたAPKをGoogle Drive等で共有
   ```

3. **データバックアップ**
   - 設定 → 統計 → エクスポート
   - JSONファイルをiCloud/Google Driveに保存

---

## 6. 展開方法（iOS/Android対応）

4つの展開方法を比較し、それぞれのアーキテクチャを示します。

### 6.1 コスト比較表

| 方式 | Android | iOS | 合計（初年度） | 適合度 |
|------|---------|-----|----------------|--------|
| Expo Go | $0 | $0 | $0 | △（通知制限） |
| APK/AdHoc | $0 | $99/年 | $99 | ○ |
| TestFlight + Internal | $25（一回） | $99/年 | $124 | ○ |
| ストア公開 | $25（一回） | $99/年 | $124 | △（過剰） |
| **推奨構成** | **$0** | **$99/年** | **$99** | **◎** |

---

### 6.2 方式1: Expo Go（開発・テスト用）

```mermaid
sequenceDiagram
    participant Dev as 開発者PC
    participant Expo as Expo Dev Server
    participant User as 配布対象者
    participant App as Expo Goアプリ

    Dev->>Expo: npx expo start
    Expo-->>Dev: QRコード生成
    Dev->>User: QRコード共有(LINE等)
    User->>App: Expo Goインストール
    App->>Expo: QRスキャン→接続
    Expo-->>App: JSバンドル配信
    App-->>User: アプリ起動
```

| 項目 | 内容 |
|------|------|
| コスト | **$0** |
| 対応OS | iOS / Android |
| 制限 | expo-notifications制限、開発者PC起動必須 |
| 適合度 | △（本アプリは通知使用のため非推奨） |

---

### 6.3 方式2: APK/AdHoc直接配布

```mermaid
flowchart TB
    subgraph Build["EAS Build"]
        A[eas build -p android<br/>--profile preview] --> B[APK生成]
        C[eas build -p ios<br/>--profile preview] --> D[IPA生成]
    end
    
    subgraph Android["Android配布（無料）"]
        B --> E[Google Drive/LINE共有]
        E --> F[提供元不明許可]
        F --> G[インストール完了]
    end
    
    subgraph iOS["iOS配布（$99/年）"]
        D --> H[UDID収集]
        H --> I[AdHocプロファイル作成]
        I --> J[Diawi等でホスト]
        J --> K[インストール完了]
    end
```

| 項目 | Android | iOS |
|------|---------|-----|
| コスト | **$0** | **$99/年** |
| 手順 | APK共有→即インストール | UDID収集→プロファイル作成→共有 |
| 制限 | 「提供元不明」許可必要 | 最大100台、UDID管理必要 |

---

### 6.4 方式3: TestFlight + Internal Testing

```mermaid
flowchart LR
    subgraph Build["ビルド"]
        A[eas build] --> B{OS}
        B -->|iOS| C[IPA]
        B -->|Android| D[AAB]
    end
    
    subgraph Submit["提出"]
        C --> E[eas submit -p ios]
        D --> F[eas submit -p android]
        E --> G[TestFlight]
        F --> H[Internal Testing]
    end
    
    subgraph Invite["招待"]
        G --> I[メールで招待]
        H --> J[Googleアカウント追加]
    end
    
    subgraph Install["インストール"]
        I --> K[TestFlightアプリから]
        J --> L[Play Storeから]
    end
```

| 項目 | iOS | Android |
|------|-----|---------|
| コスト | **$99/年** | **$25（一回）** |
| プラットフォーム | TestFlight | Google Play Internal Testing |
| メリット | UDID不要、OTAアップデート | 正規ルート配布 |

---

### 6.5 方式4: ストア公開

```mermaid
flowchart TB
    subgraph Prep["準備"]
        A[アイコン1024x1024] --> B[スクリーンショット]
        B --> C[プライバシーポリシー]
        C --> D[メタデータ入力]
    end
    
    subgraph Build["ビルド・提出"]
        D --> E[eas build --profile production]
        E --> F[eas submit]
    end
    
    subgraph Review["審査"]
        F --> G{審査}
        G -->|Apple| H[1-7日]
        G -->|Google| I[数時間-3日]
    end
    
    subgraph Release["公開"]
        H --> J[App Store]
        I --> K[Google Play]
        J --> L[一般ユーザー]
        K --> L
    end
```

| 項目 | 費用 |
|------|------|
| Apple Developer | $99/年 |
| Google Play | $25（一回） |
| 初年度合計 | 約$124（約18,750円） |
| 適合度 | △（数人向けには過剰） |

---

### 6.6 推奨構成: Android APK + iOS TestFlight

```mermaid
flowchart LR
    subgraph Setup["初期セットアップ"]
        A[Apple Developer登録<br/>$99/年] --> B[eas.json作成]
        B --> C[アイコン画像準備]
    end
    
    subgraph Android["Android（無料）"]
        D[eas build -p android<br/>--profile preview] --> E[APK]
        E --> F[Google Drive共有]
        F --> G[Androidユーザー]
    end
    
    subgraph iOS["iOS（$99/年）"]
        H[eas build -p ios<br/>--profile production] --> I[eas submit]
        I --> J[TestFlight招待]
        J --> K[iOSユーザー]
    end
    
    Setup --> Android
    Setup --> iOS
```

**年間コスト: $99（約15,000円）** — iOSを含む配布の最小コスト

---

## 7. FAQ

### Q: 端末を変えたらデータは消える？
**A**: はい。エクスポート機能で事前にバックアップし、新端末でインポートしてください。

### Q: 家族で猫の記録を共有したい
**A**: 案Bへの移行を検討。または、エクスポートしたJSONファイルを定期的に共有する運用でも可。

### Q: iPhoneで使いたいが$99払いたくない
**A**: Expo Goアプリ経由で利用可能。App Storeには出せないが、機能は同じ。

### Q: 将来ユーザーが増えたら？
**A**: 案Bに移行。Supabase無料枠は50,000MAUまで対応。それ以上なら$25/月〜。

---

## 付録: 現在の実装状態

| 機能 | 状態 | 備考 |
|------|------|------|
| 猫管理 | ✅ 実装済 | CRUD完備 |
| 日記投稿 | ✅ 実装済 | 写真・気分・カテゴリ |
| 健康記録 | ✅ 実装済 | 体重・通院・ワクチン |
| カレンダー | ✅ 実装済 | 月間表示 |
| 統計 | ✅ 実装済 | 気分分布・連続記録 |
| エクスポート | ✅ 実装済 | JSON形式 |
| インポート | ✅ 実装済 | JSON形式 |
| ダークモード | ✅ 実装済 | システム連動 |
| リマインダー | ✅ 実装済 | 通知 |
| **認証** | ❌ 未実装 | 案Aでは不要 |
| **クラウド同期** | ❌ 未実装 | 案Aでは不要 |

**結論**: 案A（ローカルのみ）で必要な機能はすべて実装済み。すぐに利用開始可能。
