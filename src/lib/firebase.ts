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

const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY || '',
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN || '',
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID || '',
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET || '',
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || '',
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID || '',
};

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
