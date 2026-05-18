import { nanoid } from 'nanoid/non-secure';
import {
  supabase,
  requireUserId,
  toSnake,
  camelRows,
} from '../../lib/supabase';
import type { Note } from '../schema';
import { colors } from '../../theme/colors';

const TABLE = 'notes';

function pickColor(): string {
  const palette = colors.postit;
  return palette[Math.floor(Math.random() * palette.length)];
}

async function insertOne(row: Partial<Note>): Promise<Note> {
  const userId = await requireUserId();
  const payload = { ...toSnake(row as Record<string, unknown>), user_id: userId };
  const { data, error } = await supabase
    .from(TABLE)
    .insert(payload)
    .select()
    .single();
  if (error || !data) throw error ?? new Error('notes insert failed');
  return camelRows<Note>([data])[0];
}

export const notesRepo = {
  async create(content: string): Promise<Note> {
    const now = Date.now();
    const row: Partial<Note> = {
      id: nanoid(),
      content,
      groupId: null,
      color: pickColor(),
      tiltSeed: Math.floor(Math.random() * 10_000),
      createdAt: now,
      updatedAt: now,
      tossedAt: null,
    };
    return insertOne(row);
  },

  async softDeleteFromContent(content: string): Promise<Note> {
    const now = Date.now();
    const row: Partial<Note> = {
      id: nanoid(),
      content,
      groupId: null,
      color: pickColor(),
      tiltSeed: 0,
      createdAt: now,
      updatedAt: now,
      tossedAt: now,
    };
    return insertOne(row);
  },

  async restore(id: string): Promise<void> {
    const { error } = await supabase
      .from(TABLE)
      .update({ tossed_at: null, updated_at: Date.now() })
      .eq('id', id);
    if (error) throw error;
  },

  async hardDelete(id: string): Promise<void> {
    const { error } = await supabase.from(TABLE).delete().eq('id', id);
    if (error) throw error;
  },

  async sweepTossed(graceMs = 5_000): Promise<void> {
    const cutoff = Date.now() - graceMs;
    const { error } = await supabase
      .from(TABLE)
      .delete()
      .lt('tossed_at', cutoff);
    if (error) throw error;
  },

  async listActive(): Promise<Note[]> {
    const { data, error } = await supabase
      .from(TABLE)
      .select('*')
      .is('tossed_at', null)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return camelRows<Note>(data ?? []);
  },

  async getById(id: string): Promise<Note | undefined> {
    const { data, error } = await supabase
      .from(TABLE)
      .select('*')
      .eq('id', id)
      .maybeSingle();
    if (error) throw error;
    return data ? camelRows<Note>([data])[0] : undefined;
  },

  async getByIds(ids: string[]): Promise<Note[]> {
    if (ids.length === 0) return [];
    const { data, error } = await supabase
      .from(TABLE)
      .select('*')
      .in('id', ids);
    if (error) throw error;
    return camelRows<Note>(data ?? []);
  },

  async updateContent(id: string, content: string): Promise<void> {
    const { error } = await supabase
      .from(TABLE)
      .update({ content: content.trim(), updated_at: Date.now() })
      .eq('id', id);
    if (error) throw error;
  },

  async move(id: string, groupId: string | null): Promise<void> {
    const { error } = await supabase
      .from(TABLE)
      .update({ group_id: groupId, updated_at: Date.now() })
      .eq('id', id);
    if (error) throw error;
  },

  /**
   * Pick a single non-tossed note created exactly 3, 7, or 30 days ago.
   * Days are tried in shuffled order; returns null if no eligible notes exist.
   * Used by the Resurfacing flow after Keep/Toss on Brain Dump.
   */
  async pickResurfaceCandidate(): Promise<Note | null> {
    const startOfToday = (() => {
      const d = new Date();
      d.setHours(0, 0, 0, 0);
      return d.getTime();
    })();
    const dayMs = 24 * 60 * 60 * 1000;
    const offsets = [3, 7, 30].sort(() => Math.random() - 0.5);
    for (const offset of offsets) {
      const dayStart = startOfToday - offset * dayMs;
      const dayEnd = dayStart + dayMs;
      const { data, error } = await supabase
        .from(TABLE)
        .select('*')
        .is('tossed_at', null)
        .gte('created_at', dayStart)
        .lt('created_at', dayEnd)
        .limit(20);
      if (error) throw error;
      if (data && data.length > 0) {
        const pick = data[Math.floor(Math.random() * data.length)];
        return camelRows<Note>([pick])[0];
      }
    }
    return null;
  },

  /**
   * Soft-sweep all active notes older than `days` days. Uses the existing
   * `tossed_at` column so swept notes naturally drop out of `listActive()` —
   * no new schema needed. Returns the count of rows updated so the UI can
   * tell the user "swept N notes."
   */
  async sweepOlderThan(days: number): Promise<number> {
    const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
    const userId = await requireUserId();
    const { data, error } = await supabase
      .from(TABLE)
      .update({ tossed_at: Date.now(), updated_at: Date.now() })
      .eq('user_id', userId)
      .is('tossed_at', null)
      .lt('created_at', cutoff)
      .select('id');
    if (error) throw error;
    return data?.length ?? 0;
  },

  /** Counts active notes older than `days` days. Drives the confirmation modal's "N notes" hint. */
  async countOlderThan(days: number): Promise<number> {
    const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
    const { count, error } = await supabase
      .from(TABLE)
      .select('id', { count: 'exact', head: true })
      .is('tossed_at', null)
      .lt('created_at', cutoff);
    if (error) throw error;
    return count ?? 0;
  },

  /** Activity day-keys (local-tz start-of-day epoch ms) where a note was created. */
  async listCreationActivityDays(days: number): Promise<Set<number>> {
    const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
    const { data, error } = await supabase
      .from(TABLE)
      .select('created_at')
      .gte('created_at', cutoff);
    if (error) throw error;
    const dayKeys = new Set<number>();
    for (const row of (data ?? []) as { created_at: number }[]) {
      const d = new Date(row.created_at);
      d.setHours(0, 0, 0, 0);
      dayKeys.add(d.getTime());
    }
    return dayKeys;
  },
};
