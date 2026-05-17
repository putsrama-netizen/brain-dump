import { nanoid } from 'nanoid/non-secure';
import { supabase, requireUserId, camelRows } from '../../lib/supabase';
import type { Ritual } from '../schema';

const RITUALS = 'rituals';
const COMPLETIONS = 'ritual_completions';

export function getDayKey(date: Date = new Date()): number {
  return (
    date.getFullYear() * 10000 + (date.getMonth() + 1) * 100 + date.getDate()
  );
}

export type RitualWithStatus = Ritual & { completedToday: boolean };

export const ritualsRepo = {
  async list(): Promise<RitualWithStatus[]> {
    const { data: rituals, error } = await supabase
      .from(RITUALS)
      .select('*')
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: true });
    if (error) throw error;
    const items = camelRows<Ritual>(rituals ?? []);
    if (items.length === 0) return [];

    const today = getDayKey();
    const { data: completions, error: cErr } = await supabase
      .from(COMPLETIONS)
      .select('ritual_id')
      .eq('day_key', today);
    if (cErr) throw cErr;
    const done = new Set((completions ?? []).map((c) => c.ritual_id));
    return items.map((r) => ({ ...r, completedToday: done.has(r.id) }));
  },

  async create(input: {
    name: string;
    icon: string;
    color: string;
  }): Promise<Ritual> {
    const userId = await requireUserId();
    const now = Date.now();
    const row = {
      id: nanoid(),
      user_id: userId,
      name: input.name.trim(),
      icon: input.icon,
      color: input.color,
      sort_order: now,
      created_at: now,
    };
    const { data, error } = await supabase
      .from(RITUALS)
      .insert(row)
      .select()
      .single();
    if (error || !data) throw error ?? new Error('rituals insert failed');
    return camelRows<Ritual>([data])[0];
  },

  async toggleToday(ritualId: string): Promise<boolean> {
    const today = getDayKey();
    const { data: existing, error: readErr } = await supabase
      .from(COMPLETIONS)
      .select('id')
      .eq('ritual_id', ritualId)
      .eq('day_key', today)
      .maybeSingle();
    if (readErr) throw readErr;

    if (existing) {
      const { error } = await supabase
        .from(COMPLETIONS)
        .delete()
        .eq('id', existing.id);
      if (error) throw error;
      return false;
    }

    const userId = await requireUserId();
    const { error } = await supabase.from(COMPLETIONS).insert({
      id: nanoid(),
      user_id: userId,
      ritual_id: ritualId,
      day_key: today,
      completed_at: Date.now(),
    });
    if (error) throw error;
    return true;
  },

  async delete(ritualId: string): Promise<void> {
    // ON DELETE CASCADE on ritual_completions.ritual_id takes care of completions;
    // we just drop the ritual itself.
    const { error } = await supabase
      .from(RITUALS)
      .delete()
      .eq('id', ritualId);
    if (error) throw error;
  },
};
