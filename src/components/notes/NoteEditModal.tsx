import React, { useCallback, useEffect, useState } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Plus } from 'lucide-react-native';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { spacing, radius } from '../../theme/spacing';
import { withAlpha } from '../rituals/palette';
import { TodoItem } from '../todos/TodoItem';
import { tasksRepo } from '../../db/repositories/tasks';
import { dueDateForBucket, type DueBucket } from '../../lib/dueDate';
import type { Group, Note, Task } from '../../db/schema';

const BUCKETS: { key: DueBucket; label: string }[] = [
  { key: 'today', label: 'Today' },
  { key: 'tomorrow', label: 'Tomorrow' },
  { key: 'someday', label: 'Someday' },
];

type Props = {
  note: Note | null;
  groups: Group[];
  onClose: () => void;
  onSave: (
    id: string,
    content: string,
    groupId: string | null,
  ) => void | Promise<void>;
  onCreateGroup: () => void;
  // Lets Dashboard re-fetch task-stat badges once the modal closes.
  onTasksChanged?: () => void;
};

export function NoteEditModal({
  note,
  groups,
  onClose,
  onSave,
  onCreateGroup,
  onTasksChanged,
}: Props) {
  const [draft, setDraft] = useState('');
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [stepDraft, setStepDraft] = useState('');
  const [stepBucket, setStepBucket] = useState<DueBucket | null>(null);
  const [tasksDirty, setTasksDirty] = useState(false);

  const reloadTasks = useCallback(async (noteId: string) => {
    const rows = await tasksRepo.listByNote(noteId);
    setTasks(rows);
  }, []);

  useEffect(() => {
    if (note) {
      setDraft(note.content);
      setSelectedGroupId(note.groupId ?? null);
      setStepDraft('');
      setStepBucket(null);
      setTasksDirty(false);
      reloadTasks(note.id).catch((e) => console.error('[edit] load tasks:', e));
    } else {
      setTasks([]);
    }
  }, [note, reloadTasks]);

  const canSave = !!note && draft.trim().length > 0;

  const handleSave = async () => {
    if (!note || !canSave) return;
    // Flush any unsubmitted step draft so the user doesn't lose what they
    // were typing in the Action Steps input.
    const pendingStep = stepDraft.trim();
    if (pendingStep) {
      try {
        const created = await tasksRepo.create(pendingStep, {
          noteId: note.id,
          dueDate: stepBucket ? dueDateForBucket(stepBucket) : null,
        });
        setTasks((prev) => [...prev, created]);
        setTasksDirty(true);
        setStepDraft('');
        setStepBucket(null);
      } catch (e) {
        console.error('[edit] flush step on save:', e);
      }
    }
    onSave(note.id, draft, selectedGroupId);
    if (tasksDirty || pendingStep) onTasksChanged?.();
    onClose();
  };

  const handleClose = () => {
    if (tasksDirty) onTasksChanged?.();
    onClose();
  };

  const handleAddStep = async () => {
    const trimmed = stepDraft.trim();
    if (!trimmed || !note) return;
    const dueDate = stepBucket ? dueDateForBucket(stepBucket) : null;
    setStepDraft('');
    setStepBucket(null);
    try {
      const created = await tasksRepo.create(trimmed, {
        noteId: note.id,
        dueDate,
      });
      setTasks((prev) => [...prev, created]);
      setTasksDirty(true);
    } catch (e) {
      console.error('[edit] add step failed:', e);
    }
  };

  const handleToggleStep = async (id: string) => {
    setTasks((prev) =>
      prev.map((t) =>
        t.id === id
          ? {
              ...t,
              completed: !t.completed,
              completedAt: !t.completed ? Date.now() : null,
            }
          : t,
      ),
    );
    setTasksDirty(true);
    try {
      await tasksRepo.toggle(id);
    } catch (e) {
      console.error('[edit] toggle step failed:', e);
      if (note) reloadTasks(note.id);
    }
  };

  const handleDeleteStep = async (id: string) => {
    setTasks((prev) => prev.filter((t) => t.id !== id));
    setTasksDirty(true);
    try {
      await tasksRepo.delete(id);
    } catch (e) {
      console.error('[edit] delete step failed:', e);
      if (note) reloadTasks(note.id);
    }
  };

  return (
    <Modal
      visible={!!note}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleClose}
    >
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View style={styles.headerRow}>
            <Pressable onPress={handleClose} hitSlop={12}>
              <Text style={styles.cancelText}>Cancel</Text>
            </Pressable>
            <Text style={styles.title}>Edit note</Text>
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

          <ScrollView
            style={styles.body}
            contentContainerStyle={styles.bodyContent}
            keyboardShouldPersistTaps="handled"
          >
            <TextInput
              value={draft}
              onChangeText={setDraft}
              placeholder="Refine your thought…"
              placeholderTextColor={colors.textMuted}
              style={styles.textInput}
              multiline
              textAlignVertical="top"
              autoFocus
            />

            <Text style={styles.fieldLabel}>Group</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.chipsRow}
            >
              <GroupChip
                label="None"
                selected={selectedGroupId === null}
                onPress={() => setSelectedGroupId(null)}
              />
              {groups.map((g) => (
                <GroupChip
                  key={g.id}
                  label={g.name}
                  selected={selectedGroupId === g.id}
                  onPress={() => setSelectedGroupId(g.id)}
                />
              ))}
              <Pressable
                onPress={onCreateGroup}
                style={({ pressed }) => [
                  styles.chip,
                  styles.chipNew,
                  pressed && styles.chipPressed,
                ]}
                accessibilityRole="button"
                accessibilityLabel="Create new group"
              >
                <Plus size={14} color={colors.text} strokeWidth={1.8} />
                <Text style={styles.chipNewText}>New</Text>
              </Pressable>
            </ScrollView>

            <Text style={styles.fieldLabel}>Action Steps</Text>
            <View style={styles.stepsContainer}>
              {tasks.length === 0 ? (
                <Text style={styles.stepsEmpty}>
                  No steps yet. Add one below.
                </Text>
              ) : (
                tasks.map((task) => (
                  <TodoItem
                    key={task.id}
                    task={task}
                    onToggle={handleToggleStep}
                    onDelete={handleDeleteStep}
                  />
                ))
              )}
              <View style={styles.addStepRow}>
                <Pressable
                  onPress={handleAddStep}
                  hitSlop={8}
                  disabled={!stepDraft.trim()}
                  style={({ pressed }) => [
                    styles.addStepCircle,
                    !stepDraft.trim() && styles.addStepCircleDisabled,
                    pressed && styles.addStepCirclePressed,
                  ]}
                  accessibilityRole="button"
                  accessibilityLabel="Add step"
                >
                  <Plus size={12} color={colors.text} strokeWidth={1.8} />
                </Pressable>
                <TextInput
                  value={stepDraft}
                  onChangeText={setStepDraft}
                  placeholder="Add a step"
                  placeholderTextColor={colors.textMuted}
                  style={styles.addStepInput}
                  returnKeyType="done"
                  onSubmitEditing={handleAddStep}
                  blurOnSubmit={false}
                  maxLength={140}
                />
              </View>
              {stepDraft.length > 0 ? (
                <View style={styles.bucketRow}>
                  {BUCKETS.map((b) => {
                    const selected = stepBucket === b.key;
                    return (
                      <Pressable
                        key={b.key}
                        onPress={() => setStepBucket(selected ? null : b.key)}
                        hitSlop={6}
                        style={({ pressed }) => [
                          styles.bucketBtn,
                          pressed && { opacity: 0.6 },
                        ]}
                        accessibilityRole="button"
                        accessibilityState={{ selected }}
                      >
                        <Text
                          style={[
                            styles.bucketText,
                            selected && styles.bucketTextSelected,
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
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
}

function GroupChip({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.chip,
        selected && styles.chipSelected,
        pressed && styles.chipPressed,
      ]}
      accessibilityRole="button"
      accessibilityState={{ selected }}
    >
      <Text
        style={[styles.chipText, selected && styles.chipTextSelected]}
        numberOfLines={1}
      >
        {label}
      </Text>
    </Pressable>
  );
}

const STEP_CIRCLE = 18;

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
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  title: { ...typography.title, color: colors.text },
  cancelText: { ...typography.body, color: colors.textMuted },
  saveText: { ...typography.body, color: colors.text, fontWeight: '600' },
  saveTextDisabled: { color: colors.slateMut },
  body: { flex: 1 },
  bodyContent: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
    paddingBottom: spacing.xxl,
    gap: spacing.lg,
  },
  textInput: {
    ...typography.input,
    fontSize: 17,
    color: colors.text,
    minHeight: 160,
    backgroundColor: colors.card,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.divider,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  fieldLabel: {
    ...typography.caption,
    color: colors.textMuted,
    textTransform: 'uppercase',
    marginBottom: -spacing.xs,
  },
  chipsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    paddingVertical: spacing.xs,
  },
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.divider,
    backgroundColor: colors.card,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  chipPressed: { opacity: 0.7 },
  chipSelected: {
    borderColor: colors.text,
    backgroundColor: withAlpha(colors.sage, 0.4),
  },
  chipText: { ...typography.body, fontSize: 14, color: colors.text },
  chipTextSelected: { fontWeight: '600' },
  chipNew: { borderStyle: 'dashed' },
  chipNewText: { ...typography.body, fontSize: 14, color: colors.text },
  stepsContainer: {
    backgroundColor: colors.card,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.divider,
    paddingVertical: spacing.xs,
    // Negative horizontal padding to counteract TodoItem's wide screen padding.
    marginHorizontal: -spacing.md,
  },
  stepsEmpty: {
    ...typography.body,
    fontSize: 14,
    color: colors.textMuted,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.xl,
  },
  addStepRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.sm,
  },
  addStepCircle: {
    width: STEP_CIRCLE,
    height: STEP_CIRCLE,
    borderRadius: STEP_CIRCLE / 2,
    borderWidth: 1,
    borderColor: colors.text,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addStepCircleDisabled: {
    borderColor: colors.divider,
    borderStyle: 'dashed',
    opacity: 0.6,
  },
  addStepCirclePressed: {
    opacity: 0.6,
  },
  addStepInput: {
    ...typography.input,
    fontSize: 15,
    lineHeight: 22,
    color: colors.text,
    flex: 1,
    paddingVertical: 0,
  },
  bucketRow: {
    flexDirection: 'row',
    gap: spacing.lg,
    paddingHorizontal: spacing.xl + STEP_CIRCLE + spacing.md,
    paddingBottom: spacing.sm,
  },
  bucketBtn: {
    paddingVertical: 2,
  },
  bucketText: {
    fontFamily: typography.body.fontFamily,
    fontSize: 12,
    color: colors.textMuted,
    letterSpacing: 0.3,
  },
  bucketTextSelected: {
    color: colors.text,
    fontWeight: '600',
  },
});
