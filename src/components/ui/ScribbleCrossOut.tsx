import React, { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  useAnimatedProps,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Path } from 'react-native-svg';

const AnimatedPath = Animated.createAnimatedComponent(Path);

// Wavy ink line drawn across the entire width of whatever this component is
// laid over. Uses preserveAspectRatio="none" so the path stretches with the
// container instead of staying fixed to its 200-unit viewBox.
const PATH_D =
  'M2 3 C 20 1.5, 45 4.5, 70 2.8 S 120 4.4, 150 3.2 S 188 4.2, 198 2.6';

// Approximate path length, used as the dash-array so we can reveal it via
// strokeDashoffset for a "drawn just now" feel.
const PATH_LEN = 215;

type Props = {
  active: boolean;
};

export function ScribbleCrossOut({ active }: Props) {
  const progress = useSharedValue(active ? 1 : 0);

  useEffect(() => {
    progress.value = withTiming(active ? 1 : 0, { duration: 400 });
  }, [active, progress]);

  const animatedProps = useAnimatedProps(() => ({
    strokeDashoffset: PATH_LEN * (1 - progress.value),
  }));

  return (
    <View style={styles.layer} pointerEvents="none">
      <Svg
        width="100%"
        height="100%"
        viewBox="0 0 200 6"
        preserveAspectRatio="none"
      >
        <AnimatedPath
          d={PATH_D}
          stroke="#1A1A1A"
          strokeOpacity={0.8}
          strokeWidth={1.4}
          strokeLinecap="round"
          fill="none"
          strokeDasharray={PATH_LEN}
          animatedProps={animatedProps}
        />
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  layer: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
  },
});
