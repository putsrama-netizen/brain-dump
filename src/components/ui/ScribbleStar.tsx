import React, { useEffect } from 'react';
import Animated, {
  useAnimatedProps,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Path } from 'react-native-svg';
import { withAlpha } from '../rituals/palette';
import { colors } from '../../theme/colors';

const AnimatedPath = Animated.createAnimatedComponent(Path);

// 5-point star with deliberately wobbly vertices so it reads as hand-drawn.
// Two overlapping strokes (offset by ~1px) mimic the doubled pencil line that
// happens when you trace a shape too fast.
const STAR_OUTER =
  'M12 1.6 L14.6 8.2 L21.8 8.8 L16.1 13.5 L18.0 20.6 L12 16.7 L5.9 20.7 L7.8 13.5 L2.2 8.7 L9.4 8.2 Z';
const STAR_SHADOW =
  'M12.4 2.1 L14.9 8.6 L22.0 9.2 L16.4 13.9 L18.3 21.0 L12.4 17.1 L6.3 21.1 L8.1 13.9 L2.6 9.0 L9.7 8.5 Z';

// Approximate perimeter length of the star path — used as the
// strokeDasharray length so the animation reveals 0%→100%. Slightly
// over-estimated so the final state is fully drawn even after rounding.
const STAR_LENGTH = 92;

type Props = {
  active: boolean;
  size?: number;
};

export function ScribbleStar({ active, size = 18 }: Props) {
  const progress = useSharedValue(active ? 1 : 0);

  useEffect(() => {
    progress.value = withTiming(active ? 1 : 0, { duration: 300 });
  }, [active, progress]);

  const animatedProps = useAnimatedProps(() => ({
    strokeDashoffset: STAR_LENGTH * (1 - progress.value),
  }));

  const fill = active ? withAlpha(colors.sage, 0.5) : 'transparent';

  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      {/* Lower "pencil pressure" trace — drawn behind, slightly offset, lighter. */}
      <AnimatedPath
        d={STAR_SHADOW}
        stroke="#4A4A4A"
        strokeOpacity={0.35}
        strokeWidth={1.2}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="transparent"
        strokeDasharray={STAR_LENGTH}
        animatedProps={animatedProps}
      />
      {/* Primary trace + fill on top. */}
      <AnimatedPath
        d={STAR_OUTER}
        stroke="#4A4A4A"
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill={fill}
        strokeDasharray={STAR_LENGTH}
        animatedProps={animatedProps}
      />
    </Svg>
  );
}
