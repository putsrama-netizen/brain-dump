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
};
