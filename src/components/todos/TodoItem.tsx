import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { X } from 'lucide-react-native';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { spacing } from '../../theme/spacing';
import { haptics } from '../../hooks/useHaptics';
import { withAlpha } from '../rituals/palette';
import { dueLabel } from '../../lib/dueDate';
import { ScribbledCheck } from '../ui/ScribbledCheck';
import { ScribbleCrossOut } from '../ui/ScribbleCrossOut';
import type { Task } from '../../db/schema';

type Props = {
  task: Task;
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
};

const CIRCLE = 22;

export function TodoItem({ task, onToggle, onDelete }: Props) {
  const [deleting, setDeleting] = useState(false);
  // Local "visual completed" state. Flips immediately on tap so the cross-out
  // + opacity animation plays in place; the parent is notified after a short
  // delay so re-bucketing into the Completed section doesn't snap the task
  // mid-animation. Synced back to the prop on external changes.
  const [visualCompleted, setVisualCompleted] = useState(task.completed);
  useEffect(() => {
    setVisualCompleted(task.completed);
  }, [task.completed]);

  const fillOpacity = useSharedValue(task.completed ? 1 : 0);
  const fillScale = useSharedValue(task.completed ? 1 : 0.4);
  const checkOpacity = useSharedValue(task.completed ? 1 : 0);
  const rowOpacity = useSharedValue(task.completed ? 0.5 : 1);
  const rowTranslateX = useSharedValue(0);

  useEffect(() => {
    if (deleting) return;
    const done = visualCompleted;
    fillOpacity.value = withTiming(done ? 1 : 0, { duration: 240 });
    fillScale.value = withTiming(done ? 1 : 0.4, {
      duration: 280,
      easing: Easing.out(Easing.cubic),
    });
    checkOpacity.value = withTiming(done ? 1 : 0, { duration: 220 });
    rowOpacity.value = withTiming(done ? 0.5 : 1, { duration: 220 });
  }, [
    visualCompleted,
    deleting,
    fillOpacity,
    fillScale,
    checkOpacity,
    rowOpacity,
  ]);

  const fillStyle = useAnimatedStyle(() => ({
    opacity: fillOpacity.value,
    transform: [{ scale: fillScale.value }],
  }));
  const checkStyle = useAnimatedStyle(() => ({
    opacity: checkOpacity.value,
  }));
  const rowStyle = useAnimatedStyle(() => ({
    opacity: rowOpacity.value,
    transform: [{ translateX: rowTranslateX.value }],
  }));

  const handleToggle = () => {
    if (deleting) return;
    haptics.tap();
    setVisualCompleted((prev) => !prev);
    setTimeout(() => onToggle(task.id), 250);
  };

  const handleDelete = () => {
    if (deleting) return;
    setDeleting(true);
    haptics.tap();
    rowOpacity.value = withTiming(0, { duration: 220 });
    rowTranslateX.value = withTiming(
      24,
      { duration: 220, easing: Easing.in(Easing.cubic) },
      (finished) => {
        if (finished) runOnJS(onDelete)(task.id);
      },
    );
  };

  const label = dueLabel(task.dueDate);

  return (
    <Animated.View style={[styles.row, rowStyle]}>
      <Pressable
        onPress={handleToggle}
        hitSlop={10}
        style={styles.checkPressArea}
        accessibilityRole="checkbox"
        accessibilityState={{ checked: visualCompleted }}
        accessibilityLabel={task.content}
      >
        <View style={styles.circle}>
          <Animated.View
            pointerEvents="none"
            style={[styles.fill, fillStyle]}
          />
          <Animated.View style={[styles.check, checkStyle]}>
            <ScribbledCheck active={visualCompleted} size={15} />
          </Animated.View>
        </View>
      </Pressable>
      <Pressable
        onPress={handleToggle}
        style={styles.textPressArea}
        accessibilityRole="button"
      >
        <View style={styles.textWithCrossOut}>
          <Text style={styles.content} numberOfLines={3}>
            {task.content}
            {label ? (
              <Text style={styles.dueLabel}> • {label}</Text>
            ) : null}
          </Text>
          <ScribbleCrossOut active={visualCompleted} />
        </View>
      </Pressable>
      <Pressable
        onPress={handleDelete}
        hitSlop={12}
        style={({ pressed }) => [
          styles.deleteBtn,
          pressed && styles.deleteBtnPressed,
        ]}
        accessibilityRole="button"
        accessibilityLabel={`Delete ${task.content}`}
      >
        <X size={16} color={colors.textMuted} strokeWidth={1.6} />
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.xl,
    gap: spacing.md,
  },
  checkPressArea: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  circle: {
    width: CIRCLE,
    height: CIRCLE,
    borderRadius: CIRCLE / 2,
    borderWidth: 1,
    borderColor: colors.text,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    backgroundColor: colors.card,
  },
  fill: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: withAlpha(colors.sage, 0.85),
  },
  check: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textPressArea: {
    flex: 1,
  },
  textWithCrossOut: {
    position: 'relative',
  },
  content: {
    ...typography.input,
    fontSize: 16,
    lineHeight: 22,
    color: colors.text,
  },
  dueLabel: {
    color: colors.textMuted,
    fontWeight: '400',
    fontSize: 13,
  },
  deleteBtn: {
    opacity: 0.35,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.xs,
  },
  deleteBtnPressed: {
    opacity: 0.8,
  },
});
