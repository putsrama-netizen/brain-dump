import React, { useEffect } from 'react';
import Animated, {
  useAnimatedProps,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Path } from 'react-native-svg';

const AnimatedPath = Animated.createAnimatedComponent(Path);

// Two-stroke check mark: the main trace is a slight zig-zag (not a clean
// straight line), and a faint shadow trace sits behind it for the "drew
// over the line twice" pencil look.
const CHECK_PATH = 'M4.5 12.7 L8.6 17.0 L9.1 16.8 L19.0 6.7';
const CHECK_SHADOW = 'M4.8 12.5 L8.9 16.8 L19.2 6.5';

const CHECK_LENGTH = 28;

type Props = {
  active: boolean;
  size?: number;
};

export function ScribbledCheck({ active, size = 14 }: Props) {
  const progress = useSharedValue(active ? 1 : 0);

  useEffect(() => {
    progress.value = withTiming(active ? 1 : 0, { duration: 240 });
  }, [active, progress]);

  const animatedProps = useAnimatedProps(() => ({
    strokeDashoffset: CHECK_LENGTH * (1 - progress.value),
  }));

  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <AnimatedPath
        d={CHECK_SHADOW}
        stroke="#4A4A4A"
        strokeOpacity={0.4}
        strokeWidth={1.6}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="transparent"
        strokeDasharray={CHECK_LENGTH}
        animatedProps={animatedProps}
      />
      <AnimatedPath
        d={CHECK_PATH}
        stroke="#1A1A1A"
        strokeWidth={2.2}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="transparent"
        strokeDasharray={CHECK_LENGTH}
        animatedProps={animatedProps}
      />
    </Svg>
  );
}
