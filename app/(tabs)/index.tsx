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
import { colors } from '../../src/theme/colors';
import { typography } from '../../src/theme/typography';
import { spacing, radius } from '../../src/theme/spacing';
import { notesRepo } from '../../src/db/repositories/notes';
import { promptsRepo } from '../../src/db/repositories/prompts';
import { promptAnalyticsRepo } from '../../src/db/repositories/promptAnalytics';
import { ensureAnonSession } from '../../src/lib/supabase';
import { currentSlot } from '../../src/lib/timeSlot';
import { haptics } from '../../src/hooks/useHaptics';
import { ResurfaceModal } from '../../src/components/resurface/ResurfaceModal';
import type { Note, Prompt } from '../../src/db/schema';

const INPUT_ACCESSORY_ID = 'voidKeyboardAccessory';

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

// Toss animation — applied directly to the input wrapper as Reanimated transforms.
// We dropped the ViewShot snapshot approach because captureRef() returns a blank
// PNG against an autofocused iOS TextInput, which is why the toss animation was
// invisible regardless of z-order fixes.
const CRUMPLE_MS = 720;
const TOSS_MS = 520;
const LAND_MS = 200;

export default function VoidScreen() {
  const [text, setText] = useState('');
  const [resetKey, setResetKey] = useState(0);
  const [pendingTossId, setPendingTossId] = useState<string | null>(null);
  const [animating, setAnimating] = useState(false);
  const [binCenter, setBinCenter] = useState<{ x: number; y: number } | null>(
    null,
  );

  // --- Prompt engine state ----------------------------------------------
  const [currentPrompt, setCurrentPrompt] = useState<Prompt | null>(null);
  const eligiblePool = useRef<Prompt[]>([]);
  const sessionSkipped = useRef<Set<string>>(new Set());

  // --- Resurfacing state -----------------------------------------------
  const [resurfaceNote, setResurfaceNote] = useState<Note | null>(null);

  const binRef = useRef<BinIconHandle>(null);
  const binWrapRef = useRef<View>(null);
  const canvasRef = useRef<View>(null);
  const pendingNoteRef = useRef<Note | null>(null);
  const tabBarHeight = useBottomTabBarHeight();
  const router = useRouter();

  // Reanimated shared values for the crumple+toss.
  const scale = useSharedValue(1);
  const rotate = useSharedValue(0);
  const skewX = useSharedValue(0);
  const tx = useSharedValue(0);
  const ty = useSharedValue(0);
  const opacity = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [
      { translateX: tx.value },
      { translateY: ty.value },
      { scale: scale.value },
      { rotate: `${rotate.value}deg` },
      { skewX: `${skewX.value}deg` },
    ],
  }));

  const resetAnim = useCallback(() => {
    scale.value = 1;
    rotate.value = 0;
    skewX.value = 0;
    tx.value = 0;
    ty.value = 0;
    opacity.value = 1;
  }, [scale, rotate, skewX, tx, ty, opacity]);

  const measureBin = useCallback(() => {
    if (!binWrapRef.current) return;
    binWrapRef.current.measureInWindow((x, y, width, height) => {
      setBinCenter({ x: x + width / 2, y: y + height / 2 });
    });
  }, []);

  const measureCanvasCenter = (): Promise<{ x: number; y: number }> =>
    new Promise((resolve) => {
      if (!canvasRef.current) {
        resolve({ x: 0, y: 0 });
        return;
      }
      canvasRef.current.measureInWindow((x, y, width, height) => {
        resolve({ x: x + width / 2, y: y + height / 2 });
      });
    });

  const dismissKeyboard = useCallback(() => {
    Keyboard.dismiss();
  }, []);

  // Pick a random prompt from the in-memory pool, excluding any seen this
  // session. Logs a 'shown' analytics row in the background.
  const pickFromPool = useCallback(async () => {
    const pool = eligiblePool.current.filter(
      (p) => !sessionSkipped.current.has(p.id),
    );
    if (pool.length === 0) {
      setCurrentPrompt(null);
      return;
    }
    const next = pool[Math.floor(Math.random() * pool.length)];
    setCurrentPrompt(next);
    promptAnalyticsRepo.log(next.id, 'shown').catch(() => {});
  }, []);

  // Boot the prompt engine once per mount: slot → server pool → first pick.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const slot = currentSlot();
        const [slotPrompts, shownIds] = await Promise.all([
          promptsRepo.listBySlot(slot),
          promptAnalyticsRepo.listShownPromptIds(7),
        ]);
        if (cancelled) return;
        const shownSet = new Set(shownIds);
        let eligible = slotPrompts.filter((p) => !shownSet.has(p.id));
        // If everything in this slot has been seen recently, fall back to the
        // whole slot rather than show nothing.
        if (eligible.length === 0) eligible = slotPrompts;
        eligiblePool.current = eligible;
        await pickFromPool();
      } catch (e) {
        console.error('[prompts] boot:', e);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [pickFromPool]);

  const handleNotThisOne = () => {
    if (!currentPrompt) return;
    haptics.tap();
    sessionSkipped.current.add(currentPrompt.id);
    promptAnalyticsRepo.log(currentPrompt.id, 'skipped').catch(() => {});
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

  const runTossAnim = (dx: number, dy: number, onDone: () => void) => {
    const arcLift = -Math.max(140, Math.abs(dx) * 0.3);

    haptics.tear();

    // Phase 1: crumple (720ms) — deep compression with wrinkle oscillation.
    scale.value = withTiming(0.30, {
      duration: CRUMPLE_MS,
      easing: Easing.bezier(0.4, 0, 0.2, 1),
    });
    rotate.value = withTiming(-28, { duration: CRUMPLE_MS });
    skewX.value = withSequence(
      withTiming(14, { duration: 180 }),
      withTiming(-12, { duration: 180 }),
      withTiming(8, { duration: 180 }),
      withTiming(0, { duration: 180 }),
    );
    setTimeout(() => haptics.crumple(), 240);
    setTimeout(() => haptics.crumple(), 480);
    setTimeout(() => haptics.crumple(), 660);

    // Phase 2: toss (520ms, starting at 720ms) — arc to bin.
    tx.value = withDelay(
      CRUMPLE_MS,
      withTiming(dx, { duration: TOSS_MS, easing: Easing.linear }),
    );
    ty.value = withDelay(
      CRUMPLE_MS,
      withSequence(
        withTiming(arcLift, { duration: 230, easing: Easing.out(Easing.quad) }),
        withTiming(dy, { duration: 290, easing: Easing.in(Easing.quad) }),
      ),
    );
    rotate.value = withDelay(
      CRUMPLE_MS,
      withTiming(-360, { duration: TOSS_MS }),
    );
    scale.value = withDelay(
      CRUMPLE_MS,
      withTiming(0.10, { duration: TOSS_MS }),
    );

    // Phase 3: land (200ms) — fade out and (via setTimeout, not the withTiming
    // completion callback) fire onDone. Reanimated's `finished` callback is
    // unreliable on web; setTimeout is cross-platform stable.
    opacity.value = withDelay(
      CRUMPLE_MS + TOSS_MS,
      withTiming(0, { duration: LAND_MS }),
    );
    setTimeout(() => {
      haptics.crumple();
      haptics.check();
      onDone();
    }, CRUMPLE_MS + TOSS_MS + LAND_MS);
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

    // Measure synchronously-ish (just rAF + measureInWindow callbacks).
    measureBin();
    const center = await measureCanvasCenter();
    const target = binCenter ?? { x: center.x, y: center.y + 240 };
    const dx = target.x - center.x;
    const dy = target.y - center.y;

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

    // Run the animation immediately. onDone fires via setTimeout so it
    // doesn't depend on Reanimated's `finished` callback (unreliable on web)
    // or on the Supabase call completing.
    runTossAnim(dx, dy, () => {
      binRef.current?.bounce();
      setText('');
      resetAnim();
      setResetKey((k) => k + 1);
      setAnimating(false);
      // Log prompt engagement + advance to a fresh one for the next dump.
      if (currentPrompt) {
        promptAnalyticsRepo
          .log(currentPrompt.id, 'completed')
          .catch(() => {});
        sessionSkipped.current.add(currentPrompt.id);
        pickFromPool();
      }
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
      await ensureAnonSession();
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
      // Log prompt engagement + advance to a fresh one for the next dump.
      if (currentPrompt) {
        promptAnalyticsRepo
          .log(currentPrompt.id, 'completed')
          .catch(() => {});
        sessionSkipped.current.add(currentPrompt.id);
        pickFromPool();
      }
      // After Keep, show the Resurfacing prompt instead of jumping tabs.
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
    // Reverse the toss: bring the ball back, then un-crumple.
    tx.value = withTiming(0, { duration: 350, easing: Easing.out(Easing.cubic) });
    ty.value = withTiming(0, { duration: 350, easing: Easing.out(Easing.cubic) });
    opacity.value = withTiming(1, { duration: 350 });
    rotate.value = withTiming(0, { duration: 350 });
    scale.value = withDelay(350, withTiming(1, { duration: 400 }));
    skewX.value = withDelay(350, withTiming(0, { duration: 200 }));
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
                {currentPrompt ? (
                  <View style={styles.promptRow}>
                    <Text style={styles.promptText}>
                      {currentPrompt.text}
                    </Text>
                    <Pressable
                      onPress={handleNotThisOne}
                      hitSlop={6}
                      style={({ pressed }) => [
                        styles.skipPromptBtn,
                        pressed && { opacity: 0.6 },
                      ]}
                      accessibilityRole="button"
                      accessibilityLabel="Skip this prompt"
                    >
                      <Text style={styles.skipPromptText}>not this one</Text>
                    </Pressable>
                  </View>
                ) : (
                  <Text style={styles.subtitle}>
                    What&apos;s on your mind?
                  </Text>
                )}
              </View>

              <View ref={canvasRef} style={styles.canvas} collapsable={false}>
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

                <View
                  ref={binWrapRef}
                  collapsable={false}
                  onLayout={measureBin}
                >
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
  promptRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: spacing.md,
    marginTop: spacing.xs,
  },
  promptText: {
    ...typography.title,
    fontSize: 18,
    lineHeight: 24,
    fontStyle: 'italic',
    color: colors.text,
    flex: 1,
  },
  skipPromptBtn: {
    paddingVertical: 2,
    paddingHorizontal: 2,
  },
  skipPromptText: {
    fontFamily: typography.body.fontFamily,
    fontSize: 12,
    color: colors.textMuted,
    fontStyle: 'italic',
    textDecorationLine: 'underline',
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
