import React, { useCallback, useEffect, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Plus } from 'lucide-react-native';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { spacing, shadows } from '../../theme/spacing';
import {
  ritualsRepo,
  getDayKey,
  type RitualWithStatus,
} from '../../db/repositories/rituals';
import { haptics } from '../../hooks/useHaptics';
import {
  RitualCircle,
  RITUAL_CIRCLE_SIZE,
  RITUAL_ITEM_WIDTH,
} from './RitualCircle';
import { AddRitualModal } from './AddRitualModal';

export function RitualsRow() {
  const [items, setItems] = useState<RitualWithStatus[]>([]);
  const [modalOpen, setModalOpen] = useState(false);

  const reload = useCallback(async () => {
    const next = await ritualsRepo.list();
    setItems(next);
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  // Reset at midnight while the screen stays mounted: re-fetch when the day flips.
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | null = null;
    let lastDay = getDayKey();

    const arm = () => {
      const now = new Date();
      const next = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate() + 1,
        0,
        0,
        0,
        50,
      );
      const ms = Math.max(1000, next.getTime() - now.getTime());
      timer = setTimeout(() => {
        const today = getDayKey();
        if (today !== lastDay) {
          lastDay = today;
          reload();
        }
        arm();
      }, ms);
    };

    arm();
    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [reload]);

  const handleToggle = async (id: string) => {
    // Optimistic update so the watercolor animates immediately.
    setItems((prev) =>
      prev.map((r) =>
        r.id === id ? { ...r, completedToday: !r.completedToday } : r,
      ),
    );
    try {
      await ritualsRepo.toggleToday(id);
    } catch {
      reload();
    }
  };

  const handleDelete = async (id: string) => {
    setItems((prev) => prev.filter((r) => r.id !== id));
    await ritualsRepo.delete(id);
  };

  const handleCreate = async (input: {
    name: string;
    icon: string;
    color: string;
  }) => {
    const created = await ritualsRepo.create(input);
    setItems((prev) => [...prev, { ...created, completedToday: false }]);
  };

  const openModal = () => {
    haptics.tap();
    setModalOpen(true);
  };

  return (
    <View style={styles.wrapper}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {items.map((ritual) => (
          <RitualCircle
            key={ritual.id}
            ritual={ritual}
            onToggle={handleToggle}
            onDelete={handleDelete}
          />
        ))}
        <View style={styles.addItem}>
          <Pressable
            onPress={openModal}
            style={({ pressed }) => [
              styles.addCircle,
              pressed && styles.addCirclePressed,
            ]}
            accessibilityRole="button"
            accessibilityLabel="Add ritual"
          >
            <Plus size={24} color={colors.slateMut} strokeWidth={1.5} />
          </Pressable>
          <Text style={styles.addLabel} numberOfLines={1}>
            Add
          </Text>
        </View>
      </ScrollView>

      <AddRitualModal
        visible={modalOpen}
        onClose={() => setModalOpen(false)}
        onCreate={handleCreate}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    paddingTop: spacing.md,
    paddingBottom: spacing.lg,
  },
  scrollContent: {
    paddingHorizontal: spacing.xl,
    gap: spacing.md,
    alignItems: 'flex-start',
  },
  addItem: {
    width: RITUAL_ITEM_WIDTH,
    alignItems: 'center',
  },
  addCircle: {
    width: RITUAL_CIRCLE_SIZE,
    height: RITUAL_CIRCLE_SIZE,
    borderRadius: RITUAL_CIRCLE_SIZE / 2,
    backgroundColor: colors.paper,
    borderWidth: StyleSheet.hairlineWidth * 2,
    borderColor: colors.divider,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.soft,
  },
  addCirclePressed: {
    backgroundColor: colors.card,
  },
  addLabel: {
    ...typography.caption,
    color: colors.textMuted,
    marginTop: spacing.sm,
    textAlign: 'center',
    maxWidth: RITUAL_ITEM_WIDTH,
  },
});
