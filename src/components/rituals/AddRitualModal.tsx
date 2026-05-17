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
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { spacing, shadows } from '../../theme/spacing';
import { RITUAL_ICONS } from './icons';
import { pickWatercolor, withAlpha } from './palette';

type Props = {
  visible: boolean;
  onClose: () => void;
  onCreate: (input: { name: string; icon: string; color: string }) => void;
};

export function AddRitualModal({ visible, onClose, onCreate }: Props) {
  const [name, setName] = useState('');
  const [iconName, setIconName] = useState<string>(RITUAL_ICONS[0].name);

  useEffect(() => {
    if (visible) {
      setName('');
      setIconName(RITUAL_ICONS[0].name);
    }
  }, [visible]);

  const canSave = name.trim().length > 0;

  const handleSave = () => {
    if (!canSave) return;
    onCreate({
      name: name.trim(),
      icon: iconName,
      color: pickWatercolor(),
    });
    onClose();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View style={styles.headerRow}>
            <Pressable onPress={onClose} hitSlop={12}>
              <Text style={styles.cancelText}>Cancel</Text>
            </Pressable>
            <Text style={styles.title}>New Ritual</Text>
            <Pressable
              onPress={handleSave}
              hitSlop={12}
              disabled={!canSave}
            >
              <Text
                style={[
                  styles.saveText,
                  !canSave && styles.saveTextDisabled,
                ]}
              >
                Save
              </Text>
            </Pressable>
          </View>

          <View style={styles.body}>
            <Text style={styles.fieldLabel}>Name</Text>
            <TextInput
              value={name}
              onChangeText={setName}
              placeholder="Drink water"
              placeholderTextColor={colors.textMuted}
              style={styles.nameInput}
              autoFocus
              maxLength={24}
              returnKeyType="done"
              onSubmitEditing={handleSave}
            />

            <Text style={[styles.fieldLabel, styles.iconLabel]}>Icon</Text>
            <View style={styles.iconGrid}>
              {RITUAL_ICONS.map(({ name: iName, Icon }) => {
                const selected = iName === iconName;
                return (
                  <Pressable
                    key={iName}
                    onPress={() => setIconName(iName)}
                    style={[
                      styles.iconChoice,
                      selected && styles.iconChoiceSelected,
                    ]}
                    accessibilityRole="button"
                    accessibilityState={{ selected }}
                  >
                    <Icon
                      size={24}
                      color={selected ? colors.sageDeep : colors.slate}
                      strokeWidth={1.5}
                    />
                  </Pressable>
                );
              })}
            </View>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
}

const ICON_CHOICE = 56;

const styles = StyleSheet.create({
  flex: { flex: 1 },
  safe: { flex: 1, backgroundColor: colors.paper },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
    paddingBottom: spacing.md,
  },
  title: { ...typography.title, color: colors.text },
  cancelText: { ...typography.body, color: colors.textMuted },
  saveText: { ...typography.body, color: colors.sageDeep, fontWeight: '500' },
  saveTextDisabled: { color: colors.slateMut },
  body: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
  },
  fieldLabel: {
    ...typography.caption,
    color: colors.textMuted,
    textTransform: 'uppercase',
    marginBottom: spacing.sm,
  },
  iconLabel: { marginTop: spacing.xxl },
  nameInput: {
    ...typography.input,
    color: colors.text,
    backgroundColor: colors.card,
    borderRadius: 16,
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.md,
    ...shadows.soft,
  },
  iconGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  iconChoice: {
    width: ICON_CHOICE,
    height: ICON_CHOICE,
    borderRadius: ICON_CHOICE / 2,
    backgroundColor: colors.card,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth * 2,
    borderColor: colors.divider,
    ...shadows.soft,
  },
  iconChoiceSelected: {
    borderColor: colors.sageDeep,
    backgroundColor: withAlpha(colors.sage, 0.18),
  },
});
