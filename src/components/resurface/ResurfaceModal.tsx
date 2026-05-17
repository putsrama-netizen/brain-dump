import React from 'react';
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { spacing, radius, shadows } from '../../theme/spacing';
import { HandDrawnUnderline } from '../ui/HandDrawnUnderline';
import type { Note } from '../../db/schema';

type Props = {
  note: Note | null;
  onClose: () => void;
  onToss: (note: Note) => void;
  onKeep: (note: Note) => void;
  onAddSteps: (note: Note) => void;
};

function describeAge(note: Note): string {
  const days = Math.round((Date.now() - note.createdAt) / (24 * 60 * 60 * 1000));
  if (days <= 1) return 'From yesterday';
  if (days < 14) return `From ${days} days ago`;
  if (days < 60) return `From ${Math.round(days / 7)} weeks ago`;
  return `From ${Math.round(days / 30)} months ago`;
}

export function ResurfaceModal({
  note,
  onClose,
  onToss,
  onKeep,
  onAddSteps,
}: Props) {
  if (!note) return null;
  return (
    <Modal
      visible
      animationType="fade"
      transparent
      onRequestClose={onClose}
    >
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <View style={styles.body}>
          <View style={styles.header}>
            <Text style={styles.title}>Something from earlier</Text>
            <View style={styles.underline}>
              <HandDrawnUnderline />
            </View>
            <Text style={styles.age}>{describeAge(note)}</Text>
          </View>

          <View
            style={[
              styles.card,
              { backgroundColor: note.color || colors.card },
            ]}
          >
            <Text style={styles.cardText}>{note.content}</Text>
          </View>

          <View style={styles.actions}>
            <Pressable
              onPress={() => onToss(note)}
              style={({ pressed }) => [
                styles.actionBtn,
                styles.tossBtn,
                pressed && styles.pressed,
              ]}
              accessibilityRole="button"
            >
              <Text style={[styles.actionText, styles.tossText]}>Toss</Text>
            </Pressable>
            <Pressable
              onPress={() => onKeep(note)}
              style={({ pressed }) => [
                styles.actionBtn,
                styles.keepBtn,
                pressed && styles.pressed,
              ]}
              accessibilityRole="button"
            >
              <Text style={[styles.actionText, styles.keepText]}>Keep</Text>
            </Pressable>
            <Pressable
              onPress={() => onAddSteps(note)}
              style={({ pressed }) => [
                styles.actionBtn,
                styles.stepsBtn,
                pressed && styles.pressed,
              ]}
              accessibilityRole="button"
            >
              <Text style={[styles.actionText, styles.stepsText]}>
                Add Action Steps
              </Text>
            </Pressable>
          </View>

          <Pressable
            onPress={onClose}
            hitSlop={8}
            style={({ pressed }) => [
              styles.skipBtn,
              pressed && { opacity: 0.6 },
            ]}
            accessibilityRole="button"
          >
            <Text style={styles.skipText}>Skip for now</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.paper,
  },
  body: {
    flex: 1,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xxl,
    paddingBottom: spacing.xl,
    gap: spacing.xl,
  },
  header: {
    alignItems: 'flex-start',
    gap: spacing.xs,
  },
  title: {
    ...typography.title,
    fontStyle: 'italic',
    color: colors.text,
  },
  underline: {
    width: 100,
  },
  age: {
    ...typography.caption,
    color: colors.textMuted,
    textTransform: 'uppercase',
    marginTop: spacing.sm,
  },
  card: {
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.divider,
    padding: spacing.xl,
    transform: [{ rotate: '-0.8deg' }],
    ...shadows.card,
    minHeight: 160,
  },
  cardText: {
    ...typography.input,
    fontSize: 16,
    lineHeight: 24,
    color: colors.text,
  },
  actions: {
    gap: spacing.md,
  },
  actionBtn: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.pill,
    alignItems: 'center',
  },
  pressed: { opacity: 0.85 },
  actionText: {
    ...typography.body,
    fontWeight: '600',
  },
  tossBtn: { backgroundColor: colors.slate },
  tossText: { color: colors.paper },
  keepBtn: { backgroundColor: colors.sand },
  keepText: { color: colors.slate },
  stepsBtn: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.text,
  },
  stepsText: { color: colors.text },
  skipBtn: {
    alignSelf: 'center',
    paddingVertical: spacing.sm,
  },
  skipText: {
    ...typography.body,
    fontSize: 13,
    color: colors.textMuted,
    fontStyle: 'italic',
  },
});
