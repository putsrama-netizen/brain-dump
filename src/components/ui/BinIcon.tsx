import React, { forwardRef } from 'react';
import { View, StyleSheet, type LayoutChangeEvent } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSequence,
  withSpring,
} from 'react-native-reanimated';
import { Trash2 } from 'lucide-react-native';
import { colors } from '../../theme/colors';
import { spacing, radius, shadows } from '../../theme/spacing';

export type BinIconHandle = {
  bounce: () => void;
};

type Props = {
  onLayout?: (e: LayoutChangeEvent) => void;
  size?: number;
};

export const BinIcon = forwardRef<BinIconHandle, Props>(({ onLayout, size = 56 }, ref) => {
  const scale = useSharedValue(1);

  React.useImperativeHandle(ref, () => ({
    bounce: () => {
      scale.value = withSequence(
        withSpring(1.18, { damping: 6, stiffness: 220 }),
        withSpring(1, { damping: 9, stiffness: 180 }),
      );
    },
  }));

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <View
      onLayout={onLayout}
      style={[
        styles.container,
        { width: size, height: size, borderRadius: radius.lg },
      ]}
    >
      <Animated.View style={animatedStyle}>
        <Trash2 size={size * 0.45} color={colors.slateMut} strokeWidth={1.5} />
      </Animated.View>
    </View>
  );
});

BinIcon.displayName = 'BinIcon';

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.card,
    alignItems: 'center',
    justifyContent: 'center',
    margin: spacing.base,
    ...shadows.soft,
  },
});
