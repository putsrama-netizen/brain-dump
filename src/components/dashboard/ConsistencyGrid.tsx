import React, { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { spacing } from '../../theme/spacing';

type Props = {
  activityDays: Set<number>;
  days?: number;
};

function startOfToday(): number {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

export function ConsistencyGrid({ activityDays, days = 30 }: Props) {
  const todayKey = startOfToday();
  const dayKeys = useMemo(
    () =>
      Array.from({ length: days }, (_, i) =>
        todayKey - (days - 1 - i) * 24 * 60 * 60 * 1000,
      ),
    [days, todayKey],
  );
  const engaged = dayKeys.filter((d) => activityDays.has(d)).length;

  return (
    <View style={styles.wrap}>
      <Text style={styles.label}>
        Engaged{' '}
        <Text style={styles.labelStrong}>{engaged}</Text>
        {' '}of the last {days} days
      </Text>
      <View style={styles.grid}>
        {dayKeys.map((dk) => (
          <View
            key={dk}
            style={[
              styles.dot,
              activityDays.has(dk) && styles.dotFilled,
            ]}
          />
        ))}
      </View>
    </View>
  );
}

const DOT = 8;

const styles = StyleSheet.create({
  wrap: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
    gap: spacing.sm,
  },
  label: {
    ...typography.caption,
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  labelStrong: {
    color: colors.text,
    fontWeight: '600',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 5,
    paddingTop: 2,
  },
  dot: {
    width: DOT,
    height: DOT,
    borderRadius: DOT / 2,
    borderWidth: 1,
    borderColor: 'rgba(26,26,26,0.35)',
    backgroundColor: 'transparent',
  },
  dotFilled: {
    backgroundColor: colors.text,
    borderColor: colors.text,
  },
});
