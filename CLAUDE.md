# CLAUDE.md

Claude Code がこのプロジェクトで作業する際の指示書です。

## プロジェクト概要

猫の写真にキャプションを付けて日記形式で管理する React Native (Expo) モバイルアプリ。

## 開発コマンド

```bash
npm start          # 開発サーバー起動（Expo Go でスキャン）
npm run android    # Android エミュレータ起動
npm run ios        # iOS シミュレータ起動（macOS のみ）
```

## 技術スタック

- **Expo** ~55.0.4 (managed workflow)
- **React Native** 0.83.2 / **React** 19.2.0 / **TypeScript**
- **React Navigation** v7 — `@react-navigation/native-stack` を使用（`@react-navigation/stack` は不使用）
- **expo-image-picker** — 写真ライブラリへのアクセス
- **expo-file-system** — 写真をアプリ内にコピーして永続化
- **AsyncStorage** — エントリデータの永続化

## ディレクトリ構成

```
src/
├── types/DiaryEntry.ts        # DiaryEntry 型・RootStackParamList
├── storage/storage.ts         # AsyncStorage CRUD + ファイルコピー
├── screens/
│   ├── HomeScreen.tsx         # エントリ一覧（useFocusEffect でリロード）
│   ├── NewEntryScreen.tsx     # 写真選択 + キャプション入力
│   └── EntryDetailScreen.tsx  # 詳細表示 + 削除
└── components/
    └── EntryCard.tsx          # 一覧カードコンポーネント
App.tsx                        # NavigationContainer + Stack.Navigator
```

## コーディング規約

- 関数コンポーネント + hooks のみ使用（クラスコンポーネント不使用）
- スタイルは各ファイル末尾で `StyleSheet.create` にまとめる
- 新しい画面は `src/screens/` へ、再利用パーツは `src/components/` へ
- 型は `src/types/` で一元管理する

## データモデル

```typescript
interface DiaryEntry {
  id: string;       // Date.now() の文字列
  date: string;     // YYYY-MM-DD
  photoUri: string; // documentDirectory/photos/ 以下のローカルパス
  caption: string;
  createdAt: string;
}
```

## 注意事項

- 写真は必ず `copyPhotoToAppDir()` でアプリ内にコピーしてから保存する（一時URIは使わない）
- エントリ削除時は AsyncStorage とファイルシステムの両方を削除する（`deleteEntry()` が担当）
- パッケージ追加は `npx expo install <pkg>` を使う（SDK バージョン互換性を自動解決するため）
