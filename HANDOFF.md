# Brain Dump — Handoff

Snapshot of where the project stands so we can pick up tomorrow. Target ship: **iOS App Store**.

## What it is

A minimalist "Paper Trail" thought-capture app:
- **Brain Dump tab** — type a thought, **Keep** it (saves to Dashboard) or **Toss** it (crumple+toss animation, soft-delete + 5s undo).
- **Dashboard tab** — kept thoughts laid out as a tilted 2-column masonry of post-it "scraps." Tap to edit, long-press / tap X to crumple-delete. Notes can be organized into Groups. Sub-tasks per note via "Action Steps" in the edit modal — badge shows `X/Y done` on each card.
- **Tasks tab** — Daily Rituals row at top (12 line icons, watercolor-fill on tap, midnight reset), then a sectioned to-do list (Inbox + one section per note-linked sub-list). Tasks support a `Today / Tomorrow / Someday` picker and an importance star.

Philosophy: **no streaks, no gamification, no historical guilt.** Everything is "today's clarity."

## Tech stack

| Layer | Choice |
|---|---|
| Runtime | Expo SDK 54, React Native 0.81, React 19 |
| Router | expo-router (typed routes, static web rendering) |
| Backend | Supabase (Postgres + REST + anonymous auth) |
| Local storage | `@react-native-async-storage/async-storage` (Supabase session + one-shot import flag) |
| Animations | `react-native-reanimated` v3 (works on iOS, Android, web). No more `react-native-view-shot`. |
| Icons | `lucide-react-native` |
| Fonts | `@expo-google-fonts/playfair-display` (display + title), Menlo (input/monospace) |
| Schema sketch | `drizzle-orm/sqlite-core` — types-only; tables live in Supabase |

`react-native-view-shot` and `drizzle-orm/expo-sqlite` are still in `package.json` but **unused at runtime**. Safe to uninstall in a cleanup pass.

## Architecture

- **Auth.** `ensureAnonSession()` runs at boot in `app/_layout.tsx`. Every install gets a hidden Supabase auth user via `signInAnonymously()`. Session persists in AsyncStorage (native) / localStorage (web).
- **RLS.** Every table has a single `"owner all"` policy: `FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id)`. Anonymous-auth users ARE in the `authenticated` role — do **not** add separate `anon`-role policies.
- **Repos.** `src/db/repositories/*.ts` go through `src/lib/supabase.ts` helpers: `requireUserId()` (cached), `toSnake()` (request bodies), `camelRows<T>()` (responses). Supabase is snake_case, the app is camelCase.
- **Types.** `src/db/schema.ts` keeps Drizzle table builders solely so we can `$inferSelect` types. No Drizzle queries hit Supabase.
- **Migration.** `src/lib/migrate.native.ts` does a one-shot SQLite→Supabase upload on first boot of native users who used the pre-Supabase build. Web has a no-op shim. Gated by AsyncStorage flag `@brain-dump/sb-import-v1`.
- **Web container.** `_layout.tsx` wraps the app in `<PhoneFrame>` — on screens > 600px the content centers in a 414×896 rounded frame; below that breakpoint it's full-width.

## Supabase

- Project ref: `huauocnvwezmpvagcinq`
- Anon JWT lives in `.env` (gitignored). `.env.example` is the committable template.
- **Dashboard requirement:** Authentication → Sign In / Up → "Allow anonymous sign-ins" must be ON. Without it, `signInAnonymously()` 422s and the app shows the red error screen.
- Tables: `groups`, `notes`, `tasks`, `rituals`, `ritual_completions`. Canonical SQL at `supabase/schema.sql`.
- IDs are client-generated `nanoid` text (not Postgres UUIDs) so the existing repo code didn't need rewriting.
- `tasks` has `is_important boolean default false` and `due_date bigint nullable`. Someday uses a sentinel timestamp `2099-01-01`.

## File map (the bits that matter)

```
app/
  _layout.tsx              # fonts + anon sign-in + migration + PhoneFrame wrapper
  (tabs)/
    _layout.tsx            # 3-tab nav (Dump, Dashboard, Tasks)
    index.tsx              # Brain Dump (Keep/Toss flow, inline crumple animation)
    dashboard.tsx          # Masonry, groups, edit-modal orchestration
    tasks.tsx              # RitualsRow + TodoList
src/
  components/
    notes/
      NoteCard.tsx         # Tilted scrap, X-delete, crumple animation, task badge
      NoteEditModal.tsx    # Edit text, group chips, Action Steps checklist + picker
      NewGroupModal.tsx
    todos/
      TodoList.tsx         # Inbox + note-grouped sections, focus-effect reload
      TodoSection.tsx      # Section header + add input + Today/Tomorrow/Someday picker
      TodoItem.tsx         # Star, check-circle, due-label, X-delete
    rituals/
      RitualsRow.tsx
      RitualCircle.tsx     # Inline crumple animation (no longer uses CrumpleToss)
      AddRitualModal.tsx
      icons.ts, palette.ts
    ui/
      PaperGrain.tsx       # SVG paper-grain wrapper (wraps screen content)
      BinIcon.tsx
    animations/
      UndoToast.tsx
  db/
    schema.ts              # Drizzle table builders — types only
    repositories/
      notes.ts, groups.ts, tasks.ts, rituals.ts
  hooks/
    useHaptics.ts          # Web-safe haptics wrapper (no-ops on web)
  lib/
    supabase.ts            # client + helpers
    dueDate.ts             # Today/Tomorrow/Someday math + display
    migrate.native.ts, migrate.web.ts, migrate.d.ts
  theme/
    colors.ts, typography.ts, spacing.ts
supabase/
  schema.sql               # Canonical schema + RLS policies
app.json                   # Display name "Brain Dump", slug "clarity-void"
```

## Development

```bash
cd ~/dev/clarity-void
npm run dev          # = expo start --web (serves both web at localhost:8081 AND a QR for Expo Go)
npm start            # = expo start (no --web flag, native-only)
npm run ios          # = expo start --ios (boots iOS simulator)
npm run web          # = expo start --web (alias of dev)
```

Tunnel mode: `npx expo start --tunnel` requires `@expo/ngrok` installed globally — already done on this Mac. Falls back to LAN if ngrok is flaky.

**Always `npm install --legacy-peer-deps`** — `lucide-react-native@0.468` peers against React ≤18, project ships React 19.

## iOS shipping checklist (next session)

This is the gap between "works in Expo Go on my phone" and "App Store-ready."

- [ ] Replace the placeholder Expo icon + splash screen. `app.json` references no custom asset paths currently.
- [ ] Set a real iOS `bundleIdentifier` (e.g. `com.putsra.braindump`). Currently unset → Expo Go default.
- [ ] Pin `@react-native-async-storage/async-storage` to **2.2.0** (Expo SDK 54 expected version). Currently 3.0.2 — works in Expo Go but may fail native builds. Run `npx expo install @react-native-async-storage/async-storage`.
- [ ] **EAS Build** — register an Apple Developer account, run `eas init` + `eas build --platform ios`. Expo Go testing alone won't produce an `.ipa`.
- [ ] Decide on auth model for production. Anonymous auth works for solo dev; if you ever want to test from two devices, you need to add email/magic-link sign-in (right now phone and web each get their own anon user → can't see each other's data).
- [ ] Verify ALL flows on native (the testing has been mostly web): Brain Dump toss, Dashboard crumple-delete, ritual long-press delete, sub-task picker.
- [ ] Add an App Privacy entry: app collects no PII directly but stores user content on Supabase (a sub-processor).
- [ ] App Store screenshots, description, keywords.
- [ ] Test with Wi-Fi off — Supabase calls have a 10s timeout in Keep but the rest of the app currently has no offline graceful-degradation. Consider whether that's acceptable for v1.

## Known issues / nice-to-haves

- **Editing the due-date on an existing task** isn't supported in the UI yet — the picker only shows during task creation. Tapping the "• Today" label to cycle through buckets would be a small follow-up.
- **Web hot-reload is flaky.** When in doubt, fully close the tab and reopen. Cmd+Shift+R is not always enough.
- **Dashboard task-stat badge** doesn't auto-refresh when you add a task from the Tasks tab — needs a focus-effect on the Dashboard tab.
- **Bundle size on web is 4.24 MB** (Playfair Display × 4 weights + Reanimated + Lucide). Fine for now, optimize before any public web launch.
- **Old `CrumpleToss` component is deleted.** All three callers (Brain Dump, NoteCard, RitualCircle) now use inline Reanimated transforms. Don't reintroduce ViewShot — it returns blank PNGs against autofocused iOS TextInputs.
- The `tasks` table includes a `completed` column (boolean) — there's no separate `is_completed`. Same field, different name preference.

## Where conversations have left off

Last completed feature: **due-date picker (Today/Tomorrow/Someday) + importance star** in both the Tasks tab and the Action Steps section of the edit modal. SQL `ALTER TABLE public.tasks ADD COLUMN ...` should already be run in the Supabase dashboard. Verify by running:

```sql
SELECT column_name FROM information_schema.columns
WHERE table_schema='public' AND table_name='tasks'
  AND column_name IN ('due_date','is_important');
```

If you get 2 rows back, the schema is up to date.
