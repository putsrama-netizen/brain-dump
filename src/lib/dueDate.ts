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

export function bucketForDueDate(due: number | null): DueBucket | null {
  if (due === null) return null;
  if (due === SOMEDAY_SENTINEL) return 'someday';
  const today = startOfDay();
  if (due === today) return 'today';
  if (due === today + 24 * 60 * 60 * 1000) return 'tomorrow';
  return null;
}

export function dueLabel(due: number | null): string | null {
  if (due === null) return null;
  if (due === SOMEDAY_SENTINEL) return 'Someday';
  const today = startOfDay();
  if (due === today) return 'Today';
  if (due === today + 24 * 60 * 60 * 1000) return 'Tomorrow';
  // Future-proof: any other date renders as a short month/day.
  return new Date(due).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
  });
}
