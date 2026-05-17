import React, { useEffect, useState } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { spacing, radius, shadows } from '../../theme/spacing';

type Props = {
  visible: boolean;
  onClose: () => void;
  onCreate: (name: string) => void;
};

export function NewGroupModal({ visible, onClose, onCreate }: Props) {
  const [name, setName] = useState('');

  useEffect(() => {
    if (visible) setName('');
  }, [visible]);

  const canSave = name.trim().length > 0;
  const save = () => {
    if (!canSave) return;
    onCreate(name.trim());
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable style={styles.backdrop} onPress={onClose}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.flex}
        >
          <Pressable style={styles.sheet} onPress={() => {}}>
            <Text style={styles.title}>New group</Text>
            <TextInput
              value={name}
              onChangeText={setName}
              placeholder="Business Ideas"
              placeholderTextColor={colors.textMuted}
              style={styles.input}
              autoFocus
              maxLength={40}
              returnKeyType="done"
              onSubmitEditing={save}
            />
            <View style={styles.actions}>
              <Pressable onPress={onClose} hitSlop={8}>
                <Text style={styles.cancelText}>Cancel</Text>
              </Pressable>
              <Pressable
                onPress={save}
                disabled={!canSave}
                hitSlop={8}
              >
                <Text
                  style={[
                    styles.saveText,
                    !canSave && styles.saveTextDisabled,
                  ]}
                >
                  Create
                </Text>
              </Pressable>
            </View>
          </Pressable>
        </KeyboardAvoidingView>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, width: '100%' },
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
    alignSelf: 'center',
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.divider,
    padding: spacing.lg,
    gap: spacing.md,
    ...shadows.card,
  },
  title: {
    ...typography.title,
    fontStyle: 'italic',
    color: colors.text,
  },
  input: {
    ...typography.input,
    fontSize: 17,
    color: colors.text,
    backgroundColor: colors.paper,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.divider,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: spacing.xs,
  },
  cancelText: {
    ...typography.body,
    color: colors.textMuted,
  },
  saveText: {
    ...typography.body,
    color: colors.text,
    fontWeight: '600',
  },
  saveTextDisabled: {
    color: colors.slateMut,
  },
});
