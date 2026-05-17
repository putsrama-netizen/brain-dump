import { supabase, camelRows } from '../../lib/supabase';
import type { Prompt } from '../schema';

const TABLE = 'prompts';

export const promptsRepo = {
  /** All prompts for a given time-of-day slot. Small table (~5–8 rows), no pagination needed. */
  async listBySlot(slot: string): Promise<Prompt[]> {
    const { data, error } = await supabase
      .from(TABLE)
      .select('*')
      .eq('time_of_day', slot);
    if (error) throw error;
    return camelRows<Prompt>(data ?? []);
  },
};
