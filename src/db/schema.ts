import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';

export const projects = sqliteTable('projects', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  color: text('color').notNull(),
  createdAt: integer('created_at').notNull(),
});

export const groups = sqliteTable('groups', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  color: text('color'),
  createdAt: integer('created_at').notNull(),
});

export const notes = sqliteTable('notes', {
  id: text('id').primaryKey(),
  content: text('content').notNull(),
  groupId: text('group_id').references(() => groups.id),
  color: text('color').notNull(),
  tiltSeed: integer('tilt_seed').notNull(),
  createdAt: integer('created_at').notNull(),
  updatedAt: integer('updated_at').notNull(),
  tossedAt: integer('tossed_at'),
});

export const tasks = sqliteTable('tasks', {
  id: text('id').primaryKey(),
  content: text('content').notNull(),
  noteId: text('note_id').references(() => notes.id),
  completed: integer('completed', { mode: 'boolean' }).notNull().default(false),
  isImportant: integer('is_important', { mode: 'boolean' })
    .notNull()
    .default(false),
  dueDate: integer('due_date'),
  createdAt: integer('created_at').notNull(),
  completedAt: integer('completed_at'),
});

export const rituals = sqliteTable('rituals', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  icon: text('icon').notNull(),
  color: text('color').notNull(),
  sortOrder: integer('sort_order').notNull().default(0),
  createdAt: integer('created_at').notNull(),
});

export const ritualCompletions = sqliteTable('ritual_completions', {
  id: text('id').primaryKey(),
  ritualId: text('ritual_id')
    .notNull()
    .references(() => rituals.id, { onDelete: 'cascade' }),
  dayKey: integer('day_key').notNull(),
  completedAt: integer('completed_at').notNull(),
});

export type Project = typeof projects.$inferSelect;
export type Note = typeof notes.$inferSelect;
export type Task = typeof tasks.$inferSelect;
export type Ritual = typeof rituals.$inferSelect;
export type RitualCompletion = typeof ritualCompletions.$inferSelect;
export type Group = typeof groups.$inferSelect;
export type NewProject = typeof projects.$inferInsert;
export type NewNote = typeof notes.$inferInsert;
export type NewTask = typeof tasks.$inferInsert;
export type NewRitual = typeof rituals.$inferInsert;
export type NewRitualCompletion = typeof ritualCompletions.$inferInsert;
export type NewGroup = typeof groups.$inferInsert;
