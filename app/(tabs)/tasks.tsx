import React from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import { colors } from '../../src/theme/colors';
import { typography } from '../../src/theme/typography';
import { spacing } from '../../src/theme/spacing';
import { RitualsRow } from '../../src/components/rituals/RitualsRow';
import { TodoList } from '../../src/components/todos/TodoList';
import { PaperGrain } from '../../src/components/ui/PaperGrain';

export default function TasksScreen() {
  const tabBarHeight = useBottomTabBarHeight();
  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <PaperGrain>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          keyboardVerticalOffset={tabBarHeight}
          style={styles.flex}
        >
          <View style={styles.header}>
            <Text style={styles.title}>Tasks</Text>
            <Text style={styles.subtitle}>Where notes become action.</Text>
          </View>
          <RitualsRow />
          <TodoList />
        </KeyboardAvoidingView>
      </PaperGrain>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.paper },
  flex: { flex: 1 },
  header: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
  },
  title: { ...typography.display, color: colors.text },
  subtitle: { ...typography.body, color: colors.textMuted, marginTop: spacing.xs },
});
