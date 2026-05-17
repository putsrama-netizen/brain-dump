import React from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { colors } from '../../theme/colors';

// A subtly wavy underline drawn as a single cubic-bezier path with deliberate
// peak/valley wobble. Sits flush against the bottom of whatever it follows.
//
// width is set via the wrapping View; the SVG re-flows because the viewBox
// keeps the 200-unit drawing space and the SVG itself stretches to 100%.

type Props = {
  // Override the ink color if needed (defaults to the theme's divider).
  color?: string;
  thickness?: number;
};

export function HandDrawnUnderline({
  color = colors.text,
  thickness = 1.2,
}: Props) {
  return (
    <View style={styles.wrap} pointerEvents="none">
      <Svg
        width="100%"
        height={6}
        viewBox="0 0 200 6"
        preserveAspectRatio="none"
      >
        <Path
          d="M2 3.5 C 22 1.6, 48 4.6, 72 3.2 S 122 1.8, 150 3.6 S 188 4.2, 198 2.8"
          stroke={color}
          strokeOpacity={0.55}
          strokeWidth={thickness}
          strokeLinecap="round"
          fill="transparent"
        />
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    width: '100%',
    height: 6,
  },
});
