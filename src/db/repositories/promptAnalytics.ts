import { supabase, requireUserId } from '../../lib/supabase';

const TABLE = 'prompt_analytics';

export type PromptAction = 'shown' | 'completed' | 'skipped';

export const promptAnalyticsRepo = {
  async log(promptId: string, action: PromptAction): Promise<void> {
    const userId = await requireUserId();
    const { error } = await supabase.from(TABLE).insert({
      user_id: userId,
      prompt_id: promptId,
      action,
      created_at: Date.now(),
    });
    if (error) throw error;
  },

  /** prompt_ids the current user has been *shown* within the last `days` days. */
  async listShownPromptIds(days: number): Promise<string[]> {
    const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
    const { data, error } = await supabase
      .from(TABLE)
      .select('prompt_id')
      .eq('action', 'shown')
      .gte('created_at', cutoff);
    if (error) throw error;
    return (data ?? []).map(
      (r) => (r as { prompt_id: string }).prompt_id,
    );
  },

  /**
   * Activity day-keys (local-tz start-of-day epoch ms) where the user
   * completed a prompt. Used by the 30-day consistency grid.
   */
  async listCompletedActivityDays(days: number): Promise<Set<number>> {
    const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
    const { data, error } = await supabase
      .from(TABLE)
      .select('created_at')
      .eq('action', 'completed')
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
