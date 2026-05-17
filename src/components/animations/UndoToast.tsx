import React, { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
  cancelAnimation,
} from 'react-native-reanimated';
import { colors } from '../../theme/colors';
import { spacing, radius, shadows } from '../../theme/spacing';
import { typography } from '../../theme/typography';

type Props = {
  visible: boolean;
  durationMs?: number;
  onUndo: () => void;
  onElapsed: () => void;
};

export function UndoToast({ visible, durationMs = 5000, onUndo, onElapsed }: Props) {
  const opacity = useSharedValue(0);
  const translateY = useSharedValue(20);
  const progress = useSharedValue(0);
  const [secondsLeft, setSecondsLeft] = useState(Math.ceil(durationMs / 1000));
  const elapsedFiredRef = useRef(false);

  useEffect(() => {
    if (visible) {
      elapsedFiredRef.current = false;
      setSecondsLeft(Math.ceil(durationMs / 1000));

      // Slide + fade in
      opacity.value = withTiming(1, { duration: 220, easing: Easing.out(Easing.cubic) });
      translateY.value = withTiming(0, { duration: 220, easing: Easing.out(Easing.cubic) });

      // Progress bar fills 0 → 1 over the grace window
      progress.value = 0;
      progress.value = withTiming(1, { duration: durationMs, easing: Easing.linear });

      const interval = setInterval(() => {
        setSecondsLeft((s) => Math.max(0, s - 1));
      }, 1000);

      const timeout = setTimeout(() => {
        if (elapsedFiredRef.current) return;
        elapsedFiredRef.current = true;
        opacity.value = withTiming(0, { duration: 180 });
        translateY.value = withTiming(20, { duration: 180 });
        onElapsed();
      }, durationMs);

      return () => {
        clearInterval(interval);
        clearTimeout(timeout);
        cancelAnimation(progress);
      };
    } else {
      opacity.value = withTiming(0, { duration: 180 });
      translateY.value = withTiming(20, { duration: 180 });
    }
  }, [visible, durationMs]);

  const containerStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }));

  const fillStyle = useAnimatedStyle(() => ({
    width: `${progress.value * 100}%`,
  }));

  if (!visible) return null;

  const handleUndo = () => {
    elapsedFiredRef.current = true;
    cancelAnimation(progress);
    opacity.value = withTiming(0, { duration: 180 });
    translateY.value = withTiming(20, { duration: 180 });
    onUndo();
  };

  return (
    <Animated.View pointerEvents="box-none" style={[styles.wrapper, containerStyle]}>
      <View style={styles.toast}>
        <Text style={styles.label}>
          Tossed. <Text style={styles.muted}>Changed your mind?</Text>
        </Text>
        <Pressable
          onPress={handleUndo}
          hitSlop={12}
          style={({ pressed }) => [styles.undoBtn, pressed && styles.undoBtnPressed]}
        >
          <Text style={styles.undoText}>Undo · {secondsLeft}s</Text>
        </Pressable>
      </View>
      <View style={styles.progressTrack}>
        <Animated.View style={[styles.progressFill, fillStyle]} />
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    bottom: spacing.xxl,
    left: spacing.lg,
    right: spacing.lg,
    alignItems: 'stretch',
  },
  toast: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.slate,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    ...shadows.card,
  },
  label: {
    ...typography.body,
    color: colors.paper,
    flex: 1,
  },
  muted: {
    color: colors.slateMut,
  },
  undoBtn: {
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
    marginLeft: spacing.md,
    borderRadius: radius.md,
  },
  undoBtnPressed: {
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  undoText: {
    ...typography.body,
    color: colors.sage,
    fontWeight: '600',
  },
  progressTrack: {
    height: 3,
    backgroundColor: 'rgba(0,0,0,0.4)',
    borderBottomLeftRadius: radius.lg,
    borderBottomRightRadius: radius.lg,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.sage,
  },
});
