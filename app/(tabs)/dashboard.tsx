import React, { useCallback, useEffect, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Plus } from 'lucide-react-native';
import { colors } from '../../src/theme/colors';
import { typography } from '../../src/theme/typography';
import { spacing, radius } from '../../src/theme/spacing';
import { PaperGrain } from '../../src/components/ui/PaperGrain';
import { HandDrawnUnderline } from '../../src/components/ui/HandDrawnUnderline';
import { ConsistencyGrid } from '../../src/components/dashboard/ConsistencyGrid';
import { NoteCard } from '../../src/components/notes/NoteCard';
import { NoteEditModal } from '../../src/components/notes/NoteEditModal';
import { NewGroupModal } from '../../src/components/notes/NewGroupModal';
import { notesRepo } from '../../src/db/repositories/notes';
import { tasksRepo } from '../../src/db/repositories/tasks';
import { groupsRepo } from '../../src/db/repositories/groups';
import { promptAnalyticsRepo } from '../../src/db/repositories/promptAnalytics';
import { haptics } from '../../src/hooks/useHaptics';
import type { Group, Note } from '../../src/db/schema';

function splitMasonry(notes: Note[]): { left: Note[]; right: Note[] } {
  const left: Note[] = [];
  const right: Note[] = [];
  let leftWeight = 0;
  let rightWeight = 0;
  for (const note of notes) {
    const weight = note.content.length + 24;
    if (leftWeight <= rightWeight) {
      left.push(note);
      leftWeight += weight;
    } else {
      right.push(note);
      rightWeight += weight;
    }
  }
  return { left, right };
}

export default function DashboardScreen() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [taskStats, setTaskStats] = useState<
    Map<string, { total: number; done: number }>
  >(new Map());
  const [activityDays, setActivityDays] = useState<Set<number>>(new Set());
  const [editing, setEditing] = useState<Note | null>(null);
  const [groupModalOpen, setGroupModalOpen] = useState(false);

  // Brain Dump's Resurface modal can deep-link here with `editNoteId` to open
  // the edit modal directly for a specific past note. Clear the param once
  // consumed so a tab-switch doesn't re-trigger it.
  const { editNoteId } = useLocalSearchParams<{ editNoteId?: string }>();
  const router = useRouter();

  const reload = useCallback(async () => {
    const [n, g, s, noteDays, completedDays] = await Promise.all([
      notesRepo.listActive(),
      groupsRepo.list(),
      tasksRepo.countsByNote(),
      notesRepo.listCreationActivityDays(30),
      promptAnalyticsRepo.listCompletedActivityDays(30),
    ]);
    setNotes(n);
    setGroups(g);
    setTaskStats(s);
    const union = new Set<number>();
    noteDays.forEach((d) => union.add(d));
    completedDays.forEach((d) => union.add(d));
    setActivityDays(union);
  }, []);

  // Pulls just the task counts, used after the edit modal closes so badges
  // refresh without re-fetching every note + group.
  const reloadTaskStats = useCallback(async () => {
    try {
      const s = await tasksRepo.countsByNote();
      setTaskStats(s);
    } catch (e) {
      console.error('[dashboard] reload task stats:', e);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      reload();
    }, [reload]),
  );

  // When Brain Dump deep-links here with editNoteId, open the matching note's
  // edit modal once data is loaded. Clear the param afterward so re-focusing
  // this tab later doesn't reopen the modal.
  useEffect(() => {
    if (!editNoteId || notes.length === 0) return;
    const target = notes.find((n) => n.id === editNoteId);
    if (target) {
      setEditing(target);
      router.setParams({ editNoteId: undefined });
    }
  }, [editNoteId, notes, router]);

  const handleTap = (note: Note) => {
    haptics.tap();
    setEditing(note);
  };

  const handleDelete = async (id: string) => {
    setNotes((prev) => prev.filter((n) => n.id !== id));
    await notesRepo.hardDelete(id);
  };

  const handleSave = async (
    id: string,
    content: string,
    groupId: string | null,
  ) => {
    setNotes((prev) =>
      prev.map((n) =>
        n.id === id ? { ...n, content: content.trim(), groupId } : n,
      ),
    );
    await notesRepo.updateContent(id, content);
    await notesRepo.move(id, groupId);
  };

  const handleCreateGroup = async (name: string) => {
    const created = await groupsRepo.create(name);
    setGroups((prev) => [...prev, created]);
    haptics.tap();
  };

  // Split notes into ungrouped + per-group buckets.
  const ungrouped = notes.filter((n) => !n.groupId);
  const grouped = groups
    .map((g) => ({
      group: g,
      notes: notes.filter((n) => n.groupId === g.id),
    }))
    .filter((s) => s.notes.length > 0);

  const ungroupedCols = splitMasonry(ungrouped);

  const renderCard = (note: Note) => (
    <NoteCard
      key={note.id}
      note={note}
      onTap={handleTap}
      onDelete={handleDelete}
      taskStats={taskStats.get(note.id)}
    />
  );

  const renderColumns = (set: Note[]) => {
    const { left, right } = splitMasonry(set);
    return (
      <View style={styles.columns}>
        <View style={styles.column}>{left.map(renderCard)}</View>
        <View style={styles.column}>{right.map(renderCard)}</View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <PaperGrain>
        <View style={styles.headerRow}>
          <View style={styles.headerText}>
            <Text style={styles.title}>Dashboard</Text>
            <Text style={styles.subtitle}>Your kept thoughts.</Text>
          </View>
          <Pressable
            onPress={() => setGroupModalOpen(true)}
            style={({ pressed }) => [
              styles.newGroupBtn,
              pressed && styles.newGroupBtnPressed,
            ]}
            accessibilityRole="button"
            accessibilityLabel="New group"
          >
            <Plus size={14} color={colors.text} strokeWidth={1.8} />
            <Text style={styles.newGroupText}>New Group</Text>
          </Pressable>
        </View>

        <ConsistencyGrid activityDays={activityDays} />

        {notes.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>Nothing kept yet.</Text>
            <Text style={styles.emptyBody}>
              Use Keep on Brain Dump to save anything worth revisiting.
            </Text>
          </View>
        ) : (
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {ungrouped.length > 0 && (
              <View style={styles.section}>
                {grouped.length > 0 && (
                  <View style={styles.sectionHeaderWrap}>
                    <Text style={styles.sectionHeader}>Unsorted</Text>
                    <View style={styles.sectionUnderline}>
                      <HandDrawnUnderline />
                    </View>
                  </View>
                )}
                <View style={styles.columns}>
                  <View style={styles.column}>
                    {ungroupedCols.left.map(renderCard)}
                  </View>
                  <View style={styles.column}>
                    {ungroupedCols.right.map(renderCard)}
                  </View>
                </View>
              </View>
            )}
            {grouped.map((section) => (
              <View key={section.group.id} style={styles.section}>
                <View style={styles.sectionHeaderWrap}>
                  <Text style={styles.sectionHeader}>{section.group.name}</Text>
                  <View style={styles.sectionUnderline}>
                    <HandDrawnUnderline />
                  </View>
                </View>
                {renderColumns(section.notes)}
              </View>
            ))}
          </ScrollView>
        )}
      </PaperGrain>

      <NoteEditModal
        note={editing}
        groups={groups}
        onClose={() => setEditing(null)}
        onSave={handleSave}
        onCreateGroup={() => setGroupModalOpen(true)}
        onTasksChanged={reloadTaskStats}
      />
      <NewGroupModal
        visible={groupModalOpen}
        onClose={() => setGroupModalOpen(false)}
        onCreate={handleCreateGroup}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.paper },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
    gap: spacing.md,
  },
  headerText: { flexShrink: 1 },
  title: { ...typography.display, color: colors.text },
  subtitle: {
    ...typography.body,
    color: colors.textMuted,
    marginTop: spacing.xs,
  },
  newGroupBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.text,
    backgroundColor: colors.card,
  },
  newGroupBtnPressed: { opacity: 0.7 },
  newGroupText: {
    ...typography.body,
    fontSize: 14,
    fontWeight: '500',
    color: colors.text,
  },
  scrollContent: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.xxl,
  },
  section: {
    paddingTop: spacing.md,
    paddingBottom: spacing.lg,
  },
  sectionHeaderWrap: {
    paddingHorizontal: spacing.sm,
    paddingBottom: spacing.sm,
  },
  sectionHeader: {
    ...typography.title,
    fontStyle: 'italic',
    fontSize: 18,
    color: colors.text,
  },
  sectionUnderline: {
    marginTop: 2,
    width: '40%',
  },
  columns: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  column: {
    flex: 1,
    gap: spacing.md,
  },
  empty: {
    flex: 1,
    paddingHorizontal: spacing.xxl,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  emptyTitle: {
    ...typography.title,
    color: colors.text,
    textAlign: 'center',
  },
  emptyBody: {
    ...typography.body,
    color: colors.textMuted,
    textAlign: 'center',
  },
});
