import AsyncStorage from '@react-native-async-storage/async-storage';
import { initializeApp, getApp, getApps } from 'firebase/app';
import * as firebaseAuth from 'firebase/auth';
import { initializeAuth, getAuth, Auth, Persistence } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

// getReactNativePersistence は react-native ビルドにのみ存在し、
// 公開型定義に含まれていないため型を補って参照する
const { getReactNativePersistence } = firebaseAuth as unknown as {
  getReactNativePersistence?: (storage: unknown) => Persistence;
};

const envConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY || '',
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN || '',
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID || '',
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET || '',
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || '',
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID || '',
};

// 認証・Firestore・Storage を動かすのに最低限必要な値が揃っているか
export const isFirebaseConfigured = Boolean(
  envConfig.apiKey && envConfig.projectId && envConfig.appId
);

// 未設定でも SDK の初期化自体は成功させ、アプリをクラッシュさせずに
// ローカル（端末内のみ）動作へフォールバックできるようにする。
// このダミー値ではネットワーク呼び出しは必ず失敗するが、各 storage 層が
// try/catch でキャッシュ + pending ops に退避するため動作は継続する。
const placeholderConfig = {
  apiKey: 'AIzaSyLOCALONLYPLACEHOLDERKEY0000000000000',
  authDomain: 'localhost',
  projectId: 'cat-daily-note-local',
  storageBucket: 'cat-daily-note-local.appspot.com',
  messagingSenderId: '000000000000',
  appId: '1:000000000000:web:0000000000000000000000',
};

const firebaseConfig = isFirebaseConfigured ? envConfig : placeholderConfig;

// Fast Refresh で initializeApp が二重に走らないようにする
const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

// React Native では AsyncStorage 永続化で initializeAuth する。
// getReactNativePersistence が無い環境（Web プレビュー等）では
// 既定の永続化で getAuth にフォールバックする。
let authInstance: Auth;
if (typeof getReactNativePersistence === 'function') {
  authInstance = initializeAuth(app, {
    persistence: getReactNativePersistence(AsyncStorage),
  });
} else {
  authInstance = getAuth(app);
}

export const auth = authInstance;
export const db = getFirestore(app);
export const storage = getStorage(app);
