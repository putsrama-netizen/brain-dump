import { nanoid } from 'nanoid/non-secure';
import { supabase, requireUserId, camelRows } from '../../lib/supabase';
import type { Task } from '../schema';

const TABLE = 'tasks';

export const tasksRepo = {
  async list(): Promise<Task[]> {
    const { data, error } = await supabase
      .from(TABLE)
      .select('*')
      .order('created_at', { ascending: true });
    if (error) throw error;
    return camelRows<Task>(data ?? []);
  },

  async listByNote(noteId: string): Promise<Task[]> {
    const { data, error } = await supabase
      .from(TABLE)
      .select('*')
      .eq('note_id', noteId)
      .order('created_at', { ascending: true });
    if (error) throw error;
    return camelRows<Task>(data ?? []);
  },

  /** Returns a Map<noteId, { total, done }> covering every note this user has tasks on. */
  async countsByNote(): Promise<Map<string, { total: number; done: number }>> {
    const { data, error } = await supabase
      .from(TABLE)
      .select('note_id, completed')
      .not('note_id', 'is', null);
    if (error) throw error;
    const counts = new Map<string, { total: number; done: number }>();
    for (const row of (data ?? []) as { note_id: string; completed: boolean }[]) {
      const c = counts.get(row.note_id) ?? { total: 0, done: 0 };
      c.total += 1;
      if (row.completed) c.done += 1;
      counts.set(row.note_id, c);
    }
    return counts;
  },

  async create(
    content: string,
    options?: {
      noteId?: string | null;
      dueDate?: number | null;
      isImportant?: boolean;
    },
  ): Promise<Task> {
    const userId = await requireUserId();
    const row = {
      id: nanoid(),
      user_id: userId,
      content: content.trim(),
      note_id: options?.noteId ?? null,
      completed: false,
      is_important: options?.isImportant ?? false,
      due_date: options?.dueDate ?? null,
      created_at: Date.now(),
      completed_at: null,
    };
    const { data, error } = await supabase
      .from(TABLE)
      .insert(row)
      .select()
      .single();
    if (error || !data) throw error ?? new Error('tasks insert failed');
    return camelRows<Task>([data])[0];
  },

  async setImportant(id: string, value: boolean): Promise<void> {
    const { error } = await supabase
      .from(TABLE)
      .update({ is_important: value })
      .eq('id', id);
    if (error) throw error;
  },

  async setDueDate(id: string, due: number | null): Promise<void> {
    const { error } = await supabase
      .from(TABLE)
      .update({ due_date: due })
      .eq('id', id);
    if (error) throw error;
  },

  async toggle(id: string): Promise<boolean> {
    const { data: existing, error: readErr } = await supabase
      .from(TABLE)
      .select('completed')
      .eq('id', id)
      .maybeSingle();
    if (readErr || !existing) throw readErr ?? new Error('task not found');
    const next = !existing.completed;
    const { error } = await supabase
      .from(TABLE)
      .update({
        completed: next,
        completed_at: next ? Date.now() : null,
      })
      .eq('id', id);
    if (error) throw error;
    return next;
  },

  async delete(id: string): Promise<void> {
    const { error } = await supabase.from(TABLE).delete().eq('id', id);
    if (error) throw error;
  },

  /** Bulk-delete every completed task belonging to the current user. */
  async deleteAllCompleted(): Promise<number> {
    const userId = await requireUserId();
    const { data, error } = await supabase
      .from(TABLE)
      .delete()
      .eq('user_id', userId)
      .eq('completed', true)
      .select('id');
    if (error) throw error;
    return data?.length ?? 0;
  },
};
