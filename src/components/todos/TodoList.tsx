import React, { useCallback, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { spacing } from '../../theme/spacing';
import { tasksRepo } from '../../db/repositories/tasks';
import { notesRepo } from '../../db/repositories/notes';
import type { Task, Note } from '../../db/schema';
import { TodoSection, type AddTaskMeta } from './TodoSection';
import { HandDrawnUnderline } from '../ui/HandDrawnUnderline';
import {
  bucketForDueDate,
  bucketLabel,
  type DueBucket,
} from '../../lib/dueDate';

type NoteGroup = {
  noteId: string;
  title: string;
  tasks: Task[];
};

// Supabase's PostgrestError is a plain object — `String(e)` would render
// "[object Object]". Same helper used by Brain Dump.
function formatError(e: unknown): string {
  if (e instanceof Error) return e.message;
  if (typeof e === 'object' && e !== null) {
    const obj = e as Record<string, unknown>;
    const msg = obj.message ?? obj.error_description ?? obj.error;
    if (typeof msg === 'string') {
      const code = typeof obj.code === 'string' ? ` [${obj.code}]` : '';
      return msg + code;
    }
    try {
      return JSON.stringify(e);
    } catch {
      /* fall through */
    }
  }
  return String(e);
}

export function TodoList() {
  const [inbox, setInbox] = useState<Task[]>([]);
  const [groups, setGroups] = useState<NoteGroup[]>([]);
  const [errorBanner, setErrorBanner] = useState<string | null>(null);

  const reload = useCallback(async () => {
    const allTasks = await tasksRepo.list();
    const inboxTasks: Task[] = [];
    const byNote = new Map<string, Task[]>();
    for (const t of allTasks) {
      if (t.noteId) {
        const arr = byNote.get(t.noteId) ?? [];
        arr.push(t);
        byNote.set(t.noteId, arr);
      } else {
        inboxTasks.push(t);
      }
    }
    const noteIds = Array.from(byNote.keys());
    const linkedNotes = await notesRepo.getByIds(noteIds);
    const notesById = new Map<string, Note>(
      linkedNotes.map((n) => [n.id, n]),
    );
    // Sort sections by oldest task in the group, so the order is stable.
    const nextGroups: NoteGroup[] = noteIds
      .map((id) => ({
        noteId: id,
        title: notesById.get(id)?.content ?? 'Note',
        tasks: byNote.get(id) ?? [],
      }))
      .sort((a, b) => {
        const aOldest = Math.min(...a.tasks.map((t) => t.createdAt));
        const bOldest = Math.min(...b.tasks.map((t) => t.createdAt));
        return aOldest - bOldest;
      });
    setInbox(inboxTasks);
    setGroups(nextGroups);
  }, []);

  useFocusEffect(
    useCallback(() => {
      reload();
    }, [reload]),
  );

  const handleToggle = async (id: string) => {
    const flip = (t: Task): Task =>
      t.id === id
        ? {
            ...t,
            completed: !t.completed,
            completedAt: !t.completed ? Date.now() : null,
          }
        : t;
    setInbox((prev) => prev.map(flip));
    setGroups((prev) =>
      prev.map((g) => ({ ...g, tasks: g.tasks.map(flip) })),
    );
    try {
      await tasksRepo.toggle(id);
    } catch {
      reload();
    }
  };

  const handleDelete = async (id: string) => {
    setInbox((prev) => prev.filter((t) => t.id !== id));
    setGroups((prev) =>
      prev
        .map((g) => ({ ...g, tasks: g.tasks.filter((t) => t.id !== id) }))
        .filter((g) => g.tasks.length > 0),
    );
    try {
      await tasksRepo.delete(id);
    } catch {
      reload();
    }
  };

  const handleToggleImportant = async (id: string) => {
    let nextValue = false;
    const flip = (t: Task): Task => {
      if (t.id !== id) return t;
      nextValue = !t.isImportant;
      return { ...t, isImportant: nextValue };
    };
    setInbox((prev) => prev.map(flip));
    setGroups((prev) =>
      prev.map((g) => ({ ...g, tasks: g.tasks.map(flip) })),
    );
    try {
      await tasksRepo.setImportant(id, nextValue);
    } catch {
      reload();
    }
  };

  const surfaceError = useCallback((label: string, e: unknown) => {
    const msg = formatError(e);
    console.error(`[tasks] ${label}:`, e);
    setErrorBanner(`${label}: ${msg}`);
    Alert.alert('Add task failed', msg);
  }, []);

  const handleAddInbox = async (content: string, meta: AddTaskMeta) => {
    setErrorBanner(null);
    try {
      const created = await tasksRepo.create(content, {
        dueDate: meta.dueDate,
        isImportant: meta.isImportant,
      });
      setInbox((prev) => [...prev, created]);
    } catch (e) {
      surfaceError('add inbox failed', e);
    }
  };

  const handleAddToGroup =
    (noteId: string) => async (content: string, meta: AddTaskMeta) => {
      setErrorBanner(null);
      try {
        const created = await tasksRepo.create(content, {
          noteId,
          dueDate: meta.dueDate,
          isImportant: meta.isImportant,
        });
        setGroups((prev) =>
          prev.map((g) =>
            g.noteId === noteId
              ? { ...g, tasks: [...g.tasks, created] }
              : g,
          ),
        );
      } catch (e) {
        surfaceError('add to group failed', e);
      }
    };

  const totallyEmpty = inbox.length === 0 && groups.length === 0;

  return (
    <View style={styles.wrapper}>
      <View style={styles.sectionLabelWrap}>
        <Text style={styles.sectionLabel}>To-do</Text>
        <View style={styles.sectionUnderline}>
          <HandDrawnUnderline />
        </View>
      </View>
      {errorBanner ? (
        <View style={styles.errorBanner}>
          <Text style={styles.errorTitle}>Couldn&apos;t save task</Text>
          <Text style={styles.errorBody} selectable>
            {errorBanner}
          </Text>
          <Text
            style={styles.errorDismiss}
            onPress={() => setErrorBanner(null)}
          >
            Dismiss
          </Text>
        </View>
      ) : null}
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
      >
        {totallyEmpty ? (
          <Text style={styles.emptyText}>
            Nothing yet. Add the first thing below.
          </Text>
        ) : null}
        {/* Single add row at the top of the inbox; the picker on this row
            decides which bucket the new task falls into. */}
        <TodoSection
          title={null}
          placeholder="Add a task"
          tasks={[]}
          onToggle={handleToggle}
          onDelete={handleDelete}
          onToggleImportant={handleToggleImportant}
          onAdd={handleAddInbox}
        />
        {/* Inbox tasks grouped by their due bucket. Empty buckets are hidden. */}
        {([
          'today',
          'tomorrow',
          'someday',
          null,
        ] as (DueBucket | null)[])
          .map((bucket) => ({
            bucket,
            tasks: inbox.filter(
              (t) => bucketForDueDate(t.dueDate) === bucket,
            ),
          }))
          .filter(({ tasks }) => tasks.length > 0)
          .map(({ bucket, tasks }) => (
            <TodoSection
              key={bucket ?? 'anytime'}
              title={bucketLabel(bucket)}
              placeholder=""
              tasks={tasks}
              onToggle={handleToggle}
              onDelete={handleDelete}
              onToggleImportant={handleToggleImportant}
              onAdd={() => {}}
              hideAdder
            />
          ))}
        {groups.map((g) => (
          <TodoSection
            key={g.noteId}
            title={g.title}
            placeholder="Add to this list"
            tasks={g.tasks}
            onToggle={handleToggle}
            onDelete={handleDelete}
            onToggleImportant={handleToggleImportant}
            onAdd={handleAddToGroup(g.noteId)}
          />
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
  },
  sectionLabelWrap: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.sm,
    paddingBottom: spacing.sm,
  },
  sectionLabel: {
    ...typography.caption,
    color: colors.textMuted,
    textTransform: 'uppercase',
  },
  sectionUnderline: {
    marginTop: 2,
    width: 60,
  },
  errorBanner: {
    marginHorizontal: spacing.xl,
    marginTop: spacing.sm,
    marginBottom: spacing.sm,
    padding: spacing.md,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#C97C1F',
    backgroundColor: '#FFF6D0',
    gap: 4,
  },
  errorTitle: {
    fontFamily: typography.body.fontFamily,
    fontSize: 13,
    fontWeight: '700',
    color: '#7A4A00',
  },
  errorBody: {
    fontFamily: 'Menlo',
    fontSize: 11,
    color: '#7A4A00',
    lineHeight: 16,
  },
  errorDismiss: {
    fontFamily: typography.body.fontFamily,
    fontSize: 12,
    color: '#7A4A00',
    fontStyle: 'italic',
    textDecorationLine: 'underline',
    marginTop: 4,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: spacing.xl,
  },
  emptyText: {
    ...typography.body,
    color: colors.textMuted,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.sm,
  },
});
