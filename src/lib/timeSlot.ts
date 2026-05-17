// Map the user's current local time to a prompt slot. Mirrors the slot keys
// stored in the `prompts.time_of_day` column.

export type TimeSlot =
  | 'morning'
  | 'release'
  | 'body'
  | 'gentle_action'
  | 'evening'
  | 'weekly_reflect';

/**
 * Rules:
 *   - 5:00 – 10:59  → morning
 *   - 20:00 – 01:59 → evening
 *   - Fri/Sun midday → weekly_reflect (takes priority over the midday rotation)
 *   - Midday rotation (11:00 – 19:59 on non-Fri/Sun):
 *       11:00 – 12:59 → release
 *       13:00 – 15:59 → body
 *       16:00 – 19:59 → gentle_action
 */
export function currentSlot(now: Date = new Date()): TimeSlot {
  const hour = now.getHours();
  const day = now.getDay(); // 0 = Sun, 5 = Fri

  if (hour >= 5 && hour < 11) return 'morning';
  if (hour >= 20 || hour < 2) return 'evening';

  // Midday-ish: 11..20 on weekdays; weekend reflect on Fri/Sun.
  if (day === 5 || day === 0) return 'weekly_reflect';
  if (hour < 13) return 'release';
  if (hour < 16) return 'body';
  return 'gentle_action';
}
