import React from 'react';
import { StyleSheet, View, type ViewStyle, type StyleProp } from 'react-native';
import Svg, { Defs, Pattern, Circle, Rect } from 'react-native-svg';

// Subtle, deterministic specks tiled across a 120×120 pattern. The values are
// hand-tuned to read as paper grain at small ink opacities and don't shimmer
// when the screen re-renders (no Math.random at runtime).
const SPECKS: readonly { x: number; y: number; r: number; o: number }[] = [
  { x: 7, y: 11, r: 0.55, o: 0.10 },
  { x: 19, y: 28, r: 0.40, o: 0.07 },
  { x: 33, y: 9, r: 0.50, o: 0.09 },
  { x: 48, y: 22, r: 0.35, o: 0.06 },
  { x: 61, y: 6, r: 0.55, o: 0.11 },
  { x: 78, y: 18, r: 0.40, o: 0.08 },
  { x: 94, y: 12, r: 0.45, o: 0.09 },
  { x: 108, y: 27, r: 0.35, o: 0.06 },
  { x: 14, y: 42, r: 0.45, o: 0.08 },
  { x: 29, y: 55, r: 0.55, o: 0.10 },
  { x: 44, y: 47, r: 0.30, o: 0.05 },
  { x: 58, y: 60, r: 0.50, o: 0.09 },
  { x: 72, y: 51, r: 0.40, o: 0.07 },
  { x: 88, y: 45, r: 0.55, o: 0.10 },
  { x: 102, y: 58, r: 0.35, o: 0.06 },
  { x: 117, y: 49, r: 0.45, o: 0.08 },
  { x: 9, y: 73, r: 0.40, o: 0.07 },
  { x: 23, y: 88, r: 0.55, o: 0.11 },
  { x: 38, y: 80, r: 0.30, o: 0.05 },
  { x: 53, y: 95, r: 0.50, o: 0.09 },
  { x: 67, y: 76, r: 0.45, o: 0.08 },
  { x: 82, y: 90, r: 0.35, o: 0.06 },
  { x: 98, y: 81, r: 0.55, o: 0.10 },
  { x: 113, y: 94, r: 0.40, o: 0.07 },
  { x: 17, y: 106, r: 0.50, o: 0.09 },
  { x: 34, y: 113, r: 0.35, o: 0.06 },
  { x: 51, y: 109, r: 0.55, o: 0.10 },
  { x: 70, y: 115, r: 0.40, o: 0.07 },
  { x: 88, y: 104, r: 0.45, o: 0.08 },
  { x: 106, y: 116, r: 0.30, o: 0.05 },
];

function GrainCanvas() {
  return (
    <View style={styles.grainLayer} pointerEvents="none">
      <Svg style={StyleSheet.absoluteFill}>
        <Defs>
          <Pattern
            id="paperGrain"
            patternUnits="userSpaceOnUse"
            width={120}
            height={120}
          >
            {SPECKS.map((s, i) => (
              <Circle
                key={i}
                cx={s.x}
                cy={s.y}
                r={s.r}
                fill="#1A1A1A"
                opacity={s.o}
              />
            ))}
          </Pattern>
        </Defs>
        <Rect x={0} y={0} width="100%" height="100%" fill="url(#paperGrain)" />
      </Svg>
    </View>
  );
}

type Props = {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
};

// Wraps screen content so the grain layer is mounted as a sibling *behind*
// the children in source order. Avoids absolute-positioned-sibling z-order
// quirks (the cause of the earlier toss-animation invisibility bug).
export function PaperGrain({ children, style }: Props) {
  return (
    <View style={[styles.root, style]}>
      <GrainCanvas />
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  grainLayer: {
    ...StyleSheet.absoluteFillObject,
  },
});
