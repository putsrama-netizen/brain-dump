import React, { useEffect, useState } from 'react';
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { spacing, radius, shadows } from '../../theme/spacing';
import { notesRepo } from '../../db/repositories/notes';

type Props = {
  visible: boolean;
  onClose: () => void;
  onSwept: (count: number) => void;
  // Default 30 days; we surface this in the copy so it isn't surprising.
  days?: number;
};

export function SweepModal({
  visible,
  onClose,
  onSwept,
  days = 30,
}: Props) {
  const [count, setCount] = useState<number | null>(null);
  const [running, setRunning] = useState(false);

  useEffect(() => {
    if (!visible) return;
    setCount(null);
    notesRepo
      .countOlderThan(days)
      .then(setCount)
      .catch((e) => {
        console.error('[sweep] count failed:', e);
        setCount(0);
      });
  }, [visible, days]);

  const handleSweep = async () => {
    if (running) return;
    setRunning(true);
    try {
      const n = await notesRepo.sweepOlderThan(days);
      onSwept(n);
      onClose();
    } catch (e) {
      console.error('[sweep] failed:', e);
    } finally {
      setRunning(false);
    }
  };

  const canSweep = count !== null && count > 0 && !running;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.sheet} onPress={() => {}}>
          <Text style={styles.title}>Sweep older notes</Text>
          <Text style={styles.body}>
            {count === null
              ? 'Looking at your kept notes…'
              : count === 0
                ? `Nothing older than ${days} days yet.`
                : `Set aside ${count} ${count === 1 ? 'note' : 'notes'} you kept more than ${days} days ago?`}
          </Text>
          <Text style={styles.subtle}>
            Swept notes leave the Dashboard. Nothing is permanently deleted.
          </Text>
          <View style={styles.actions}>
            <Pressable onPress={onClose} hitSlop={8}>
              <Text style={styles.cancelText}>Cancel</Text>
            </Pressable>
            <Pressable
              onPress={handleSweep}
              disabled={!canSweep}
              hitSlop={8}
            >
              <Text
                style={[
                  styles.confirmText,
                  !canSweep && styles.confirmTextDisabled,
                ]}
              >
                {running ? 'Sweeping…' : 'Sweep'}
              </Text>
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: colors.overlay,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  sheet: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.divider,
    padding: spacing.lg,
    gap: spacing.sm,
    ...shadows.card,
  },
  title: {
    ...typography.title,
    fontStyle: 'italic',
    color: colors.text,
  },
  body: {
    ...typography.body,
    fontSize: 15,
    color: colors.text,
    lineHeight: 22,
  },
  subtle: {
    ...typography.body,
    fontSize: 13,
    fontStyle: 'italic',
    color: colors.textMuted,
    lineHeight: 18,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: spacing.sm,
  },
  cancelText: { ...typography.body, color: colors.textMuted },
  confirmText: {
    ...typography.body,
    color: colors.text,
    fontWeight: '600',
  },
  confirmTextDisabled: { color: colors.slateMut },
});
