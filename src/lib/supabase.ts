import 'react-native-url-polyfill/auto';
import { useEffect, useState } from 'react';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient, type Session } from '@supabase/supabase-js';

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

// ---------------------------------------------------------------------------
// Email + password auth. Supabase persists the session in AsyncStorage on RN
// and localStorage on web automatically (configured above), so successful
// sign-in survives reloads without any extra glue.
// ---------------------------------------------------------------------------

/**
 * Returns { session: null } when Supabase has "Confirm email" turned on — the
 * caller should show a "check your inbox" notice instead of expecting an
 * auto-redirect.
 */
export async function signUpWithEmail(email: string, password: string) {
  const { data, error } = await supabase.auth.signUp({ email, password });
  if (error) throw error;
  return data;
}

export async function signInWithEmail(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  if (error) throw error;
  return data;
}

export async function signOut(): Promise<void> {
  cachedUserId = null;
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

/**
 * React hook that mirrors `supabase.auth.getSession()` + `onAuthStateChange`.
 * Returns `'loading'` until the initial session fetch resolves; thereafter
 * `null` (signed out) or a Session.
 */
export function useSession(): Session | null | 'loading' {
  const [session, setSession] = useState<Session | null | 'loading'>('loading');
  useEffect(() => {
    let active = true;
    supabase.auth
      .getSession()
      .then(({ data }) => {
        if (active) setSession(data.session ?? null);
      })
      .catch(() => {
        if (active) setSession(null);
      });
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, s) => {
      if (active) setSession(s ?? null);
    });
    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);
  return session;
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
