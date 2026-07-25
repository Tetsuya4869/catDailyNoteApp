import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  ReactNode,
} from 'react';
import { Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as WebBrowser from 'expo-web-browser';
import * as Google from 'expo-auth-session/providers/google';
import {
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithCredential,
  signOut as firebaseSignOut,
} from 'firebase/auth';
import { auth, isFirebaseConfigured } from '../lib/firebase';
import { isMigrationNeeded, migrateLocalData } from '../lib/migration';

WebBrowser.maybeCompleteAuthSession();

// Firebase 未設定時に使うローカル専用ユーザー。
// クラウド同期はされず、データは端末内（AsyncStorage）にのみ保存される。
const LOCAL_USER_KEY = '@cat_diary_local_user';
const LOCAL_USER: AppUser = {
  id: 'local-user',
  displayName: 'ローカルユーザー',
};

// 画面側が特定の認証 SDK に依存しないよう、アプリ独自のユーザー型を公開する
export type AppUser = {
  id: string;
  email?: string;
  displayName?: string;
  photoUrl?: string;
};

type AuthContextType = {
  user: AppUser | null;
  loading: boolean;
  /** Firebase 未設定のため端末内のみで動作しているか */
  isLocalMode: boolean;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  isLocalMode: false,
  signInWithGoogle: async () => {},
  signOut: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);
  const isLocalMode = !isFirebaseConfigured;

  // Google OAuth で id_token を取得し、Firebase Auth に引き渡す
  const [request, response, promptAsync] = Google.useIdTokenAuthRequest({
    clientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID || '',
    iosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID || undefined,
    androidClientId:
      process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID || undefined,
  });

  useEffect(() => {
    // ローカルモードでは Firebase Auth を使わず、保存済みのローカルユーザーを復元する
    if (isLocalMode) {
      let cancelled = false;
      (async () => {
        try {
          const saved = await AsyncStorage.getItem(LOCAL_USER_KEY);
          if (!cancelled && saved) setUser(JSON.parse(saved));
        } catch (err) {
          console.error('Failed to restore local user:', err);
        } finally {
          if (!cancelled) setLoading(false);
        }
      })();
      return () => {
        cancelled = true;
      };
    }

    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      if (firebaseUser) {
        setUser({
          id: firebaseUser.uid,
          email: firebaseUser.email ?? undefined,
          displayName: firebaseUser.displayName ?? undefined,
          photoUrl: firebaseUser.photoURL ?? undefined,
        });
      } else {
        setUser(null);
      }
      setLoading(false);
    });
    return unsubscribe;
  }, [isLocalMode]);

  useEffect(() => {
    if (response?.type === 'success') {
      const idToken = response.params?.id_token;
      if (!idToken) {
        Alert.alert('エラー', 'Google 認証情報を取得できませんでした');
        return;
      }
      const credential = GoogleAuthProvider.credential(idToken);
      signInWithCredential(auth, credential).catch((err) => {
        console.error('Firebase sign-in failed:', err);
        Alert.alert('エラー', 'ログインに失敗しました');
      });
    } else if (response?.type === 'error') {
      Alert.alert('エラー', 'Google ログインに失敗しました');
    }
  }, [response]);

  // 初回ログイン時にローカルデータを Firestore へ移行
  useEffect(() => {
    // ローカルモードでは移行先の Firestore が無いので何もしない
    if (isLocalMode) return;
    if (user?.id) {
      (async () => {
        try {
          const needsMigration = await isMigrationNeeded();
          if (needsMigration) {
            const result = await migrateLocalData(user.id);
            if (!result.success && result.errors.length > 0) {
              Alert.alert(
                'データ移行',
                `${result.errors.length}件のエラーがありました。一部のデータは後で再試行できます。`
              );
            }
          }
        } catch (err) {
          console.error('Migration check failed:', err);
        }
      })();
    }
  }, [user?.id]);

  const signInWithGoogle = useCallback(async () => {
    // ローカルモード: 認証プロバイダを介さず端末内ユーザーで開始する
    if (isLocalMode) {
      try {
        await AsyncStorage.setItem(LOCAL_USER_KEY, JSON.stringify(LOCAL_USER));
        setUser(LOCAL_USER);
      } catch (error) {
        Alert.alert('エラー', 'ローカルユーザーの保存に失敗しました');
        console.error(error);
      }
      return;
    }

    try {
      if (!request) {
        Alert.alert('エラー', 'ログインの準備中です。少し待って再試行してください');
        return;
      }
      await promptAsync();
    } catch (error) {
      Alert.alert('エラー', 'ログインに失敗しました');
      console.error(error);
    }
  }, [isLocalMode, request, promptAsync]);

  const signOut = useCallback(async () => {
    try {
      if (isLocalMode) {
        await AsyncStorage.removeItem(LOCAL_USER_KEY);
        setUser(null);
        return;
      }
      await firebaseSignOut(auth);
    } catch (error) {
      Alert.alert('エラー', 'ログアウトに失敗しました');
      console.error(error);
    }
  }, [isLocalMode]);

  return (
    <AuthContext.Provider
      value={{ user, loading, isLocalMode, signInWithGoogle, signOut }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
