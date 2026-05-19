import { supabase, camelRows } from '../../lib/supabase';
import type { Prompt } from '../schema';

const TABLE = 'prompts';

// Wellness pivot: prompts are no longer tied to a literal time-of-day. The
// pool draws from three wellness categories — Release (let go of mental
// load), Body (somatic check-in), Evening (close the day). Other categories
// (e.g. morning/midday productivity prompts) are filtered out so the
// "(stuck?)" surface stays on-message.
export const WELLNESS_SLOTS = ['release', 'body', 'evening'] as const;

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

  /** Wellness pool: Release + Body + Evening prompts. */
  async listWellnessPool(): Promise<Prompt[]> {
    const { data, error } = await supabase
      .from(TABLE)
      .select('*')
      .in('time_of_day', WELLNESS_SLOTS as unknown as string[]);
    if (error) throw error;
    return camelRows<Prompt>(data ?? []);
  },
};
