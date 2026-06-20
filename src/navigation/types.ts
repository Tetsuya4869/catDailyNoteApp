// フェーズ1で実装済みのルート。完全な目標構成は DESIGN.md を参照。
export type RootStackParamList = {
  MainTabs: undefined;
  CatProfile: { catId: string };
  DiaryEntry: { id?: string; catId?: string };
  NewPost: undefined; // 中央FAB用ダミー（tabBarButtonで横取り）
  CatEdit: { id?: string };
  Stats: undefined;
};

// 案A タイムライン中心: 4タブ ＋ 中央の新規投稿ボタン
export type TabParamList = {
  Home: undefined;
  Calendar: undefined;
  NewPost: undefined;
  MyCats: undefined;
  Settings: undefined;
};
