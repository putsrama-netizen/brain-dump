import { nanoid } from 'nanoid/non-secure';
import { supabase, requireUserId, camelRows } from '../../lib/supabase';
import type { Group } from '../schema';

const TABLE = 'groups';

export const groupsRepo = {
  async list(): Promise<Group[]> {
    const { data, error } = await supabase
      .from(TABLE)
      .select('*')
      .order('created_at', { ascending: true });
    if (error) throw error;
    return camelRows<Group>(data ?? []);
  },

  async create(name: string): Promise<Group> {
    const userId = await requireUserId();
    const row = {
      id: nanoid(),
      user_id: userId,
      name: name.trim(),
      color: null,
      created_at: Date.now(),
    };
    const { data, error } = await supabase
      .from(TABLE)
      .insert(row)
      .select()
      .single();
    if (error || !data) throw error ?? new Error('groups insert failed');
    return camelRows<Group>([data])[0];
  },

  async delete(id: string): Promise<void> {
    // Detach notes pointing at this group first so we don't leave orphan references.
    const { error: clearErr } = await supabase
      .from('notes')
      .update({ group_id: null, updated_at: Date.now() })
      .eq('group_id', id);
    if (clearErr) throw clearErr;
    const { error } = await supabase.from(TABLE).delete().eq('id', id);
    if (error) throw error;
  },
};
