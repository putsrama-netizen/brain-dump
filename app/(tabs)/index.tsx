import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Alert,
  InputAccessoryView,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import Animated, {
  Easing,
  FadeInDown,
  FadeOut,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import { UndoToast } from '../../src/components/animations/UndoToast';
import { BinIcon, type BinIconHandle } from '../../src/components/ui/BinIcon';
import { PaperGrain } from '../../src/components/ui/PaperGrain';
import { HandDrawnUnderline } from '../../src/components/ui/HandDrawnUnderline';
import { colors } from '../../src/theme/colors';
import { typography } from '../../src/theme/typography';
import { spacing, radius } from '../../src/theme/spacing';
import { notesRepo } from '../../src/db/repositories/notes';
import { promptsRepo } from '../../src/db/repositories/prompts';
import { promptAnalyticsRepo } from '../../src/db/repositories/promptAnalytics';
import { haptics } from '../../src/hooks/useHaptics';
import { ResurfaceModal } from '../../src/components/resurface/ResurfaceModal';
import type { Note, Prompt } from '../../src/db/schema';

const INPUT_ACCESSORY_ID = 'voidKeyboardAccessory';

// Local fallback pool. Used when the wellness pool comes back empty (e.g.
// the seed SQL hasn't been run on this Supabase project). Lean Release / Body
// / Evening so the "(stuck?)" surface stays on-message even offline.
const FALLBACK_PROMPTS: { id: string; text: string }[] = [
  { id: '_fallback_a', text: "What's loud right now?" },
  { id: '_fallback_b', text: 'Anything sitting on your chest?' },
  { id: '_fallback_c', text: 'What can you let go of today?' },
  { id: '_fallback_d', text: "What's the smallest thing you'd feel better having handled?" },
  { id: '_fallback_e', text: 'What stayed with you today?' },
];

function pickFallbackPrompt(excludeIds: Set<string>): {
  id: string;
  text: string;
} {
  const pool = FALLBACK_PROMPTS.filter((p) => !excludeIds.has(p.id));
  const arr = pool.length > 0 ? pool : FALLBACK_PROMPTS;
  return arr[Math.floor(Math.random() * arr.length)];
}

// Supabase's PostgrestError is a plain object (not an Error subclass), so
// `e instanceof Error` is false and `String(e)` returns "[object Object]".
// This pulls the useful fields out.
function formatError(e: unknown): string {
  if (e instanceof Error) return e.message;
  if (typeof e === 'object' && e !== null) {
    const obj = e as Record<string, unknown>;
    const msg = obj.message ?? obj.error_description ?? obj.error;
    if (typeof msg === 'string') {
      const code = typeof obj.code === 'string' ? ` [${obj.code}]` : '';
      const details =
        typeof obj.details === 'string' ? ` — ${obj.details}` : '';
      const hint = typeof obj.hint === 'string' ? ` (hint: ${obj.hint})` : '';
      return msg + code + details + hint;
    }
    try {
      return JSON.stringify(e);
    } catch {
      /* fall through */
    }
  }
  return String(e);
}

// On native, wrap content in TouchableWithoutFeedback so tapping outside
// the input dismisses the on-screen keyboard. On web there's no virtual
// keyboard to dismiss, and the wrapper's click handler steals focus from
// the TextInput on every click — making it impossible to type or to click
// the action buttons. Skip it on web.
function DismissOnBackgroundTap({
  onDismiss,
  children,
}: {
  onDismiss: () => void;
  children: React.ReactElement;
}) {
  if (Platform.OS === 'web') return children;
  return (
    <TouchableWithoutFeedback onPress={onDismiss} accessible={false}>
      {children}
    </TouchableWithoutFeedback>
  );
}

// Toss animation — physical text-shredder feel rather than the old crumple+arc.
// The input compresses vertically into a thin strip (feed-through), then the
// strip falls straight down and fades out. No bin arc — the shredder sits in
// place of the input. We dropped the ViewShot snapshot approach because
// captureRef() returns a blank PNG against an autofocused iOS TextInput.
const FEED_MS = 220;
const SHRED_MS = 520;
const FALL_MS = 360;

export default function VoidScreen() {
  const [text, setText] = useState('');
  const [resetKey, setResetKey] = useState(0);
  const [pendingTossId, setPendingTossId] = useState<string | null>(null);
  const [animating, setAnimating] = useState(false);

  // --- Prompt engine state ----------------------------------------------
  // currentPrompt holds either a real Prompt row OR a tagged fallback object.
  // Both expose `id` + `text`; only real prompts can be logged to analytics.
  // The screen stays clean until the user pulls a prompt via the "(stuck?)"
  // button — see promptRevealed.
  const [currentPrompt, setCurrentPrompt] = useState<
    Prompt | { id: string; text: string } | null
  >(null);
  const [promptRevealed, setPromptRevealed] = useState(false);
  const [promptDiagnostic, setPromptDiagnostic] = useState<string | null>(null);
  const eligiblePool = useRef<Prompt[]>([]);
  const sessionSkipped = useRef<Set<string>>(new Set());

  // --- Resurfacing state -----------------------------------------------
  const [resurfaceNote, setResurfaceNote] = useState<Note | null>(null);

  const binRef = useRef<BinIconHandle>(null);
  const pendingNoteRef = useRef<Note | null>(null);
  const tabBarHeight = useBottomTabBarHeight();
  const router = useRouter();

  // Reanimated shared values for the shred animation. scaleY drives the
  // vertical compression; ty drives the fall after the strip is formed.
  const scaleY = useSharedValue(1);
  const scaleX = useSharedValue(1);
  const tx = useSharedValue(0);
  const ty = useSharedValue(0);
  const opacity = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [
      { translateX: tx.value },
      { translateY: ty.value },
      { scaleX: scaleX.value },
      { scaleY: scaleY.value },
    ],
  }));

  const resetAnim = useCallback(() => {
    scaleY.value = 1;
    scaleX.value = 1;
    tx.value = 0;
    ty.value = 0;
    opacity.value = 1;
  }, [scaleY, scaleX, tx, ty, opacity]);

  const dismissKeyboard = useCallback(() => {
    Keyboard.dismiss();
  }, []);

  // Pick a random prompt from the in-memory pool, excluding any seen this
  // session. Logs a 'shown' analytics row in the background.
  const pickFromPool = useCallback(() => {
    const pool = eligiblePool.current.filter(
      (p) => !sessionSkipped.current.has(p.id),
    );
    if (pool.length === 0) {
      // Pool is exhausted (or never loaded) — fall back to the local list
      // so the prompt area is never blank.
      setCurrentPrompt(pickFallbackPrompt(sessionSkipped.current));
      return;
    }
    const next = pool[Math.floor(Math.random() * pool.length)];
    setCurrentPrompt(next);
    promptAnalyticsRepo.log(next.id, 'shown').catch(() => {});
  }, []);

  // Boot: silently warm the prompt pool so the first reveal feels instant.
  // We do NOT pick or display a prompt on mount — the screen stays clean
  // until the user actively pulls one via "(stuck?)".
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        // Wellness pivot: pull from Release + Body + Evening categories rather
        // than the legacy time-of-day slot, so the "(stuck?)" prompt always
        // points at letting-go / body / day-close rather than productivity.
        const [pool, shownIds] = await Promise.all([
          promptsRepo.listWellnessPool(),
          promptAnalyticsRepo.listShownPromptIds(7),
        ]);
        if (cancelled) return;
        const shownSet = new Set(shownIds);
        let eligible = pool.filter((p) => !shownSet.has(p.id));
        if (eligible.length === 0) eligible = pool;
        eligiblePool.current = eligible;
        if (eligible.length === 0) {
          // DB returned zero prompts — surface a diagnostic so the user
          // knows the seed SQL hasn't been run. Fallback pool still works.
          setPromptDiagnostic(
            'No wellness prompts found in Supabase. Run supabase/prompts.sql.',
          );
          return;
        }
        setPromptDiagnostic(null);
      } catch (e) {
        if (cancelled) return;
        const msg = e instanceof Error ? e.message : String(e);
        console.error('[prompts] boot:', e);
        setPromptDiagnostic(`Couldn't load prompts (${msg}).`);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // First reveal: pull a prompt and show it with the fade-in animation.
  const handleRevealPrompt = () => {
    haptics.tap();
    pickFromPool();
    setPromptRevealed(true);
  };

  const handleNotThisOne = () => {
    if (!currentPrompt) return;
    haptics.tap();
    sessionSkipped.current.add(currentPrompt.id);
    if (!currentPrompt.id.startsWith('_fallback')) {
      promptAnalyticsRepo
        .log(currentPrompt.id, 'skipped')
        .catch(() => {});
    }
    pickFromPool();
  };

  const triggerResurface = useCallback(async () => {
    try {
      const candidate = await notesRepo.pickResurfaceCandidate();
      if (candidate) setResurfaceNote(candidate);
    } catch (e) {
      console.error('[resurface] pick:', e);
    }
  }, []);

  const runShredAnim = (onDone: () => void) => {
    haptics.tear();

    // Phase 1: feed-in (220ms) — paper is drawn down into the shredder.
    // A tiny downward translation + a touch of widening sells the "pulled in".
    ty.value = withTiming(12, {
      duration: FEED_MS,
      easing: Easing.in(Easing.quad),
    });
    scaleX.value = withTiming(1.02, { duration: FEED_MS });

    // Phase 2: shred (520ms, starting at FEED_MS) — vertical compression to
    // a thin strip, with subtle horizontal jitter to evoke teeth biting.
    scaleY.value = withDelay(
      FEED_MS,
      withTiming(0.04, {
        duration: SHRED_MS,
        easing: Easing.bezier(0.55, 0, 0.5, 1),
      }),
    );
    scaleX.value = withDelay(
      FEED_MS,
      withTiming(1.08, { duration: SHRED_MS }),
    );
    tx.value = withDelay(
      FEED_MS,
      withSequence(
        withTiming(-2, { duration: 110 }),
        withTiming(2, { duration: 110 }),
        withTiming(-1.5, { duration: 110 }),
        withTiming(0, { duration: 190 }),
      ),
    );
    setTimeout(() => haptics.crumple(), FEED_MS + 110);
    setTimeout(() => haptics.crumple(), FEED_MS + 320);

    // Phase 3: fall (360ms) — the strip drops straight down and fades.
    ty.value = withDelay(
      FEED_MS + SHRED_MS,
      withTiming(260, {
        duration: FALL_MS,
        easing: Easing.in(Easing.cubic),
      }),
    );
    opacity.value = withDelay(
      FEED_MS + SHRED_MS,
      withTiming(0, { duration: FALL_MS }),
    );
    setTimeout(() => {
      haptics.check();
      onDone();
    }, FEED_MS + SHRED_MS + FALL_MS);
  };

  const handleToss = async () => {
    console.log('[toss] clicked', {
      hasText: !!text.trim(),
      animating,
      pendingTossId,
    });
    const trimmed = text.trim();
    if (!trimmed || animating || pendingTossId) return;

    setAnimating(true);
    Keyboard.dismiss();

    // Fire Supabase save in the BACKGROUND. Do not await — a hung/slow
    // request must not stop the visual flow. Schedule hard-delete once the
    // soft-delete row id comes back.
    notesRepo
      .softDeleteFromContent(trimmed)
      .then((note) => {
        console.log('[toss] inserted', note.id);
        setTimeout(() => {
          notesRepo.hardDelete(note.id).catch((e) => {
            console.error('[toss] hard delete failed:', e);
          });
        }, 5000);
      })
      .catch((e) => {
        console.error('[toss] supabase failed:', e);
      });

    // Run the shred immediately. onDone fires via setTimeout so it doesn't
    // depend on Reanimated's `finished` callback (unreliable on web) or on
    // the Supabase call completing.
    runShredAnim(() => {
      binRef.current?.bounce();
      setText('');
      resetAnim();
      setResetKey((k) => k + 1);
      setAnimating(false);
      // Log prompt engagement (if any), then collapse back to clean slate.
      if (currentPrompt) {
        if (!currentPrompt.id.startsWith('_fallback')) {
          promptAnalyticsRepo
            .log(currentPrompt.id, 'completed')
            .catch(() => {});
        }
        sessionSkipped.current.add(currentPrompt.id);
      }
      setCurrentPrompt(null);
      setPromptRevealed(false);
      triggerResurface();
    });
  };

  const handleKeep = async () => {
    const trimmed = text.trim();
    if (!trimmed || animating || pendingTossId) return;
    Keyboard.dismiss();
    haptics.tap();

    // Optimistic UI: clear immediately so the input stays responsive.
    setText('');
    resetAnim();
    setResetKey((k) => k + 1);

    try {
      // 10s timeout so a hung Supabase request becomes a visible error
      // rather than a silent freeze.
      await Promise.race([
        notesRepo.create(trimmed),
        new Promise<never>((_, reject) =>
          setTimeout(
            () => reject(new Error('Supabase insert timed out after 10s')),
            10_000,
          ),
        ),
      ]);
      // Log prompt engagement (if any), then collapse back to clean slate.
      if (currentPrompt) {
        if (!currentPrompt.id.startsWith('_fallback')) {
          promptAnalyticsRepo
            .log(currentPrompt.id, 'completed')
            .catch(() => {});
        }
        sessionSkipped.current.add(currentPrompt.id);
      }
      setCurrentPrompt(null);
      setPromptRevealed(false);
      // Navigate to Dashboard so the user sees their kept scrap of paper;
      // the Resurfacing modal overlays on top regardless of which tab is active.
      router.push('/(tabs)/dashboard');
      triggerResurface();
    } catch (e) {
      const msg = formatError(e);
      console.error('[keep] failed:', e);
      Alert.alert('Database Error', msg);
      setText(trimmed);
    }
  };

  const handleUndo = async () => {
    if (pendingTossId) {
      await notesRepo.restore(pendingTossId);
    }
    haptics.tap();
    // Reverse the shred: bring the strip back up, then expand it.
    ty.value = withTiming(0, { duration: 320, easing: Easing.out(Easing.cubic) });
    opacity.value = withTiming(1, { duration: 320 });
    scaleY.value = withDelay(320, withTiming(1, { duration: 360 }));
    scaleX.value = withDelay(320, withTiming(1, { duration: 280 }));
    tx.value = withTiming(0, { duration: 200 });
    setPendingTossId(null);
    pendingNoteRef.current = null;
  };

  const handleElapsed = async () => {
    if (pendingTossId) {
      await notesRepo.hardDelete(pendingTossId);
    }
    setText('');
    setPendingTossId(null);
    pendingNoteRef.current = null;
    resetAnim();
    setResetKey((k) => k + 1);
  };

  const busy = animating || !!pendingTossId;
  const canSubmit = text.trim().length > 0 && !busy;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <PaperGrain>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          keyboardVerticalOffset={tabBarHeight}
          style={styles.flex}
        >
          <DismissOnBackgroundTap onDismiss={dismissKeyboard}>
            <View style={styles.flex}>
              <View style={styles.header}>
                <Text style={styles.title}>Brain Dump</Text>
                {promptRevealed && currentPrompt ? (
                  <Animated.View
                    entering={FadeInDown.duration(300)}
                    exiting={FadeOut.duration(200)}
                  >
                    <Text style={styles.promptText}>
                      {currentPrompt.text}
                    </Text>
                    <View style={styles.promptUnderline}>
                      <HandDrawnUnderline />
                    </View>
                  </Animated.View>
                ) : (
                  <Text style={styles.subtitle}>
                    What&apos;s on your mind?
                  </Text>
                )}
                {promptDiagnostic ? (
                  <Text style={styles.promptDiagnostic}>
                    {promptDiagnostic}
                  </Text>
                ) : null}
              </View>

              <View style={styles.canvas} collapsable={false}>
                <Animated.View
                  key={resetKey}
                  style={[styles.crumpleHost, animatedStyle]}
                >
                  <TextInput
                    value={text}
                    onChangeText={setText}
                    multiline
                    placeholder="Just start typing…"
                    placeholderTextColor={colors.textMuted}
                    style={styles.input}
                    editable={!busy}
                    autoFocus
                    textAlignVertical="top"
                    inputAccessoryViewID={
                      Platform.OS === 'ios' ? INPUT_ACCESSORY_ID : undefined
                    }
                  />
                </Animated.View>
              </View>

              {/* Pull-based prompt trigger. Hidden once the user has text in
                  the input pre-reveal (workspace stays distraction-free).
                  Once the prompt is revealed, the same button cycles it. */}
              {promptRevealed || text.trim().length === 0 ? (
                <View style={styles.stuckRow}>
                  <Pressable
                    onPress={
                      promptRevealed ? handleNotThisOne : handleRevealPrompt
                    }
                    hitSlop={8}
                    style={({ pressed }) => [
                      styles.stuckBtn,
                      pressed && { opacity: 0.6 },
                    ]}
                    accessibilityRole="button"
                    accessibilityLabel={
                      promptRevealed
                        ? 'Try a different prompt'
                        : 'Show me a prompt'
                    }
                  >
                    <Text style={styles.stuckText}>
                      {promptRevealed ? '(not this one)' : '(stuck?)'}
                    </Text>
                  </Pressable>
                </View>
              ) : null}

              <View style={styles.footer}>
                <Pressable
                  onPress={handleKeep}
                  disabled={!canSubmit}
                  style={({ pressed }) => [
                    styles.btn,
                    styles.keepBtn,
                    !canSubmit && styles.btnDisabled,
                    pressed && styles.btnPressed,
                  ]}
                >
                  <Text style={[styles.btnText, styles.keepText]}>Keep</Text>
                </Pressable>

                <View collapsable={false}>
                  <BinIcon ref={binRef} />
                </View>

                <Pressable
                  onPress={handleToss}
                  disabled={!canSubmit}
                  style={({ pressed }) => [
                    styles.btn,
                    styles.tossBtn,
                    !canSubmit && styles.btnDisabled,
                    pressed && styles.btnPressed,
                  ]}
                >
                  <Text style={[styles.btnText, styles.tossText]}>Toss</Text>
                </Pressable>
              </View>

              <UndoToast
                visible={!!pendingTossId}
                onUndo={handleUndo}
                onElapsed={handleElapsed}
              />
            </View>
          </DismissOnBackgroundTap>
        </KeyboardAvoidingView>
      </PaperGrain>

      <ResurfaceModal
        note={resurfaceNote}
        onClose={() => setResurfaceNote(null)}
        onToss={async (n) => {
          setResurfaceNote(null);
          try {
            await notesRepo.hardDelete(n.id);
          } catch (e) {
            console.error('[resurface] toss:', e);
          }
        }}
        onKeep={() => setResurfaceNote(null)}
        onAddSteps={(n) => {
          setResurfaceNote(null);
          router.push({
            pathname: '/(tabs)/dashboard',
            params: { editNoteId: n.id },
          });
        }}
      />

      {Platform.OS === 'ios' && (
        <InputAccessoryView nativeID={INPUT_ACCESSORY_ID}>
          <View style={styles.accessory}>
            <Pressable
              onPress={dismissKeyboard}
              hitSlop={12}
              style={({ pressed }) => [
                styles.doneBtn,
                pressed && styles.btnPressed,
              ]}
              accessibilityRole="button"
              accessibilityLabel="Hide keyboard"
            >
              <Text style={styles.doneBtnText}>Done</Text>
            </Pressable>
          </View>
        </InputAccessoryView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.paper,
  },
  flex: { flex: 1 },
  header: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
  },
  title: {
    ...typography.display,
    color: colors.text,
  },
  subtitle: {
    ...typography.body,
    color: colors.textMuted,
    marginTop: spacing.xs,
  },
  promptText: {
    ...typography.title,
    fontSize: 18,
    lineHeight: 24,
    fontStyle: 'italic',
    color: colors.text,
    marginTop: spacing.xs,
  },
  promptUnderline: {
    width: '100%',
    marginTop: spacing.xs,
  },
  stuckRow: {
    alignItems: 'center',
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.xl,
  },
  stuckBtn: {
    paddingVertical: 2,
    paddingHorizontal: 4,
  },
  stuckText: {
    fontFamily: typography.body.fontFamily,
    fontSize: 12,
    color: '#757575',
    fontStyle: 'italic',
    textDecorationLine: 'underline',
  },
  promptDiagnostic: {
    fontFamily: typography.body.fontFamily,
    fontSize: 11,
    color: colors.textMuted,
    fontStyle: 'italic',
    marginTop: spacing.xs,
  },
  canvas: {
    flex: 1,
    paddingHorizontal: spacing.xl,
  },
  crumpleHost: {
    flex: 1,
  },
  input: {
    flex: 1,
    ...typography.input,
    color: colors.text,
    paddingTop: spacing.lg,
    paddingBottom: spacing.lg,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
  },
  btn: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    borderRadius: radius.pill,
    minWidth: 110,
    alignItems: 'center',
  },
  btnPressed: {
    opacity: 0.85,
  },
  btnDisabled: {
    opacity: 0.35,
  },
  btnText: {
    ...typography.body,
    fontWeight: '600',
  },
  keepBtn: {
    backgroundColor: colors.sand,
  },
  keepText: {
    color: colors.slate,
  },
  tossBtn: {
    backgroundColor: colors.slate,
  },
  tossText: {
    color: colors.paper,
  },
  accessory: {
    backgroundColor: colors.paper,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.divider,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    alignItems: 'flex-end',
  },
  doneBtn: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  doneBtnText: {
    ...typography.body,
    color: colors.sageDeep,
    fontWeight: '500',
  },
});
