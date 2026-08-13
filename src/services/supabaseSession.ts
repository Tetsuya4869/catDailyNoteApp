import AsyncStorage from '@react-native-async-storage/async-storage';
import { configureSupabaseSession, syncSupabaseNow, useLocalRepository } from '../repositories';

declare const process: { env: Record<string, string | undefined> };

const SESSION_KEY = '@cat_diary_supabase_session';

type StoredSession = {
  accessToken: string;
  refreshToken: string;
  userId: string;
  expiresAt: number;
};

type AuthPayload = {
  access_token?: string;
  refresh_token?: string;
  expires_in?: number;
  user?: { id?: string };
  session?: {
    access_token?: string;
    refresh_token?: string;
    expires_in?: number;
    user?: { id?: string };
  };
};

function getConfig() {
  const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
  return url && anonKey ? { url: url.replace(/\/$/, ''), anonKey } : null;
}

function parseAuthPayload(payload: AuthPayload): StoredSession | null {
  const accessToken = payload.access_token ?? payload.session?.access_token;
  const refreshToken = payload.refresh_token ?? payload.session?.refresh_token;
  const expiresIn = payload.expires_in ?? payload.session?.expires_in ?? 3600;
  const userId = payload.user?.id ?? payload.session?.user?.id;
  if (!accessToken || !refreshToken || !userId) return null;
  return { accessToken, refreshToken, userId, expiresAt: Date.now() + expiresIn * 1000 };
}

async function authRequest(path: string, body: unknown): Promise<StoredSession> {
  const config = getConfig();
  if (!config) throw new Error('Supabase environment variables are not configured');
  const response = await fetch(`${config.url}/auth/v1/${path}`, {
    method: 'POST',
    headers: { apikey: config.anonKey, Authorization: `Bearer ${config.anonKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!response.ok) throw new Error(`Supabase Auth ${response.status}: ${await response.text()}`);
  const session = parseAuthPayload(await response.json() as AuthPayload);
  if (!session) throw new Error('Supabase Auth response did not include a session');
  await AsyncStorage.setItem(SESSION_KEY, JSON.stringify(session));
  return session;
}

export async function signInAnonymously(): Promise<StoredSession> {
  // Supabase Auth uses POST /signup with no email/password for anonymous sign-in.
  return authRequest('signup', { data: {} });
}

async function refreshSession(refreshToken: string): Promise<StoredSession> {
  return authRequest('token?grant_type=refresh_token', { refresh_token: refreshToken });
}

export async function getOrCreateSupabaseSession(): Promise<StoredSession | null> {
  if (!getConfig()) return null;
  const storedJson = await AsyncStorage.getItem(SESSION_KEY);
  if (storedJson) {
    try {
      const stored = JSON.parse(storedJson) as StoredSession;
      if (stored.accessToken && stored.refreshToken && stored.userId) {
        if (stored.expiresAt > Date.now() + 60_000) return stored;
        return await refreshSession(stored.refreshToken);
      }
    } catch {
      await AsyncStorage.removeItem(SESSION_KEY);
    }
  }
  return signInAnonymously();
}

export async function bootstrapSupabaseSync(): Promise<boolean> {
  const config = getConfig();
  if (!config) {
    useLocalRepository();
    return false;
  }
  try {
    const session = await getOrCreateSupabaseSession();
    if (!session) return false;
    configureSupabaseSession({ url: config.url, anonKey: config.anonKey, accessToken: session.accessToken, userId: session.userId });
    await syncSupabaseNow();
    return true;
  } catch (error) {
    console.warn('[supabase] bootstrap failed; continuing offline', error);
    return false;
  }
}

export async function clearSupabaseSession(): Promise<void> {
  await AsyncStorage.removeItem(SESSION_KEY);
  useLocalRepository();
}
