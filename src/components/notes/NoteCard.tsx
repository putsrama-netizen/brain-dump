import React, { useState } from 'react';
import {
  Dimensions,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Animated, {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { ListChecks, X } from 'lucide-react-native';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { spacing, radius, shadows } from '../../theme/spacing';
import { haptics } from '../../hooks/useHaptics';
import type { Note } from '../../db/schema';

const SCREEN_W = Dimensions.get('window').width;

// Map the persisted tiltSeed (0..9999) to a small, deterministic rotation so
// each scrap of paper sits slightly off-square but doesn't shift between renders.
function tiltFromSeed(seed: number): number {
  const normalized = (seed % 200) / 200; // 0..1
  return (normalized - 0.5) * 3; // -1.5° .. +1.5°
}

type TaskStats = { total: number; done: number };

type Props = {
  note: Note;
  onTap: (note: Note) => void;
  onDelete: (id: string) => void;
  taskStats?: TaskStats;
};

export function NoteCard({ note, onTap, onDelete, taskStats }: Props) {
  const tilt = tiltFromSeed(note.tiltSeed);
  const [crumpling, setCrumpling] = useState(false);

  const scale = useSharedValue(1);
  const rotate = useSharedValue(0);
  const skewX = useSharedValue(0);
  const tx = useSharedValue(0);
  const ty = useSharedValue(0);
  const opacity = useSharedValue(1);

  const animStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [
      { translateX: tx.value },
      { translateY: ty.value },
      { scale: scale.value },
      { rotate: `${rotate.value}deg` },
      { skewX: `${skewX.value}deg` },
    ],
  }));

  const startCrumple = () => {
    if (crumpling) return;
    setCrumpling(true);
    haptics.tear();

    // Phase 1: crumple (700ms) — same physics language as the Brain Dump toss.
    scale.value = withTiming(0.30, {
      duration: 700,
      easing: Easing.bezier(0.4, 0, 0.2, 1),
    });
    rotate.value = withTiming(-26, { duration: 700 });
    skewX.value = withSequence(
      withTiming(14, { duration: 175 }),
      withTiming(-11, { duration: 175 }),
      withTiming(7, { duration: 175 }),
      withTiming(0, { duration: 175 }),
    );
    setTimeout(() => haptics.crumple(), 230);
    setTimeout(() => haptics.crumple(), 460);
    setTimeout(() => haptics.crumple(), 640);

    // Phase 2: toss off the right edge (500ms, delayed 700ms).
    tx.value = withDelay(
      700,
      withTiming(SCREEN_W + 100, { duration: 500, easing: Easing.linear }),
    );
    ty.value = withDelay(
      700,
      withSequence(
        withTiming(-90, { duration: 220, easing: Easing.out(Easing.quad) }),
        withTiming(-60, { duration: 280, easing: Easing.in(Easing.quad) }),
      ),
    );
    rotate.value = withDelay(700, withTiming(-360, { duration: 500 }));
    scale.value = withDelay(700, withTiming(0.10, { duration: 500 }));

    // Phase 3: fade out and remove (200ms, starting at 1100ms).
    opacity.value = withDelay(
      1100,
      withTiming(0, { duration: 200 }, (finished) => {
        if (finished) {
          runOnJS(haptics.crumple)();
          runOnJS(onDelete)(note.id);
        }
      }),
    );
  };

  return (
    <Animated.View style={animStyle}>
      <Pressable
        onPress={() => !crumpling && onTap(note)}
        onLongPress={startCrumple}
        delayLongPress={420}
        disabled={crumpling}
        style={({ pressed }) => [
          styles.card,
          {
            backgroundColor: note.color,
            transform: [{ rotate: `${tilt}deg` }],
          },
          pressed && !crumpling && styles.cardPressed,
        ]}
        accessibilityRole="button"
        accessibilityLabel={note.content}
        accessibilityHint="Tap to edit. Long-press or tap the X to discard."
      >
        <Text style={styles.content}>{note.content}</Text>
        {taskStats && taskStats.total > 0 ? (
          <View style={styles.taskBadge}>
            <ListChecks size={12} color={colors.textMuted} strokeWidth={1.6} />
            <Text style={styles.taskBadgeText}>
              {taskStats.done}/{taskStats.total} done
            </Text>
          </View>
        ) : null}
        <Pressable
          onPress={startCrumple}
          hitSlop={10}
          disabled={crumpling}
          style={({ pressed }) => [
            styles.deleteBadge,
            pressed && styles.deleteBadgePressed,
          ]}
          accessibilityRole="button"
          accessibilityLabel="Discard note"
        >
          <View style={styles.deleteBadgeBg}>
            <X size={12} color={colors.text} strokeWidth={1.8} />
          </View>
        </Pressable>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.divider,
    padding: spacing.base,
    // X delete badge is absolutely-positioned, so we only need enough
    // right-padding for text to clear its bounding box, not the badge plus a buffer.
    paddingRight: spacing.lg,
    ...shadows.soft,
  },
  cardPressed: {
    opacity: 0.85,
  },
  content: {
    ...typography.input,
    fontSize: 14,
    lineHeight: 20,
    color: colors.text,
  },
  deleteBadge: {
    position: 'absolute',
    top: 4,
    right: 4,
    padding: 4,
    opacity: 0.45,
  },
  deleteBadgePressed: {
    opacity: 0.9,
  },
  deleteBadgeBg: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.divider,
    alignItems: 'center',
    justifyContent: 'center',
  },
  taskBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: spacing.sm,
    paddingTop: spacing.xs,
    borderTopWidth: 1,
    borderTopColor: colors.divider,
  },
  taskBadgeText: {
    ...typography.caption,
    fontSize: 11,
    color: colors.textMuted,
    letterSpacing: 0.3,
  },
});
