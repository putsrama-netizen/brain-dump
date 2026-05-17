import 'react-native-url-polyfill/auto';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!url || !anonKey) {
  // Surface this early — easier to spot than a 401 mid-flow.
  throw new Error(
    'Missing EXPO_PUBLIC_SUPABASE_URL or EXPO_PUBLIC_SUPABASE_ANON_KEY. Set them in .env and restart Metro with --clear.',
  );
}

// On the web supabase-js auto-uses localStorage; on RN we pin it to AsyncStorage
// so the anonymous session survives app restarts.
export const supabase = createClient(url, anonKey, {
  auth: {
    storage: Platform.OS === 'web' ? undefined : AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: Platform.OS === 'web',
  },
});

// ---------------------------------------------------------------------------
// User-id helper. Cached so reads don't pay the round-trip on every query.
// Cleared by onAuthStateChange so sign-out + re-sign-in stays correct.
// ---------------------------------------------------------------------------

let cachedUserId: string | null = null;

export async function requireUserId(): Promise<string> {
  if (cachedUserId) return cachedUserId;
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) {
    throw new Error('No Supabase session — sign in before calling repo methods.');
  }
  cachedUserId = data.user.id;
  return cachedUserId;
}

supabase.auth.onAuthStateChange((_event, session) => {
  cachedUserId = session?.user?.id ?? null;
});

/**
 * Ensure the device has an anonymous session. Idempotent — returns the
 * existing session if one is already persisted.
 */
export async function ensureAnonSession(): Promise<string> {
  const existing = await supabase.auth.getSession();
  if (existing.data.session) {
    cachedUserId = existing.data.session.user.id;
    return cachedUserId;
  }
  const { data, error } = await supabase.auth.signInAnonymously();
  if (error || !data.user) {
    throw new Error(
      `Anonymous sign-in failed: ${error?.message ?? 'no user returned'}. Enable "Allow anonymous sign-ins" in Supabase → Authentication → Sign In / Up.`,
    );
  }
  cachedUserId = data.user.id;
  return cachedUserId;
}

// ---------------------------------------------------------------------------
// Casing helpers — Supabase returns snake_case; app code is camelCase.
// ---------------------------------------------------------------------------

type AnyRow = Record<string, unknown>;

export function toCamel<T extends AnyRow>(row: T): AnyRow {
  const out: AnyRow = {};
  for (const [k, v] of Object.entries(row)) {
    const camel = k.replace(/_([a-z])/g, (_, c: string) => c.toUpperCase());
    out[camel] = v;
  }
  return out;
}

export function toSnake<T extends AnyRow>(row: T): AnyRow {
  const out: AnyRow = {};
  for (const [k, v] of Object.entries(row)) {
    const snake = k.replace(/[A-Z]/g, (c) => '_' + c.toLowerCase());
    out[snake] = v;
  }
  return out;
}

export function camelRows<T>(rows: AnyRow[]): T[] {
  return rows.map((r) => toCamel(r)) as T[];
}
