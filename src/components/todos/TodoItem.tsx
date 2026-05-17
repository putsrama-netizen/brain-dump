import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { Check, Star, X } from 'lucide-react-native';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { spacing } from '../../theme/spacing';
import { haptics } from '../../hooks/useHaptics';
import { withAlpha } from '../rituals/palette';
import { dueLabel } from '../../lib/dueDate';
import type { Task } from '../../db/schema';

type Props = {
  task: Task;
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
  onToggleImportant: (id: string) => void;
};

const CIRCLE = 22;
const STAR = 18;

export function TodoItem({
  task,
  onToggle,
  onDelete,
  onToggleImportant,
}: Props) {
  const [deleting, setDeleting] = useState(false);

  const fillOpacity = useSharedValue(task.completed ? 1 : 0);
  const fillScale = useSharedValue(task.completed ? 1 : 0.4);
  const checkOpacity = useSharedValue(task.completed ? 1 : 0);
  const rowOpacity = useSharedValue(task.completed ? 0.5 : 1);
  const rowTranslateX = useSharedValue(0);

  useEffect(() => {
    if (deleting) return;
    const done = task.completed;
    fillOpacity.value = withTiming(done ? 1 : 0, { duration: 240 });
    fillScale.value = withTiming(done ? 1 : 0.4, {
      duration: 280,
      easing: Easing.out(Easing.cubic),
    });
    checkOpacity.value = withTiming(done ? 1 : 0, { duration: 220 });
    rowOpacity.value = withTiming(done ? 0.5 : 1, { duration: 220 });
  }, [
    task.completed,
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
    onToggle(task.id);
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

  const handleToggleStar = () => {
    if (deleting) return;
    haptics.tap();
    onToggleImportant(task.id);
  };

  const label = dueLabel(task.dueDate);
  const isImportant = task.isImportant;

  return (
    <Animated.View style={[styles.row, rowStyle]}>
      <Pressable
        onPress={handleToggleStar}
        hitSlop={6}
        style={({ pressed }) => [
          styles.starPressArea,
          pressed && { opacity: 0.6 },
        ]}
        accessibilityRole="button"
        accessibilityLabel={
          isImportant ? 'Unmark important' : 'Mark important'
        }
      >
        <Star
          size={STAR}
          color={isImportant ? colors.sandDeep : colors.divider}
          fill={isImportant ? withAlpha(colors.sage, 0.9) : 'transparent'}
          strokeWidth={1.5}
        />
      </Pressable>
      <Pressable
        onPress={handleToggle}
        hitSlop={10}
        style={styles.checkPressArea}
        accessibilityRole="checkbox"
        accessibilityState={{ checked: task.completed }}
        accessibilityLabel={task.content}
      >
        <View style={styles.circle}>
          <Animated.View
            pointerEvents="none"
            style={[styles.fill, fillStyle]}
          />
          <Animated.View style={[styles.check, checkStyle]}>
            <Check size={14} color={colors.text} strokeWidth={2.4} />
          </Animated.View>
        </View>
      </Pressable>
      <Pressable
        onPress={handleToggle}
        style={styles.textPressArea}
        accessibilityRole="button"
      >
        <Text
          style={[
            styles.content,
            isImportant && styles.contentImportant,
            task.completed && styles.contentDone,
          ]}
          numberOfLines={3}
        >
          {task.content}
          {label ? (
            <Text style={styles.dueLabel}> • {label}</Text>
          ) : null}
        </Text>
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
    gap: spacing.sm,
  },
  starPressArea: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 2,
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
    paddingLeft: spacing.xs,
  },
  content: {
    ...typography.input,
    fontSize: 16,
    lineHeight: 22,
    color: colors.text,
  },
  contentDone: {
    textDecorationLine: 'line-through',
  },
  contentImportant: {
    fontWeight: '600',
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
