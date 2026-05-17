import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Plus } from 'lucide-react-native';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { spacing } from '../../theme/spacing';
import { TodoItem } from './TodoItem';
import { HandDrawnUnderline } from '../ui/HandDrawnUnderline';
import {
  dueDateForBucket,
  type DueBucket,
} from '../../lib/dueDate';
import type { Task } from '../../db/schema';

export type AddTaskMeta = {
  dueDate: number | null;
  isImportant: boolean;
};

type Props = {
  // null → main inbox (no header). Otherwise the note-derived header.
  title?: string | null;
  placeholder: string;
  tasks: Task[];
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
  onToggleImportant: (id: string) => void;
  onAdd: (content: string, meta: AddTaskMeta) => void;
};

const CIRCLE = 18;

const BUCKETS: { key: DueBucket; label: string }[] = [
  { key: 'today', label: 'Today' },
  { key: 'tomorrow', label: 'Tomorrow' },
  { key: 'someday', label: 'Someday' },
];

export function TodoSection({
  title,
  placeholder,
  tasks,
  onToggle,
  onDelete,
  onToggleImportant,
  onAdd,
}: Props) {
  const [draft, setDraft] = useState('');
  const [bucket, setBucket] = useState<DueBucket | null>(null);

  const submit = () => {
    const trimmed = draft.trim();
    if (!trimmed) return;
    onAdd(trimmed, {
      dueDate: bucket ? dueDateForBucket(bucket) : null,
      isImportant: false, // star toggles after the task exists
    });
    setDraft('');
    setBucket(null);
  };

  const pickerVisible = draft.length > 0;

  return (
    <View style={styles.section}>
      {title ? (
        <View style={styles.headerWrap}>
          <Text style={styles.header} numberOfLines={2}>
            {title}
          </Text>
          <View style={styles.underline}>
            <HandDrawnUnderline />
          </View>
        </View>
      ) : null}
      {tasks.map((task) => (
        <TodoItem
          key={task.id}
          task={task}
          onToggle={onToggle}
          onDelete={onDelete}
          onToggleImportant={onToggleImportant}
        />
      ))}
      <View style={styles.addRow}>
        <View style={styles.addCircle}>
          <Plus size={12} color={colors.textMuted} strokeWidth={1.8} />
        </View>
        <TextInput
          value={draft}
          onChangeText={setDraft}
          placeholder={placeholder}
          placeholderTextColor={colors.textMuted}
          style={styles.addInput}
          returnKeyType="done"
          onSubmitEditing={submit}
          blurOnSubmit={false}
          maxLength={140}
        />
      </View>
      {pickerVisible ? (
        <View style={styles.pickerRow}>
          {BUCKETS.map((b) => {
            const selected = bucket === b.key;
            return (
              <Pressable
                key={b.key}
                onPress={() => setBucket(selected ? null : b.key)}
                hitSlop={6}
                style={({ pressed }) => [
                  styles.pickerBtn,
                  pressed && { opacity: 0.6 },
                ]}
                accessibilityRole="button"
                accessibilityState={{ selected }}
              >
                <Text
                  style={[
                    styles.pickerText,
                    selected && styles.pickerTextSelected,
                  ]}
                >
                  {b.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    paddingVertical: spacing.sm,
  },
  headerWrap: {
    paddingTop: spacing.md,
    paddingBottom: spacing.xs,
    paddingHorizontal: spacing.xl,
  },
  header: {
    ...typography.title,
    fontStyle: 'italic',
    fontSize: 18,
    lineHeight: 24,
    color: colors.text,
  },
  underline: {
    marginTop: 2,
    width: '60%',
  },
  addRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.sm,
  },
  addCircle: {
    width: CIRCLE,
    height: CIRCLE,
    borderRadius: CIRCLE / 2,
    borderWidth: 1,
    borderColor: colors.divider,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
  },
  addInput: {
    ...typography.input,
    fontSize: 15,
    lineHeight: 22,
    color: colors.text,
    flex: 1,
    paddingVertical: 0,
  },
  pickerRow: {
    flexDirection: 'row',
    gap: spacing.lg,
    paddingHorizontal: spacing.xl + CIRCLE + spacing.md,
    paddingBottom: spacing.sm,
  },
  pickerBtn: {
    paddingVertical: 2,
  },
  pickerText: {
    fontFamily: typography.body.fontFamily,
    fontSize: 12,
    color: colors.textMuted,
    letterSpacing: 0.3,
  },
  pickerTextSelected: {
    color: colors.text,
    fontWeight: '600',
  },
});
