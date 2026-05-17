import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SQLite from 'expo-sqlite';
import { supabase, requireUserId } from './supabase';

const FLAG_KEY = '@brain-dump/sb-import-v1';
const LOCAL_DB = 'clarity-void.db';

type Row = Record<string, unknown>;

function safeQuery(db: SQLite.SQLiteDatabase, sql: string): Row[] {
  try {
    return db.getAllSync(sql) as Row[];
  } catch {
    // Table likely doesn't exist yet (fresh install) — treat as empty.
    return [];
  }
}

async function uploadIfAny(
  table: string,
  rows: Row[],
  userId: string,
): Promise<void> {
  if (rows.length === 0) return;
  const withUser = rows.map((r) => ({ ...r, user_id: userId }));
  // Upsert on PK so re-runs are safe.
  const { error } = await supabase
    .from(table)
    .upsert(withUser, { onConflict: 'id' });
  if (error) throw new Error(`upload ${table}: ${error.message}`);
}

/**
 * One-shot import of the local SQLite tables into Supabase. Native-only.
 * Idempotent via AsyncStorage flag; safe to call on every boot.
 */
export async function maybeImportLocalData(): Promise<void> {
  const flag = await AsyncStorage.getItem(FLAG_KEY);
  if (flag) return;

  const userId = await requireUserId();
  const db = SQLite.openDatabaseSync(LOCAL_DB);

  // Pull everything; column names are already snake_case so they map cleanly.
  // Explicit column lists so legacy local-only columns (like notes.project_id)
  // aren't forwarded to Supabase, which would fail PGRST204.
  const groups = safeQuery(db, 'SELECT id, name, color, created_at FROM groups');
  const notes = safeQuery(
    db,
    'SELECT id, content, group_id, color, tilt_seed, created_at, updated_at, tossed_at FROM notes',
  );
  const tasks = safeQuery(
    db,
    'SELECT id, content, note_id, completed, created_at, completed_at FROM tasks',
  );
  const rituals = safeQuery(
    db,
    'SELECT id, name, icon, color, sort_order, created_at FROM rituals',
  );
  const ritualCompletions = safeQuery(
    db,
    'SELECT id, ritual_id, day_key, completed_at FROM ritual_completions',
  );

  // FK-aware order: groups before notes (group_id ref), notes before tasks
  // (note_id ref), rituals before ritual_completions.
  await uploadIfAny('groups', groups, userId);
  await uploadIfAny('notes', notes, userId);
  await uploadIfAny('tasks', tasks, userId);
  await uploadIfAny('rituals', rituals, userId);
  await uploadIfAny('ritual_completions', ritualCompletions, userId);

  await AsyncStorage.setItem(FLAG_KEY, '1');
}
