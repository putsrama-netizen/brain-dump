import React, { useEffect, useState } from 'react';
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
import { haptics } from '../../hooks/useHaptics';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { spacing, shadows } from '../../theme/spacing';
import { getIconComponent } from './icons';
import { withAlpha } from './palette';
import type { RitualWithStatus } from '../../db/repositories/rituals';

const CIRCLE = 64;
const ITEM_WIDTH = 84;
const SCREEN_WIDTH = Dimensions.get('window').width;

type Props = {
  ritual: RitualWithStatus;
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
};

export function RitualCircle({ ritual, onToggle, onDelete }: Props) {
  const [tossing, setTossing] = useState(false);

  // Watercolor-fill animation values (completion state).
  const fillScale = useSharedValue(ritual.completedToday ? 1 : 0.45);
  const fillOpacity = useSharedValue(ritual.completedToday ? 1 : 0);
  const blobScale = useSharedValue(ritual.completedToday ? 1 : 0.3);
  const blobOpacity = useSharedValue(ritual.completedToday ? 1 : 0);
  const pressScale = useSharedValue(1);

  // Crumple+toss animation values (long-press delete).
  const tossScale = useSharedValue(1);
  const tossRotate = useSharedValue(0);
  const tossSkewX = useSharedValue(0);
  const tossTx = useSharedValue(0);
  const tossTy = useSharedValue(0);
  const tossOpacity = useSharedValue(1);

  useEffect(() => {
    if (tossing) return;
    fillScale.value = withTiming(ritual.completedToday ? 1 : 0.45, {
      duration: 480,
      easing: Easing.out(Easing.cubic),
    });
    fillOpacity.value = withTiming(ritual.completedToday ? 1 : 0, {
      duration: 360,
      easing: Easing.out(Easing.quad),
    });
    blobScale.value = withTiming(ritual.completedToday ? 1 : 0.3, {
      duration: 560,
      easing: Easing.out(Easing.cubic),
    });
    blobOpacity.value = withTiming(ritual.completedToday ? 1 : 0, {
      duration: 420,
      easing: Easing.out(Easing.quad),
    });
  }, [
    ritual.completedToday,
    tossing,
    fillScale,
    fillOpacity,
    blobScale,
    blobOpacity,
  ]);

  const fillStyle = useAnimatedStyle(() => ({
    opacity: fillOpacity.value,
    transform: [{ scale: fillScale.value }],
  }));
  const blobStyle = useAnimatedStyle(() => ({
    opacity: blobOpacity.value,
    transform: [{ scale: blobScale.value }],
  }));
  const wrapperStyle = useAnimatedStyle(() => ({
    opacity: tossOpacity.value,
    transform: [
      { translateX: tossTx.value },
      { translateY: tossTy.value },
      { scale: tossScale.value * pressScale.value },
      { rotate: `${tossRotate.value}deg` },
      { skewX: `${tossSkewX.value}deg` },
    ],
  }));

  const handlePressIn = () => {
    if (tossing) return;
    pressScale.value = withTiming(0.94, { duration: 120 });
  };
  const handlePressOut = () => {
    if (tossing) return;
    pressScale.value = withTiming(1, { duration: 160 });
  };

  const handlePress = () => {
    if (tossing) return;
    haptics.tap();
    onToggle(ritual.id);
  };

  const handleLongPress = () => {
    if (tossing) return;
    setTossing(true);
    haptics.tear();

    // Phase 1: crumple (700ms) — same physics language as NoteCard and Brain Dump.
    tossScale.value = withTiming(0.30, {
      duration: 700,
      easing: Easing.bezier(0.4, 0, 0.2, 1),
    });
    tossRotate.value = withTiming(-26, { duration: 700 });
    tossSkewX.value = withSequence(
      withTiming(14, { duration: 175 }),
      withTiming(-11, { duration: 175 }),
      withTiming(7, { duration: 175 }),
      withTiming(0, { duration: 175 }),
    );
    setTimeout(() => haptics.crumple(), 230);
    setTimeout(() => haptics.crumple(), 460);
    setTimeout(() => haptics.crumple(), 640);

    // Phase 2: toss off the right edge (500ms, delayed 700ms).
    tossTx.value = withDelay(
      700,
      withTiming(SCREEN_WIDTH + 100, { duration: 500, easing: Easing.linear }),
    );
    tossTy.value = withDelay(
      700,
      withSequence(
        withTiming(-90, { duration: 220, easing: Easing.out(Easing.quad) }),
        withTiming(-60, { duration: 280, easing: Easing.in(Easing.quad) }),
      ),
    );
    tossRotate.value = withDelay(700, withTiming(-360, { duration: 500 }));
    tossScale.value = withDelay(700, withTiming(0.10, { duration: 500 }));

    // Phase 3: fade out and remove (200ms, starting at 1100ms).
    tossOpacity.value = withDelay(
      1100,
      withTiming(0, { duration: 200 }, (finished) => {
        if (finished) {
          runOnJS(haptics.crumple)();
          runOnJS(onDelete)(ritual.id);
        }
      }),
    );
  };

  const Icon = getIconComponent(ritual.icon);
  const fillColor = withAlpha(ritual.color, 0.55);
  const blobColor = withAlpha(ritual.color, 0.35);

  return (
    <View style={styles.item}>
      <Animated.View style={wrapperStyle}>
        <Pressable
          onPress={handlePress}
          onLongPress={handleLongPress}
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
          delayLongPress={420}
          disabled={tossing}
          accessibilityRole="button"
          accessibilityLabel={ritual.name}
          accessibilityState={{ selected: ritual.completedToday }}
          accessibilityHint="Tap to mark done. Long-press to remove."
        >
          <View style={styles.circle}>
            <View style={styles.circleClip}>
              <Animated.View
                pointerEvents="none"
                style={[styles.fill, { backgroundColor: fillColor }, fillStyle]}
              />
              <Animated.View
                pointerEvents="none"
                style={[styles.blob, { backgroundColor: blobColor }, blobStyle]}
              />
              <Icon size={26} color={colors.slate} strokeWidth={1.5} />
            </View>
          </View>
        </Pressable>
      </Animated.View>
      <Text style={styles.label} numberOfLines={1}>
        {ritual.name}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  item: {
    width: ITEM_WIDTH,
    alignItems: 'center',
  },
  circle: {
    width: CIRCLE,
    height: CIRCLE,
    borderRadius: CIRCLE / 2,
    backgroundColor: colors.card,
    ...shadows.soft,
  },
  circleClip: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: CIRCLE / 2,
    borderWidth: StyleSheet.hairlineWidth * 2,
    borderColor: colors.divider,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  fill: {
    position: 'absolute',
    width: CIRCLE * 1.25,
    height: CIRCLE * 1.25,
    borderRadius: CIRCLE,
    top: -CIRCLE * 0.1,
    left: -CIRCLE * 0.15,
  },
  blob: {
    position: 'absolute',
    width: CIRCLE * 0.9,
    height: CIRCLE * 0.9,
    borderRadius: CIRCLE,
    top: CIRCLE * 0.2,
    left: CIRCLE * 0.25,
  },
  label: {
    ...typography.caption,
    color: colors.textMuted,
    marginTop: spacing.sm,
    textAlign: 'center',
    maxWidth: ITEM_WIDTH,
  },
});

export const RITUAL_ITEM_WIDTH = ITEM_WIDTH;
export const RITUAL_CIRCLE_SIZE = CIRCLE;
