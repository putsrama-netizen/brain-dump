import React, { useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { spacing, radius, shadows } from '../../theme/spacing';

type Props = {
  visible: boolean;
  count: number;
  onClose: () => void;
  onConfirm: () => Promise<void> | void;
};

export function ArchiveCompletedModal({
  visible,
  count,
  onClose,
  onConfirm,
}: Props) {
  const [running, setRunning] = useState(false);

  const handleConfirm = async () => {
    if (running) return;
    setRunning(true);
    try {
      await onConfirm();
      onClose();
    } finally {
      setRunning(false);
    }
  };

  const canConfirm = count > 0 && !running;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.sheet} onPress={() => {}}>
          <Text style={styles.title}>Archive completed</Text>
          <Text style={styles.body}>
            Clear{' '}
            <Text style={styles.bodyStrong}>
              {count} {count === 1 ? 'task' : 'tasks'}
            </Text>{' '}
            from the Completed list?
          </Text>
          <Text style={styles.subtle}>
            Archived tasks are removed from the to-do list. This can&apos;t
            be undone.
          </Text>
          <View style={styles.actions}>
            <Pressable onPress={onClose} hitSlop={8}>
              <Text style={styles.cancelText}>Cancel</Text>
            </Pressable>
            <Pressable
              onPress={handleConfirm}
              disabled={!canConfirm}
              hitSlop={8}
            >
              <Text
                style={[
                  styles.confirmText,
                  !canConfirm && styles.confirmTextDisabled,
                ]}
              >
                {running ? 'Archiving…' : 'Archive'}
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
  bodyStrong: { fontWeight: '600' },
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
  confirmText: { ...typography.body, color: colors.text, fontWeight: '600' },
  confirmTextDisabled: { color: colors.slateMut },
});
