import { Platform } from 'react-native';
import * as Haptics from 'expo-haptics';

// Web has no haptics; expo-haptics ships a web stub but we still guard
// every call so a stub that throws (or a future SDK change) can't crash
// the toss/keep flows. Fire-and-forget; we don't await.
function safe(fn: () => Promise<unknown> | void) {
  if (Platform.OS === 'web') return;
  try {
    const result = fn();
    if (result && typeof (result as Promise<unknown>).catch === 'function') {
      (result as Promise<unknown>).catch(() => {});
    }
  } catch {
    /* swallow — haptics are non-essential */
  }
}

export const haptics = {
  tap() {
    safe(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light));
  },
  tear() {
    safe(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium));
  },
  crumple() {
    safe(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy));
  },
  check() {
    safe(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success));
  },
  warn() {
    safe(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning));
  },
};

export function useHaptics() {
  return haptics;
}
