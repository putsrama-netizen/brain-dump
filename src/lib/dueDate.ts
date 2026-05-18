// Due-date semantics for tasks.
//
// "Soon" picker is three buckets:
//   Today    → start-of-day epoch ms (local TZ)
//   Tomorrow → today + 24h
//   Someday  → sentinel timestamp (year 2099) — chosen over a string enum so
//              the column can stay a simple bigint and an index still works.
//
// `null` means "no preference" (default for tasks created without the picker).

export const SOMEDAY_SENTINEL = new Date(2099, 0, 1).getTime();

export type DueBucket = 'today' | 'tomorrow' | 'someday';

function startOfDay(date = new Date()): number {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

export function dueDateForBucket(bucket: DueBucket): number {
  if (bucket === 'someday') return SOMEDAY_SENTINEL;
  const base = startOfDay();
  return bucket === 'tomorrow' ? base + 24 * 60 * 60 * 1000 : base;
}

export function bucketForDueDate(
  due: number | null | undefined,
): DueBucket | null {
  if (due === null || due === undefined || !Number.isFinite(due)) return null;
  if (due === SOMEDAY_SENTINEL) return 'someday';
  const today = startOfDay();
  const tomorrow = today + 24 * 60 * 60 * 1000;
  // Anything past or present rolls forward into Today; only a strict
  // "set today as tomorrow" still reads as Tomorrow.
  if (due >= tomorrow && due < tomorrow + 24 * 60 * 60 * 1000) {
    return 'tomorrow';
  }
  return 'today';
}

/**
 * Header label for a bucket section in the inbox. `null` is the "no due date"
 * group, rendered as "Anytime" — softer than "No deadline" and matches the
 * gentle tone of the rest of the app.
 */
export function bucketLabel(bucket: DueBucket | null): string {
  switch (bucket) {
    case 'today':
      return 'Today';
    case 'tomorrow':
      return 'Tomorrow';
    case 'someday':
      return 'Someday';
    case null:
      return 'No due date';
  }
}

export function dueLabel(due: number | null | undefined): string | null {
  // Defensive against missing columns / NaN / stale rows from before the
  // due_date column existed — render nothing instead of "Invalid Date".
  if (due === null || due === undefined || !Number.isFinite(due)) return null;
  if (due === SOMEDAY_SENTINEL) return 'Someday';
  const today = startOfDay();
  const tomorrow = today + 24 * 60 * 60 * 1000;
  if (due >= tomorrow && due < tomorrow + 24 * 60 * 60 * 1000) return 'Tomorrow';
  // Past or present → "Today" (rollover). Yesterday's "Today" task still says
  // Today — no guilt-tripping "Overdue" label.
  return 'Today';
}
